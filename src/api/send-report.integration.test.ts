import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { Mail } from '@/src/mail/send'
import { UPLOAD_BUDGET_BYTES } from '@/src/photo/budget'
import { serializeCase } from '@/src/send-case'
import {
  type GenchouCase,
  type Photo,
  addDefectPage,
  beginCase,
  toggleDefectStatus,
  withCustomerInfo,
  withDefectNote,
  withDefectPhoto,
  withExteriorPhoto,
} from '@/src/domain'
import { sendReport } from './send-report'

/** 実物に近い大きさの写真。長辺1600pxへ縮めた後のものを想定する。 */
const REAL_PHOTO = new Uint8Array(readFileSync(join(process.cwd(), 'e2e/fixtures/defect-a.jpg')))

const ENV = {
  REPORT_MAIL_TO: 'report@example.co.jp',
  REPORT_MAIL_FROM: '現調報告書 <no-reply@example.co.jp>',
  RESEND_API_KEY: 'test-key',
}

const photo = (id: string): Photo => ({
  id,
  jpeg: REAL_PHOTO as Uint8Array<ArrayBuffer>,
  quality: 0.82,
  width: 2400,
  height: 1600,
})

function fullCase(defectCount: number): GenchouCase {
  let current = withCustomerInfo(beginCase({ today: '2026-09-16' }), {
    customerName: '山田 太郎',
    propertyAddress: '東京都渋谷区神宮前 1-2-3 グランドハイツ 405',
    surveyorName: '鈴木 一郎',
  })
  for (let i = 0; i < 4; i += 1) current = withExteriorPhoto(current, i, photo(`e${i}`))
  for (let i = 0; i < defectCount; i += 1) {
    const pageIndex = Math.floor(i / 4)
    if (i % 4 === 0 && pageIndex > 0) current = addDefectPage(current)
    current = withDefectPhoto(current, pageIndex, i % 4, photo(`d${i}`))
    if (i % 2 === 0) current = toggleDefectStatus(current, pageIndex, i % 4, 'A')
    current = withDefectNote(current, pageIndex, i % 4, `${i + 1}箇所目の所見。外壁のひび割れ、幅およそ2mm`)
  }
  return current
}

describe('画面から送信までの通し', () => {
  it('画面が組み立てた中身を、そのまま受け取って報告書にできる', async () => {
    const sent: Mail[] = []
    const genchouCase = fullCase(6)

    // 画面がサーバーへ送り出す形に直してから渡す
    const outcome = await sendReport(serializeCase(genchouCase), {
      env: ENV,
      mailer: async (mail) => void sent.push(mail),
    })

    expect(outcome).toMatchObject({ ok: true, pageCount: 2 })

    const pdf = await PDFDocument.load(sent[0].attachment.content)
    expect(pdf.getPageCount()).toBe(2)
    expect(sent[0].attachment.fileName).toBe('20260916_山田 太郎_現調報告書.pdf')
  })

  it('不具合12枚（3ページ）でも、送り出す中身が上限に収まる', async () => {
    const genchouCase = fullCase(12)

    const payload = JSON.stringify(serializeCase(genchouCase))

    expect(Buffer.byteLength(payload)).toBeLessThanOrEqual(UPLOAD_BUDGET_BYTES)
  })

  it('不具合12枚でも報告書は3ページで組み上がる', async () => {
    const sent: Mail[] = []

    const outcome = await sendReport(serializeCase(fullCase(12)), {
      env: ENV,
      mailer: async (mail) => void sent.push(mail),
    })

    expect(outcome).toMatchObject({ ok: true, pageCount: 3 })
    expect((await PDFDocument.load(sent[0].attachment.content)).getPageCount()).toBe(3)
  })
})
