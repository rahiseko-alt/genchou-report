import { describe, expect, it, vi } from 'vitest'
import {
  type GenchouCase,
  type Photo,
  addDefectPage,
  beginCase,
  withCustomerInfo,
  withDefectPhoto,
  withExteriorPhoto,
} from '@/src/domain'
import { JPEG_QUALITIES } from './budget'
import { estimateUploadBytes, shrinkToBudget } from './shrink'

/** 画質に比例して小さくなる、作り物の写真。canvas を使わずに入れ直しを試す。 */
const bytesFor = (quality: number) => Math.round(1_000_000 * quality)

const photo = (id: string, quality = JPEG_QUALITIES[0]): Photo => ({
  id,
  jpeg: new Uint8Array(bytesFor(quality)) as Uint8Array<ArrayBuffer>,
  quality,
  width: 1600,
  height: 1200,
})

const fakeReencode = vi.fn(async (original: Photo, quality: number) => ({
  ...original,
  jpeg: new Uint8Array(bytesFor(quality)) as Uint8Array<ArrayBuffer>,
  quality,
}))

function sampleCase(defectCount: number): GenchouCase {
  let current = withCustomerInfo(beginCase({ today: '2026-09-16' }), { customerName: '山田' })
  for (let i = 0; i < 4; i += 1) current = withExteriorPhoto(current, i, photo(`e${i}`))
  for (let i = 0; i < defectCount; i += 1) {
    const pageIndex = Math.floor(i / 4)
    if (i % 4 === 0 && pageIndex > 0) current = addDefectPage(current)
    current = withDefectPhoto(current, pageIndex, i % 4, photo(`d${i}`))
  }
  return current
}

describe('送り出す中身の見積もり', () => {
  it('写真の合計より、base64 のぶんだけ大きく見積もる', () => {
    const genchouCase = sampleCase(0)
    const jpegTotal = 4 * bytesFor(JPEG_QUALITIES[0])

    expect(estimateUploadBytes(genchouCase)).toBeGreaterThan(jpegTotal)
    expect(estimateUploadBytes(genchouCase)).toBe(Math.ceil(jpegTotal * 1.34))
  })
})

describe('上限に収まるまで写真を入れ直す', () => {
  it('はじめから収まっていれば、入れ直さない', async () => {
    fakeReencode.mockClear()
    const genchouCase = sampleCase(0)

    const outcome = await shrinkToBudget(genchouCase, {
      budget: 10_000_000,
      reencode: fakeReencode,
    })

    expect(outcome).toEqual({ ok: true, genchouCase })
    expect(fakeReencode).not.toHaveBeenCalled()
  })

  it('超えていれば画質を下げて入れ直し、収まったら止まる', async () => {
    fakeReencode.mockClear()
    // 外観4枚だけ。0.82 では約 4.4MB、0.7 では約 3.75MB、0.58 では約 3.1MB
    const outcome = await shrinkToBudget(sampleCase(0), {
      budget: 3_500_000,
      reencode: fakeReencode,
    })

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(estimateUploadBytes(outcome.genchouCase)).toBeLessThanOrEqual(3_500_000)
    // 0.7 では足りず 0.58 まで下げた
    expect(fakeReencode).toHaveBeenCalledTimes(8)
  })

  it('入れ直した画質が、すべての写真に行き渡る', async () => {
    const outcome = await shrinkToBudget(sampleCase(2), {
      budget: 3_500_000,
      reencode: fakeReencode,
    })

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const qualities = [
      ...outcome.genchouCase.exteriorFrames.map((frame) => frame?.quality),
      ...outcome.genchouCase.defectPages.flat().map((frame) => frame?.photo.quality),
    ].filter((quality) => quality !== undefined)
    expect(new Set(qualities).size).toBe(1)
    expect(qualities[0]).toBeLessThan(JPEG_QUALITIES[0])
  })

  it('下限まで下げても収まらなければ、そのことを知らせる', async () => {
    const outcome = await shrinkToBudget(sampleCase(12), {
      budget: 100_000,
      reencode: fakeReencode,
    })

    expect(outcome).toEqual({ ok: false, reason: 'tooLarge' })
  })

  it('下げ続けて終わらない、ということが無い', async () => {
    fakeReencode.mockClear()

    await shrinkToBudget(sampleCase(12), { budget: 1, reencode: fakeReencode })

    // 写真16枚 × 下げられる段数（4段）が上限
    expect(fakeReencode.mock.calls.length).toBeLessThanOrEqual(16 * (JPEG_QUALITIES.length - 1))
  })

  it('元の案件は変わらない', async () => {
    const genchouCase = sampleCase(0)
    const before = genchouCase.exteriorFrames[0]?.quality

    await shrinkToBudget(genchouCase, { budget: 3_500_000, reencode: fakeReencode })

    expect(genchouCase.exteriorFrames[0]?.quality).toBe(before)
  })
})
