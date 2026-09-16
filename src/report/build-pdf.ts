import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { type PDFFont, type PDFImage, PDFDocument, type PDFPage, rgb } from 'pdf-lib'
import type { DefectEntry, Photo } from '@/src/domain'
import { type ReportPage, type ReportPlan, planReport } from './layout'
import type { GenchouCase } from '@/src/domain'

/**
 * 割り付け（`layout.ts`）を A4 縦の PDF に起こす。
 *
 * サーバーでのみ動く。日本語のフォントが 6MB あり、端末へ配らないため（docs/adr/0002）。
 */

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 32
const FOOTER_HEIGHT = 24
const GAP = 10

/**
 * 高さの配分は決め打ちにする。
 *
 * ページごとに残りの高さから割り出すと、1ページ目（顧客情報と外観がある）と
 * 2ページ目以降で不具合写真の大きさが変わり、体裁が揃わない。
 * 一番窮屈な1ページ目に合わせ、全ページで同じ大きさにする。
 *
 * 外観を不具合より小さくしているのは、報告書の中身は不具合のほうだから。
 */
const HEADING_HEIGHT = 85
const SECTION_TITLE_HEIGHT = 18
const EXTERIOR_CELL_HEIGHT = 115
const DEFECT_PHOTO_HEIGHT = 150
/** 不具合写真の下に置くステータスと補足のぶん。 */
const DEFECT_TEXT_HEIGHT = 32

const INK = rgb(0.106, 0.114, 0.129)
const MUTED = rgb(0.361, 0.384, 0.439)
const BRAND = rgb(0.122, 0.227, 0.373)
const LINE = rgb(0.847, 0.859, 0.886)

/** フォントは1回読めばよい。呼ばれるたびに 6MB を読み直さない。 */
let fontBytes: Uint8Array | null = null

async function japaneseFont(): Promise<Uint8Array> {
  if (fontBytes === null) {
    fontBytes = new Uint8Array(await readFile(join(process.cwd(), 'src/report/ipag.ttf')))
  }
  return fontBytes
}

export async function buildReportPdf(genchouCase: GenchouCase): Promise<Uint8Array> {
  return buildFromPlan(planReport(genchouCase))
}

export async function buildFromPlan(plan: ReportPlan): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  // 使った字だけを埋め込む。全字入れると数 MB になる。
  const font = await pdf.embedFont(await japaneseFont(), { subset: true })

  for (const page of plan.pages) {
    await drawPage(pdf, font, page, plan.pageCount)
  }

  pdf.setTitle('現調報告書')
  return pdf.save()
}

async function drawPage(
  pdf: PDFDocument,
  font: PDFFont,
  plan: ReportPage,
  pageCount: number,
): Promise<void> {
  const page = pdf.addPage([A4.width, A4.height])
  const contentWidth = A4.width - MARGIN * 2
  const cellWidth = (contentWidth - GAP) / 2
  let top = A4.height - MARGIN

  if (plan.heading !== null) {
    drawHeading(page, font, plan.heading, top)
    top -= HEADING_HEIGHT
  }

  if (plan.exterior.length > 0) {
    top = drawSectionTitle(page, font, '外観', top)
    for (const [index, photo] of plan.exterior.entries()) {
      const column = index % 2
      const row = Math.floor(index / 2)
      await drawPhoto(
        pdf,
        page,
        photo,
        MARGIN + column * (cellWidth + GAP),
        top - (row + 1) * EXTERIOR_CELL_HEIGHT - row * GAP,
        cellWidth,
        EXTERIOR_CELL_HEIGHT,
      )
    }
    const rows = Math.ceil(plan.exterior.length / 2)
    top -= rows * EXTERIOR_CELL_HEIGHT + (rows - 1) * GAP + GAP
  }

  if (plan.defects.length > 0) {
    top = drawSectionTitle(page, font, '不具合', top)
    await drawDefects(pdf, page, font, plan.defects, top, cellWidth)
  }

  drawFooter(page, font, plan.number, pageCount)
}

function drawHeading(page: PDFPage, font: PDFFont, heading: ReportPage['heading'], top: number) {
  if (heading === null) return

  page.drawText('現調報告書', { x: MARGIN, y: top - 16, size: 16, font, color: BRAND })

  const rows: [string, string][] = [
    ['顧客名', heading.customerName],
    ['物件住所', heading.propertyAddress],
    ['調査日', heading.surveyedOn],
    ['担当者', heading.surveyorName],
  ]

  let y = top - 34
  for (const [label, value] of rows) {
    page.drawText(label, { x: MARGIN, y, size: 8, font, color: MUTED })
    page.drawText(value, { x: MARGIN + 54, y, size: 9.5, font, color: INK })
    y -= 12
  }

  page.drawLine({
    start: { x: MARGIN, y: top - HEADING_HEIGHT + 10 },
    end: { x: A4.width - MARGIN, y: top - HEADING_HEIGHT + 10 },
    thickness: 0.8,
    color: LINE,
  })
}

function drawSectionTitle(page: PDFPage, font: PDFFont, text: string, top: number): number {
  page.drawText(text, { x: MARGIN, y: top - 10, size: 10, font, color: BRAND })
  return top - SECTION_TITLE_HEIGHT
}

/** 不具合を2列で並べる。写真の下にステータスと補足を置く。 */
async function drawDefects(
  pdf: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  entries: DefectEntry[],
  top: number,
  cellWidth: number,
): Promise<void> {
  for (const [index, entry] of entries.entries()) {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = MARGIN + column * (cellWidth + GAP)
    const cellTop = top - row * (DEFECT_PHOTO_HEIGHT + DEFECT_TEXT_HEIGHT + GAP)

    await drawPhoto(pdf, page, entry.photo, x, cellTop - DEFECT_PHOTO_HEIGHT, cellWidth, DEFECT_PHOTO_HEIGHT)

    let textY = cellTop - DEFECT_PHOTO_HEIGHT - 11
    if (entry.statuses.length > 0) {
      page.drawText(entry.statuses.join('　'), { x, y: textY, size: 9, font, color: BRAND })
      textY -= 11
    }
    if (entry.note !== '') {
      // 入りきらない補足は切る。報告書の体裁が崩れるより、続きが載らないほうがまし。
      for (const line of wrap(entry.note, font, 8, cellWidth).slice(0, 2)) {
        page.drawText(line, { x, y: textY, size: 8, font, color: INK })
        textY -= 10
      }
    }
  }
}

/** 写真を、枠の中に縦横の比を保って収める。端は切り落とさない。 */
async function drawPhoto(
  pdf: PDFDocument,
  page: PDFPage,
  photo: Photo,
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
): Promise<void> {
  const image: PDFImage = await pdf.embedJpg(photo.jpeg)
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height)
  const width = image.width * scale
  const height = image.height * scale

  page.drawImage(image, {
    x: x + (boxWidth - width) / 2,
    y: y + (boxHeight - height) / 2,
    width,
    height,
  })
}

function drawFooter(page: PDFPage, font: PDFFont, number: number, pageCount: number): void {
  const text = `${number} / ${pageCount}`
  const width = font.widthOfTextAtSize(text, 8)
  page.drawText(text, {
    x: (A4.width - width) / 2,
    y: MARGIN - 4,
    size: 8,
    font,
    color: MUTED,
  })
}

/** 枠の幅に収まるところで文字を折り返す。日本語は語の切れ目が無いため1字ずつ見る。 */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const character of text) {
    if (character === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const candidate = line + character
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line !== '') {
      lines.push(line)
      line = character
    } else {
      line = candidate
    }
  }
  if (line !== '') lines.push(line)
  return lines
}
