import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deploy fallback. Production is built on GitHub Actions
 * (.github/workflows/deploy.yml) and uploaded to Vercel prebuilt; Vercel's own
 * git builds are off (vercel.json). GitHub sends `workflow_run` webhooks here,
 * and when a Deploy run on main ends without deploying — it failed, couldn't
 * start because the monthly Actions minutes are used up, or timed out — we
 * fire the Vercel Deploy Hook so Vercel builds main itself. Cancelled runs were
 * superseded by a newer push, so they don't fall back.
 */
const DEPLOY_WORKFLOW = '.github/workflows/deploy.yml'
const FALLBACK_CONCLUSIONS = new Set(['failure', 'startup_failure', 'timed_out'])

function hasValidSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith('sha256=')) return false
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`)
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL
  if (!secret || !hookUrl) {
    return NextResponse.json({ error: 'Deploy fallback not configured.' }, { status: 503 })
  }

  const body = await req.text()
  if (!hasValidSignature(body, req.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event')
  if (event === 'ping') return NextResponse.json({ ok: true })
  if (event !== 'workflow_run') return NextResponse.json({ ignored: event })

  const payload = JSON.parse(body)
  const run = payload.workflow_run ?? {}
  const shouldFallback =
    payload.action === 'completed' &&
    typeof run.path === 'string' &&
    run.path.startsWith(DEPLOY_WORKFLOW) &&
    run.head_branch === 'main' &&
    FALLBACK_CONCLUSIONS.has(run.conclusion)
  if (!shouldFallback) return NextResponse.json({ ignored: true })

  const res = await fetch(hookUrl, { method: 'POST' })
  console.log(
    `[deploy-fallback] Deploy run ${run.id} (${run.head_sha}) ended "${run.conclusion}"; Vercel deploy hook → ${res.status}`,
  )
  return NextResponse.json({ fallback: true, hookStatus: res.status }, { status: res.ok ? 202 : 502 })
}
