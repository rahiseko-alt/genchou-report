/**
 * 縮小後の大きさを決める。canvas を呼ばない純粋な計算だけを置く。
 *
 * 実際の描き直しは `import-photo.ts` の役目。容量に合わせた画質の調整は Issue #7。
 */

/** 縮小後の長辺。現場の状況が読み取れて、メールに収まる大きさ。 */
export const LONG_EDGE = 1600

export type PixelSize = { width: number; height: number }

/**
 * 縦横の比を保ったまま、長辺が `longEdge` に収まる大きさを返す。
 * もともと収まっている写真は引き伸ばさない。
 */
export function fitWithin(size: PixelSize, longEdge: number): PixelSize {
  const currentLongEdge = Math.max(size.width, size.height)
  if (currentLongEdge <= longEdge) return { width: size.width, height: size.height }

  const ratio = longEdge / currentLongEdge
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  }
}
