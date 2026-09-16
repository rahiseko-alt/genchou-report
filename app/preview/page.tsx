'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCaseStore } from '@/src/case-store'

export default function PreviewPage() {
  const router = useRouter()
  const { genchouCase } = useCaseStore()

  useEffect(() => {
    if (genchouCase === null) router.replace('/customer')
  }, [genchouCase, router])

  return (
    <main className="screen">
      <h1 className="screenTitle">完成プレビュー</h1>
    </main>
  )
}
