import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recallSurveyorName, rememberSurveyorName } from './last-surveyor'

describe('前回の担当者名の覚え書き', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    })
  })

  it('覚えた名前をそのまま返す', () => {
    rememberSurveyorName('田中')

    expect(recallSurveyorName()).toBe('田中')
  })

  it('まだ何も覚えていなければ空を返す', () => {
    expect(recallSurveyorName()).toBe('')
  })

  it('空白だけの名前は覚えない', () => {
    rememberSurveyorName('　 ')

    expect(recallSurveyorName()).toBe('')
  })

  it('保存が塞がれた端末でも入力を止めない', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('塞がれている')
        },
        setItem: () => {
          throw new Error('塞がれている')
        },
      },
    })

    expect(() => rememberSurveyorName('田中')).not.toThrow()
    expect(recallSurveyorName()).toBe('')
  })
})
