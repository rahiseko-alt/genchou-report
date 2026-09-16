import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type PDFDict, PDFName, PDFDocument, PDFRawStream } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
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
import { buildReportPdf } from './build-pdf'

const JPEG = new Uint8Array(readFileSync(join(process.cwd(), 'src/report/sample-photo.jpg')))

const photo = (id: string): Photo => ({ id, jpeg: JPEG, width: 1600, height: 1200 })

function sampleCase(defectCount: number): GenchouCase {
  let current = withCustomerInfo(beginCase({ today: '2026-09-16' }), {
    customerName: '山田 太郎',
    propertyAddress: '東京都渋谷区神宮前 1-2-3',
    surveyorName: '鈴木',
  })
  for (let i = 0; i < 4; i += 1) current = withExteriorPhoto(current, i, photo(`e${i}`))
  for (let i = 0; i < defectCount; i += 1) {
    const pageIndex = Math.floor(i / 4)
    const frameIndex = i % 4
    if (frameIndex === 0 && pageIndex > 0) current = addDefectPage(current)
    current = withDefectPhoto(current, pageIndex, frameIndex, photo(`d${i}`))
  }
  return current
}

async function pageCountOf(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount()
}

/** PDF の中の対象を、あたる条件で数える。中身を文字列に起こさずに調べる。 */
function countObjects(pdf: PDFDocument, matches: (dict: PDFDict) => boolean): number {
  return pdf.context.enumerateIndirectObjects().filter(([, object]) => {
    const dict = object instanceof PDFRawStream ? object.dict : null
    const asDict = dict ?? ('has' in object && 'get' in object ? (object as PDFDict) : null)
    return asDict !== null && matches(asDict)
  }).length
}

describe('現調報告書の PDF', () => {
  it('A4 縦で出る', async () => {
    const pdf = await PDFDocument.load(await buildReportPdf(sampleCase(4)))
    const { width, height } = pdf.getPage(0).getSize()

    expect(Math.round(width)).toBe(595)
    expect(Math.round(height)).toBe(842)
    expect(height).toBeGreaterThan(width)
  })

  it('不具合4枚なら1ページ', async () => {
    expect(await pageCountOf(await buildReportPdf(sampleCase(4)))).toBe(1)
  })

  it('不具合5枚なら2ページ', async () => {
    expect(await pageCountOf(await buildReportPdf(sampleCase(5)))).toBe(2)
  })

  it('不具合8枚なら2ページ、9枚なら3ページ', async () => {
    expect(await pageCountOf(await buildReportPdf(sampleCase(8)))).toBe(2)
    expect(await pageCountOf(await buildReportPdf(sampleCase(9)))).toBe(3)
  })

  it('割り付けが決めたページ数と一致する', async () => {
    const { planReport } = await import('./layout')
    const genchouCase = sampleCase(9)

    expect(await pageCountOf(await buildReportPdf(genchouCase))).toBe(
      planReport(genchouCase).pageCount,
    )
  })

  it('題名が現調報告書になっている', async () => {
    const pdf = await PDFDocument.load(await buildReportPdf(sampleCase(4)))

    expect(pdf.getTitle()).toBe('現調報告書')
  })

  it('日本語のフォントが埋め込まれている', async () => {
    const pdf = await PDFDocument.load(await buildReportPdf(sampleCase(4)))

    // 字体の実体（FontFile2）が PDF の中にある。無ければ日本語は出ない。
    expect(countObjects(pdf, (dict) => dict.has(PDFName.of('FontFile2')))).toBeGreaterThan(0)
  })

  it('写真が載っている（外観4枚＋不具合4枚）', async () => {
    const pdf = await PDFDocument.load(await buildReportPdf(sampleCase(4)))

    expect(
      countObjects(pdf, (dict) => dict.get(PDFName.of('Subtype')) === PDFName.of('Image')),
    ).toBe(8)
  })

  it('同じ案件からは同じページ数が繰り返し得られる', async () => {
    const genchouCase = sampleCase(6)

    expect(await pageCountOf(await buildReportPdf(genchouCase))).toBe(2)
    expect(await pageCountOf(await buildReportPdf(genchouCase))).toBe(2)
  })

  it('ステータスと補足が付いていても組み上がる', async () => {
    let genchouCase = sampleCase(1)
    genchouCase = toggleDefectStatus(genchouCase, 0, 0, 'A')
    genchouCase = withDefectNote(genchouCase, 0, 0, '外壁のひび割れ。幅はおよそ2mm、長さ50cm ほど。雨水の侵入が疑われる')

    expect(await pageCountOf(await buildReportPdf(genchouCase))).toBe(1)
  })
})
