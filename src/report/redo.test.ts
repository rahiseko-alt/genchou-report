import { describe, expect, it } from 'vitest'
import {
  type GenchouCase,
  type Photo,
  addDefectPage,
  beginCase,
  withCustomerInfo,
  withDefectPhoto,
  withExteriorPhoto,
} from '@/src/domain'
import { redoTargets } from './redo'

const photo = (id: string): Photo => ({
  id,
  jpeg: new TextEncoder().encode(id),
  quality: 0.82,
  width: 1600,
  height: 1200,
})

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

describe('やり直しの行き先', () => {
  it('顧客情報と外観がつねに並ぶ', () => {
    const targets = redoTargets(sampleCase(4))

    expect(targets[0]).toMatchObject({ title: '顧客情報', href: '/customer' })
    expect(targets[1]).toMatchObject({ title: '外観写真', href: '/exterior' })
  })

  it('不具合ページの数だけ行き先が並ぶ', () => {
    expect(redoTargets(sampleCase(4))).toHaveLength(3)
    expect(redoTargets(sampleCase(5))).toHaveLength(4)
    expect(redoTargets(sampleCase(9))).toHaveLength(5)
  })

  it('不具合ページは何ページ目かが分かる', () => {
    const targets = redoTargets(sampleCase(5))

    expect(targets[2]).toMatchObject({ title: '不具合写真 1ページ目', href: '/defects?page=1' })
    expect(targets[3]).toMatchObject({ title: '不具合写真 2ページ目', href: '/defects?page=2' })
  })

  it('顧客情報には顧客名が添えられる', () => {
    expect(redoTargets(sampleCase(4))[0].summary).toBe('山田')
  })

  it('顧客名が空なら、その旨が添えられる', () => {
    const empty = withCustomerInfo(sampleCase(4), { customerName: '' })

    expect(redoTargets(empty)[0].summary).toBe('未入力')
  })

  it('外観には枚数が添えられる', () => {
    expect(redoTargets(sampleCase(4))[1].summary).toBe('4 枚')
  })

  it('不具合ページには、そのページの枚数が添えられる', () => {
    const targets = redoTargets(sampleCase(6))

    expect(targets[2].summary).toBe('4 枚')
    expect(targets[3].summary).toBe('2 枚')
  })
})
