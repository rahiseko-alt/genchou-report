import { describe, expect, it } from 'vitest'
import {
  A4,
  CELL_WIDTH,
  CONTENT_WIDTH,
  REPORT_METRICS,
  metricsAsPercentOfContentWidth,
} from './metrics'

describe('報告書の寸法', () => {
  it('1ページ目の中身が、用紙の高さに収まる', () => {
    const m = REPORT_METRICS
    const used =
      m.margin * 2 +
      m.headingHeight +
      m.sectionTitleHeight +
      m.exteriorCellHeight * 2 +
      m.gap + // 外観2行の隙間
      m.gap + // 外観と不具合の間
      m.sectionTitleHeight +
      (m.defectPhotoHeight + m.defectTextHeight) * 2 +
      m.gap + // 不具合2行の隙間
      m.footerHeight

    expect(used).toBeLessThanOrEqual(A4.height)
  })

  it('写真2枚と隙間で、用紙の内側の幅がちょうど埋まる', () => {
    expect(CELL_WIDTH * 2 + REPORT_METRICS.gap).toBeCloseTo(CONTENT_WIDTH, 6)
  })

  it('割合に直しても、同じ配分になっている', () => {
    const percent = metricsAsPercentOfContentWidth()

    expect(percent.defectPhotoHeight / percent.exteriorCellHeight).toBeCloseTo(
      REPORT_METRICS.defectPhotoHeight / REPORT_METRICS.exteriorCellHeight,
      2,
    )
  })

  it('外観は不具合より小さい', () => {
    expect(REPORT_METRICS.exteriorCellHeight).toBeLessThan(REPORT_METRICS.defectPhotoHeight)
  })
})
