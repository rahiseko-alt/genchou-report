import { describe, expect, it } from 'vitest'
import { composeMail, readMailSettings } from './send'

const customer = {
  customerName: '山田 太郎',
  propertyAddress: '東京都渋谷区 1-2-3',
  surveyedOn: '2026-09-16',
  surveyorName: '鈴木',
}

const settings = { to: 'report@example.co.jp', from: '現調報告書 <no-reply@example.co.jp>' }
const pdf = new Uint8Array([1, 2, 3])

describe('送るメールの組み立て', () => {
  it('宛先と差出人が設定のとおりになる', () => {
    const mail = composeMail(customer, pdf, settings)

    expect(mail.to).toBe('report@example.co.jp')
    expect(mail.from).toBe('現調報告書 <no-reply@example.co.jp>')
  })

  it('件名に顧客名が入る', () => {
    expect(composeMail(customer, pdf, settings).subject).toBe('【現調報告書】山田 太郎 様')
  })

  it('添付の名前が日付と顧客名になる', () => {
    expect(composeMail(customer, pdf, settings).attachment.fileName).toBe(
      '20260916_山田 太郎_現調報告書.pdf',
    )
  })

  it('添付の中身が渡した PDF そのもの', () => {
    expect(composeMail(customer, pdf, settings).attachment.content).toBe(pdf)
    expect(composeMail(customer, pdf, settings).attachment.contentType).toBe('application/pdf')
  })

  it('本文に担当者名が入る', () => {
    expect(composeMail(customer, pdf, settings).text).toContain('鈴木')
  })
})

describe('設定の読み取り', () => {
  const full = {
    REPORT_MAIL_TO: 'a@example.com',
    REPORT_MAIL_FROM: 'b@example.com',
    RESEND_API_KEY: 'key',
  }

  it('3つ揃っていれば読める', () => {
    expect(readMailSettings(full)).toEqual({
      to: 'a@example.com',
      from: 'b@example.com',
      apiKey: 'key',
    })
  })

  it('どれか欠けていれば読めない', () => {
    for (const key of Object.keys(full)) {
      const partial = { ...full, [key]: '' }
      expect(readMailSettings(partial), `${key} が空`).toBeNull()
    }
  })

  it('何も無ければ読めない', () => {
    expect(readMailSettings({})).toBeNull()
  })
})
