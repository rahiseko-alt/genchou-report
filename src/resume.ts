import { type GenchouCase, customerInfoReadiness, exteriorReadiness, finishReadiness } from '@/src/domain'

/**
 * 「続きから」で開く画面。
 *
 * まだ足りない、いちばん手前の画面を返す。すべて揃っていれば完成プレビューへ。
 * 送り損ねた案件を「あとで送る」で残したとき、押し直しをせずに送付へ戻れる。
 *
 * どこまで進んだかの判断は案件モデルの判定をそのまま使う。
 */
export function resumeHref(genchouCase: GenchouCase): string {
  if (!customerInfoReadiness(genchouCase.customer).canProceed) return '/customer'
  if (!exteriorReadiness(genchouCase.exteriorFrames).canProceed) return '/exterior'
  if (!finishReadiness(genchouCase).canProceed) return '/defects'
  return '/preview'
}
