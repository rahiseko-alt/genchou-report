'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCaseStore } from '@/src/case-store'
import { finishReadiness } from '@/src/domain'
import { UPLOAD_BUDGET_BYTES } from '@/src/photo/budget'
import { planReport } from '@/src/report/layout'
import { type SendState, estimateUploadBytes, sendCase } from '@/src/send-case'
import { ReportPageView } from './ReportPageView'
import styles from './page.module.css'

export default function PreviewPage() {
  const router = useRouter()
  const { genchouCase, ready, discard } = useCaseStore()
  const [state, setState] = useState<SendState>('idle')
  const [failure, setFailure] = useState('')

  // 案件が無い、または不具合が1枚も無いまま開かれたら、手前の画面へ戻す。
  // 送り終えた後は案件を捨てるので、そのときは戻さない。
  useEffect(() => {
    if (!ready || state === 'sent') return
    if (genchouCase === null) router.replace('/customer')
    else if (!finishReadiness(genchouCase).canProceed) router.replace('/defects')
  }, [ready, genchouCase, router, state])

  if (state === 'sent') {
    return (
      <main className={styles.done}>
        <p className={styles.doneMark} aria-hidden="true" />
        <h1 className={styles.doneTitle}>送りました</h1>
        <p className={styles.doneText}>会社あてにメールが届いています。</p>
        <button type="button" className={styles.send} onClick={() => router.push('/')}>
          最初の画面へ
        </button>
      </main>
    )
  }

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>完成プレビュー</h1>
      </main>
    )
  }

  const plan = planReport(genchouCase)
  const tooLarge = estimateUploadBytes(genchouCase) > UPLOAD_BUDGET_BYTES

  const send = async () => {
    setState('sending')
    setFailure('')
    const result = await sendCase(genchouCase)
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
        {state === 'failed' && (
          <p className={styles.failure} role="status">
            {failure}
          </p>
        )}

        {tooLarge && state !== 'failed' && (
          <p className={styles.failure} role="status">
            写真が重く、このままでは送れないおそれがあります
          </p>
        )}

        <button type="button" className={styles.send} onClick={() => void send()} disabled={state === 'sending'}>
          {state === 'sending' ? '送っています…' : state === 'failed' ? '再送する' : '完了（会社へ送る）'}
        </button>

        {state === 'failed' && (
          <button
            type="button"
            className={styles.later}
            onClick={() => router.push('/defects')}
            disabled={false}
          >
            あとで送る
          </button>
        )}
      </div>
    </main>
  )
}
