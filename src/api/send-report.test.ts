import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { Mail } from '@/src/mail/send'
import { type SendRequestBody, sendReport } from './send-report'

const JPEG_BASE64 = readFileSync(join(process.cwd(), 'src/report/sample-photo.jpg')).toString('base64')

const ENV = {
  REPORT_MAIL_TO: 'report@example.co.jp',
  REPORT_MAIL_FROM: '現調報告書 <no-reply@example.co.jp>',
  RESEND_API_KEY: 'test-key',
}

const photo = (id: string) => ({ id, jpeg: JPEG_BASE64, quality: 0.82, width: 1600, height: 1200 })

function requestBody(defectCount = 4): SendRequestBody {
  const defects = Array.from({ length: defectCount }, (_, i) => ({
    photo: photo(`d${i}`),
    statuses: i === 0 ? ['A', 'C'] : [],
    note: i === 0 ? '外壁のひび割れ' : '',
  }))
  const pages: SendRequestBody['defectPages'] = []
  for (let start = 0; start < defects.length; start += 4) {
    const page = defects.slice(start, start + 4)
    pages.push([page[0] ?? null, page[1] ?? null, page[2] ?? null, page[3] ?? null])
  }
  return {
    customer: {
      customerName: '山田 太郎',
      propertyAddress: '東京都渋谷区 1-2-3',
      surveyedOn: '2026-09-16',
      surveyorName: '鈴木',
    },
    exteriorFrames: [photo('e0'), photo('e1'), photo('e2'), photo('e3')],
    defectPages: pages,
  }
}

/** 実際には送らず、送ろうとした中身だけを覚える送り手。 */
function spyMailer() {
  const sent: Mail[] = []
  return { sent, mailer: async (mail: Mail) => void sent.push(mail) }
}

describe('報告書の送付', () => {
  it('会社の固定アドレスへ送る', async () => {
    const { sent, mailer } = spyMailer()

    const outcome = await sendReport(requestBody(), { mailer, env: ENV })

    expect(outcome.ok).toBe(true)
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('report@example.co.jp')
    expect(sent[0].from).toBe('現調報告書 <no-reply@example.co.jp>')
  })

  it('件名に顧客名が入る', async () => {
    const { sent, mailer } = spyMailer()

    await sendReport(requestBody(), { mailer, env: ENV })

    expect(sent[0].subject).toBe('【現調報告書】山田 太郎 様')
  })

  it('添付の名前が日付と顧客名になる', async () => {
    const { sent, mailer } = spyMailer()

    await sendReport(requestBody(), { mailer, env: ENV })

    expect(sent[0].attachment.fileName).toBe('20260916_山田 太郎_現調報告書.pdf')
  })

  it('添付が読める PDF になっている', async () => {
    const { sent, mailer } = spyMailer()

    await sendReport(requestBody(5), { mailer, env: ENV })

    const pdf = await PDFDocument.load(sent[0].attachment.content)
    expect(pdf.getPageCount()).toBe(2)
    expect(pdf.getTitle()).toBe('現調報告書')
  })

  it('ページ数と添付の名前を返す', async () => {
    const { mailer } = spyMailer()

    const outcome = await sendReport(requestBody(9), { mailer, env: ENV })

    expect(outcome).toMatchObject({ ok: true, pageCount: 3 })
  })

  it('送り先が設定されていなければ、その旨を返す', async () => {
    const { sent, mailer } = spyMailer()

    const outcome = await sendReport(requestBody(), { mailer, env: {} })

    expect(outcome).toMatchObject({ ok: false, reason: 'notConfigured' })
    expect(sent).toHaveLength(0)
  })

  it('メールの送信が失敗しても、例外で落ちずに知らせる', async () => {
    const outcome = await sendReport(requestBody(), {
      env: ENV,
      mailer: async () => {
        throw new Error('相手が受け取らなかった')
      },
    })

    expect(outcome).toMatchObject({ ok: false, reason: 'mailFailed' })
  })

  it('顧客名が空なら送らない', async () => {
    const { sent, mailer } = spyMailer()
    const body = requestBody()
    body.customer.customerName = '  '

    const outcome = await sendReport(body, { mailer, env: ENV })

    expect(outcome).toMatchObject({ ok: false, reason: 'badRequest' })
    expect(sent).toHaveLength(0)
  })

  it('外観が4枚揃っていなければ送らない', async () => {
    const { sent, mailer } = spyMailer()
    const body = requestBody()
    body.exteriorFrames[2] = null

    const outcome = await sendReport(body, { mailer, env: ENV })

    expect(outcome).toMatchObject({ ok: false, reason: 'badRequest' })
    expect(sent).toHaveLength(0)
  })

  it('不具合が1枚も無ければ送らない', async () => {
    const { sent, mailer } = spyMailer()
    const body = requestBody()
    body.defectPages = [[null, null, null, null]]

    const outcome = await sendReport(body, { mailer, env: ENV })

    expect(outcome).toMatchObject({ ok: false, reason: 'badRequest' })
    expect(sent).toHaveLength(0)
  })

  it('中身が空なら送らない', async () => {
    const { sent, mailer } = spyMailer()

    expect(await sendReport(null, { mailer, env: ENV })).toMatchObject({ ok: false })
    expect(await sendReport('あ', { mailer, env: ENV })).toMatchObject({ ok: false })
    expect(sent).toHaveLength(0)
  })
})
