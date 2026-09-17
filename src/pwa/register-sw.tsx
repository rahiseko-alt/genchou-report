'use client'

import { useEffect } from 'react'

/**
 * 圏外でも立ち上がるための控えを、端末に覚えさせる。
 *
 * 画面には何も出さない。開発中は登録しない（作りかけの画面が控えに残ると、
 * 直したはずのものが出続けて紛らわしいため）。
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // 登録できなくても、通信があればアプリは動く。
    })
  }, [])

  return null
}
