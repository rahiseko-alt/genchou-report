import { type MailEnv, type Mailer, composeMail, readMailSettings, resendMailer } from '@/src/mail/send'
import { buildReportPdf } from '@/src/report/build-pdf'
import { planReport } from '@/src/report/layout'
import { BadCaseError, parseCase } from './parse-case'

/**
 * 「完了」で送られてきた案件を、報告書にして会社へ送る。
 *
 * 送信の中身だけを持ち、HTTP の作法（Request / Response）には触れない。
 * こうしておくと、実際にメールを送らずに宛先と添付を確かめられる。
 */

export type SendOutcome =
  | { ok: true; fileName: string; pageCount: number }
  | { ok: false; reason: 'badRequest' | 'notConfigured' | 'buildFailed' | 'mailFailed'; message: string }

export type { SerializedCase as SendRequestBody } from './parse-case'

export async function sendReport(
  body: unknown,
  { mailer, env = process.env }: { mailer?: Mailer; env?: MailEnv } = {},
): Promise<SendOutcome> {
  const settings = readMailSettings(env)
  if (settings === null) {
    return { ok: false, reason: 'notConfigured', message: '送り先が設定されていない' }
  }

  let genchouCase
  try {
    genchouCase = parseCase(body)
  } catch (error) {
    return {
      ok: false,
      reason: 'badRequest',
      message: error instanceof BadCaseError ? error.message : '送られてきた中身を読めない',
    }
  }

  // 形は通っても組み立てで転ぶことがある（読めない写真など）。
  // ここで受け止めないと、担当者には理由の分からない失敗として届く。
  let pdf: Uint8Array
  try {
    pdf = await buildReportPdf(genchouCase)
  } catch (error) {
    return {
      ok: false,
      reason: 'buildFailed',
      message: error instanceof Error ? error.message : '報告書を組み立てられなかった',
    }
  }

  const mail = composeMail(genchouCase.customer, pdf, settings)
  const send = mailer ?? resendMailer(settings.apiKey)

  try {
    await send(mail)
  } catch (error) {
    return {
      ok: false,
      reason: 'mailFailed',
      message: error instanceof Error ? error.message : 'メールを送れなかった',
    }
  }

  return {
    ok: true,
    fileName: mail.attachment.fileName,
    pageCount: planReport(genchouCase).pageCount,
  }
}
