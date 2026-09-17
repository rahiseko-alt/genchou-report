import type { CustomerInfo } from '@/src/domain'

/**
 * 会社へ送るメールの文面。
 *
 * **文面を変えるときはここだけを直す。** 送信の仕組みとは切り離してある。
 */

/** ファイル名に使えない文字。Windows と macOS の双方で避けるべきもの。 */
const UNUSABLE_IN_FILE_NAME = /[/\\:*?"<>|]/g

/** 添付ファイル名の長さの上限。長すぎる名前でメールソフトが困らないように。 */
const MAX_FILE_NAME_LENGTH = 100

export function mailSubject(customer: CustomerInfo): string {
  return `【現調報告書】${customer.customerName} 様`
}

export function attachmentFileName(customer: CustomerInfo): string {
  const suffix = '_現調報告書.pdf'
  const date = customer.surveyedOn.replaceAll('-', '')
  const prefix = date === '' ? '' : `${date}_`

  const cleaned = customer.customerName.replace(UNUSABLE_IN_FILE_NAME, '').trim()
  const name = cleaned === '' ? '顧客名なし' : cleaned

  const room = MAX_FILE_NAME_LENGTH - prefix.length - suffix.length
  return `${prefix}${name.slice(0, room)}${suffix}`
}

export function mailBody(customer: CustomerInfo): string {
  return [
    '現調報告書を送ります。PDF を添付しています。',
    '',
    `顧客名　　: ${customer.customerName}`,
    `物件住所　: ${customer.propertyAddress}`,
    `調査日　　: ${customer.surveyedOn}`,
    `担当者　　: ${customer.surveyorName}`,
    '',
    'このメールは現調報告書アプリから自動で送っています。',
  ].join('\n')
}
