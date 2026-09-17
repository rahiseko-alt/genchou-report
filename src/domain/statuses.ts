/**
 * 不具合写真に付けるステータスの文言。
 *
 * **ここが唯一の置き場所。** 画面も報告書もこの並びを見る。
 * 依頼元から実際に使う言葉が届いたら、この配列を書き換えるだけでよい。
 */
export const DEFECT_STATUSES = ['A', 'B', 'C'] as const

export type StatusId = (typeof DEFECT_STATUSES)[number]
