import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from './ui'
import { collectionsApi, type DeletePreview, type DeleteResult } from '../api/collections'

function fileSize(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

function errorText(e: unknown) {
  const err = e as { response?: { data?: { error?: string } }; message?: string }
  return err?.response?.data?.error || err?.message || 'Something went wrong'
}

/** "Delete collection + photos": shows what will go and what stays, asks for the album name, then deletes. */
export default function DeleteAlbumModal({ collectionId, onClose, onDeleted }: {
  collectionId: string; onClose: () => void; onDeleted: () => void
}) {
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<DeleteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    collectionsApi.deletePreview(collectionId).then(setPreview).catch(e => setError(errorText(e)))
  }, [collectionId])

  const run = async () => {
    setBusy(true)
    setError(null)
    try { setResult(await collectionsApi.deleteWithMedia(collectionId)) }
    catch (e) { setError(errorText(e)) }
    finally { setBusy(false) }
  }

  const close = () => {
    if (busy) return
    if (result) onDeleted()
    else onClose()
  }

  const nameOk = !!preview && typed.trim() === preview.name.trim()

  return (
    <Modal title="Delete collection + photos" onClose={close} size="lg">
      {!preview && !error && (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Counting albums and photos…</p>
      )}

      {preview && !result && (
        <div className="space-y-4 text-sm text-slate-700">
          <p className="font-medium text-slate-800 break-words">"{preview.path}"</p>
          <ul className="space-y-1.5">
            <li>{plural(preview.albums, 'album')} — this one and every album below it</li>
            <li className="text-rose-600 font-medium">
              {plural(preview.toDelete, 'file')} deleted for good, from the database and from B2
              {preview.toDelete > 0 && ` (${fileSize(preview.toDeleteBytes)})`}
            </li>
            {preview.keptInOtherAlbums > 0 && (
              <li>{plural(preview.keptInOtherAlbums, 'file')} kept — also in albums outside this one (only taken out of these)</li>
            )}
            {preview.keptInUse > 0 && (
              <li>
                {plural(preview.keptInUse, 'file')} kept — in use (only taken out of these albums):
                <ul className="mt-1 ml-4 max-h-32 overflow-y-auto text-xs text-slate-500 space-y-0.5">
                  {preview.inUse.map(u => <li key={u.mediaId} className="break-words">{u.fileName} — {u.usedAs}</li>)}
                </ul>
              </li>
            )}
          </ul>
          <p className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />This cannot be undone.
          </p>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">
              Type the album name to confirm: <span className="font-semibold text-slate-800">{preview.name}</span>
            </label>
            <input value={typed} onChange={e => setTyped(e.target.value)} disabled={busy} autoFocus
              className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-50" />
          </div>
          {busy && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" />Deleting — database first, then the B2 files. A big album can take a minute.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={close} disabled={busy}
              className="px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button onClick={run} disabled={!nameOk || busy}
              className="px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-40">
              Delete {plural(preview.albums, 'album')} and {plural(preview.toDelete, 'file')}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Deleted {plural(result.albumsDeleted, 'album')} and {plural(result.photosDeleted, 'file')}.</p>
          <p>
            B2: {plural(result.storageDeleted, 'file')} deleted
            {result.storageFailed > 0 && <span className="text-rose-600">, {plural(result.storageFailed, 'file')} failed (left on B2, see the API log)</span>}.
          </p>
          {(result.keptInOtherAlbums > 0 || result.keptInUse > 0) && (
            <p className="text-slate-500">
              Kept: {result.keptInOtherAlbums.toLocaleString()} still in other albums, {result.keptInUse.toLocaleString()} in use.
            </p>
          )}
          <div className="flex justify-end">
            <button onClick={close} className="px-4 py-2 text-sm bg-pink-500 text-white rounded-lg hover:bg-pink-600">Close</button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-600 break-words">{error}</p>}
    </Modal>
  )
}
