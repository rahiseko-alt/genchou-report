/**
 * 送り出すものを、通信の上限に収めるための見立て。
 *
 * canvas を呼ばない純粋な計算だけを置く。実際の入れ直しは `import-photo.ts` の役目。
 */

/**
 * 送り出す中身の上限。
 *
 * Vercel の関数が受け取れる本文は 4.5MB まで。取りこぼしが出ないよう余裕を取る。
 * 参考: https://vercel.com/docs/functions/limitations
 */
export const UPLOAD_BUDGET_BYTES = 3_500_000

/**
 * 試す画質。左から順に下げる。
 *
 * 下限を 0.4 で止めるのは、これより下げると不具合の状況が読み取れなくなるため。
 * 読めない報告書を送るくらいなら、送れないことを知らせたほうがよい。
 */
export const JPEG_QUALITIES = [0.82, 0.7, 0.58, 0.48, 0.4] as const

export type JpegQuality = (typeof JPEG_QUALITIES)[number]

/** いまの画質の次に試すもの。もう下げられなければ null。 */
export function nextQuality(quality: number): JpegQuality | null {
  const index = JPEG_QUALITIES.indexOf(quality as JpegQuality)
  if (index === -1 || index === JPEG_QUALITIES.length - 1) return null
  return JPEG_QUALITIES[index + 1]
}

export type EncodingPlan =
  /** このまま送れる。 */
  | { verdict: 'fits' }
  /** 超えている。この画質で入れ直す。 */
  | { verdict: 'retry'; quality: JpegQuality }
  /** 下限まで下げても超えている。担当者に知らせるほかない。 */
  | { verdict: 'tooLarge' }

export function planEncoding({
  totalBytes,
  quality,
  budget = UPLOAD_BUDGET_BYTES,
}: {
  totalBytes: number
  quality: number
  budget?: number
}): EncodingPlan {
  if (totalBytes <= budget) return { verdict: 'fits' }

  const lower = nextQuality(quality)
  return lower === null ? { verdict: 'tooLarge' } : { verdict: 'retry', quality: lower }
}
