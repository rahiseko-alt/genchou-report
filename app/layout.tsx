import type { Metadata, Viewport } from 'next'
import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from '@/src/branding'
import './globals.css'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: BRAND_COLOR,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
