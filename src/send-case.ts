import type { GenchouCase } from '@/src/domain'

/**
 * 案件をサーバーへ送り出す。
 *
 * 写真は base64 に直して JSON で運ぶ。中身の組み立てと送信はサーバーの役目で、
 * ここは「送る」と「結果を持ち帰る」だけを引き受ける。
 */

export type SendResult =
  | { ok: true; fileName: string; pageCount: number }
  | { ok: false; message: string }

export type SendState = 'idle' | 'sending' | 'sent' | 'failed'

export function serializeCase(genchouCase: GenchouCase) {
  return {
    customer: genchouCase.customer,
    exteriorFrames: genchouCase.exteriorFrames.map((frame) =>
      frame === null ? null : serializePhoto(frame),
    ),
    defectPages: genchouCase.defectPages.map((page) =>
      page.map((frame) =>
        frame === null
          ? null
          : { photo: serializePhoto(frame.photo), statuses: frame.statuses, note: frame.note },
      ),
    ),
  }
}

function serializePhoto(photo: { id: string; jpeg: Uint8Array; quality: number; width: number; height: number }) {
  return {
    id: photo.id,
    jpeg: toBase64(photo.jpeg),
    quality: photo.quality,
    width: photo.width,
    height: photo.height,
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  // 一度に渡すと、写真1枚ぶんの長さで呼び出しが詰まる端末がある。
  const CHUNK = 0x8000
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

/** 送り出す中身のおおよその大きさ。base64 にすると約 4/3 に膨らむ。 */
export function estimateUploadBytes(genchouCase: GenchouCase): number {
  const photos = [
    ...genchouCase.exteriorFrames.filter((frame) => frame !== null),
    ...genchouCase.defectPages.flat().filter((frame) => frame !== null).map((frame) => frame.photo),
  ]
  const jpegBytes = photos.reduce((total, photo) => total + photo.jpeg.length, 0)
  return Math.ceil(jpegBytes * 1.34)
}

export async function sendCase(genchouCase: GenchouCase): Promise<SendResult> {
  let response: Response
  try {
    response = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeCase(genchouCase)),
    })
  } catch {
    return { ok: false, message: '送れませんでした。電波の届く場所でもう一度お試しください' }
  }

  let outcome: unknown
  try {
    outcome = await response.json()
  } catch {
    return { ok: false, message: '送れませんでした。もう一度お試しください' }
  }

  if (response.ok && isSuccess(outcome)) {
    return { ok: true, fileName: outcome.fileName, pageCount: outcome.pageCount }
  }

  return { ok: false, message: messageFor(response.status) }
}

function isSuccess(outcome: unknown): outcome is { fileName: string; pageCount: number } {
  return typeof outcome === 'object' && outcome !== null && 'fileName' in outcome
}

function messageFor(status: number): string {
  if (status === 503) return '送り先がまだ設定されていません。管理者に連絡してください'
  if (status === 413) return '写真が重すぎて送れませんでした。枚数を減らしてお試しください'
  if (status === 400) return '報告書の中身に足りないところがあります'
  return '送れませんでした。もう一度お試しください'
}
