'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCaseStore } from '@/src/case-store'
import { finishReadiness } from '@/src/domain'
import { shrinkToBudget } from '@/src/photo/shrink'
import { planReport } from '@/src/report/layout'
import { type SendState, sendCase } from '@/src/send-case'
import { RedoList } from './RedoList'
import { ReportPageView } from './ReportPageView'
import { SentScreen } from './SentScreen'
import styles from './page.module.css'

export default function PreviewPage() {
  const router = useRouter()
  const { genchouCase, ready, update, discard } = useCaseStore()
  const [state, setState] = useState<SendState>('idle')
  const [failure, setFailure] = useState('')

  // 案件が無い、または不具合が1枚も無いまま開かれたら、手前の画面へ戻す。
  // 送り終えた後は案件を捨てるので、そのときは戻さない。
  useEffect(() => {
    if (!ready || state === 'sent') return
    if (genchouCase === null) router.replace('/customer')
    else if (!finishReadiness(genchouCase).canProceed) router.replace('/defects')
  }, [ready, genchouCase, router, state])

  if (state === 'sent') return <SentScreen onRestart={() => router.push('/')} />

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>完成プレビュー</h1>
      </main>
    )
  }

  const plan = planReport(genchouCase)

  const send = async () => {
    setFailure('')

    // 送る前に、通信に収まる大きさまで自動で落とす。担当者は何も設定しない。
    setState('shrinking')
    const shrunk = await shrinkToBudget(genchouCase)
    if (!shrunk.ok) {
      setState('failed')
      setFailure('写真が多すぎて、この報告書は送れません。枚数を減らしてお試しください')
      return
    }
    // 落とした結果を案件に残す。再送のたびに落とし直さずに済む。
    update(() => shrunk.genchouCase)

    setState('sending')
    const result = await sendCase(shrunk.genchouCase)
    if (result.ok) {
      setState('sent')
      // 送り終えた案件は、その場で手放す。端末に残った下書きもここで消える。
      discard()
    } else {
      setState('failed')
      setFailure(result.message)
    }
  }

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

      <div className={styles.foot}>
        <RedoList genchouCase={genchouCase} onPick={(href) => router.push(href)} />

        {state === 'failed' && (
          <p className={styles.failure} role="status">
            {failure}
          </p>
        )}

        <button
          type="button"
          className={styles.send}
          onClick={() => void send()}
          disabled={state === 'shrinking' || state === 'sending'}
        >
          {state === 'shrinking'
            ? '写真を軽くしています…'
            : state === 'sending'
              ? '送っています…'
              : state === 'failed'
                ? '再送する'
                : '完了（会社へ送る）'}
        </button>

        {state === 'failed' && (
          <button
            type="button"
            className={styles.later}
            onClick={() => router.push('/defects')}
          >
            あとで送る
          </button>
        )}
      </div>
    </main>
  )
}
