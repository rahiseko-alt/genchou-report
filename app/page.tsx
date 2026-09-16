import Link from 'next/link'
import styles from './page.module.css'

export default function TopPage() {
  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <h1 className={styles.title}>現調報告書</h1>
        <p className={styles.lead}>
          写真を撮って、状態を選ぶだけ。
          <br />
          報告書はその場で出来上がります。
        </p>
      </div>

      <Link href="/customer" className={styles.start}>
        スタート
      </Link>
    </main>
  )
}
