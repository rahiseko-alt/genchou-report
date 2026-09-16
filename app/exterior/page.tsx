'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useOngoingCase } from '@/src/case-store'
import {
  EXTERIOR_SLOT_COUNT,
  exteriorReadiness,
  withExteriorPhoto,
  withoutExteriorPhoto,
} from '@/src/domain/genchou-case'
import { importPhoto } from '@/src/photo/import-photo'
import { PhotoFrame } from './PhotoFrame'
import styles from './page.module.css'

const slotLabel = (position: number) => `外観写真 ${position}枚目`

export default function ExteriorPage() {
  const router = useRouter()
  const { genchouCase, update } = useOngoingCase(() => router.replace('/customer'))
  const [failed, setFailed] = useState(false)

  if (genchouCase === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>外観写真</h1>
      </main>
    )
  }

  const readiness = exteriorReadiness(genchouCase.exteriorPhotos)
  const filledCount = genchouCase.exteriorPhotos.filter((slot) => slot !== null).length

  const pick = async (slotIndex: number, file: File) => {
    setFailed(false)
    try {
      update(withExteriorPhoto(genchouCase, slotIndex, await importPhoto(file)))
    } catch {
      setFailed(true)
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>外観写真</h1>
        <p className={styles.count}>
          {filledCount} / {EXTERIOR_SLOT_COUNT} 枚
        </p>
      </header>

      <div className={styles.frames}>
        {genchouCase.exteriorPhotos.map((photo, slotIndex) => (
          <PhotoFrame
            // 枠は4つで固定、並び順がそのまま報告書の順になる。
            key={slotIndex}
            position={slotIndex + 1}
            label={slotLabel(slotIndex + 1)}
            photo={photo}
            onPick={(file) => void pick(slotIndex, file)}
            onRemove={() => update(withoutExteriorPhoto(genchouCase, slotIndex))}
          />
        ))}
      </div>

      <div className={styles.foot}>
        {failed && (
          <p className={styles.reason} role="status">
            写真を読み取れませんでした。もう一度撮ってください
          </p>
        )}
        {!readiness.canProceed && (
          <p id="exterior-blocked-reason" className={styles.hint} role="status">
            4枚すべて撮ると次へ進めます
          </p>
        )}
        <button
          type="button"
          className={styles.next}
          onClick={() => router.push('/defects')}
          disabled={!readiness.canProceed}
          aria-describedby={readiness.canProceed ? undefined : 'exterior-blocked-reason'}
        >
          次へ
        </button>
      </div>
    </main>
  )
}
