'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCaseStore } from '@/src/case-store'
import {
  EXTERIOR_FRAME_COUNT,
  type ExteriorIssue,
  exteriorReadiness,
  filledExteriorCount,
  withExteriorPhoto,
  withoutExteriorPhoto,
} from '@/src/domain/genchou-case'
import { importPhoto } from '@/src/photo/import-photo'
import { PhotoFrame } from './PhotoFrame'
import styles from './page.module.css'

/** 「次へ」から押せない理由を指すための目印。 */
const REASON_ID = 'exterior-blocked-reason'

const ISSUE_MESSAGES: Record<ExteriorIssue, string> = {
  exteriorFramesIncomplete: '4枚すべて撮ると次へ進めます',
}

const frameLabel = (position: number) => `外観写真 ${position}枚目`

export default function ExteriorPage() {
  const router = useRouter()
  const { genchouCase, update } = useCaseStore()
  const [failedFrames, setFailedFrames] = useState<ReadonlySet<number>>(new Set())

  // 案件が無いまま開かれたら、始まりの画面へ戻す。
  useEffect(() => {
    if (genchouCase === null) router.replace('/customer')
  }, [genchouCase, router])

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>外観写真</h1>
      </main>
    )
  }

  const { exteriorFrames } = genchouCase
  const readiness = exteriorReadiness(exteriorFrames)

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
      update((current) => withExteriorPhoto(current, frameIndex, photo))
    } catch {
      markFailed(frameIndex, true)
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>外観写真</h1>
        <p className={styles.count}>
          {filledExteriorCount(exteriorFrames)} / {EXTERIOR_FRAME_COUNT} 枚
        </p>
      </header>

      <div className={styles.frames}>
        {exteriorFrames.map((photo, frameIndex) => (
          <PhotoFrame
            // 枠は4つで固定、並び順がそのまま報告書の順になる。
            key={frameIndex}
            position={frameIndex + 1}
            label={frameLabel(frameIndex + 1)}
            photo={photo}
            failed={failedFrames.has(frameIndex)}
            onPick={(file) => void pick(frameIndex, file)}
            onRemove={() => update((current) => withoutExteriorPhoto(current, frameIndex))}
          />
        ))}
      </div>

      <div className={styles.foot}>
        {!readiness.canProceed && (
          <p id={REASON_ID} className={styles.hint} role="status">
            {readiness.issues.map((issue) => ISSUE_MESSAGES[issue]).join('　')}
          </p>
        )}
        <button
          type="button"
          className={styles.next}
          onClick={() => router.push('/defects')}
          disabled={!readiness.canProceed}
          aria-describedby={readiness.canProceed ? undefined : REASON_ID}
        >
          次へ
        </button>
      </div>
    </main>
  )
}
