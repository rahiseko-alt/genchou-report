import { describe, expect, it } from 'vitest'
import { today } from './today'

describe('今日の日付', () => {
  it('YYYY-MM-DD で返す', () => {
    expect(today(new Date(2026, 8, 16, 12, 0, 0))).toBe('2026-09-16')
  })

  it('月と日が1桁でも0で埋める', () => {
    expect(today(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })

  it('深夜でも端末の暦の日付になる（UTC へ寄せて前日に戻らない）', () => {
    // 日本時間の午前1時。UTC では前日の16時にあたる。
    expect(today(new Date(2026, 8, 16, 1, 0, 0))).toBe('2026-09-16')
  })
})
