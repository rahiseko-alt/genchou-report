/**
 * 画面の中身が整うまでのあいだ、見出しだけを出す。
 *
 * 真っ白にしないためのもの。入力欄をここで出さないのは、中身が整う前に打った
 * 内容が消えるため。
 */
export function ScreenSkeleton({ title }: { title: string }) {
  return (
    <main className="screen">
      <h1 className="screenTitle">{title}</h1>
    </main>
  )
}
