'use client'

import { type DefectFrame as Entry, DEFECT_STATUSES, type StatusId } from '@/src/domain'
import { PhotoFrame } from '@/src/ui/PhotoFrame'
import styles from './page.module.css'

type Props = {
  /** 画面と報告書での並び順。1 から数える。 */
  position: number
  entry: Entry
  failed: boolean
  onPick: (file: File) => void
  onRemove: () => void
  onToggleStatus: (status: StatusId) => void
  onNote: (note: string) => void
}

/**
 * 不具合写真1枚の枠と、それに付ける所見。
 *
 * ステータスと補足は、写真が入ってから現れる。何に対する所見か定まらないため。
 */
export function DefectFrame({
  position,
  entry,
  failed,
  onPick,
  onRemove,
  onToggleStatus,
  onNote,
}: Props) {
  const label = `不具合写真 ${position}枚目`
  const noteId = `defect-note-${position}`

  return (
    <div className={styles.defect}>
      <PhotoFrame
        takeLabel={`${position}枚目を撮る`}
        attachLabel={`${position}枚目を画像から選ぶ`}
        label={label}
        photo={entry?.photo ?? null}
        failed={failed}
        onPick={onPick}
        onRemove={onRemove}
      />

      {entry !== null && (
        <>
          <div className={styles.statuses}>
            {DEFECT_STATUSES.map((status) => {
              const on = entry.statuses.includes(status)
              return (
                <button
                  key={status}
                  type="button"
                  className={on ? styles.statusOn : styles.status}
                  aria-pressed={on}
                  onClick={() => onToggleStatus(status)}
                >
                  {status}
                </button>
              )
            })}
          </div>

          <label className={styles.noteField} htmlFor={noteId}>
            <span className={styles.noteLabel}>{position}枚目の補足</span>
            <textarea
              id={noteId}
              className={styles.note}
              rows={2}
              value={entry.note}
              onChange={(event) => onNote(event.target.value)}
              placeholder="ボタンで表せないことがあれば"
            />
          </label>
        </>
      )}
    </div>
  )
}
