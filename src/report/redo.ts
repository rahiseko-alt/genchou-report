import { type GenchouCase, filledExteriorCount } from '@/src/domain'

/**
 * 完成プレビューの「やり直し」から戻れる画面の一覧。
 *
 * どの画面が並ぶかは案件の中身で決まる（不具合ページの数だけ増える）。
 * 純粋な計算だけを置き、画面の見せ方には触れない。
 */
export type RedoTarget = {
  title: string
  /** その画面にいま何が入っているかの一言。戻り先を選ぶ手がかりになる。 */
  summary: string
  href: string
}

export function redoTargets(genchouCase: GenchouCase): RedoTarget[] {
  const customerName = genchouCase.customer.customerName.trim()

  return [
    {
      title: '顧客情報',
      summary: customerName === '' ? '未入力' : customerName,
      href: '/customer',
    },
    {
      title: '外観写真',
      summary: `${filledExteriorCount(genchouCase.exteriorFrames)} 枚`,
      href: '/exterior',
    },
    ...genchouCase.defectPages.map((page, index) => ({
      title: `不具合写真 ${index + 1}ページ目`,
      summary: `${page.filter((frame) => frame !== null).length} 枚`,
      href: `/defects?page=${index + 1}`,
    })),
  ]
}
