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

/** 枠に収まった写真1枚。整え終えた JPEG の中身をそのまま持つ。 */
export type Photo = {
  /** 入れ替えを見分けるための目印。 */
  id: string
  /** JPEG の中身。ブラウザの型ではなく、ただのバイト列として持つ。 */
  jpeg: Uint8Array<ArrayBuffer>
  width: number
  height: number
}

/** 写真を1枚入れるための場所。まだ入っていなければ null。 */
export type Frame = Photo | null

/** 外観写真の枠は4つで固定。 */
export type ExteriorFrames = [Frame, Frame, Frame, Frame]

export const EXTERIOR_FRAME_COUNT = 4

/** 1件の現調と、そこから生まれる1通の現調報告書をひとまとめにした単位。 */
export type GenchouCase = {
  customer: CustomerInfo
  /** 並び順がそのまま報告書の並び順になる。 */
  exteriorFrames: ExteriorFrames
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
    exteriorFrames: emptyExteriorFrames(),
  }
}

function emptyExteriorFrames(): ExteriorFrames {
  return Array.from({ length: EXTERIOR_FRAME_COUNT }, () => null) as ExteriorFrames
}

export function withExteriorPhoto(
  genchouCase: GenchouCase,
  frameIndex: number,
  photo: Photo,
): GenchouCase {
  return replaceExteriorFrame(genchouCase, frameIndex, photo)
}

export function withoutExteriorPhoto(genchouCase: GenchouCase, frameIndex: number): GenchouCase {
  return replaceExteriorFrame(genchouCase, frameIndex, null)
}

function replaceExteriorFrame(
  genchouCase: GenchouCase,
  frameIndex: number,
  frame: Frame,
): GenchouCase {
  const exteriorFrames = [...genchouCase.exteriorFrames] as ExteriorFrames
  exteriorFrames[frameIndex] = frame
  return { ...genchouCase, exteriorFrames }
}

/** 埋まっている枠の数。あと何枚かを画面に出すために使う。 */
export function filledExteriorCount(exteriorFrames: ExteriorFrames): number {
  return exteriorFrames.filter((frame) => frame !== null).length
}

/** 外観の画面から先へ進めない理由。 */
export type ExteriorIssue = 'exteriorFramesIncomplete'

export type ExteriorReadiness =
  | { canProceed: true }
  | { canProceed: false; issues: ExteriorIssue[] }

/**
 * 外観の画面で「次へ」を押せるか。
 *
 * 外観は4枚で固定。撮り忘れたまま先へ進まないよう、揃うまで止める。
 */
export function exteriorReadiness(exteriorFrames: ExteriorFrames): ExteriorReadiness {
  const allFilled = filledExteriorCount(exteriorFrames) === EXTERIOR_FRAME_COUNT

  return allFilled ? { canProceed: true } : { canProceed: false, issues: ['exteriorFramesIncomplete'] }
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
