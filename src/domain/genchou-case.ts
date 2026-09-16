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

/** 枠に収まった写真1枚。 */
export type Photo = {
  /** 枠の入れ替えを見分けるための目印。 */
  id: string
  blob: Blob
  width: number
  height: number
}

/** 写真を1枚入れるための場所。まだ入っていなければ null。 */
export type PhotoSlot = Photo | null

/** 外観写真の枠は4つで固定。 */
export type ExteriorPhotos = [PhotoSlot, PhotoSlot, PhotoSlot, PhotoSlot]

export const EXTERIOR_SLOT_COUNT = 4

/** 1件の現調と、そこから生まれる1通の現調報告書をひとまとめにした単位。 */
export type GenchouCase = {
  customer: CustomerInfo
  exteriorPhotos: ExteriorPhotos
}

export function beginCase({
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
    exteriorPhotos: [null, null, null, null],
  }
}

export function withExteriorPhoto(
  genchouCase: GenchouCase,
  slotIndex: number,
  photo: Photo,
): GenchouCase {
  return replaceExteriorSlot(genchouCase, slotIndex, photo)
}

export function withoutExteriorPhoto(genchouCase: GenchouCase, slotIndex: number): GenchouCase {
  return replaceExteriorSlot(genchouCase, slotIndex, null)
}

function replaceExteriorSlot(
  genchouCase: GenchouCase,
  slotIndex: number,
  slot: PhotoSlot,
): GenchouCase {
  const exteriorPhotos = [...genchouCase.exteriorPhotos] as ExteriorPhotos
  exteriorPhotos[slotIndex] = slot
  return { ...genchouCase, exteriorPhotos }
}

/** 外観の画面から先へ進めない理由。 */
export type ExteriorIssue = 'exteriorPhotosIncomplete'

export type ExteriorReadiness =
  | { canProceed: true }
  | { canProceed: false; issues: ExteriorIssue[] }

/**
 * 外観の画面で「次へ」を押せるか。
 *
 * 外観は4枚で固定。撮り忘れたまま先へ進まないよう、揃うまで止める。
 */
export function exteriorReadiness(exteriorPhotos: ExteriorPhotos): ExteriorReadiness {
  const allFilled = exteriorPhotos.every((slot) => slot !== null)

  return allFilled ? { canProceed: true } : { canProceed: false, issues: ['exteriorPhotosIncomplete'] }
}

export function withCustomerInfo(
  genchouCase: GenchouCase,
  patch: Partial<CustomerInfo>,
): GenchouCase {
  return { ...genchouCase, customer: { ...genchouCase.customer, ...patch } }
}

/** 顧客情報の画面から先へ進めない理由。 */
export type CustomerInfoIssue = 'customerNameMissing'

export type CustomerInfoReadiness =
  | { canProceed: true }
  | { canProceed: false; issues: CustomerInfoIssue[] }

/**
 * 顧客情報の画面で「次へ」を押せるか。
 *
 * 顧客名は報告書の見出しと添付ファイル名に要るため必須。
 * 物件住所は現地で分からないことがあるため任意。
 */
export function customerInfoReadiness(customer: CustomerInfo): CustomerInfoReadiness {
  const issues: CustomerInfoIssue[] = []

  if (customer.customerName.trim() === '') issues.push('customerNameMissing')

  return issues.length === 0 ? { canProceed: true } : { canProceed: false, issues }
}
