import { useState, useRef, useCallback } from 'react'
import { Button } from '../components/ui'
import { usePersons } from '../hooks/usePersons'
import { uploadApi, TreeResponse } from '../api/collections'
import type { PersonSummary } from '../types'

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface FileItem {
  id: string
  file: File
  relativePath: string
  folder: string
  status: FileStatus
  progress: number
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function parseFolderPath(relativePath: string): { folder: string; rootName: string } {
  const parts = relativePath.split('/')
  if (parts.length <= 1) return { folder: '', rootName: '' }
  return { folder: parts.length > 2 ? parts.slice(1, -1).join('/') : '', rootName: parts[0] }
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

export default function UploadPage() {
  const { data: persons = [] } = usePersons()
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [rootName, setRootName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const folderRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  const handleFiles = useCallback((fileList: FileList) => {
    const items: FileItem[] = []
    let detectedRoot = ''
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) continue
      const path = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name
      const { folder, rootName: rn } = parseFolderPath(path)
      if (rn && !detectedRoot) detectedRoot = rn
      items.push({ id: Math.random().toString(36).slice(2), file: f, relativePath: path, folder, status: 'pending', progress: 0 })
    }
    if (detectedRoot && !rootName) setRootName(detectedRoot)
    setFiles(prev => [...prev, ...items])
    setDone(false)
  }, [rootName])

  const updateFile = (id: string, patch: Partial<FileItem>) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  const folders = [...new Set(files.map(f => f.folder).filter(Boolean))].sort()

  const folderTree = () => {
    const tree: Record<string, number> = {}
    tree['(root)'] = files.filter(f => !f.folder).length
    folders.forEach(f => { tree[f] = files.filter(fi => fi.folder === f).length })
    return tree
  }

  const startUpload = async () => {
    if (!rootName.trim()) return
    setUploading(true); setDone(false); setLog([]); abortRef.current = false

    try {
      addLog(`Creating collection: ${rootName}`)
      const treeResp: TreeResponse = await uploadApi.createTree({
        rootName: rootName.trim(),
        personIds: selectedPerson ? [selectedPerson.id] : undefined,
        folders,
      })
      addLog(`✓ Created (${folders.length} sub-folders)`)

      const pathToCollectionId: Record<string, string> = { '': treeResp.rootId, ...treeResp.pathToId }
      const pending = files.filter(f => f.status === 'pending')
      let doneCount = 0, errorCount = 0

      for (const item of pending) {
        if (abortRef.current) break
        updateFile(item.id, { status: 'uploading' })
        try {
          const media = await uploadApi.uploadFile(item.file, selectedPerson?.id, rootName.trim())
          const collectionId = pathToCollectionId[item.folder] || treeResp.rootId
          await uploadApi.linkMediaToCollection(collectionId, media.id)
          updateFile(item.id, { status: 'done', progress: 100 })
          doneCount++
        } catch (err) {
          updateFile(item.id, { status: 'error' })
          errorCount++
          addLog(`✗ ${item.relativePath}`)
        }
      }
      addLog(`Done: ${doneCount} uploaded${errorCount ? `, ${errorCount} failed` : ''}`)
    } catch (err) {
      addLog(`✗ Failed: ${err}`)
    }
    setUploading(false); setDone(true)
  }

  const counts = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    done: files.filter(f => f.status === 'done').length,
    error: files.filter(f => f.status === 'error').length,
  }

  return (
    <div className="p-3 md:p-6 lg:p-8">
      <h1 className="text-lg md:text-xl font-semibold text-slate-800 mb-5">Upload</h1>

      {/* Person picker */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-2">Person (optional)</label>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setSelectedPerson(null)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors active:scale-95 ${
              !selectedPerson ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}>None</button>
          {persons.map((p: PersonSummary) => (
            <button key={p.id} onClick={() => setSelectedPerson(p)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors active:scale-95 ${
                selectedPerson?.id === p.id ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-500'
              }`}>{p.displayName || p.name}</button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {!uploading && files.length === 0 && (
        <div className="space-y-3">
          {/* Folder select (desktop) */}
          {!isMobile && (
            <div onClick={() => folderRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-10 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 active:bg-pink-50/50 transition-colors">
              <div className="text-2xl mb-1.5">📁</div>
              <div className="text-sm text-slate-600 mb-1">Select a folder</div>
              <div className="text-[11px] text-slate-400">Folder structure preserved as Collections</div>
              <input ref={folderRef} type="file" className="hidden"
                {...{ webkitdirectory: '', directory: '', multiple: true } as React.InputHTMLAttributes<HTMLInputElement>}
                onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }} />
            </div>
          )}

          {/* File select (mobile fallback + desktop alternative) */}
          <div onClick={() => filesRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 md:p-10 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 active:bg-pink-50/50 transition-colors">
            <div className="text-2xl mb-1.5">🖼️</div>
            <div className="text-sm text-slate-600 mb-1">{isMobile ? 'Select photos & videos' : 'Or select files'}</div>
            <div className="text-[11px] text-slate-400">JPG, PNG, WebP, MP4 — multiple</div>
            <input ref={filesRef} type="file" className="hidden" multiple accept="image/*,video/*"
              onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }} />
          </div>
        </div>
      )}

      {files.length > 0 && (
        <>
          {/* Root name */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Collection Name</label>
            <input className="w-full px-3 py-2.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 outline-none"
              value={rootName} onChange={e => setRootName(e.target.value)} disabled={uploading} placeholder="Enter name..." />
          </div>

          {/* Tree preview */}
          {folders.length > 0 && (
            <div className="bg-white rounded-xl p-3 md:p-4 border border-slate-100 mb-4">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Structure</h3>
              <div className="font-mono text-[11px] space-y-0.5">
                {Object.entries(folderTree()).map(([path, count]) => (
                  <div key={path} className="flex gap-1.5">
                    <span className="text-pink-400">📂</span>
                    <span className="text-slate-600 truncate flex-1">{path === '(root)' ? rootName || '(root)' : `${rootName}/${path}`}</span>
                    <span className="text-slate-300 shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary + controls */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">{counts.total} files</span>
            {counts.pending > 0 && <span className="text-[11px] text-slate-400">⏳{counts.pending}</span>}
            {counts.done > 0 && <span className="text-[11px] text-green-500">✓{counts.done}</span>}
            {counts.error > 0 && <span className="text-[11px] text-rose-500">✗{counts.error}</span>}

            <div className="ml-auto flex gap-2">
              {!uploading && !done && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setDone(false); setLog([]) }}>Clear</Button>
                  <Button size="sm" onClick={startUpload} disabled={!rootName.trim()}>Upload {counts.pending}</Button>
                </>
              )}
              {uploading && <Button variant="danger" size="sm" onClick={() => { abortRef.current = true }}>Stop</Button>}
              {done && <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setDone(false); setLog([]); setRootName('') }}>New</Button>}
            </div>
          </div>

          {/* Progress */}
          {(uploading || done) && (
            <div className="h-1 bg-slate-100 rounded-full mb-4">
              <div className="h-full rounded-full bg-pink-500 transition-all duration-300"
                style={{ width: `${counts.total ? ((counts.done + counts.error) / counts.total * 100) : 0}%` }} />
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-2.5 mb-4 max-h-24 overflow-y-auto">
              {log.map((l, i) => <div key={i} className="text-[10px] md:text-xs font-mono text-slate-300">{l}</div>)}
            </div>
          )}

          {/* File list */}
          <div className="space-y-0.5 max-h-[50vh] overflow-y-auto">
            {files.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-white rounded-lg border border-slate-50 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  item.status === 'done' ? 'bg-green-400' :
                  item.status === 'error' ? 'bg-rose-400' :
                  item.status === 'uploading' ? 'bg-pink-400 animate-pulse' : 'bg-slate-200'
                }`} />
                <span className="text-slate-600 truncate flex-1">{item.relativePath}</span>
                <span className="text-slate-300 shrink-0">{fmtSize(item.file.size)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
