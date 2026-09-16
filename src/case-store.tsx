'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { type GenchouCase, beginCase } from '@/src/domain/genchou-case'
import { clearDraft, loadDraft, saveDraft } from '@/src/storage/draft'
import { recallSurveyorName } from '@/src/storage/last-surveyor'
import { today } from '@/src/today'

/**
 * いま作りかけの案件を、画面をまたいで持ち回る。
 *
 * 変わるたびに端末へ書き出すので、閉じても電池が切れても続きから再開できる。
 * 書き出し先は端末の中だけで、サーバーへは送られない。
 */
type CaseStore = {
  /** まだ始まっていなければ null。 */
  genchouCase: GenchouCase | null
  /** 端末に残っている下書きを読み終えたか。読み終えるまで画面は待つ。 */
  ready: boolean
  /** 新しい案件を始める。すでに始まっていれば何もしない。 */
  begin: () => void
  /** 下書きを捨てて、新しい案件を始める。 */
  beginFresh: () => void
  /**
   * 案件を書き換える。
   *
   * いま持っている案件ではなく、その時点で最新の案件を受け取って次を返す。
   * 写真の取り込みのように時間のかかる操作が重なっても、先の変更を消さないため。
   */
  update: (revise: (current: GenchouCase) => GenchouCase) => void
  /** 送り終えた、または捨てると決めた案件を手放す。 */
  discard: () => void
}

const CaseContext = createContext<CaseStore | null>(null)

export function CaseProvider({ children }: { children: React.ReactNode }) {
  // 調査日の「今日」も前回の担当者名も端末の中にしか無い。最初の描画に混ぜると
  // 組み立てた日の日付が HTML に焼き付くため、案件は端末の上で始める。
  const [genchouCase, setGenchouCase] = useState<GenchouCase | null>(null)
  const [ready, setReady] = useState(false)

  // 端末に残っている下書きを、開いた直後に一度だけ読む。
  useEffect(() => {
    let alive = true
    void loadDraft().then((draft) => {
      if (!alive) return
      if (draft !== null) setGenchouCase(draft)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  // 案件が変わるたびに書き出す。読み終える前に書くと、下書きを空で潰してしまう。
  useEffect(() => {
    if (!ready) return
    if (genchouCase === null) void clearDraft()
    else void saveDraft(genchouCase)
  }, [genchouCase, ready])

  const freshCase = useCallback(
    () => beginCase({ today: today(), lastSurveyorName: recallSurveyorName() }),
    [],
  )

  const begin = useCallback(() => {
    setGenchouCase((current) => current ?? freshCase())
  }, [freshCase])

  const beginFresh = useCallback(() => setGenchouCase(freshCase()), [freshCase])

  const update = useCallback((revise: (current: GenchouCase) => GenchouCase) => {
    setGenchouCase((current) => (current === null ? current : revise(current)))
  }, [])

  const discard = useCallback(() => setGenchouCase(null), [])

  const store = useMemo(
    () => ({ genchouCase, ready, begin, beginFresh, update, discard }),
    [genchouCase, ready, begin, beginFresh, update, discard],
  )

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>
}

export function useCaseStore(): CaseStore {
  const store = useContext(CaseContext)
  if (store === null) throw new Error('CaseProvider の外では案件を扱えない')
  return store
}
