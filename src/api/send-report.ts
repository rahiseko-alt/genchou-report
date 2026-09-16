import type { CustomerInfo, GenchouCase, Photo } from '@/src/domain'
import { type MailEnv, type Mailer, composeMail, readMailSettings, resendMailer } from '@/src/mail/send'
import { buildReportPdf } from '@/src/report/build-pdf'

/**
 * 「完了」で送られてきた案件を、報告書にして会社へ送る。
 *
 * 送信の中身だけを持ち、HTTP の作法（Request / Response）には触れない。
 * こうしておくと、実際にメールを送らずに宛先と添付を確かめられる。
 */

export type SendOutcome =
  | { ok: true; fileName: string; pageCount: number }
  | { ok: false; reason: 'badRequest' | 'notConfigured' | 'mailFailed'; message: string }

/** 端末から送られてくる形。写真の中身は base64 で運ぶ。 */
export type SendRequestBody = {
  customer: CustomerInfo
  exteriorFrames: (SerializedPhoto | null)[]
  defectPages: ({ photo: SerializedPhoto; statuses: string[]; note: string } | null)[][]
}

type SerializedPhoto = { id: string; jpeg: string; quality: number; width: number; height: number }

export async function sendReport(
  body: unknown,
  { mailer, env = process.env }: { mailer?: Mailer; env?: MailEnv } = {},
): Promise<SendOutcome> {
  const settings = readMailSettings(env)
  if (settings === null) {
    return {
      ok: false,
      reason: 'notConfigured',
      message: '送り先が設定されていない',
    }
  }

  let genchouCase: GenchouCase
  try {
    genchouCase = parseCase(body)
  } catch (error) {
    return {
      ok: false,
      reason: 'badRequest',
      message: error instanceof Error ? error.message : '送られてきた中身を読めない',
    }
  }

  const pdf = await buildReportPdf(genchouCase)
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

  const { planReport } = await import('@/src/report/layout')
  return { ok: true, fileName: mail.attachment.fileName, pageCount: planReport(genchouCase).pageCount }
}

function parseCase(body: unknown): GenchouCase {
  if (typeof body !== 'object' || body === null) throw new Error('中身が空')
  const raw = body as Partial<SendRequestBody>

  const customer = raw.customer
  if (customer === undefined || typeof customer.customerName !== 'string') {
    throw new Error('顧客情報が無い')
  }
  if (customer.customerName.trim() === '') throw new Error('顧客名が無い')

  const exteriorFrames = (raw.exteriorFrames ?? []).map(revivePhoto)
  if (exteriorFrames.length !== 4 || exteriorFrames.some((frame) => frame === null)) {
    throw new Error('外観写真が4枚揃っていない')
  }

  const defectPages = (raw.defectPages ?? []).map((page) =>
    page.map((frame) =>
      frame === null
        ? null
        : {
            photo: revivePhotoOrThrow(frame.photo),
            statuses: frame.statuses,
            note: frame.note,
          },
    ),
  )
  const defectCount = defectPages.flat().filter((frame) => frame !== null).length
  if (defectCount === 0) throw new Error('不具合写真が1枚も無い')

  return {
    customer,
    exteriorFrames: exteriorFrames as GenchouCase['exteriorFrames'],
    defectPages: defectPages as GenchouCase['defectPages'],
  }
}

function revivePhoto(photo: SerializedPhoto | null): Photo | null {
  return photo === null ? null : revivePhotoOrThrow(photo)
}

function revivePhotoOrThrow(photo: SerializedPhoto | undefined): Photo {
  if (photo === undefined || typeof photo.jpeg !== 'string') throw new Error('写真の中身が無い')
  return {
    id: photo.id,
    jpeg: new Uint8Array(Buffer.from(photo.jpeg, 'base64')),
    quality: photo.quality,
    width: photo.width,
    height: photo.height,
  }
}
