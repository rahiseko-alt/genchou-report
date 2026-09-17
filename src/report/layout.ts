import type { CustomerInfo, DefectEntry, GenchouCase, Photo } from '@/src/domain'

/**
 * 現調報告書の割り付け。どのページに何がどの順で載るかを決める。
 *
 * **完成プレビュー（HTML）と PDF は、どちらもここが返した割り付けを読む。**
 * 見せ方は別々でも、ページ数と並び順は必ず一致する（docs/adr/0002）。
 *
 * 純粋な計算だけを置く。画像の描画にも PDF の組み立てにも触れない。
 */

/** 1ページ目の上部に載せる顧客情報。2ページ目以降は null。 */
export type ReportHeading = CustomerInfo

/** 外観写真1枚と、その枠の見出し。 */
export type ExteriorItem = { photo: Photo; label: string }

export type ReportPage = {
  /** 1 から数えたページ番号。 */
  number: number
  heading: ReportHeading | null
  /** 1ページ目だけが持つ。2ページ目以降は空。 */
  exterior: ExteriorItem[]
  defects: DefectEntry[]
}

export type ReportPlan = {
  pages: ReportPage[]
  pageCount: number
}

/** 1ページに載る不具合写真の数。 */
export const DEFECTS_PER_REPORT_PAGE = 4

export function planReport(genchouCase: GenchouCase): ReportPlan {
  const exterior = genchouCase.exteriorFrames
    .map((photo, index) => ({ photo, label: genchouCase.exteriorLabels[index] }))
    .filter((item): item is ExteriorItem => item.photo !== null)
  // 入れた枠の順のまま、ページをまたいで1本に並べ直す。埋まっていない枠は飛ばす。
  const defects = genchouCase.defectPages.flatMap((page) =>
    page.filter((frame) => frame !== null),
  )

  const chunks: DefectEntry[][] = []
  for (let start = 0; start < defects.length; start += DEFECTS_PER_REPORT_PAGE) {
    chunks.push(defects.slice(start, start + DEFECTS_PER_REPORT_PAGE))
  }
  // 不具合が1枚も無くても、顧客情報と外観だけの1ページは出す。
  if (chunks.length === 0) chunks.push([])

  const pages = chunks.map((defectsOnPage, index) => ({
    number: index + 1,
    heading: index === 0 ? genchouCase.customer : null,
    exterior: index === 0 ? exterior : [],
    defects: defectsOnPage,
  }))

  return { pages, pageCount: pages.length }
}
