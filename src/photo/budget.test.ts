import { describe, expect, it } from 'vitest'
import { JPEG_QUALITIES, type JpegQuality, nextQuality, planEncoding } from './budget'

describe('画質の下げ方', () => {
  it('最初は一番良い画質から始める', () => {
    expect(JPEG_QUALITIES[0]).toBe(0.82)
  })

  it('段階的に下がる', () => {
    expect(nextQuality(0.82)).toBeLessThan(0.82)
    expect(nextQuality(0.7)).toBeLessThan(0.7)
  })

  it('下限まで来たら、それ以上は下がらない', () => {
    const lowest = JPEG_QUALITIES[JPEG_QUALITIES.length - 1]

    expect(nextQuality(lowest)).toBeNull()
  })
})

describe('容量に収まるかの見立て', () => {
  const budget = 3_500_000

  it('予算内なら、そのまま送れると判断する', () => {
    expect(planEncoding({ totalBytes: 1_000_000, quality: 0.82, budget })).toEqual({
      verdict: 'fits',
    })
  })

  it('ちょうど予算なら、そのまま送れる', () => {
    expect(planEncoding({ totalBytes: budget, quality: 0.82, budget })).toEqual({ verdict: 'fits' })
  })

  it('超えていれば、次の画質で入れ直すよう促す', () => {
    const plan = planEncoding({ totalBytes: 5_000_000, quality: 0.82, budget })

    expect(plan.verdict).toBe('retry')
    expect(plan).toMatchObject({ quality: nextQuality(0.82) })
  })

  it('下限の画質でも超えていれば、諦めて知らせる', () => {
    const lowest = JPEG_QUALITIES[JPEG_QUALITIES.length - 1]

    expect(planEncoding({ totalBytes: 9_000_000, quality: lowest, budget })).toEqual({
      verdict: 'tooLarge',
    })
  })

  it('画質を下げるたびに、前より低い画質を指す', () => {
    let quality: JpegQuality = JPEG_QUALITIES[0]
    const seen: JpegQuality[] = [quality]
    for (;;) {
      const plan = planEncoding({ totalBytes: 99_000_000, quality, budget })
      if (plan.verdict !== 'retry') break
      expect(plan.quality).toBeLessThan(quality)
      quality = plan.quality
      seen.push(quality)
      // 下がり続けて終わらない、ということが無いこと
      expect(seen.length).toBeLessThanOrEqual(JPEG_QUALITIES.length)
    }
    expect(seen.length).toBe(JPEG_QUALITIES.length)
  })
})
