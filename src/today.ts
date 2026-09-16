/** 端末の暦での今日を `YYYY-MM-DD` で返す。UTC へ寄せると日付が1日ずれる。 */
export function today(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
