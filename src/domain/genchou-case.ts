/**
 * 案件の状態と、それを進める操作。
 *
 * 純粋な TypeScript とする。DOM・ブラウザの API・ネットワーク・ファイルの
 * いずれにも依存させない。検証のルールはこのモジュールだけが持つ。
 */

/** 案件の冒頭で記録する4項目。 */
export type CustomerInfo = {
  customerName: string
  propertyAddress: string
  /** 調査日。`YYYY-MM-DD` */
  surveyedOn: string
  surveyorName: string
}

/** 1件の現調と、そこから生まれる1通の現調報告書をひとまとめにした単位。 */
export type GenchouCase = {
  customer: CustomerInfo
}

export function startCase({
  today,
  lastSurveyorName = '',
}: {
  today: string
  /** 前回の案件で入力された担当者名。毎回打ち直さずに済ませるため引き継ぐ。 */
  lastSurveyorName?: string
}): GenchouCase {
  return {
    customer: {
      customerName: '',
      propertyAddress: '',
      surveyedOn: today,
      surveyorName: lastSurveyorName,
    },
  }
}

export function withCustomerInfo(
  genchouCase: GenchouCase,
  patch: Partial<CustomerInfo>,
): GenchouCase {
  return { ...genchouCase, customer: { ...genchouCase.customer, ...patch } }
}

/** 顧客情報の画面から先へ進めない理由。 */
export type CustomerInfoIssue = 'customerNameMissing'

export type CustomerInfoCheck =
  | { canProceed: true }
  | { canProceed: false; issues: CustomerInfoIssue[] }

/**
 * 顧客情報の画面で「次へ」を押せるか。
 *
 * 顧客名は報告書の見出しと添付ファイル名に要るため必須。
 * 物件住所は現地で分からないことがあるため任意。
 */
export function checkCustomerInfo(customer: CustomerInfo): CustomerInfoCheck {
  const issues: CustomerInfoIssue[] = []

  if (customer.customerName.trim() === '') issues.push('customerNameMissing')

  return issues.length === 0 ? { canProceed: true } : { canProceed: false, issues }
}
