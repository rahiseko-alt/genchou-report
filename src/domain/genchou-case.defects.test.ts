import { describe, expect, it } from 'vitest'
import {
  DEFECT_FRAMES_PER_PAGE,
  type GenchouCase,
  type Photo,
  addDefectPage,
  beginCase,
  canAddDefectPage,
  defectPhotoCount,
  finishReadiness,
  toggleDefectStatus,
  withDefectNote,
  withDefectPhoto,
  withoutDefectPages,
  withoutDefectPhoto,
} from './genchou-case'

const photo = (id: string): Photo => ({
  id,
  jpeg: new TextEncoder().encode(id),
  quality: 0.82,
  width: 1600,
  height: 1200,
})

const started = beginCase({ today: '2026-09-16' })

/** ページ0から順に、指定した枚数ずつ埋めた案件を作る。 */
const fill = (...perPage: number[]): GenchouCase =>
  perPage.reduce((current, count, pageIndex) => {
    const withPage = pageIndex === 0 ? current : addDefectPage(current)
    return Array.from({ length: count }).reduce<GenchouCase>(
      (acc, _, frameIndex) => withDefectPhoto(acc, pageIndex, frameIndex, photo(`p${pageIndex}-${frameIndex}`)),
      withPage,
    )
  }, started)

describe('不具合ページ', () => {
  it('案件は空の枠4つを持つ1ページで始まる', () => {
    expect(started.defectPages).toHaveLength(1)
    expect(started.defectPages[0]).toEqual([null, null, null, null])
  })

  it('枠に写真を入れられる', () => {
    const filled = withDefectPhoto(started, 0, 2, photo('a'))

    expect(filled.defectPages[0][2]?.photo.id).toBe('a')
  })

  it('入れた直後はステータスも補足も空', () => {
    const filled = withDefectPhoto(started, 0, 0, photo('a'))

    expect(filled.defectPages[0][0]?.statuses).toEqual([])
    expect(filled.defectPages[0][0]?.note).toBe('')
  })

  it('枠から写真を外せる', () => {
    const emptied = withoutDefectPhoto(withDefectPhoto(started, 0, 1, photo('a')), 0, 1)

    expect(emptied.defectPages[0][1]).toBeNull()
  })

  it('入れても元の案件は変わらない', () => {
    withDefectPhoto(started, 0, 0, photo('a'))

    expect(started.defectPages[0][0]).toBeNull()
  })
})

describe('ステータス', () => {
  const one = withDefectPhoto(started, 0, 0, photo('a'))

  it('押すと付く', () => {
    const tagged = toggleDefectStatus(one, 0, 0, 'A')

    expect(tagged.defectPages[0][0]?.statuses).toEqual(['A'])
  })

  it('1枚に複数付けられる', () => {
    const tagged = toggleDefectStatus(toggleDefectStatus(one, 0, 0, 'A'), 0, 0, 'C')

    expect(tagged.defectPages[0][0]?.statuses).toEqual(['A', 'C'])
  })

  it('もう一度押すと外れる', () => {
    const tagged = toggleDefectStatus(toggleDefectStatus(one, 0, 0, 'A'), 0, 0, 'A')

    expect(tagged.defectPages[0][0]?.statuses).toEqual([])
  })

  it('写真の入っていない枠には付かない', () => {
    const tagged = toggleDefectStatus(started, 0, 1, 'A')

    expect(tagged.defectPages[0][1]).toBeNull()
  })

  it('他の枠のステータスは変わらない', () => {
    const two = withDefectPhoto(one, 0, 1, photo('b'))
    const tagged = toggleDefectStatus(two, 0, 0, 'A')

    expect(tagged.defectPages[0][1]?.statuses).toEqual([])
  })
})

describe('補足', () => {
  const one = withDefectPhoto(started, 0, 0, photo('a'))

  it('書き込める', () => {
    expect(withDefectNote(one, 0, 0, '雨漏りの跡').defectPages[0][0]?.note).toBe('雨漏りの跡')
  })

  it('写真の入っていない枠には書き込めない', () => {
    expect(withDefectNote(started, 0, 1, 'あ').defectPages[0][1]).toBeNull()
  })

  it('写真を外すとステータスも補足も消える', () => {
    const written = withDefectNote(toggleDefectStatus(one, 0, 0, 'A'), 0, 0, 'あ')
    const emptied = withoutDefectPhoto(written, 0, 0)

    expect(emptied.defectPages[0][0]).toBeNull()
  })
})

describe('ページの追加', () => {
  it('4枠すべて埋まるまで足せない', () => {
    expect(canAddDefectPage(fill(3))).toBe(false)
    expect(canAddDefectPage(fill(DEFECT_FRAMES_PER_PAGE))).toBe(true)
  })

  it('足すと空の枠4つのページが増える', () => {
    const added = addDefectPage(fill(DEFECT_FRAMES_PER_PAGE))

    expect(added.defectPages).toHaveLength(2)
    expect(added.defectPages[1]).toEqual([null, null, null, null])
  })

  it('足しても前のページはそのまま残る', () => {
    const added = addDefectPage(fill(DEFECT_FRAMES_PER_PAGE))

    expect(added.defectPages[0][0]?.photo.id).toBe('p0-0')
  })
})

describe('作成完了を押せるか', () => {
  it('不具合写真が1枚も無ければ押せない', () => {
    expect(finishReadiness(started).canProceed).toBe(false)
    expect(finishReadiness(started)).toMatchObject({ issues: ['noDefectPhotos'] })
  })

  it('1枚あれば押せる', () => {
    expect(finishReadiness(fill(1)).canProceed).toBe(true)
  })

  it('最後のページが2枚でも押せる', () => {
    expect(finishReadiness(fill(4, 2)).canProceed).toBe(true)
  })

  it('最後のページが空でも、前のページに写真があれば押せる', () => {
    expect(finishReadiness(fill(4, 0)).canProceed).toBe(true)
  })
})

describe('空のページの取り除き', () => {
  it('写真が1枚も無いページは落ちる', () => {
    expect(withoutDefectPages(fill(4, 0)).defectPages).toHaveLength(1)
  })

  it('写真のあるページは残る', () => {
    expect(withoutDefectPages(fill(4, 2)).defectPages).toHaveLength(2)
  })

  it('全部空でも1ページは残す', () => {
    expect(withoutDefectPages(started).defectPages).toHaveLength(1)
  })
})

describe('不具合写真の枚数', () => {
  it('ページをまたいで数える', () => {
    expect(defectPhotoCount(fill(4, 2))).toBe(6)
  })
})
