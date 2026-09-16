'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  type CustomerInfo,
  type CustomerInfoIssue,
  checkCustomerInfo,
  startCase,
  withCustomerInfo,
} from '@/src/domain/genchou-case'
import { readLastSurveyorName, rememberSurveyorName } from '@/src/storage/last-surveyor'
import { today } from '@/src/today'
import styles from './page.module.css'

const ISSUE_MESSAGES: Record<CustomerInfoIssue, string> = {
  customerNameMissing: '顧客名を入れてください',
}

export default function CustomerPage() {
  const router = useRouter()
  const [genchouCase, setGenchouCase] = useState(() => startCase({ today: today() }))

  // 前回の担当者名は端末の中にある。サーバー側の描画では読めないため、開いた後に入れる。
  useEffect(() => {
    const lastSurveyorName = readLastSurveyorName()
    if (lastSurveyorName === '') return
    setGenchouCase((current) => withCustomerInfo(current, { surveyorName: lastSurveyorName }))
  }, [])

  const { customer } = genchouCase
  const check = checkCustomerInfo(customer)

  const update = (patch: Partial<CustomerInfo>) =>
    setGenchouCase((current) => withCustomerInfo(current, patch))

  const goNext = () => {
    if (!check.canProceed) return
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
        {!check.canProceed && (
          <p className={styles.reason} role="status">
            {check.issues.map((issue) => ISSUE_MESSAGES[issue]).join('　')}
          </p>
        )}
        <button
          type="button"
          className={styles.next}
          onClick={goNext}
          disabled={!check.canProceed}
        >
          次へ
        </button>
      </div>
    </main>
  )
}
