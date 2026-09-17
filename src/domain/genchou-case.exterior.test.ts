import { describe, expect, it } from 'vitest'
import {
  type Photo,
  beginCase,
  exteriorReadiness,
  filledExteriorCount,
  withExteriorLabel,
  withExteriorPhoto,
  withoutExteriorPhoto,
} from './genchou-case'

const photo = (id: string): Photo => ({
  id,
  jpeg: new TextEncoder().encode(id),
  quality: 0.82,
  width: 1600,
  height: 1200,
})

const started = beginCase({ today: '2026-09-16' })

const withPhotos = (...indexes: number[]) =>
  indexes.reduce((current, index) => withExteriorPhoto(current, index, photo(`p${index}`)), started)

describe('外観写真の枠', () => {
  it('案件は空の枠を4つ持って始まる', () => {
    expect(started.exteriorFrames).toEqual([null, null, null, null])
  })

  it('枠に写真を入れられる', () => {
    const filled = withExteriorPhoto(started, 2, photo('a'))

    expect(filled.exteriorFrames[2]?.id).toBe('a')
    expect(filled.exteriorFrames[0]).toBeNull()
  })

  it('写真の入った枠を入れ替えられる', () => {
    const filled = withExteriorPhoto(withExteriorPhoto(started, 0, photo('a')), 0, photo('b'))

    expect(filled.exteriorFrames[0]?.id).toBe('b')
  })

  it('枠から写真を外せる', () => {
    const emptied = withoutExteriorPhoto(withExteriorPhoto(started, 1, photo('a')), 1)

    expect(emptied.exteriorFrames[1]).toBeNull()
  })

  it('入れても元の案件は変わらない', () => {
    withExteriorPhoto(started, 0, photo('a'))

    expect(started.exteriorFrames[0]).toBeNull()
  })

  it('枠の並び順が入れた場所のまま保たれる', () => {
    const filled = withExteriorPhoto(withExteriorPhoto(started, 3, photo('d')), 1, photo('b'))

    expect(filled.exteriorFrames.map((slot) => slot?.id ?? null)).toEqual([null, 'b', null, 'd'])
  })
})

describe('埋まっている枠の数', () => {
  it('まだ1枚も入っていなければ0', () => {
    expect(filledExteriorCount(started.exteriorFrames)).toBe(0)
  })

  it('飛ばした枠があっても、入っている枚数を数える', () => {
    expect(filledExteriorCount(withPhotos(0, 3).exteriorFrames)).toBe(2)
  })
})

describe('外観の画面から次へ進めるか', () => {
  it('4枚揃うまで進めない', () => {
    expect(exteriorReadiness(withPhotos(0, 1, 2).exteriorFrames).canProceed).toBe(false)
  })

  it('1枚も無ければ進めない', () => {
    const readiness = exteriorReadiness(started.exteriorFrames)

    expect(readiness.canProceed).toBe(false)
    expect(readiness).toMatchObject({ issues: ['exteriorFramesIncomplete'] })
  })

  it('4枚揃えば進める', () => {
    expect(exteriorReadiness(withPhotos(0, 1, 2, 3).exteriorFrames).canProceed).toBe(true)
  })

  it('飛ばした枠があれば、枚数が同じでも進めない', () => {
    const filled = withPhotos(0, 1, 3)

    expect(exteriorReadiness(filled.exteriorFrames).canProceed).toBe(false)
  })
})

describe('外観の枠の見出し', () => {
  it('正面・右・左・裏で始まる', () => {
    expect(started.exteriorLabels).toEqual(['正面', '右', '左', '裏'])
  })

  it('書き換えられる', () => {
    const renamed = withExteriorLabel(started, 2, '北側の壁')

    expect(renamed.exteriorLabels[2]).toBe('北側の壁')
  })

  it('他の枠の見出しは変わらない', () => {
    const renamed = withExteriorLabel(started, 0, '玄関')

    expect(renamed.exteriorLabels[1]).toBe('右')
  })

  it('空にすると、もとの見出しに戻る', () => {
    const cleared = withExteriorLabel(withExteriorLabel(started, 1, '東'), 1, '  ')

    expect(cleared.exteriorLabels[1]).toBe('右')
  })

  it('書き換えても元の案件は変わらない', () => {
    withExteriorLabel(started, 0, '玄関')

    expect(started.exteriorLabels[0]).toBe('正面')
  })
})
