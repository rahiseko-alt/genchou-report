import {
  DEFECT_FRAMES_PER_PAGE,
  DEFECT_STATUSES,
  DEFAULT_EXTERIOR_LABELS,
  EXTERIOR_FRAME_COUNT,
  type CustomerInfo,
  type DefectFrame,
  type DefectPage,
  type ExteriorLabels,
  type GenchouCase,
  type Photo,
  type StatusId,
  customerInfoReadiness,
  exteriorReadiness,
  finishReadiness,
} from '@/src/domain'

/**
 * 端末から送られてきた中身を、案件として読み直す。
 *
 * 送られてくるものは信用できない。形が違えば必ずここで止め、組み立てへ渡さない。
 * 組み立ての途中で落ちると、担当者には「送れなかった」としか伝わらない。
 *
 * 成立しているかどうか（外観が4枚揃っているか、不具合が1枚以上あるか）は
 * 案件モデルの判定をそのまま使う。ここに同じ判定を書き直さない。
 */

export class BadCaseError extends Error {}

/** 端末が送り出す形。写真の中身は base64 で運ぶ。 */
export type SerializedPhoto = {
  id: string
  jpeg: string
  quality: number
  width: number
  height: number
}

export type SerializedDefectFrame = {
  photo: SerializedPhoto
  statuses: string[]
  note: string
} | null

export type SerializedCase = {
  customer: CustomerInfo
  exteriorFrames: (SerializedPhoto | null)[]
  exteriorLabels: string[]
  defectPages: SerializedDefectFrame[][]
}

export function parseCase(body: unknown): GenchouCase {
  const raw = asObject(body, '中身が空')

  const genchouCase: GenchouCase = {
    customer: parseCustomer(raw.customer),
    exteriorFrames: parseExteriorFrames(raw.exteriorFrames),
    exteriorLabels: parseExteriorLabels(raw.exteriorLabels),
    defectPages: parseDefectPages(raw.defectPages),
  }

  if (!customerInfoReadiness(genchouCase.customer).canProceed) {
    throw new BadCaseError('顧客名が入っていない')
  }
  if (!exteriorReadiness(genchouCase.exteriorFrames).canProceed) {
    throw new BadCaseError('外観写真が4枚揃っていない')
  }
  if (!finishReadiness(genchouCase).canProceed) {
    throw new BadCaseError('不具合写真が1枚も入っていない')
  }

  return genchouCase
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadCaseError(message)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, message: string): string {
  if (typeof value !== 'string') throw new BadCaseError(message)
  return value
}

function asFiniteNumber(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new BadCaseError(message)
  return value
}

function parseCustomer(value: unknown): CustomerInfo {
  const raw = asObject(value, '顧客情報が無い')
  return {
    customerName: asString(raw.customerName, '顧客名が文字になっていない'),
    propertyAddress: asString(raw.propertyAddress, '物件住所が文字になっていない'),
    surveyedOn: asString(raw.surveyedOn, '調査日が文字になっていない'),
    surveyorName: asString(raw.surveyorName, '担当者名が文字になっていない'),
  }
}

function parseExteriorFrames(value: unknown): GenchouCase['exteriorFrames'] {
  if (!Array.isArray(value) || value.length !== EXTERIOR_FRAME_COUNT) {
    throw new BadCaseError('外観写真の枠の数が合わない')
  }
  return value.map((frame) => (frame === null ? null : parsePhoto(frame))) as
    GenchouCase['exteriorFrames']
}

/** 見出しが欠けていたり空だったりすれば、もとの見出しで補う。 */
function parseExteriorLabels(value: unknown): ExteriorLabels {
  if (!Array.isArray(value)) return [...DEFAULT_EXTERIOR_LABELS] as ExteriorLabels

  return DEFAULT_EXTERIOR_LABELS.map((fallback, index) => {
    const label = value[index]
    return typeof label === 'string' && label.trim() !== '' ? label.trim() : fallback
  }) as ExteriorLabels
}

function parseDefectPages(value: unknown): DefectPage[] {
  if (!Array.isArray(value) || value.length === 0) throw new BadCaseError('不具合ページが無い')

  return value.map((page) => {
    if (!Array.isArray(page) || page.length !== DEFECT_FRAMES_PER_PAGE) {
      throw new BadCaseError('不具合ページの枠の数が合わない')
    }
    return page.map(parseDefectFrame) as DefectPage
  })
}

function parseDefectFrame(value: unknown): DefectFrame {
  if (value === null) return null
  const raw = asObject(value, '不具合の枠が読めない')

  return {
    photo: parsePhoto(raw.photo),
    statuses: parseStatuses(raw.statuses),
    note: asString(raw.note, '補足が文字になっていない'),
  }
}

/**
 * ステータスは `src/domain/statuses.ts` に並ぶものだけを通す。
 * 知らない言葉をそのまま通すと、報告書にそのまま印字されて会社へ届く。
 */
function parseStatuses(value: unknown): StatusId[] {
  if (!Array.isArray(value)) throw new BadCaseError('ステータスが並びになっていない')

  return value.map((status) => {
    if (!DEFECT_STATUSES.includes(status as StatusId)) {
      throw new BadCaseError('知らないステータスが入っている')
    }
    return status as StatusId
  })
}

function parsePhoto(value: unknown): Photo {
  const raw = asObject(value, '写真が無い')
  const jpeg = decodeJpeg(asString(raw.jpeg, '写真の中身が文字になっていない'))

  return {
    id: asString(raw.id, '写真の目印が無い'),
    jpeg,
    quality: asFiniteNumber(raw.quality, '写真の画質が数になっていない'),
    width: asFiniteNumber(raw.width, '写真の幅が数になっていない'),
    height: asFiniteNumber(raw.height, '写真の高さが数になっていない'),
  }
}

/** JPEG の先頭にある印。ここで弾かないと、組み立ての途中で落ちる。 */
const JPEG_START = [0xff, 0xd8, 0xff]

function decodeJpeg(base64: string): Uint8Array<ArrayBuffer> {
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = new Uint8Array(Buffer.from(base64, 'base64'))
  } catch {
    throw new BadCaseError('写真の中身を読めない')
  }

  if (bytes.length < JPEG_START.length || JPEG_START.some((byte, i) => bytes[i] !== byte)) {
    throw new BadCaseError('写真が JPEG になっていない')
  }
  return bytes
}
