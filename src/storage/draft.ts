import type { GenchouCase } from '@/src/domain'

/**
 * 作りかけの案件（下書き）を、その端末の中だけに預ける。
 *
 * 現場では電話が入ったり電池が切れたりする。次に開いたとき続きから再開できるよう、
 * 変わるたびに書き出す。写真をそのまま持てる必要があるので IndexedDB を使う
 * （localStorage では容量が足りない）。
 *
 * ここに置いたものはサーバーへ送られない。送付は「完了」を押したときだけ。
 */

const DB_NAME = 'genchou-report'
const DB_VERSION = 1
const STORE = 'draft'
/** 端末に残る案件はつねに1件。取り違えが起きないよう鍵を固定する。 */
const KEY = 'current'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('下書きを開けない'))
  })
}

/**
 * 書き込みは1件ずつ順番に行う。
 *
 * 書き出しには間があるため、並べて走らせると順番が入れ替わる。
 * 送り終えて消したあとに、その前の書き出しが届いて下書きが生き返ることがある。
 */
let queue: Promise<unknown> = Promise.resolve()

function inOrder<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work)
  // 失敗しても後ろがつかえないよう、列そのものは常に解決させる。
  queue = next.catch(() => undefined)
  return next
}

async function withStore<T>(
  mode: IDBTransactionMode,
  use: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      const request = use(transaction.objectStore(STORE))
      // やりとりが終わってから確定とする。request の成功だけでは書き込みが
      // 確定しておらず、直後に閉じられると消えることがある。
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error ?? new Error('下書きを扱えない'))
      request.onerror = () => reject(request.error ?? new Error('下書きを扱えない'))
    })
  } finally {
    database.close()
  }
}

/**
 * 下書きを書き出す。
 *
 * 保存が塞がれている端末（閲覧モードなど）でも入力は続けられるべきなので、
 * 失敗しても投げない。保存できなかったことは戻り値で知らせる。
 */
export function saveDraft(genchouCase: GenchouCase): Promise<boolean> {
  return inOrder(async () => {
    try {
      await withStore('readwrite', (store) => store.put(genchouCase, KEY))
      return true
    } catch {
      return false
    }
  })
}

export function loadDraft(): Promise<GenchouCase | null> {
  return inOrder(async () => {
    try {
      const stored = await withStore<GenchouCase | undefined>('readonly', (store) => store.get(KEY))
      return stored ?? null
    } catch {
      return null
    }
  })
}

export function clearDraft(): Promise<void> {
  return inOrder(async () => {
    try {
      await withStore('readwrite', (store) => store.delete(KEY))
    } catch {
      // 消せなくても、次に始めたときに上書きされる。
    }
  })
}
