'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  type CustomerInfo,
  type CustomerInfoIssue,
  type GenchouCase,
  beginCase,
  customerInfoReadiness,
  withCustomerInfo,
} from '@/src/domain/genchou-case'
import { recallSurveyorName, rememberSurveyorName } from '@/src/storage/last-surveyor'
import { today } from '@/src/today'
import styles from './page.module.css'

/** 「次へ」から押せない理由を指すための目印。 */
const REASON_ID = 'next-blocked-reason'

const ISSUE_MESSAGES: Record<CustomerInfoIssue, string> = {
  customerNameMissing: '顧客名を入れてください',
}

export default function CustomerPage() {
  const router = useRouter()

  // 調査日も前回の担当者名も、開いた端末の中にしか無い。最初の描画に混ぜると、
  // 組み立てた日の日付が HTML に焼き付き、配置したあと何日経ってもその日付が出る。
  // そのため案件は端末の上で始める。
  //
  // 始まるまで入力欄を出さないのは、出してしまうと読み込みの前に打った内容が
  // 案件の作り直しで消えるため。見出しは先に出るので画面が白くはならない。
  //
  // Next.js の手引き（preventing-flash-before-hydration）は、先に描いてから
  // スクリプトで書き換える方法を薦めている。ここで採らないのは、これが利用者の
  // 編集する入力欄であり、値は React が持つ必要があるため。
  const [genchouCase, setGenchouCase] = useState<GenchouCase | null>(null)

  useEffect(() => {
    setGenchouCase(beginCase({ today: today(), lastSurveyorName: recallSurveyorName() }))
  }, [])

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>顧客情報</h1>
      </main>
    )
  }

  const { customer } = genchouCase
  const readiness = customerInfoReadiness(customer)

  const update = (patch: Partial<CustomerInfo>) =>
    setGenchouCase((current) => (current === null ? current : withCustomerInfo(current, patch)))

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
            onChange={(event) => update({ customerName: event.target.value })}
            autoComplete="off"
            enterKeyHint="next"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>物件住所</span>
          <input
            className={styles.input}
            value={customer.propertyAddress}
            onChange={(event) => update({ propertyAddress: event.target.value })}
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
            onChange={(event) => update({ surveyedOn: event.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>担当者名</span>
          <input
            className={styles.input}
            value={customer.surveyorName}
            onChange={(event) => update({ surveyorName: event.target.value })}
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
