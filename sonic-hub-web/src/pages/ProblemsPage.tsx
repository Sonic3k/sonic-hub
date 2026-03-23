import { useState } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import { useProblems, useCreateProblem } from '../hooks'
import { PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR } from '../types'
import ProblemPanel from '../components/panel/ProblemPanel'
import type { Problem, ProblemStatus } from '../types'

const FILTERS: { label: string; value: ProblemStatus | undefined }[] = [
  { label: 'Active',        value: undefined },
  { label: 'New',           value: 'NEW' },
  { label: 'Investigating', value: 'INVESTIGATING' },
  { label: 'Resolved',      value: 'RESOLVED' },
]

export default function ProblemsPage() {
  const [filter, setFilter]     = useState<ProblemStatus | undefined>(undefined)
  const [selected, setSelected] = useState<Problem | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const { data: raw = [], isLoading } = useProblems(filter)
  const createProblem = useCreateProblem()

  const problems = filter ? raw : raw.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createProblem.mutate({ title: newTitle.trim(), status: 'NEW' }, {
      onSuccess: () => { setNewTitle(''); setAdding(false) },
    })
  }

  return (
    <div className="flex h-full relative">
      <div className={`flex flex-col overflow-hidden ${selected ? 'hidden md:flex md:flex-1' : 'flex flex-1'}`}>

        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Problems</h1>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} strokeWidth={2.5} /> Log
          </button>
        </div>

        <div className="flex gap-1 px-4 md:px-6 py-2 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          {FILTERS.map(f => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0"
              style={filter === f.value ? { background: '#1a1208', color: '#faf8f5' } : { background: 'transparent', color: '#9a8a7a' }}>
              {f.label}
            </button>
          ))}
        </div>

        {adding && (
          <form onSubmit={handleCreate}
            className="flex items-center gap-3 px-4 md:px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#e8924a' }} />
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Describe the problem..."
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }} />
          </form>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-4 md:px-6 pt-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: '#ede9e3' }} />)}
            </div>
          ) : problems.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: '#b0a090' }}>No problems logged</p>
            </div>
          ) : problems.map(p => {
            const isSel = selected?.id === p.id
            return (
              <div key={p.id} onClick={() => setSelected(isSel ? null : p)}
                className="flex items-start gap-3 px-4 md:px-6 py-3 cursor-pointer transition-colors active:bg-orange-50"
                style={{
                  background: isSel ? '#f0e8de' : 'transparent',
                  borderLeft: isSel ? '3px solid #c17f3e' : '3px solid transparent',
                }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: PROBLEM_STATUS_COLOR[p.status].text }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#1a1208' }}>{p.title}</p>
                  {p.note && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#9a8a7a' }}>{p.note}</p>}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5"
                  style={{ background: PROBLEM_STATUS_COLOR[p.status].bg, color: PROBLEM_STATUS_COLOR[p.status].text }}>
                  {PROBLEM_STATUS_LABEL[p.status]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="absolute inset-0 md:static md:inset-auto flex flex-col z-10" style={{ background: '#faf8f5' }}>
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#c17f3e' }}>
              <ArrowLeft size={16} /> Problems
            </button>
          </div>
          <ProblemPanel key={selected.id} problem={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  )
}
