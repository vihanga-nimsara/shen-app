// Support feedback. Posts to the hosted backend, which writes to Supabase with
// a server-side key. If the backend route isn't deployed yet, the app can write
// straight to the Supabase table with the publishable key: the table is
// insert-only for anonymous clients, so no privileged credential ships here.
//
// If both paths fail we still hand the user a prefilled GitHub issue.

export type FeedbackKind = 'bug' | 'feature'

export interface FeedbackInput {
  kind: FeedbackKind
  title: string
  body: string
  email?: string
  version: string
  platform: string
}

export interface FeedbackResult {
  ok: boolean
  message: string
  issueUrl?: string
}

const REPO = 'vihanga-nimsara/shen-app'

// Public project values. Publishable Supabase keys are designed to be embedded
// in clients; the table only accepts inserts through the RLS policy.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://shbkpqqpmllhognnaixv.supabase.co'
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_ulRZynNVm5IGk-kblkWoGw_KNsUP481'

export function issueUrl(input: FeedbackInput): string {
  const template = input.kind === 'bug' ? 'bug_report.yml' : 'feature_request.yml'
  const title = `[${input.kind === 'bug' ? 'Bug' : 'Feature'}] ${input.title}`.slice(0, 140)
  const pieces = [
    input.body,
    '',
    `Version: ${input.version}`,
    `Platform: ${input.platform}`,
    input.email ? `Contact: ${input.email}` : ''
  ]
  const body = pieces.filter(Boolean).join('\n').slice(0, 3000)
  return `https://github.com/${REPO}/issues/new?template=${template}&title=${encodeURIComponent(
    title
  )}&body=${encodeURIComponent(body)}`
}

async function insertDirect(input: FeedbackInput): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/shen_feedback`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        kind: input.kind,
        title: input.title,
        body: input.body,
        email: input.email ?? null,
        app_version: input.version,
        platform: input.platform
      })
    })
    return res.ok
  } catch {
    return false
  }
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.ok) {
      return { ok: true, message: 'Thanks — feedback received.' }
    }
    // A not-configured/unreachable backend should not lose the report. A 400 or
    // 429 is a real answer, so don't bypass it by writing directly.
    if (res.status !== 400 && res.status !== 429 && (await insertDirect(input))) {
      return { ok: true, message: 'Thanks — feedback received.' }
    }
    return {
      ok: false,
      message:
        data.error ||
        (res.status === 404 || res.status === 503
          ? 'Feedback isn’t connected yet.'
          : `Couldn’t send feedback (${res.status}).`),
      issueUrl: issueUrl(input)
    }
  } catch {
    if (await insertDirect(input)) {
      return { ok: true, message: 'Thanks — feedback received.' }
    }
    return {
      ok: false,
      message: 'Couldn’t reach Shen right now.',
      issueUrl: issueUrl(input)
    }
  }
}
