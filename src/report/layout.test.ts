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
import { planReport } from './layout'

const photo = (id: string): Photo => ({
  id,
  jpeg: new TextEncoder().encode(id),
  width: 1600,
  height: 1200,
})

/** 顧客情報と外観4枚を入れ、不具合を指定した枚数だけ入れた案件を作る。 */
function caseWithDefects(count: number): GenchouCase {
  let current = withCustomerInfo(beginCase({ today: '2026-09-16' }), {
    customerName: '山田',
    propertyAddress: '東京都',
    surveyorName: '鈴木',
  })
  for (let i = 0; i < 4; i += 1) current = withExteriorPhoto(current, i, photo(`e${i}`))

  for (let i = 0; i < count; i += 1) {
    const pageIndex = Math.floor(i / 4)
    const frameIndex = i % 4
    if (frameIndex === 0 && pageIndex > 0) current = addDefectPage(current)
    current = withDefectPhoto(current, pageIndex, frameIndex, photo(`d${i}`))
  }
  return current
}

describe('報告書の割り付け', () => {
  it('1ページ目に顧客情報が載る', () => {
    const plan = planReport(caseWithDefects(4))

    expect(plan.pages[0].heading).toEqual({
      customerName: '山田',
      propertyAddress: '東京都',
      surveyedOn: '2026-09-16',
      surveyorName: '鈴木',
    })
  })

  it('2ページ目以降に顧客情報は載らない', () => {
    const plan = planReport(caseWithDefects(8))

    expect(plan.pages[1].heading).toBeNull()
  })

  it('1ページ目は外観4枚と不具合4枚', () => {
    const plan = planReport(caseWithDefects(4))

    expect(plan.pages[0].exterior).toHaveLength(4)
    expect(plan.pages[0].defects).toHaveLength(4)
  })

  it('不具合4枚なら1ページ', () => {
    expect(planReport(caseWithDefects(4)).pages).toHaveLength(1)
  })

  it('不具合5枚なら2ページ', () => {
    expect(planReport(caseWithDefects(5)).pages).toHaveLength(2)
  })

  it('不具合8枚なら2ページ', () => {
    expect(planReport(caseWithDefects(8)).pages).toHaveLength(2)
  })

  it('不具合9枚なら3ページ', () => {
    expect(planReport(caseWithDefects(9)).pages).toHaveLength(3)
  })

  it('2ページ目以降に外観は載らない', () => {
    const plan = planReport(caseWithDefects(8))

    expect(plan.pages[1].exterior).toHaveLength(0)
    expect(plan.pages[1].defects).toHaveLength(4)
  })

  it('不具合が1枚でも1ページ出る', () => {
    const plan = planReport(caseWithDefects(1))

    expect(plan.pages).toHaveLength(1)
    expect(plan.pages[0].defects).toHaveLength(1)
  })

  it('埋まっていない枠は載らず、ページ数も増えない', () => {
    // 1ページ目に2枚だけ、2ページ目を足して1枚
    let current = caseWithDefects(4)
    current = addDefectPage(current)
    current = withDefectPhoto(current, 1, 2, photo('later'))

    const plan = planReport(current)

    expect(plan.pages).toHaveLength(2)
    expect(plan.pages[1].defects).toHaveLength(1)
  })

  it('不具合の並び順が、入れた枠の順のまま保たれる', () => {
    const plan = planReport(caseWithDefects(6))

    const ids = plan.pages.flatMap((page) => page.defects.map((entry) => entry.photo.id))
    expect(ids).toEqual(['d0', 'd1', 'd2', 'd3', 'd4', 'd5'])
  })

  it('外観の並び順が、枠の順のまま保たれる', () => {
    const plan = planReport(caseWithDefects(4))

    expect(plan.pages[0].exterior.map((each) => each.id)).toEqual(['e0', 'e1', 'e2', 'e3'])
  })

  it('ステータスと補足が写真に付いたまま運ばれる', () => {
    let current = caseWithDefects(1)
    current = toggleDefectStatus(current, 0, 0, 'A')
    current = toggleDefectStatus(current, 0, 0, 'C')
    current = withDefectNote(current, 0, 0, '雨漏りの跡')

    const entry = planReport(current).pages[0].defects[0]

    expect(entry.statuses).toEqual(['A', 'C'])
    expect(entry.note).toBe('雨漏りの跡')
  })

  it('総ページ数を持つ', () => {
    expect(planReport(caseWithDefects(9)).pageCount).toBe(3)
  })
})
