'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { type GenchouCase, beginCase } from '@/src/domain/genchou-case'
import { recallSurveyorName } from '@/src/storage/last-surveyor'
import { today } from '@/src/today'

/**
 * いま作りかけの案件を、画面をまたいで持ち回る。
 *
 * 置き場所は画面が生きている間のメモリだけ。読み込み直すと消える。
 * 端末に保存して中断から再開できるようにするのは Issue #10 の担当。
 */
type CaseStore = {
  /** まだ始まっていなければ null。 */
  genchouCase: GenchouCase | null
  /** 新しい案件を始める。すでに始まっていれば何もしない。 */
  begin: () => void
  /**
   * 案件を書き換える。
   *
   * いま持っている案件ではなく、その時点で最新の案件を受け取って次を返す。
   * 写真の取り込みのように時間のかかる操作が重なっても、先の変更を消さないため。
   */
  update: (revise: (current: GenchouCase) => GenchouCase) => void
}

const CaseContext = createContext<CaseStore | null>(null)

export function CaseProvider({ children }: { children: React.ReactNode }) {
  // 調査日の「今日」も前回の担当者名も端末の中にしか無い。最初の描画に混ぜると
  // 組み立てた日の日付が HTML に焼き付くため、案件は端末の上で始める。
  const [genchouCase, setGenchouCase] = useState<GenchouCase | null>(null)

  const begin = useCallback(() => {
    setGenchouCase(
      (current) => current ?? beginCase({ today: today(), lastSurveyorName: recallSurveyorName() }),
    )
  }, [])

  const update = useCallback((revise: (current: GenchouCase) => GenchouCase) => {
    setGenchouCase((current) => (current === null ? current : revise(current)))
  }, [])

  const store = useMemo(() => ({ genchouCase, begin, update }), [genchouCase, begin, update])

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>
}

export function useCaseStore(): CaseStore {
  const store = useContext(CaseContext)
  if (store === null) throw new Error('CaseProvider の外では案件を扱えない')
  return store
}
