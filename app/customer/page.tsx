'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useCaseStore } from '@/src/case-store'
import {
  type CustomerInfo,
  type CustomerInfoIssue,
  customerInfoReadiness,
  withCustomerInfo,
} from '@/src/domain/genchou-case'
import { rememberSurveyorName } from '@/src/storage/last-surveyor'
import styles from './page.module.css'

/** 「次へ」から押せない理由を指すための目印。 */
const REASON_ID = 'next-blocked-reason'

const ISSUE_MESSAGES: Record<CustomerInfoIssue, string> = {
  customerNameMissing: '顧客名を入れてください',
}

export default function CustomerPage() {
  const router = useRouter()
  const { genchouCase, ready, begin, update } = useCaseStore()

  // 案件は端末の上で始まる。調査日の「今日」も前回の担当者名も端末の中にしか無く、
  // 最初の描画に混ぜると組み立てた日の日付が HTML に焼き付くため。
  // 端末に残っている下書きを読み終えるまでは、新しく始めない。
  useEffect(() => {
    if (ready) begin()
  }, [ready, begin])

  // 始まるまで入力欄を出さないのは、出してしまうと案件が始まる前に打った内容が
  // 消えるため。見出しは先に出るので画面が白くはならない。
  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>顧客情報</h1>
      </main>
    )
  }

  const { customer } = genchouCase
  const readiness = customerInfoReadiness(customer)

  const edit = (patch: Partial<CustomerInfo>) =>
    update((current) => withCustomerInfo(current, patch))

  const goNext = () => {
    if (!readiness.canProceed) return
    rememberSurveyorName(customer.surveyorName)
    router.push('/exterior')
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>顧客情報</h1>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>
            顧客名<span className={styles.required}>必須</span>
          </span>
          <input
            className={styles.input}
            value={customer.customerName}
            onChange={(event) => edit({ customerName: event.target.value })}
            autoComplete="off"
            enterKeyHint="next"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>物件住所</span>
          <input
            className={styles.input}
            value={customer.propertyAddress}
            onChange={(event) => edit({ propertyAddress: event.target.value })}
            autoComplete="off"
            enterKeyHint="next"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>調査日</span>
          <input
            className={styles.input}
            type="date"
            value={customer.surveyedOn}
            onChange={(event) => edit({ surveyedOn: event.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>担当者名</span>
          <input
            className={styles.input}
            value={customer.surveyorName}
            onChange={(event) => edit({ surveyorName: event.target.value })}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>
      </div>

      <div className={styles.foot}>
        {!readiness.canProceed && (
          <p id={REASON_ID} className={styles.reason} role="status">
            {readiness.issues.map((issue) => ISSUE_MESSAGES[issue]).join('　')}
          </p>
        )}
        <button
          type="button"
          className={styles.next}
          onClick={goNext}
          disabled={!readiness.canProceed}
          aria-describedby={readiness.canProceed ? undefined : REASON_ID}
        >
          次へ
        </button>
      </div>
    </main>
  )
}
