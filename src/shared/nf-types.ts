// Shared shapes for the Northflank live status tab. Kept free of Node imports
// so the renderer can import the types without pulling server code into the UI.

export interface NfPoint {
  t: string
  v: number
}

export interface NfMetric {
  id: string
  unit: string
  points: NfPoint[]
}

export interface NfService {
  id: string
  name: string
  status: string
  paused: boolean
  region: string
  plan: string
  instances: number
  domain: string | null
  commit: string | null
  repo: string | null
  updatedAt: string | null
}

export interface NfMetrics {
  cpu: NfMetric | null
  memory: NfMetric | null
  networkIngress: NfMetric | null
  networkEgress: NfMetric | null
}

export interface NfLive {
  service: NfService
  metrics: NfMetrics
  fetchedAt: string
  duration: number
  source: 'env' | 'dotenv' | 'cli'
}
