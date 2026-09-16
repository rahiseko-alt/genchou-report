import { describe, expect, it } from 'vitest'
import {
  type Photo,
  beginCase,
  exteriorReadiness,
  withExteriorPhoto,
  withoutExteriorPhoto,
} from './genchou-case'

const photo = (id: string): Photo => ({
  id,
  blob: new Blob([id], { type: 'image/jpeg' }),
  width: 1600,
  height: 1200,
})

const started = beginCase({ today: '2026-09-16' })

const withPhotos = (...indexes: number[]) =>
  indexes.reduce((current, index) => withExteriorPhoto(current, index, photo(`p${index}`)), started)

describe('外観写真の枠', () => {
  it('案件は空の枠を4つ持って始まる', () => {
    expect(started.exteriorPhotos).toEqual([null, null, null, null])
  })

  it('枠に写真を入れられる', () => {
    const filled = withExteriorPhoto(started, 2, photo('a'))

    expect(filled.exteriorPhotos[2]?.id).toBe('a')
    expect(filled.exteriorPhotos[0]).toBeNull()
  })

  it('写真の入った枠を入れ替えられる', () => {
    const filled = withExteriorPhoto(withExteriorPhoto(started, 0, photo('a')), 0, photo('b'))

    expect(filled.exteriorPhotos[0]?.id).toBe('b')
  })

  it('枠から写真を外せる', () => {
    const emptied = withoutExteriorPhoto(withExteriorPhoto(started, 1, photo('a')), 1)

    expect(emptied.exteriorPhotos[1]).toBeNull()
  })

  it('入れても元の案件は変わらない', () => {
    withExteriorPhoto(started, 0, photo('a'))

    expect(started.exteriorPhotos[0]).toBeNull()
  })

  it('枠の並び順が入れた場所のまま保たれる', () => {
    const filled = withExteriorPhoto(withExteriorPhoto(started, 3, photo('d')), 1, photo('b'))

    expect(filled.exteriorPhotos.map((slot) => slot?.id ?? null)).toEqual([null, 'b', null, 'd'])
  })
})

describe('外観の画面から次へ進めるか', () => {
  it('4枚揃うまで進めない', () => {
    expect(exteriorReadiness(withPhotos(0, 1, 2).exteriorPhotos).canProceed).toBe(false)
  })

  it('1枚も無ければ進めない', () => {
    const readiness = exteriorReadiness(started.exteriorPhotos)

    expect(readiness.canProceed).toBe(false)
    expect(readiness).toMatchObject({ issues: ['exteriorPhotosIncomplete'] })
  })

  it('4枚揃えば進める', () => {
    expect(exteriorReadiness(withPhotos(0, 1, 2, 3).exteriorPhotos).canProceed).toBe(true)
  })

  it('飛ばした枠があれば、枚数が同じでも進めない', () => {
    const filled = withPhotos(0, 1, 3)

    expect(exteriorReadiness(filled.exteriorPhotos).canProceed).toBe(false)
  })
})
