import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProblems, useCreateProblem } from '../hooks'
import ProblemCard from '../components/card/ProblemCard'
import ProblemDetail from '../components/panel/ProblemDetail'
import MasonryGrid, { MasonryItem } from '../components/card/MasonryGrid'
import type { Problem, ProblemStatus } from '../types'

const FILTERS: { label: string; value: ProblemStatus | undefined }[] = [
  { label: 'Active', value: undefined }, { label: 'New', value: 'NEW' },
  { label: 'Investigating', value: 'INVESTIGATING' }, { label: 'Resolved', value: 'RESOLVED' },
]

export default function ProblemsPage() {
  const [filter, setFilter]         = useState<ProblemStatus | undefined>(undefined)
  const [fullScreen, setFullScreen] = useState<Problem | null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [adding, setAdding]         = useState(false)

  const { data: raw = [], isLoading } = useProblems(filter)
  const createProblem = useCreateProblem()
  const problems = filter ? raw : raw.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createProblem.mutate({ title: newTitle.trim(), status: 'NEW' },
      { onSuccess: () => { setNewTitle(''); setAdding(false) } })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4' }}>
        <h1 className="font-heading font-semibold text-base" style={{ color: '#1a1208' }}>Problems</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold active:scale-95"
          style={{ background: '#b06070', color: '#fff' }}>
          <Plus size={14} strokeWidth={2.5} /> Log
        </button>
      </div>

      <div className="flex gap-1 px-4 py-2 border-b overflow-x-auto flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
        {FILTERS.map(f => (
          <button key={f.label} onClick={() => setFilter(f.value)}
            className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors"
            style={filter === f.value ? { background: '#1a1208', color: '#faf8f5' } : { background: 'transparent', color: '#9a8a7a' }}>
            {f.label}
          </button>
        ))}
      </div>

      {adding && (
        <form onSubmit={handleCreate}
          className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#fff', borderColor: '#e8e0d4' }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#b06070' }} />
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Describe the problem..."
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            className="flex-1 text-sm bg-transparent outline-none border-none"
            style={{ color: '#1a1208', caretColor: '#b06070' }} />
        </form>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <MasonryGrid>
            {[...Array(3)].map((_, i) => (
              <MasonryItem key={i}>
                <div className="h-24 rounded-2xl animate-pulse" style={{ background: '#ede9e3' }} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        ) : problems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm" style={{ color: '#b0a090' }}>No problems logged</p>
          </div>
        ) : (
          <MasonryGrid>
            {problems.map(problem => (
              <MasonryItem key={problem.id}>
                <ProblemCard problem={problem} onFullScreen={setFullScreen} />
              </MasonryItem>
            ))}
          </MasonryGrid>
        )}
      </div>

      {fullScreen && <ProblemDetail problem={fullScreen} onClose={() => setFullScreen(null)} />}
    </div>
  )
}
