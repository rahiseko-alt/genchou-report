'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  /** 案件モデルの操作で作った次の案件に差し替える。 */
  update: (next: GenchouCase) => void
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

  const store = useMemo(
    () => ({ genchouCase, begin, update: setGenchouCase }),
    [genchouCase, begin],
  )

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>
}

export function useCaseStore(): CaseStore {
  const store = useContext(CaseContext)
  if (store === null) throw new Error('CaseProvider の外では案件を扱えない')
  return store
}

/**
 * すでに始まっている案件を取り出す。まだ無ければ null を返し、`onMissing` を呼ぶ。
 * 途中の画面をいきなり開かれたときに、顧客情報へ戻すために使う。
 */
export function useOngoingCase(onMissing: () => void): {
  genchouCase: GenchouCase | null
  update: (next: GenchouCase) => void
} {
  const { genchouCase, update } = useCaseStore()

  useEffect(() => {
    if (genchouCase === null) onMissing()
    // onMissing は毎回作り直される。案件の有無だけを見る。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genchouCase])

  return { genchouCase, update }
}
