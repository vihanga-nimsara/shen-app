import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { NfLive, NfMetric, NfMetrics, NfPoint, NfService } from './nf-types'

// Northflank REST API. The desktop app only ever reads observability data with
// the user's own token; the token never reaches the renderer.
const NF_API = 'https://api.northflank.com/v1'
const PROJECT = process.env.NORTHFLANK_PROJECT_ID || 'default'
const SERVICE = process.env.NORTHFLANK_SERVICE_ID || 'shen-backend'
const WINDOW_SECONDS = 1200
const CACHE_MS = 5000

const METRIC_IDS = ['cpu', 'memory', 'networkIngress', 'networkEgress'] as const

type Source = NfLive['source']

interface Credential {
  token: string
  source: Source
}

let cache: { at: number; data: NfLive } | null = null

function readEnvToken(dirs: string[]): Credential | null {
  for (const dir of dirs) {
    const file = path.join(dir, '.env')
    try {
      const text = fs.readFileSync(file, 'utf8')
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(
          /^\s*(?:export\s+)?(NORTHFLANK_API_TOKEN|NF_API_TOKEN)\s*=\s*(.*?)\s*$/
        )
        if (!match) continue
        const value = match[2].replace(/^['"]|['"]$/g, '').trim()
        if (value) return { token: value, source: 'dotenv' }
      }
    } catch {
      /* no .env in this directory */
    }
  }
  return null
}

// The Northflank CLI keeps a logged-in session on the machine. Reading it lets
// the status tab work out of the box; a proper API token in .env is preferred
// because CLI sessions expire.
function readCliToken(): Credential | null {
  try {
    const file = path.join(os.homedir(), '.northflank', 'config.json')
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      current?: string
      contexts?: { name?: string; token?: string }[]
    }
    const contexts = Array.isArray(raw.contexts) ? raw.contexts : []
    const active =
      contexts.find((context) => context.name === raw.current) ?? contexts[contexts.length - 1]
    if (active?.token) return { token: active.token, source: 'cli' }
  } catch {
    /* no CLI session */
  }
  return null
}

function resolveCredential(dirs: string[]): Credential | null {
  const envToken = process.env.NORTHFLANK_API_TOKEN || process.env.NF_API_TOKEN
  if (envToken) return { token: envToken, source: 'env' }
  return readEnvToken(dirs) ?? readCliToken()
}

async function nfGet<T>(pathname: string, token: string): Promise<T> {
  const res = await fetch(`${NF_API}${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(9000)
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Northflank ${res.status}: ${body.slice(0, 180) || res.statusText}`)
  }
  return (await res.json()) as T
}

function toService(raw: any): NfService {
  const port = Array.isArray(raw.ports)
    ? raw.ports.find((item: any) => item?.public) ?? raw.ports[0]
    : null
  return {
    id: String(raw.id ?? SERVICE),
    name: String(raw.name ?? SERVICE),
    status: String(raw.status?.deployment?.status ?? 'UNKNOWN'),
    paused: Boolean(raw.servicePaused),
    region: String(raw.cluster?.id ?? raw.region ?? 'unknown'),
    plan: String(raw.billing?.deploymentPlan ?? ''),
    instances: Number(raw.deployment?.instances ?? 1),
    domain: port?.dns ?? null,
    commit: raw.deployment?.internal?.deployedSHA ?? null,
    repo: raw.deployment?.internal?.repository ?? null,
    updatedAt: raw.updatedAt ?? null
  }
}

// Merge every container series into a single timestamp-keyed line. Percentages
// are averaged; traffic is averaged too, which is right for a one-instance
// service and still readable for several replicas.
function toMetric(raw: any, fallbackId: string, fallbackUnit: string): NfMetric | null {
  const series = Array.isArray(raw?.values) ? raw.values : []
  const buckets = new Map<string, { sum: number; count: number }>()
  for (const container of series) {
    for (const point of Array.isArray(container?.data) ? container.data : []) {
      const value = Number(point?.value)
      if (!Number.isFinite(value) || typeof point?.ts !== 'string') continue
      const bucket = buckets.get(point.ts) ?? { sum: 0, count: 0 }
      bucket.sum += value
      bucket.count += 1
      buckets.set(point.ts, bucket)
    }
  }
  if (buckets.size === 0) return null
  const points: NfPoint[] = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, bucket]) => ({ t, v: bucket.sum / bucket.count }))
  return {
    id: String(raw?.metricInfo?.metricId ?? fallbackId),
    unit: String(raw?.metricInfo?.metricUnit ?? fallbackUnit),
    points
  }
}

export function northflankTarget() {
  return { projectId: PROJECT, serviceId: SERVICE }
}

export async function getNorthflankLive(envDirs: string[] = [process.cwd()]): Promise<NfLive> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data

  const credential = resolveCredential(envDirs)
  if (!credential) {
    throw new Error('No Northflank credentials found. Set NORTHFLANK_API_TOKEN or run `northflank login`.')
  }

  const servicePath = `/projects/${encodeURIComponent(PROJECT)}/services/${encodeURIComponent(SERVICE)}`
  const query = new URLSearchParams({ queryType: 'range', duration: String(WINDOW_SECONDS) })
  for (const metric of METRIC_IDS) query.append('metricTypes', metric)

  const [serviceRes, metricsRes] = await Promise.all([
    nfGet<{ data: any }>(servicePath, credential.token),
    nfGet<{ data: any }>(`${servicePath}/metrics?${query.toString()}`, credential.token)
  ])

  const metrics: NfMetrics = {
    cpu: toMetric(metricsRes.data?.cpu, 'cpu', 'pct'),
    memory: toMetric(metricsRes.data?.memory, 'memory', 'pct'),
    networkIngress: toMetric(metricsRes.data?.networkIngress, 'networkIngress', 'kbps'),
    networkEgress: toMetric(metricsRes.data?.networkEgress, 'networkEgress', 'kbps')
  }

  const data: NfLive = {
    service: toService(serviceRes.data ?? {}),
    metrics,
    fetchedAt: new Date().toISOString(),
    duration: WINDOW_SECONDS,
    source: credential.source
  }
  cache = { at: Date.now(), data }
  return data
}
