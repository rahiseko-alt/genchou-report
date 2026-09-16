import { describe, expect, it } from 'vitest'
import {
  type GenchouCase,
  type Photo,
  beginCase,
  withCustomerInfo,
  withDefectPhoto,
  withExteriorPhoto,
} from '@/src/domain'
import { resumeHref } from './resume'

const photo = (id: string): Photo => ({
  id,
  jpeg: new TextEncoder().encode(id) as Uint8Array<ArrayBuffer>,
  quality: 0.82,
  width: 1600,
  height: 1200,
})

const started = beginCase({ today: '2026-09-16' })

function withExterior(genchouCase: GenchouCase, count: number): GenchouCase {
  let current = genchouCase
  for (let i = 0; i < count; i += 1) current = withExteriorPhoto(current, i, photo(`e${i}`))
  return current
}

describe('続きから開く先', () => {
  it('顧客名がまだなら、顧客情報へ', () => {
    expect(resumeHref(started)).toBe('/customer')
  })

  it('顧客名だけ入っていれば、外観へ', () => {
    expect(resumeHref(withCustomerInfo(started, { customerName: '山田' }))).toBe('/exterior')
  })

  it('外観が途中なら、外観へ', () => {
    const current = withExterior(withCustomerInfo(started, { customerName: '山田' }), 3)

    expect(resumeHref(current)).toBe('/exterior')
  })

  it('外観が揃っていて不具合がまだなら、不具合へ', () => {
    const current = withExterior(withCustomerInfo(started, { customerName: '山田' }), 4)

    expect(resumeHref(current)).toBe('/defects')
  })

  it('不具合まで入っていれば、完成プレビューへ', () => {
    let current = withExterior(withCustomerInfo(started, { customerName: '山田' }), 4)
    current = withDefectPhoto(current, 0, 0, photo('d0'))

    expect(resumeHref(current)).toBe('/preview')
  })
})
