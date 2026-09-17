import { describe, expect, it } from 'vitest'
import { attachmentFileName, mailBody, mailSubject } from './message'

const survey = {
  customerName: '山田 太郎',
  propertyAddress: '東京都渋谷区 1-2-3',
  surveyedOn: '2026-09-16',
  surveyorName: '鈴木',
}

describe('件名', () => {
  it('顧客名が入る', () => {
    expect(mailSubject(survey)).toBe('【現調報告書】山田 太郎 様')
  })
})

describe('添付ファイルの名前', () => {
  it('調査日と顧客名が入る', () => {
    expect(attachmentFileName(survey)).toBe('20260916_山田 太郎_現調報告書.pdf')
  })

  it('ファイル名に使えない文字を取り除く', () => {
    expect(attachmentFileName({ ...survey, customerName: 'A/B:C*D?E"F<G>H|I\\J' })).toBe(
      '20260916_ABCDEFGHIJ_現調報告書.pdf',
    )
  })

  it('前後の空白を落とす', () => {
    expect(attachmentFileName({ ...survey, customerName: '　 山田 　' })).toBe(
      '20260916_山田_現調報告書.pdf',
    )
  })

  it('顧客名が記号だけになっても、名前が壊れない', () => {
    expect(attachmentFileName({ ...survey, customerName: '///' })).toBe(
      '20260916_顧客名なし_現調報告書.pdf',
    )
  })

  it('長すぎる顧客名は切り詰める', () => {
    const name = 'あ'.repeat(200)

    const fileName = attachmentFileName({ ...survey, customerName: name })

    expect(fileName.length).toBeLessThanOrEqual(100)
    expect(fileName.endsWith('_現調報告書.pdf')).toBe(true)
  })

  it('調査日が入っていなければ、日付の部分を省く', () => {
    expect(attachmentFileName({ ...survey, surveyedOn: '' })).toBe('山田 太郎_現調報告書.pdf')
  })
})

describe('本文', () => {
  it('顧客名・物件住所・調査日・担当者名が入る', () => {
    const body = mailBody(survey)

    expect(body).toContain('山田 太郎')
    expect(body).toContain('東京都渋谷区 1-2-3')
    expect(body).toContain('2026-09-16')
    expect(body).toContain('鈴木')
  })

  it('物件住所が空でも本文が壊れない', () => {
    const body = mailBody({ ...survey, propertyAddress: '' })

    expect(body).toContain('山田 太郎')
    expect(body).not.toContain('undefined')
  })
})
