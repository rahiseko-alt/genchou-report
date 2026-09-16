'use client'

import { useRouter } from 'next/navigation'
import { useCaseStore } from '@/src/case-store'
import { resumeHref } from '@/src/resume'
import styles from './page.module.css'

export default function TopPage() {
  const router = useRouter()
  const { genchouCase, ready, beginFresh } = useCaseStore()

  // 端末に残っている下書きを読み終えるまで、どちらを出すか決められない。
  const hasDraft = ready && genchouCase !== null

  const startFresh = () => {
    beginFresh()
    router.push('/customer')
  }

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>現調報告書</h1>
        <p className={styles.lead}>
          写真を撮って、状態を選ぶだけ。
          <br />
          報告書はその場で出来上がります。
        </p>
      </div>

      {hasDraft ? (
        <div className={styles.choices}>
          <p className={styles.draftNote}>
            {genchouCase.customer.customerName === ''
              ? '作りかけの報告書があります'
              : `作りかけの報告書があります（${genchouCase.customer.customerName} 様）`}
          </p>
          <button
            type="button"
            className={styles.resume}
            onClick={() => router.push(resumeHref(genchouCase))}
          >
            続きから
          </button>
          <button
            type="button"
            className={styles.fresh}
            onClick={() => {
              if (window.confirm('作りかけの報告書を捨てて、新しく始めますか。')) startFresh()
            }}
          >
            新しく始める
          </button>
        </div>
      ) : (
        <button type="button" className={styles.start} onClick={startFresh}>
          スタート
        </button>
      )}
    </main>
  )
}
