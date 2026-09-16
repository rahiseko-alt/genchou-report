import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '../../app/manifest'

describe('ホーム画面に追加したときの見え方', () => {
  const m = manifest()

  it('アイコンの名前が現調報告書だと分かる', () => {
    expect(m.name).toBe('現調報告書')
    expect(m.short_name).toBe('現調報告')
  })

  it('アイコンから開くとトップページが全画面で立ち上がる', () => {
    expect(m.start_url).toBe('/')
    expect(m.display).toBe('standalone')
  })

  it('並べたアイコンの画像が実在する', () => {
    expect(m.icons?.length).toBeGreaterThan(0)
    for (const icon of m.icons ?? []) {
      expect(existsSync(join(process.cwd(), 'public', icon.src!))).toBe(true)
    }
  })
})
