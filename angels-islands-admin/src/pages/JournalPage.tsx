import { useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { NotebookPen, Bold, Italic, List as ListIcon, Quote, Heading2, ImagePlus, Loader2, Pencil, X, Plus, Tag as TagIcon, AlertCircle, Search } from 'lucide-react'
import { journalApi } from '../api/journal'
import { uploadApi } from '../api/collections'
import TagSelectModal, { TagChip } from '../components/TagSelectModal'
import type { JournalNoteResponse, ProblemResponse, TagResponse } from '../types'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-600 border-amber-200',
  TRACKING: 'bg-blue-50 text-blue-600 border-blue-200',
  RESOLVED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
}
const statusCls = (s: string) => STATUS_COLORS[s] || 'bg-slate-50 text-slate-600 border-slate-200'

const fmtDay = (iso?: string) => (iso ? String(iso).slice(0, 10) : '')

// ── Rich editor (TipTap) with paste/drop image upload straight to B2 ─────────
function useJournalEditor() {
  const [uploading, setUploading] = useState(false)

  const insertUpload = async (editor: Editor, files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (!images.length) return
    setUploading(true)
    try {
      for (const f of images) {
        const res = await uploadApi.uploadFile(f, undefined, undefined, true)
        const url = res.media?.cdnUrl
        if (url) editor.chain().focus().setImage({ src: url }).run()
      }
    } finally { setUploading(false) }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: 'journal-img' } }),
      Placeholder.configure({ placeholder: 'Write anything — one line or an essay. Paste or drop images right here...' }),
    ],
    editorProps: {
      attributes: { class: 'journal-editor outline-none min-h-[120px] text-sm text-slate-700 leading-relaxed' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || [])
        if (files.some(f => f.type.startsWith('image/'))) {
          event.preventDefault()
          if (editor) void insertUpload(editor, files)
          return true
        }
        return false
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || [])
        if (files.some(f => f.type.startsWith('image/'))) {
          event.preventDefault()
          if (editor) void insertUpload(editor, files)
          return true
        }
        return false
      },
    },
  })

  return { editor, uploading, insertUpload }
}

function EditorToolbar({ editor, uploading, onPickImage }: { editor: Editor | null; uploading: boolean; onPickImage: () => void }) {
  if (!editor) return null
  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-pink-50 text-pink-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`
  return (
    <div className="flex items-center gap-0.5 border-b border-slate-100 pb-2 mb-2">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold"><Bold size={14} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic"><Italic size={14} /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading"><Heading2 size={14} /></button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="List"><ListIcon size={14} /></button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Quote"><Quote size={14} /></button>
      <button onClick={onPickImage} className={btn(false)} title="Insert image">
        {uploading ? <Loader2 size={14} className="animate-spin text-pink-400" /> : <ImagePlus size={14} />}
      </button>
    </div>
  )
}

// ── Problem picker modal (mirrors TagSelectModal) ────────────────────────────
function ProblemSelectModal({ onSelect, onClose }: { onSelect: (p: ProblemResponse) => void; onClose: () => void }) {
  const { data: problems = [] } = useQuery({ queryKey: ['problems'], queryFn: journalApi.problems })
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()

  const create = async () => {
    const t = newTitle.trim()
    if (!t || creating) return
    setCreating(true)
    try {
      const p = await journalApi.createProblem({ title: t })
      qc.invalidateQueries({ queryKey: ['problems'] })
      onSelect(p)
    } finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
        <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Link a problem</h3>
        <div className="space-y-1.5 mb-4 max-h-60 overflow-y-auto">
          {problems.map(p => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg border border-slate-100 hover:border-pink-200 hover:bg-pink-50/30 transition-colors">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusCls(p.status)}`}>{p.status}</span>
              <span className="text-sm text-slate-700 truncate">{p.title}</span>
            </button>
          ))}
          {problems.length === 0 && <p className="text-xs text-slate-400">No problems yet — create the first one below</p>}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <Plus size={14} className="text-slate-300 shrink-0" />
          <input className="flex-1 px-2 py-1.5 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none"
            placeholder="New problem (e.g. Work stress)..." value={newTitle}
            onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
          {newTitle.trim() && (
            <button onClick={create} disabled={creating}
              className="text-xs text-pink-500 font-medium px-2 py-1.5 hover:bg-pink-50 rounded disabled:opacity-50">Create</button>
          )}
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const [tab, setTab] = useState<'notes' | 'problems'>('notes')
  const [q, setQ] = useState(''); const [activeQ, setActiveQ] = useState('')
  const [problemFilter, setProblemFilter] = useState<ProblemResponse | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState(''); const [mood, setMood] = useState('')
  const [noteTags, setNoteTags] = useState<TagResponse[]>([])
  const [noteProblems, setNoteProblems] = useState<ProblemResponse[]>([])
  const [showTagPick, setShowTagPick] = useState(false)
  const [showProblemPick, setShowProblemPick] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const { editor, uploading, insertUpload } = useJournalEditor()

  const notesQ = useInfiniteQuery({
    queryKey: ['journal-notes', activeQ, problemFilter?.id],
    queryFn: ({ pageParam = 0 }) => journalApi.notes({ page: pageParam, size: 20, q: activeQ || undefined, problemId: problemFilter?.id }),
    getNextPageParam: last => (last.last ? undefined : last.number + 1),
    initialPageParam: 0,
  })
  const notes = useMemo(() => notesQ.data?.pages.flatMap(p => p.content) ?? [], [notesQ.data])
  const { data: problems = [] } = useQuery({ queryKey: ['problems'], queryFn: journalApi.problems, enabled: tab === 'problems' })

  const resetComposer = () => {
    setEditingId(null); setTitle(''); setMood(''); setNoteTags([]); setNoteProblems([])
    editor?.commands.setContent('')
  }

  const save = async () => {
    const content = editor?.getHTML() || ''
    if (!editor || editor.isEmpty || saving) return
    setSaving(true)
    try {
      const data = { title, content, mood, tagIds: noteTags.map(t => t.id), problemIds: noteProblems.map(p => p.id) }
      if (editingId) await journalApi.updateNote(editingId, data)
      else await journalApi.createNote(data)
      resetComposer()
      qc.invalidateQueries({ queryKey: ['journal-notes'] })
      qc.invalidateQueries({ queryKey: ['problems'] })
    } catch { alert('Save failed') }
    setSaving(false)
  }

  const editNote = (n: JournalNoteResponse) => {
    setTab('notes'); setEditingId(n.id)
    setTitle(n.title || ''); setMood(n.mood || '')
    setNoteTags(n.tags || []); setNoteProblems(n.problems || [])
    editor?.commands.setContent(n.content)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteNote = async (n: JournalNoteResponse) => {
    if (!confirm('Delete this note?')) return
    await journalApi.deleteNote(n.id)
    qc.invalidateQueries({ queryKey: ['journal-notes'] })
    qc.invalidateQueries({ queryKey: ['problems'] })
  }

  const saveProblem = async (p: ProblemResponse, patch: Partial<ProblemResponse>) => {
    await journalApi.updateProblem(p.id, patch)
    qc.invalidateQueries({ queryKey: ['problems'] })
    qc.invalidateQueries({ queryKey: ['journal-notes'] })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 flex items-center gap-2">
          <NotebookPen size={18} className="text-pink-400" />Journal
        </h1>
        <div className="flex bg-slate-100 rounded-full p-0.5 text-xs ml-auto">
          {(['notes', 'problems'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full font-medium capitalize transition-all ${tab === t ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-500'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'notes' && (
        <>
          {/* Composer — always open: life needs writing down NOW */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
              className="w-full text-sm font-semibold text-slate-800 placeholder-slate-300 outline-none mb-2" />
            <EditorToolbar editor={editor} uploading={uploading}
              onPickImage={() => fileRef.current?.click()} />
            <EditorContent editor={editor} />
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { const fs = Array.from(e.target.files || []); if (editor && fs.length) void insertUpload(editor, fs); e.target.value = '' }} />
            <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100">
              {noteProblems.map(p => (
                <span key={p.id} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${statusCls(p.status)}`}>
                  <AlertCircle size={10} />{p.title}
                  <button onClick={() => setNoteProblems(ps => ps.filter(x => x.id !== p.id))} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
              <button onClick={() => setShowProblemPick(true)}
                className="text-[11px] text-slate-400 hover:text-pink-500 border border-dashed border-slate-200 hover:border-pink-300 rounded-full px-2.5 py-1 transition-colors">
                + Problem
              </button>
              {noteTags.map(t => <TagChip key={t.id} tag={t} active onRemove={() => setNoteTags(ts => ts.filter(x => x.id !== t.id))} />)}
              <button onClick={() => setShowTagPick(true)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-pink-500 border border-dashed border-slate-200 hover:border-pink-300 rounded-full px-2.5 py-1 transition-colors">
                <TagIcon size={10} />Tag
              </button>
              <input value={mood} onChange={e => setMood(e.target.value)} placeholder="mood"
                className="text-[11px] w-20 px-2 py-1 border border-slate-200 rounded-full outline-none focus:border-pink-300" />
              <div className="ml-auto flex items-center gap-2">
                {editingId && <button onClick={resetComposer} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">Cancel</button>}
                <button onClick={save} disabled={saving || uploading}
                  className="text-xs font-medium bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full transition-all active:scale-95 disabled:opacity-60">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setActiveQ(q.trim()); if (e.key === 'Escape') { setQ(''); setActiveQ('') } }}
                placeholder="Search notes..."
                className="pl-8 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-full outline-none focus:border-pink-300 w-44" />
            </div>
            {problemFilter && (
              <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${statusCls(problemFilter.status)}`}>
                <AlertCircle size={10} />{problemFilter.title}
                <button onClick={() => setProblemFilter(null)} className="opacity-60 hover:opacity-100">×</button>
              </span>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {notes.map(n => (
              <article key={n.id} className="relative group bg-white rounded-2xl border border-slate-100 p-4 md:p-5">
                <span className="absolute top-3 right-3 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => editNote(n)} className="p-1.5 text-slate-300 hover:text-pink-500 rounded transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => deleteNote(n)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded transition-colors"><X size={13} /></button>
                </span>
                <div className="flex items-center gap-2 flex-wrap mb-1.5 pr-14">
                  <time className="text-[11px] text-slate-400 font-mono">{fmtDay(n.createdAt)}</time>
                  {n.mood && <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-500">{n.mood}</span>}
                  {(n.problems || []).map(p => (
                    <button key={p.id} onClick={() => setProblemFilter(p)}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${statusCls(p.status)}`}>
                      <AlertCircle size={9} />{p.title}
                    </button>
                  ))}
                  {(n.tags || []).map(t => (
                    <span key={t.id} className="text-[10px] text-white px-1.5 py-0.5 rounded-full" style={{ background: t.color || '#94a3b8' }}>{t.name}</span>
                  ))}
                </div>
                {n.title && <h3 className="text-sm font-semibold text-slate-800 mb-1">{n.title}</h3>}
                <div className="journal-content text-sm text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: n.content }} />
              </article>
            ))}
            {notes.length === 0 && !notesQ.isLoading && (
              <p className="text-center text-sm text-slate-400 py-10">Nothing yet — the box above is waiting.</p>
            )}
            {notesQ.hasNextPage && (
              <button onClick={() => notesQ.fetchNextPage()} disabled={notesQ.isFetchingNextPage}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-pink-500 transition-colors">
                {notesQ.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </>
      )}

      {tab === 'problems' && (
        <div className="space-y-3">
          {problems.map(p => (
            <ProblemCard key={p.id} problem={p} onSave={patch => saveProblem(p, patch)}
              onOpenNotes={() => { setProblemFilter(p); setTab('notes') }}
              onDelete={async () => {
                if (!confirm(`Delete problem "${p.title}"? Notes stay, links are removed.`)) return
                await journalApi.deleteProblem(p.id)
                qc.invalidateQueries({ queryKey: ['problems'] })
              }} />
          ))}
          {problems.length === 0 && <p className="text-center text-sm text-slate-400 py-10">No problems tracked — link one from a note, or just enjoy life.</p>}
        </div>
      )}

      {showTagPick && (
        <TagSelectModal title="Tag this note"
          onSelect={t => { setNoteTags(ts => (ts.some(x => x.id === t.id) ? ts : [...ts, t])); setShowTagPick(false) }}
          onClose={() => setShowTagPick(false)} />
      )}
      {showProblemPick && (
        <ProblemSelectModal
          onSelect={p => { setNoteProblems(ps => (ps.some(x => x.id === p.id) ? ps : [...ps, p])); setShowProblemPick(false) }}
          onClose={() => setShowProblemPick(false)} />
      )}
    </div>
  )
}

function ProblemCard({ problem, onSave, onOpenNotes, onDelete }: {
  problem: ProblemResponse
  onSave: (patch: { title?: string; description?: string; status?: string }) => void
  onOpenNotes: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(problem.title)
  const [description, setDescription] = useState(problem.description || '')
  const [status, setStatus] = useState(problem.status)

  return (
    <div className="relative group bg-white rounded-2xl border border-slate-100 p-4">
      <span className="absolute top-3 right-3 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(v => !v)} className="p-1.5 text-slate-300 hover:text-pink-500 rounded transition-colors"><Pencil size={13} /></button>
        <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-rose-500 rounded transition-colors"><X size={13} /></button>
      </span>
      {editing ? (
        <div className="space-y-2 pr-14">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full text-sm font-semibold text-slate-800 border-b border-slate-200 focus:border-pink-400 outline-none pb-1" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description..."
            className="w-full text-xs text-slate-600 border border-slate-200 rounded-lg p-2 outline-none focus:border-pink-400 resize-y" />
          <div className="flex items-center gap-2">
            <input value={status} onChange={e => setStatus(e.target.value)} list="problem-statuses" placeholder="status"
              className="text-xs w-32 px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-pink-400 uppercase" />
            <datalist id="problem-statuses">
              {['OPEN', 'TRACKING', 'RESOLVED'].map(s => <option key={s} value={s} />)}
            </datalist>
            <button onClick={() => { onSave({ title, description, status }); setEditing(false) }}
              className="text-xs font-medium bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-full ml-auto">Save</button>
          </div>
        </div>
      ) : (
        <div className="pr-14">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${statusCls(problem.status)}`}>{problem.status}</span>
            <h3 className="text-sm font-semibold text-slate-800">{problem.title}</h3>
          </div>
          {problem.description && <p className="text-xs text-slate-500 mt-1">{problem.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <button onClick={onOpenNotes} className="text-pink-500 hover:underline">{problem.noteCount ?? 0} note(s) →</button>
            {problem.resolvedAt && <span>resolved {fmtDay(problem.resolvedAt)}</span>}
            <span className="ml-auto font-mono">{fmtDay(problem.createdAt)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
