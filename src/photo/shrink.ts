import {
  type GenchouCase,
  type Photo,
  withDefectPhoto,
  withExteriorPhoto,
} from '@/src/domain'
import { type JpegQuality, UPLOAD_BUDGET_BYTES, planEncoding } from './budget'
import { reencodePhoto } from './import-photo'

/**
 * 送り出す中身が上限に収まるまで、写真を入れ直す。
 *
 * 担当者は何も設定しない。収まらない見込みなら、画質を1段下げて入れ直し、
 * また測る。下限まで下げても収まらないときだけ、そのことを知らせる。
 *
 * どこまで下げるかの判断は `budget.ts` の純粋な計算に任せ、ここは
 * 「入れ直して測り直す」繰り返しだけを持つ。
 */

export type ShrinkOutcome =
  | { ok: true; genchouCase: GenchouCase }
  | { ok: false; reason: 'tooLarge' }

/** 送り出す中身のおおよその大きさ。base64 にすると約 4/3 に膨らむ。 */
export function estimateUploadBytes(genchouCase: GenchouCase): number {
  return Math.ceil(allPhotos(genchouCase).reduce((total, photo) => total + photo.jpeg.length, 0) * 1.34)
}

/** いま案件が使っている画質。写真ごとに違えば、一番低いものに合わせる。 */
function currentQuality(genchouCase: GenchouCase): number {
  const qualities = allPhotos(genchouCase).map((photo) => photo.quality)
  return qualities.length === 0 ? 1 : Math.min(...qualities)
}

function allPhotos(genchouCase: GenchouCase): Photo[] {
  return [
    ...genchouCase.exteriorFrames.filter((frame) => frame !== null),
    ...genchouCase.defectPages
      .flat()
      .filter((frame) => frame !== null)
      .map((frame) => frame.photo),
  ]
}

export async function shrinkToBudget(
  genchouCase: GenchouCase,
  {
    budget = UPLOAD_BUDGET_BYTES,
    reencode = reencodePhoto,
  }: {
    budget?: number
    /** 入れ直す手だて。テストでは差し替え、canvas を使わずに確かめる。 */
    reencode?: (photo: Photo, quality: JpegQuality) => Promise<Photo>
  } = {},
): Promise<ShrinkOutcome> {
  let current = genchouCase

  for (;;) {
    const plan = planEncoding({
      totalBytes: estimateUploadBytes(current),
      quality: currentQuality(current),
      budget,
    })

    if (plan.verdict === 'fits') return { ok: true, genchouCase: current }
    if (plan.verdict === 'tooLarge') return { ok: false, reason: 'tooLarge' }

    current = await reencodeAll(current, plan.quality, reencode)
  }
}

async function reencodeAll(
  genchouCase: GenchouCase,
  quality: JpegQuality,
  reencode: (photo: Photo, quality: JpegQuality) => Promise<Photo>,
): Promise<GenchouCase> {
  let current = genchouCase

  for (const [frameIndex, frame] of genchouCase.exteriorFrames.entries()) {
    if (frame === null) continue
    current = withExteriorPhoto(current, frameIndex, await reencode(frame, quality))
  }

  for (const [pageIndex, page] of genchouCase.defectPages.entries()) {
    for (const [frameIndex, frame] of page.entries()) {
      if (frame === null) continue
      current = withDefectPhoto(current, pageIndex, frameIndex, await reencode(frame.photo, quality))
    }
  }

  return current
}
