import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BadCaseError, type SerializedCase, parseCase } from './parse-case'

const JPEG = readFileSync(join(process.cwd(), 'src/report/sample-photo.jpg')).toString('base64')

const photo = (id: string) => ({ id, jpeg: JPEG, quality: 0.82, width: 1600, height: 1200 })

function body(): SerializedCase {
  return {
    customer: {
      customerName: '山田 太郎',
      propertyAddress: '東京都渋谷区 1-2-3',
      surveyedOn: '2026-09-16',
      surveyorName: '鈴木',
    },
    exteriorFrames: [photo('e0'), photo('e1'), photo('e2'), photo('e3')],
    defectPages: [[{ photo: photo('d0'), statuses: ['A'], note: '外壁のひび割れ' }, null, null, null]],
  }
}

/** 中身を1箇所だけ壊して渡す。 */
function broken(change: (value: SerializedCase) => void): unknown {
  const value = body()
  change(value)
  return value
}

describe('送られてきた中身の読み直し', () => {
  it('正しい中身は案件になる', () => {
    const genchouCase = parseCase(body())

    expect(genchouCase.customer.customerName).toBe('山田 太郎')
    expect(genchouCase.defectPages[0][0]?.statuses).toEqual(['A'])
  })

  it('知らないステータスは通さない', () => {
    // 通してしまうと、その言葉がそのまま報告書に印字されて会社へ届く
    expect(() =>
      parseCase(broken((value) => void (value.defectPages[0][0]!.statuses = ['Z']))),
    ).toThrow(BadCaseError)
  })

  it('ステータスが並びでなければ通さない', () => {
    expect(() =>
      parseCase(
        broken((value) => {
          ;(value.defectPages[0][0] as unknown as { statuses: unknown }).statuses = '<script>'
        }),
      ),
    ).toThrow(BadCaseError)
  })

  it('補足が文字でなければ通さない', () => {
    expect(() =>
      parseCase(
        broken((value) => {
          ;(value.defectPages[0][0] as unknown as { note: unknown }).note = 12345
        }),
      ),
    ).toThrow(BadCaseError)
  })

  it('写真が JPEG でなければ通さない', () => {
    expect(() =>
      parseCase(broken((value) => void (value.exteriorFrames[0]!.jpeg = 'not-a-jpeg'))),
    ).toThrow(BadCaseError)
  })

  it('顧客情報の項目が欠けていれば通さない', () => {
    for (const key of ['customerName', 'propertyAddress', 'surveyedOn', 'surveyorName']) {
      expect(
        () =>
          parseCase(
            broken((value) => {
              delete (value.customer as unknown as Record<string, unknown>)[key]
            }),
          ),
        key,
      ).toThrow(BadCaseError)
    }
  })

  it('顧客名が空なら通さない', () => {
    expect(() => parseCase(broken((value) => void (value.customer.customerName = '  ')))).toThrow(
      BadCaseError,
    )
  })

  it('外観が4枚揃っていなければ通さない', () => {
    expect(() => parseCase(broken((value) => void (value.exteriorFrames[2] = null)))).toThrow(
      BadCaseError,
    )
  })

  it('外観の枠の数が合わなければ通さない', () => {
    expect(() => parseCase(broken((value) => void value.exteriorFrames.pop()))).toThrow(BadCaseError)
  })

  it('不具合が1枚も無ければ通さない', () => {
    expect(() =>
      parseCase(broken((value) => void (value.defectPages = [[null, null, null, null]]))),
    ).toThrow(BadCaseError)
  })

  it('不具合ページの枠の数が合わなければ通さない', () => {
    expect(() =>
      parseCase(broken((value) => void (value.defectPages = [[null, null]] as never))),
    ).toThrow(BadCaseError)
  })

  it('写真の大きさが数でなければ通さない', () => {
    expect(() =>
      parseCase(
        broken((value) => {
          ;(value.exteriorFrames[0] as unknown as { width: unknown }).width = '広い'
        }),
      ),
    ).toThrow(BadCaseError)
  })

  it('中身が空なら通さない', () => {
    for (const value of [null, undefined, 'あ', 42, []]) {
      expect(() => parseCase(value), String(value)).toThrow(BadCaseError)
    }
  })
})
