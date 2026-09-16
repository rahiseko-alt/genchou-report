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

import { type StatusId } from './statuses'

/** 枠に収まった写真1枚。整え終えた JPEG の中身をそのまま持つ。 */
export type Photo = {
  /** 入れ替えを見分けるための目印。 */
  id: string
  /** JPEG の中身。ブラウザの型ではなく、ただのバイト列として持つ。 */
  jpeg: Uint8Array<ArrayBuffer>
  /** この JPEG を作ったときの画質。容量が収まらないときに下げ直すために持つ。 */
  quality: number
  width: number
  height: number
}

/** 写真を1枚入れるための場所。まだ入っていなければ null。 */
export type Frame = Photo | null

/** 外観写真の枠は4つで固定。 */
export type ExteriorFrames = [Frame, Frame, Frame, Frame]

export const EXTERIOR_FRAME_COUNT = 4

/** 不具合写真1枚と、それに付けたステータスと補足。 */
export type DefectEntry = {
  photo: Photo
  /** 押した順に並ぶ。同じものを二度押すと外れる。 */
  statuses: StatusId[]
  /** ステータスでは表せない内容。任意。 */
  note: string
}

/** 不具合の枠。まだ写真が入っていなければ null。 */
export type DefectFrame = DefectEntry | null

/** 不具合ページは枠4つ。 */
export type DefectPage = [DefectFrame, DefectFrame, DefectFrame, DefectFrame]

export const DEFECT_FRAMES_PER_PAGE = 4

/** 1件の現調と、そこから生まれる1通の現調報告書をひとまとめにした単位。 */
export type GenchouCase = {
  customer: CustomerInfo
  /** 並び順がそのまま報告書の並び順になる。 */
  exteriorFrames: ExteriorFrames
  /** 1ページ以上。並び順がそのまま報告書の並び順になる。 */
  defectPages: DefectPage[]
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
    defectPages: [emptyDefectPage()],
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

// ---- 不具合ページ ----

function emptyDefectPage(): DefectPage {
  return Array.from({ length: DEFECT_FRAMES_PER_PAGE }, () => null) as DefectPage
}

/**
 * 不具合の枠を1つ書き換える。
 *
 * `revise` が受け取るのは、いまその枠にあるもの。null を返せば枠は空になる。
 * 写真の入っていない枠にステータスや補足を付けようとしても、null のまま何も起きない。
 */
function reviseDefectFrame(
  genchouCase: GenchouCase,
  pageIndex: number,
  frameIndex: number,
  revise: (current: DefectFrame) => DefectFrame,
): GenchouCase {
  const defectPages = genchouCase.defectPages.map((page, index) => {
    if (index !== pageIndex) return page
    const next = [...page] as DefectPage
    next[frameIndex] = revise(page[frameIndex])
    return next
  })
  return { ...genchouCase, defectPages }
}

export function withDefectPhoto(
  genchouCase: GenchouCase,
  pageIndex: number,
  frameIndex: number,
  photo: Photo,
): GenchouCase {
  // 写真を入れ替えても、すでに付けたステータスと補足は残す。
  return reviseDefectFrame(genchouCase, pageIndex, frameIndex, (current) => ({
    photo,
    statuses: current?.statuses ?? [],
    note: current?.note ?? '',
  }))
}

export function withoutDefectPhoto(
  genchouCase: GenchouCase,
  pageIndex: number,
  frameIndex: number,
): GenchouCase {
  return reviseDefectFrame(genchouCase, pageIndex, frameIndex, () => null)
}

export function toggleDefectStatus(
  genchouCase: GenchouCase,
  pageIndex: number,
  frameIndex: number,
  status: StatusId,
): GenchouCase {
  return reviseDefectFrame(genchouCase, pageIndex, frameIndex, (current) => {
    if (current === null) return null
    const statuses = current.statuses.includes(status)
      ? current.statuses.filter((each) => each !== status)
      : [...current.statuses, status]
    return { ...current, statuses }
  })
}

export function withDefectNote(
  genchouCase: GenchouCase,
  pageIndex: number,
  frameIndex: number,
  note: string,
): GenchouCase {
  return reviseDefectFrame(genchouCase, pageIndex, frameIndex, (current) =>
    current === null ? null : { ...current, note },
  )
}

/** そのページの枠がすべて埋まっているか。埋まるまで次のページは足せない。 */
function isDefectPageFull(page: DefectPage): boolean {
  return page.every((frame) => frame !== null)
}

/** ページを足せるか。いま開いている最後のページが埋まっているときだけ。 */
export function canAddDefectPage(genchouCase: GenchouCase): boolean {
  const last = genchouCase.defectPages[genchouCase.defectPages.length - 1]
  return last !== undefined && isDefectPageFull(last)
}

export function addDefectPage(genchouCase: GenchouCase): GenchouCase {
  if (!canAddDefectPage(genchouCase)) return genchouCase
  return { ...genchouCase, defectPages: [...genchouCase.defectPages, emptyDefectPage()] }
}

/** 不具合写真の枚数。ページをまたいで数える。 */
export function defectPhotoCount(genchouCase: GenchouCase): number {
  return genchouCase.defectPages.reduce(
    (total, page) => total + page.filter((frame) => frame !== null).length,
    0,
  )
}

/**
 * 写真が1枚も入っていないページを取り除く。
 *
 * ページ追加を押し間違えたまま完了したときに、空のページが報告書に出ないようにする。
 * すべて空でも1ページは残す。案件はつねに1ページ以上を持つ。
 */
export function withoutDefectPages(genchouCase: GenchouCase): GenchouCase {
  const kept = genchouCase.defectPages.filter((page) => page.some((frame) => frame !== null))
  return { ...genchouCase, defectPages: kept.length === 0 ? [emptyDefectPage()] : kept }
}

/** 作成完了を押せない理由。 */
export type FinishIssue = 'noDefectPhotos'

export type FinishReadiness =
  | { canProceed: true }
  | { canProceed: false; issues: FinishIssue[] }

/**
 * 「作成完了」を押せるか。
 *
 * 不具合の数は4の倍数とは限らないので、最後のページが埋まっていなくてもよい。
 * ただし1枚も無ければ報告書として成立しない。
 */
export function finishReadiness(genchouCase: GenchouCase): FinishReadiness {
  return defectPhotoCount(genchouCase) > 0
    ? { canProceed: true }
    : { canProceed: false, issues: ['noDefectPhotos'] }
}
