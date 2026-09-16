import { type SendOutcome, sendReport } from '@/src/api/send-report'

/** PDF の組み立てにフォントの読み込みが入るため、既定より長めに取る。 */
export const maxDuration = 60

const STATUS: Record<Exclude<SendOutcome, { ok: true }>['reason'], number> = {
  badRequest: 400,
  notConfigured: 503,
  mailFailed: 502,
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, reason: 'badRequest', message: '中身を読めない' }, { status: 400 })
  }

  const outcome = await sendReport(body)

  return Response.json(outcome, { status: outcome.ok ? 200 : STATUS[outcome.reason] })
}
