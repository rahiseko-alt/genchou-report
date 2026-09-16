'use client'

import { useEffect, useState } from 'react'
import type { Photo } from '@/src/domain'
import type { ReportPage } from '@/src/report/layout'
import styles from './page.module.css'

/** 写真のバイト列を、画面に出せる入れ物に変える。外れたら必ず片づける。 */
function usePhotoUrls(photos: Photo[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const key = photos.map((photo) => photo.id).join(',')

  useEffect(() => {
    const made = new Map<string, string>()
    for (const photo of photos) {
      made.set(photo.id, URL.createObjectURL(new Blob([photo.jpeg], { type: 'image/jpeg' })))
    }
    setUrls(made)
    return () => {
      for (const url of made.values()) URL.revokeObjectURL(url)
    }
    // 写真の顔ぶれが変わったときだけ作り直す。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return urls
}

/**
 * 報告書の1ページぶんを、A4 縦の比のまま見せる。
 *
 * 割り付け（どのページに何がどの順で載るか）は PDF と同じものを読む。
 * 字体や行の折り返しまでは一致しない（docs/adr/0002）。
 */
export function ReportPageView({ page, pageCount }: { page: ReportPage; pageCount: number }) {
  const photos = [...page.exterior, ...page.defects.map((entry) => entry.photo)]
  const urls = usePhotoUrls(photos)

  return (
    <section className={styles.sheet} aria-label={`報告書 ${page.number}ページ目`}>
      {page.heading !== null && (
        <header className={styles.sheetHead}>
          <h2 className={styles.sheetTitle}>現調報告書</h2>
          <dl className={styles.headRows}>
            <div className={styles.headRow}>
              <dt>顧客名</dt>
              <dd>{page.heading.customerName}</dd>
            </div>
            <div className={styles.headRow}>
              <dt>物件住所</dt>
              <dd>{page.heading.propertyAddress}</dd>
            </div>
            <div className={styles.headRow}>
              <dt>調査日</dt>
              <dd>{page.heading.surveyedOn}</dd>
            </div>
            <div className={styles.headRow}>
              <dt>担当者</dt>
              <dd>{page.heading.surveyorName}</dd>
            </div>
          </dl>
        </header>
      )}

      {page.exterior.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>外観</h3>
          <div className={styles.exteriorGrid}>
            {page.exterior.map((photo, index) => (
              <img
                key={photo.id}
                className={styles.exteriorPhoto}
                src={urls.get(photo.id)}
                alt={`外観写真 ${index + 1}枚目`}
              />
            ))}
          </div>
        </>
      )}

      {page.defects.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>不具合</h3>
          <div className={styles.defectGrid}>
            {page.defects.map((entry, index) => (
              <figure key={entry.photo.id} className={styles.defectCell}>
                <img
                  className={styles.defectPhoto}
                  src={urls.get(entry.photo.id)}
                  alt={`不具合写真 ${(page.number - 1) * 4 + index + 1}枚目`}
                />
                <figcaption className={styles.defectCaption}>
                  {entry.statuses.length > 0 && (
                    <span className={styles.statuses}>{entry.statuses.join('　')}</span>
                  )}
                  {entry.note !== '' && <span className={styles.note}>{entry.note}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      <p className={styles.sheetFoot}>
        {page.number} / {pageCount}
      </p>
    </section>
  )
}
