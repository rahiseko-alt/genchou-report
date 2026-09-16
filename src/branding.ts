/**
 * アプリの名前と色。画面・ホーム画面の見え方・報告書が同じ値を見るための1箇所。
 *
 * CSS から参照できないため、`app/globals.css` の `--brand` と `--bg` には
 * 同じ色を直接書いている。色を変えるときは両方を直すこと。
 */
export const APP_NAME = '現調報告書'
export const APP_SHORT_NAME = '現調報告'
export const APP_DESCRIPTION = '現調の写真と所見を、その場で報告書にまとめて会社へ送る'

/** 見出しとスタートボタンの濃紺。`--brand` と同じ値。 */
export const BRAND_COLOR = '#1f3a5f'
/** 画面の下地。`--bg` と同じ値。 */
export const BACKGROUND_COLOR = '#f4f5f7'
