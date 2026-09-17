import type { Photo } from '@/src/domain/genchou-case'
import { JPEG_QUALITIES, type JpegQuality } from './budget'
import { LONG_EDGE, fitWithin } from './scale'

/**
 * カメラや画像添付から受け取ったファイルを、枠に収まる1枚に整える。
 *
 * ここはブラウザの機能（画像の読み取り・canvas）に触れる層。
 * 大きさをいくつにするかの判断は `scale.ts` に置き、そちらだけを単体で確かめる。
 */

export async function importPhoto(
  file: File,
  { longEdge = LONG_EDGE, quality = JPEG_QUALITIES[0] }: { longEdge?: number; quality?: JpegQuality } = {},
): Promise<Photo> {
  const source = await decode(file)
  const size = fitWithin({ width: source.naturalWidth, height: source.naturalHeight }, longEdge)

  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height

  const context = canvas.getContext('2d')
  if (context === null) throw new Error('写真を描き直せない')
  context.drawImage(source, 0, 0, size.width, size.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (blob === null) throw new Error('写真を保存できない')

  const jpeg = new Uint8Array(await blob.arrayBuffer())

  return { id: crypto.randomUUID(), jpeg, quality, width: size.width, height: size.height }
}

/**
 * すでに取り込んだ写真を、低い画質で入れ直す。
 *
 * 送り出す中身が上限に収まらないときに使う。もとのファイルはもう手元に無いので、
 * 取り込み済みの JPEG を読み直して入れ直す。大きさは変えない。
 */
export async function reencodePhoto(photo: Photo, quality: JpegQuality): Promise<Photo> {
  const file = new File([photo.jpeg], `${photo.id}.jpg`, { type: 'image/jpeg' })
  const source = await decode(file)

  const canvas = document.createElement('canvas')
  canvas.width = photo.width
  canvas.height = photo.height

  const context = canvas.getContext('2d')
  if (context === null) throw new Error('写真を描き直せない')
  context.drawImage(source, 0, 0, photo.width, photo.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (blob === null) throw new Error('写真を保存できない')

  return { ...photo, jpeg: new Uint8Array(await blob.arrayBuffer()), quality }
}

/**
 * 画像を、撮ったときの向きのまま読み取る。
 *
 * スマートフォンの写真は、横向きに保存して「右に90度回して見せる」という
 * 指示（EXIF の回転情報）を持つことがある。その指示に従わないと、縦位置で
 * 撮った写真が横倒しのまま報告書に載る。
 *
 * img はこの指示に従って読み込む決まりになっており、`naturalWidth` と
 * `naturalHeight` も回した後の値になる。canvas へ描くときも同じ向きで写る。
 *
 * createImageBitmap を使わないのは、回転の扱いを指示する引数を黙って無視する
 * 実装があり、そのとき横倒しのまま取り込まれてしまうため。無視されたことを
 * こちら側から知る手立てがない。
 */
function decode(file: File): Promise<HTMLImageElement> {
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
