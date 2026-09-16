/**
 * 前回の担当者名。毎回打ち直さずに済ませるための、その端末だけの覚え書き。
 *
 * 案件そのものの保存（中断と再開）は Issue #10 の担当で、ここでは扱わない。
 */
const KEY = 'genchou.lastSurveyorName'

export function readLastSurveyorName(): string {
  try {
    return window.localStorage.getItem(KEY) ?? ''
  } catch {
    // 閲覧モードや保存が塞がれた端末では読めない。空として扱う。
    return ''
  }
}

export function rememberSurveyorName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name)
  } catch {
    // 覚えられなくても入力は続けられる。
  }
}
