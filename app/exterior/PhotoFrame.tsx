'use client'

import { useEffect, useRef, useState } from 'react'
import type { Photo } from '@/src/domain/genchou-case'
import styles from './page.module.css'

type Props = {
  /** 画面と報告書での並び順。1 から数える。 */
  position: number
  label: string
  photo: Photo | null
  failed: boolean
  onPick: (file: File) => void
  onRemove: () => void
}

/**
 * 写真を1枚入れるための枠。
 *
 * 空の枠を押すと背面カメラが立ち上がる。枠の下の小さなボタンからは、
 * すでに端末にある画像を選べる。写真が入った枠を押すと、撮り直すか、
 * 画像から選び直すか、削除するかを選ぶ。
 */
export function PhotoFrame({ position, label, photo, failed, onPick, onRemove }: Props) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const pickerInput = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (photo === null) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(new Blob([photo.jpeg], { type: 'image/jpeg' }))
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const open = (input: HTMLInputElement | null) => {
    if (input === null) return
    // 同じ写真を選び直せるよう、開く前に選択を空にする。
    input.value = ''
    // 選ぶのをやめたときに操作の一覧が残らないよう、先に閉じる。
    setMenuOpen(false)
    input.click()
  }

  const receive = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file !== undefined) onPick(file)
  }

  return (
    <div className={styles.frame}>
      {photo === null ? (
        <button type="button" className={styles.empty} onClick={() => open(cameraInput.current)}>
          <span className={styles.emptyMark} aria-hidden="true" />
          <span className={styles.emptyText}>{position}枚目を撮る</span>
        </button>
      ) : (
        <button type="button" className={styles.filled} onClick={() => setMenuOpen(true)}>
          {preview !== null && <img className={styles.preview} src={preview} alt={label} />}
        </button>
      )}

      {photo === null && (
        <button type="button" className={styles.attach} onClick={() => open(pickerInput.current)}>
          {position}枚目を画像から選ぶ
        </button>
      )}

      {failed && (
        <p className={styles.frameError} role="status">
          この写真は読み取れませんでした。もう一度入れてください
        </p>
      )}

      <input
        ref={cameraInput}
        className={styles.hiddenInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={pickerInput}
        className={styles.hiddenInput}
        type="file"
        accept="image/*"
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
      />

      {menuOpen && (
        <div className={styles.menuBackdrop} role="dialog" aria-label={`${label}の操作`}>
          <div className={styles.menu}>
            <p className={styles.menuTitle}>{label}</p>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => open(cameraInput.current)}
            >
              撮り直す
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => open(pickerInput.current)}
            >
              画像から選び直す
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                onRemove()
                setMenuOpen(false)
              }}
            >
              削除する
            </button>
            <button
              type="button"
              className={styles.menuCancel}
              onClick={() => setMenuOpen(false)}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
