import { useState, useRef, useCallback } from 'react'
import { Button } from '../components/ui'
import { usePersons } from '../hooks/usePersons'
import { uploadApi, TreeResponse } from '../api/collections'
import type { PersonSummary } from '../types'

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface FileItem {
  id: string
  file: File
  relativePath: string // "2010/photo1.jpg"
  folder: string       // "2010" or ""
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
  const rootName = parts[0]
  const folder = parts.length > 2 ? parts.slice(1, -1).join('/') : ''
  return { folder, rootName }
}

export default function UploadPage() {
  const { data: persons = [] } = usePersons()
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [rootName, setRootName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
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

      items.push({
        id: Math.random().toString(36).slice(2),
        file: f,
        relativePath: path,
        folder,
        status: 'pending',
        progress: 0,
      })
    }

    if (detectedRoot && !rootName) setRootName(detectedRoot)
    setFiles(prev => [...prev, ...items])
    setDone(false)
  }, [rootName])

  const updateFile = (id: string, patch: Partial<FileItem>) =>
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))

  // Get unique folders from files
  const folders = [...new Set(files.map(f => f.folder).filter(Boolean))].sort()

  const folderTree = () => {
    const tree: Record<string, number> = {}
    tree['(root)'] = files.filter(f => !f.folder).length
    folders.forEach(f => { tree[f] = files.filter(fi => fi.folder === f).length })
    return tree
  }

  const startUpload = async () => {
    if (!rootName.trim()) return
    setUploading(true)
    setDone(false)
    setLog([])
    abortRef.current = false

    try {
      // Step 1: Create collection tree
      addLog(`Creating collection tree: ${rootName}`)
      const treeResp: TreeResponse = await uploadApi.createTree({
        rootName: rootName.trim(),
        personIds: selectedPerson ? [selectedPerson.id] : undefined,
        folders,
      })
      addLog(`✓ Root collection created (${folders.length} sub-folders)`)

      // Build path → collectionId map
      const pathToCollectionId: Record<string, string> = {
        '': treeResp.rootId,
        ...treeResp.pathToId,
      }

      // Step 2: Upload files one by one
      const pending = files.filter(f => f.status === 'pending')
      let doneCount = 0
      let errorCount = 0

      for (const item of pending) {
        if (abortRef.current) break

        updateFile(item.id, { status: 'uploading' })

        try {
          // Upload file
          const media = await uploadApi.uploadFile(
            item.file,
            selectedPerson?.id,
            rootName.trim()
          )

          // Link to collection
          const collectionId = pathToCollectionId[item.folder] || treeResp.rootId
          await uploadApi.linkMediaToCollection(collectionId, media.id)

          updateFile(item.id, { status: 'done', progress: 100 })
          doneCount++
        } catch (err) {
          updateFile(item.id, { status: 'error' })
          errorCount++
          addLog(`✗ ${item.relativePath}: ${err}`)
        }
      }

      addLog(`Upload complete: ${doneCount} done${errorCount ? `, ${errorCount} failed` : ''}`)
    } catch (err) {
      addLog(`✗ Failed to create tree: ${err}`)
    }

    setUploading(false)
    setDone(true)
  }

  const counts = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    done: files.filter(f => f.status === 'done').length,
    error: files.filter(f => f.status === 'error').length,
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-lg font-semibold text-slate-800 mb-6">Upload</h1>

      {/* Person picker */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-2">Person (optional)</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPerson(null)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              !selectedPerson ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}>None</button>
          {persons.map((p: PersonSummary) => (
            <button key={p.id} onClick={() => setSelectedPerson(p)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                selectedPerson?.id === p.id ? 'bg-pink-500 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-pink-300'
              }`}>{p.displayName || p.name}</button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {!uploading && files.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
        >
          <div className="text-3xl mb-2">📁</div>
          <div className="text-sm text-slate-600 mb-1">Click to select a folder</div>
          <div className="text-xs text-slate-400">Folder structure will be preserved as Collections</div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            {...{ webkitdirectory: '', directory: '', multiple: true } as React.InputHTMLAttributes<HTMLInputElement>}
            onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {files.length > 0 && (
        <>
          {/* Root name */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Collection Name</label>
            <input
              className="w-full max-w-md px-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 outline-none"
              value={rootName} onChange={e => setRootName(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* Tree preview */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 mb-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Folder Structure</h3>
            <div className="font-mono text-xs space-y-0.5">
              {Object.entries(folderTree()).map(([path, count]) => (
                <div key={path} className="flex gap-2">
                  <span className="text-pink-500">📂</span>
                  <span className="text-slate-700">{path === '(root)' ? rootName || '(root)' : `${rootName}/${path}`}</span>
                  <span className="text-slate-300 ml-auto">{count} files</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary + controls */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">{counts.total} files</span>
            {counts.pending > 0 && <span className="text-xs text-slate-400">⏳ {counts.pending}</span>}
            {counts.done > 0 && <span className="text-xs text-green-500">✓ {counts.done}</span>}
            {counts.error > 0 && <span className="text-xs text-rose-500">✗ {counts.error}</span>}

            <div className="ml-auto flex gap-2">
              {!uploading && !done && (
                <>
                  <Button variant="ghost" onClick={() => { setFiles([]); setDone(false); setLog([]) }}>Clear</Button>
                  <Button onClick={startUpload} disabled={!rootName.trim()}>
                    Upload {counts.pending}
                  </Button>
                </>
              )}
              {uploading && (
                <Button variant="danger" onClick={() => { abortRef.current = true }}>Stop</Button>
              )}
              {done && (
                <Button variant="ghost" onClick={() => { setFiles([]); setDone(false); setLog([]); setRootName('') }}>New Upload</Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {(uploading || done) && (
            <div className="h-1 bg-slate-100 rounded-full mb-4">
              <div
                className="h-full rounded-full bg-pink-500 transition-all duration-300"
                style={{ width: `${counts.total ? ((counts.done + counts.error) / counts.total * 100) : 0}%` }}
              />
            </div>
          )}

          {/* Log */}
          {log.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              {log.map((l, i) => (
                <div key={i} className="text-xs font-mono text-slate-300">{l}</div>
              ))}
            </div>
          )}

          {/* File list */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {files.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-50 text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
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
