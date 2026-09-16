import { describe, expect, it } from 'vitest'
import manifest from '../../app/manifest'

describe('ホーム画面に追加したときの見え方', () => {
  const homeScreen = manifest()

  it('アイコンの名前が現調報告書だと分かる', () => {
    expect(homeScreen.name).toBe('現調報告書')
    expect(homeScreen.short_name).toBe('現調報告')
  })

  it('アイコンから開くとトップページが全画面で立ち上がる', () => {
    expect(homeScreen.start_url).toBe('/')
    expect(homeScreen.display).toBe('standalone')
  })

  it('大小と切り抜き用のアイコンが揃っている', () => {
    const sizes = homeScreen.icons?.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(homeScreen.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })
})
