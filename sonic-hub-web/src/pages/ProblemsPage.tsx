import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProblems, useCreateProblem } from '../hooks'
import { PROBLEM_STATUS_LABEL, PROBLEM_STATUS_COLOR } from '../types'
import ProblemPanel from '../components/panel/ProblemPanel'
import type { Problem, ProblemStatus } from '../types'

const FILTERS: { label: string; value: ProblemStatus | undefined }[] = [
  { label: 'Active',      value: undefined },
  { label: 'New',         value: 'NEW' },
  { label: 'Investigating', value: 'INVESTIGATING' },
  { label: 'Resolved',   value: 'RESOLVED' },
]

export default function ProblemsPage() {
  const [filter, setFilter]     = useState<ProblemStatus | undefined>(undefined)
  const [selected, setSelected] = useState<Problem | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)

  const { data: rawProblems = [], isLoading } = useProblems(filter)
  const createProblem = useCreateProblem()

  // If no filter, show only active (not resolved/dismissed)
  const problems = filter
    ? rawProblems
    : rawProblems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    createProblem.mutate({ title: newTitle.trim(), status: 'NEW' }, {
      onSuccess: () => { setNewTitle(''); setAdding(false) },
    })
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          <h1 className="text-base font-semibold" style={{ color: '#1a1208' }}>Problems</h1>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: '#c17f3e', color: '#fff' }}>
            <Plus size={14} />Log problem
          </button>
        </div>

        <div className="flex gap-1 px-6 py-2.5 border-b flex-shrink-0" style={{ borderColor: '#e8e0d4' }}>
          {FILTERS.map(f => (
            <button key={f.label} onClick={() => setFilter(f.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              style={filter === f.value
                ? { background: '#1a1208', color: '#faf8f5' }
                : { background: 'transparent', color: '#9a8a7a' }}>
              {f.label}
            </button>
          ))}
        </div>

        {adding && (
          <form onSubmit={handleCreate}
            className="flex items-center gap-3 px-6 py-3 border-b bg-white flex-shrink-0"
            style={{ borderColor: '#e8e0d4' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#e8924a' }} />
            <input
              autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Describe the problem... (Enter to save, Esc to cancel)"
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: '#1a1208', caretColor: '#c17f3e' }}
            />
          </form>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="px-6 pt-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: '#ede9e3' }} />
              ))}
            </div>
          ) : problems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <p className="text-sm" style={{ color: '#b0a090' }}>No problems logged</p>
            </div>
          ) : problems.map(problem => {
            const isSelected = selected?.id === problem.id
            return (
              <div key={problem.id}
                onClick={() => setSelected(isSelected ? null : problem)}
                className="flex items-start gap-3 px-6 py-3 cursor-pointer transition-colors"
                style={{
                  background: isSelected ? '#f0e8de' : 'transparent',
                  borderLeft: isSelected ? '2px solid #c17f3e' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f5f2ee' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: PROBLEM_STATUS_COLOR[problem.status].text }} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#1a1208' }}>{problem.title}</p>
                  {problem.note && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#9a8a7a' }}>{problem.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: PROBLEM_STATUS_COLOR[problem.status].bg, color: PROBLEM_STATUS_COLOR[problem.status].text }}>
                    {PROBLEM_STATUS_LABEL[problem.status]}
                  </span>
                  {problem.tags.slice(0, 2).map(tag => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: tag.color + '20', color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <ProblemPanel key={selected.id} problem={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
