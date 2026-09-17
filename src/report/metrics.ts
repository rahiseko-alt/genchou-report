/**
 * 報告書の寸法。**PDF と完成プレビューが、どちらもここを読む。**
 *
 * 片方だけに数字を書くと、プレビューと出来上がりがずれる。
 * 単位は pt（A4 縦 595.28 × 841.89pt）。
 */
export const A4 = { width: 595.28, height: 841.89 } as const

export const REPORT_METRICS = {
  margin: 32,
  gap: 10,
  footerHeight: 24,
  /** 1ページ目の顧客情報の帯。 */
  headingHeight: 85,
  sectionTitleHeight: 18,
  /** 外観は不具合より小さい。報告書の中身は不具合のほうだから。 */
  exteriorCellHeight: 103,
  /** 外観写真の下に置く見出し（正面・右・左・裏）のぶん。 */
  exteriorLabelHeight: 12,
  defectPhotoHeight: 150,
  /** 不具合写真の下に置くステータスと補足のぶん。 */
  defectTextHeight: 32,
} as const

/** 用紙の内側の幅。写真の枠はここを2列に割る。 */
export const CONTENT_WIDTH = A4.width - REPORT_METRICS.margin * 2

/** 写真1枚ぶんの幅。 */
export const CELL_WIDTH = (CONTENT_WIDTH - REPORT_METRICS.gap) / 2

/**
 * 上の寸法を、用紙の内側の幅を 100 としたときの割合に直す。
 *
 * 完成プレビューは HTML なので、用紙の幅が端末によって変わる。
 * 割合で渡しておけば、縮めても割り付けが崩れない。
 */
export function metricsAsPercentOfContentWidth(): Record<string, number> {
  const asPercent = (value: number) => Math.round((value / CONTENT_WIDTH) * 10000) / 100

  return {
    gap: asPercent(REPORT_METRICS.gap),
    footerHeight: asPercent(REPORT_METRICS.footerHeight),
    headingHeight: asPercent(REPORT_METRICS.headingHeight),
    sectionTitleHeight: asPercent(REPORT_METRICS.sectionTitleHeight),
    exteriorCellHeight: asPercent(REPORT_METRICS.exteriorCellHeight),
    exteriorLabelHeight: asPercent(REPORT_METRICS.exteriorLabelHeight),
    defectPhotoHeight: asPercent(REPORT_METRICS.defectPhotoHeight),
    defectTextHeight: asPercent(REPORT_METRICS.defectTextHeight),
  }
}
