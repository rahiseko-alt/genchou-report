import { describe, expect, it } from 'vitest'
import { fitWithin } from './scale'

describe('縮小後の大きさ', () => {
  it('横長の写真は幅が長辺に収まる', () => {
    expect(fitWithin({ width: 4032, height: 3024 }, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('縦長の写真は高さが長辺に収まる', () => {
    expect(fitWithin({ width: 3024, height: 4032 }, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('正方形はどちらも長辺に揃う', () => {
    expect(fitWithin({ width: 2000, height: 2000 }, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('もともと小さい写真は引き伸ばさない', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('ちょうど長辺の写真はそのまま', () => {
    expect(fitWithin({ width: 1600, height: 900 }, 1600)).toEqual({ width: 1600, height: 900 })
  })

  it('縮めても1px を下回らない', () => {
    expect(fitWithin({ width: 10000, height: 3 }, 1600)).toEqual({ width: 1600, height: 1 })
  })
})
