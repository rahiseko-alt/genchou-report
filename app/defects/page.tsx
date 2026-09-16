'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCaseStore } from '@/src/case-store'
import {
  DEFECT_FRAMES_PER_PAGE,
  type FinishIssue,
  type StatusId,
  addDefectPage,
  canAddDefectPage,
  defectPhotoCount,
  exteriorReadiness,
  finishReadiness,
  toggleDefectStatus,
  withDefectNote,
  withDefectPhoto,
  withoutDefectPages,
  withoutDefectPhoto,
} from '@/src/domain'
import { importPhoto } from '@/src/photo/import-photo'
import { DefectFrame } from './DefectFrame'
import styles from './page.module.css'

/** 「作成完了」から押せない理由を指すための目印。 */
const REASON_ID = 'finish-blocked-reason'

const ISSUE_MESSAGES: Record<FinishIssue, string> = {
  noDefectPhotos: '不具合写真を1枚以上入れると完了できます',
}

export default function DefectsPage() {
  const router = useRouter()
  const { genchouCase, ready, update } = useCaseStore()
  const [pageIndex, setPageIndex] = useState(0)
  const [failedFrames, setFailedFrames] = useState<ReadonlySet<number>>(new Set())

  // 外観が揃っていないまま開かれたら、手前の画面へ戻す。
  useEffect(() => {
    if (!ready) return
    if (genchouCase === null) router.replace('/customer')
    else if (!exteriorReadiness(genchouCase.exteriorFrames).canProceed) router.replace('/exterior')
  }, [ready, genchouCase, router])

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>不具合写真</h1>
      </main>
    )
  }

  const page = genchouCase.defectPages[pageIndex] ?? genchouCase.defectPages[0]
  const readiness = finishReadiness(genchouCase)

  const markFailed = (frameIndex: number, failed: boolean) =>
    setFailedFrames((current) => {
      const next = new Set(current)
      if (failed) next.add(frameIndex)
      else next.delete(frameIndex)
      return next
    })

  const pick = async (frameIndex: number, file: File) => {
    markFailed(frameIndex, false)
    try {
      const photo = await importPhoto(file)
      // 取り込みの間に別の枠が埋まっていることがある。最新の案件から組み立てる。
      update((current) => withDefectPhoto(current, pageIndex, frameIndex, photo))
    } catch {
      markFailed(frameIndex, true)
    }
  }

  const goToPage = (next: number) => {
    setFailedFrames(new Set())
    setPageIndex(next)
  }

  const finish = () => {
    if (!readiness.canProceed) return
    // 押し間違いで足した空のページを、報告書に出さない。
    update(withoutDefectPages)
    router.push('/preview')
  }

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>不具合写真</h1>
        <p className={styles.pageNumber}>{pageIndex + 1} ページ目</p>
      </header>

      <div className={styles.frames}>
        {page.map((entry, frameIndex) => (
          <DefectFrame
            // 枠は4つで固定、並び順がそのまま報告書の順になる。
            key={`${pageIndex}-${frameIndex}`}
            position={frameIndex + 1}
            entry={entry}
            failed={failedFrames.has(frameIndex)}
            onPick={(file) => void pick(frameIndex, file)}
            onRemove={() => update((current) => withoutDefectPhoto(current, pageIndex, frameIndex))}
            onToggleStatus={(status: StatusId) =>
              update((current) => toggleDefectStatus(current, pageIndex, frameIndex, status))
            }
            onNote={(note) =>
              update((current) => withDefectNote(current, pageIndex, frameIndex, note))
            }
          />
        ))}
      </div>

      <div className={styles.foot}>
        <p className={styles.total}>不具合写真 {defectPhotoCount(genchouCase)} 枚</p>

        {!readiness.canProceed && (
          <p id={REASON_ID} className={styles.hint} role="status">
            {readiness.issues.map((issue) => ISSUE_MESSAGES[issue]).join('　')}
          </p>
        )}

        <button
          type="button"
          className={styles.finish}
          onClick={finish}
          disabled={!readiness.canProceed}
          aria-describedby={readiness.canProceed ? undefined : REASON_ID}
        >
          作成完了
        </button>

        <div className={styles.pageButtons}>
          {pageIndex > 0 && (
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => goToPage(pageIndex - 1)}
            >
              ページ戻る
            </button>
          )}
          <button
            type="button"
            className={styles.pageButton}
            disabled={!canAddDefectPage(genchouCase) || pageIndex !== genchouCase.defectPages.length - 1}
            onClick={() => {
              update(addDefectPage)
              goToPage(genchouCase.defectPages.length)
            }}
          >
            ページ追加
          </button>
        </div>

        {!canAddDefectPage(genchouCase) && pageIndex === genchouCase.defectPages.length - 1 && (
          <p className={styles.hint}>
            {DEFECT_FRAMES_PER_PAGE}枠すべて埋めるとページを足せます
          </p>
        )}
      </div>
    </main>
  )
}
