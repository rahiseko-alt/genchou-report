import type { Photo } from '@/src/domain/genchou-case'
import { LONG_EDGE, fitWithin } from './scale'

/**
 * カメラや画像添付から受け取ったファイルを、枠に収まる1枚に整える。
 *
 * ここはブラウザの機能（canvas・画像の読み取り）に触れる層。
 * 大きさをいくつにするかの判断は `scale.ts` に置き、そちらだけを単体で確かめる。
 */

/** 再符号化するときの画質。容量に合わせた引き下げは Issue #7。 */
const JPEG_QUALITY = 0.82

export async function importPhoto(file: File, longEdge: number = LONG_EDGE): Promise<Photo> {
  const source = await decode(file)
  const size = fitWithin({ width: source.width, height: source.height }, longEdge)

  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (context === null) throw new Error('写真を描き直せない')
  context.drawImage(source, 0, 0, size.width, size.height)
  if ('close' in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (blob === null) throw new Error('写真を保存できない')

  return { id: crypto.randomUUID(), blob, width: size.width, height: size.height }
}

/**
 * 画像を、撮ったときの向きのまま読み取る。
 *
 * スマートフォンの写真は、横向きに保存して「右に90度回して見せる」という
 * 指示（EXIF の回転情報）を持つことがある。その指示を読んだ状態で取り出さないと、
 * 縦位置で撮った写真が横倒しのまま報告書に載る。
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 古い端末では上の呼び方が通らない。img は既定で回転の指示に従う。
    return await decodeWithImageElement(file)
  }
}

function decodeWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('写真を読み取れない'))
    }
    image.src = url
  })
}
