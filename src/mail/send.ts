import type { CustomerInfo } from '@/src/domain'
import { attachmentFileName, mailBody, mailSubject } from './message'

/**
 * 会社へメールを送る。
 *
 * 実際の送信は `Mailer` の裏に1つだけ置く。テストではここを差し替え、
 * 宛先・件名・添付を確かめるだけで実際には送らない。
 */

export type Mail = {
  to: string
  from: string
  subject: string
  text: string
  attachment: { fileName: string; content: Uint8Array; contentType: string }
}

export type Mailer = (mail: Mail) => Promise<void>

export type MailSettings = {
  to: string
  from: string
  apiKey: string
}

/**
 * 設定は環境変数から読む。コードに宛先も鍵も書かない。
 * 運用を始める前に、ここの値を差し替えるだけで宛先が変わる。
 */
export type MailEnv = Record<string, string | undefined>

export function readMailSettings(env: MailEnv = process.env): MailSettings | null {
  const to = env.REPORT_MAIL_TO
  const from = env.REPORT_MAIL_FROM
  const apiKey = env.RESEND_API_KEY

  if (!to || !from || !apiKey) return null
  return { to, from, apiKey }
}

export function composeMail(
  customer: CustomerInfo,
  pdf: Uint8Array,
  settings: Pick<MailSettings, 'to' | 'from'>,
): Mail {
  return {
    to: settings.to,
    from: settings.from,
    subject: mailSubject(customer),
    text: mailBody(customer),
    attachment: {
      fileName: attachmentFileName(customer),
      content: pdf,
      contentType: 'application/pdf',
    },
  }
}

/** Resend にそのまま渡す形の送り手。鍵が無ければ作らない。 */
export function resendMailer(apiKey: string): Mailer {
  return async (mail) => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mail.from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        attachments: [
          {
            filename: mail.attachment.fileName,
            content: Buffer.from(mail.attachment.content).toString('base64'),
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`メールを送れなかった（${response.status}）`)
    }
  }
}
