// Support feedback. Posts to the hosted backend, which writes to Supabase with
// a server-side key. The desktop app never carries a database credential.
//
// If the backend hasn't been configured yet (503) we still hand the user a
// prefilled GitHub issue so nothing is lost.

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
    return {
      ok: false,
      message: 'Couldn’t reach Shen right now.',
      issueUrl: issueUrl(input)
    }
  }
}
