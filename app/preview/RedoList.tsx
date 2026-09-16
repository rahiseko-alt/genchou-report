'use client'

import { useState } from 'react'
import type { GenchouCase } from '@/src/domain'
import { redoTargets } from '@/src/report/redo'
import styles from './page.module.css'

/**
 * 完成プレビューから、直したい画面へ戻るための折りたたみ。
 *
 * 戻り先には `from=preview` を添える。戻った先は「プレビューへ戻る」を出し、
 * 「次へ」を繰り返さずに一足で戻れる。
 */
export function RedoList({
  genchouCase,
  onPick,
}: {
  genchouCase: GenchouCase
  onPick: (href: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.redo}>
      <button
        type="button"
        className={styles.redoToggle}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        やり直す
        <span className={open ? styles.redoMarkOpen : styles.redoMark} aria-hidden="true" />
      </button>

      {open && (
        <ul className={styles.redoList}>
          {redoTargets(genchouCase).map((target) => (
            <li key={target.href}>
              <button
                type="button"
                className={styles.redoItem}
                onClick={() =>
                  onPick(`${target.href}${target.href.includes('?') ? '&' : '?'}from=preview`)
                }
              >
                <span className={styles.redoItemTitle}>{target.title}</span>
                <span className={styles.redoItemSummary}>{target.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
