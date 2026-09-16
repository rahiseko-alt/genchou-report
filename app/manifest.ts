import type { MetadataRoute } from 'next'

/**
 * ホーム画面に追加したときの見え方。`/manifest.webmanifest` として配信される。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '現調報告書',
    short_name: '現調報告',
    description: 'リフォームの現地調査から報告書の送付までを、その場で終える',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f5f7',
    theme_color: '#1f3a5f',
    lang: 'ja',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
