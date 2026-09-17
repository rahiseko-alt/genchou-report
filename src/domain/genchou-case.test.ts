import { describe, expect, it } from 'vitest'
import { beginCase, customerInfoReadiness, withCustomerInfo } from './genchou-case'

describe('案件を始めたときの顧客情報', () => {
  it('調査日に今日の日付が入っている', () => {
    const started = beginCase({ today: '2026-09-16' })

    expect(started.customer.surveyedOn).toBe('2026-09-16')
  })

  it('担当者名に前回の担当者が入っている', () => {
    const started = beginCase({ today: '2026-09-16', lastSurveyorName: '田中' })

    expect(started.customer.surveyorName).toBe('田中')
  })

  it('前回の担当者が分からないときは空で始まる', () => {
    const started = beginCase({ today: '2026-09-16' })

    expect(started.customer.surveyorName).toBe('')
  })

  it('顧客名と物件住所は空で始まる', () => {
    const started = beginCase({ today: '2026-09-16' })

    expect(started.customer.customerName).toBe('')
    expect(started.customer.propertyAddress).toBe('')
  })
})

describe('顧客情報の画面から次へ進めるか', () => {
  const started = beginCase({ today: '2026-09-16' })

  it('顧客名が空のままでは進めない', () => {
    const check = customerInfoReadiness(started.customer)

    expect(check.canProceed).toBe(false)
    expect(check).toMatchObject({ issues: ['customerNameMissing'] })
  })

  it('顧客名が空白だけでも進めない', () => {
    const filled = withCustomerInfo(started, { customerName: '　 ' })

    expect(customerInfoReadiness(filled.customer).canProceed).toBe(false)
  })

  it('顧客名を入れれば進める', () => {
    const filled = withCustomerInfo(started, { customerName: '山田' })

    expect(customerInfoReadiness(filled.customer).canProceed).toBe(true)
  })

  it('物件住所が空でも進める', () => {
    const filled = withCustomerInfo(started, { customerName: '山田', propertyAddress: '' })

    expect(customerInfoReadiness(filled.customer).canProceed).toBe(true)
  })

  it('担当者名が空でも進める', () => {
    const filled = withCustomerInfo(started, { customerName: '山田', surveyorName: '' })

    expect(customerInfoReadiness(filled.customer).canProceed).toBe(true)
  })
})

describe('顧客情報の書き換え', () => {
  it('書き換えても元の案件は変わらない', () => {
    const started = beginCase({ today: '2026-09-16' })

    withCustomerInfo(started, { customerName: '山田' })

    expect(started.customer.customerName).toBe('')
  })

  it('指定していない項目はそのまま残る', () => {
    const started = beginCase({ today: '2026-09-16', lastSurveyorName: '田中' })

    const filled = withCustomerInfo(started, { customerName: '山田' })

    expect(filled.customer.surveyorName).toBe('田中')
    expect(filled.customer.surveyedOn).toBe('2026-09-16')
  })
})

describe('担当者名の引き継ぎ', () => {
  it('前回の担当者が空白だけなら空として始まる', () => {
    const started = beginCase({ today: '2026-09-16', lastSurveyorName: '' })

    expect(started.customer.surveyorName).toBe('')
  })
})
