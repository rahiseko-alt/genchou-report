'use client'

import styles from './page.module.css'

/** 送り終えたあとの画面。ここまで来れば、担当者のすることは終わっている。 */
export function SentScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <main className={styles.done}>
      <p className={styles.doneMark} aria-hidden="true" />
      <h1 className={styles.doneTitle}>送りました</h1>
      <p className={styles.doneText}>会社あてにメールが届いています。</p>
      <button type="button" className={styles.send} onClick={onRestart}>
        最初の画面へ
      </button>
    </main>
  )
}
