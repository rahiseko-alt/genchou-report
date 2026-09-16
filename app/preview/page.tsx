'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCaseStore } from '@/src/case-store'
import { finishReadiness } from '@/src/domain'
import { planReport } from '@/src/report/layout'
import { ReportPageView } from './ReportPageView'
import styles from './page.module.css'

export default function PreviewPage() {
  const router = useRouter()
  const { genchouCase } = useCaseStore()

  // 案件が無い、または不具合が1枚も無いまま開かれたら、手前の画面へ戻す。
  useEffect(() => {
    if (genchouCase === null) router.replace('/customer')
    else if (!finishReadiness(genchouCase).canProceed) router.replace('/defects')
  }, [genchouCase, router])

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>完成プレビュー</h1>
      </main>
    )
  }

  const plan = planReport(genchouCase)

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>完成プレビュー</h1>
        <p className={styles.pageCount}>全 {plan.pageCount} ページ</p>
      </header>

      <div className={styles.sheets}>
        {plan.pages.map((page) => (
          <ReportPageView key={page.number} page={page} pageCount={plan.pageCount} />
        ))}
      </div>
    </main>
  )
}
