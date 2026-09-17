import type { MetadataRoute } from 'next'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BACKGROUND_COLOR,
  BRAND_COLOR,
} from '@/src/branding'

/**
 * ホーム画面に追加したときの見え方。`/manifest.webmanifest` として配信される。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND_COLOR,
    theme_color: BRAND_COLOR,
    lang: 'ja',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
