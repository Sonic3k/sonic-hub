import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { TagChip, TYPE_COLOR, TYPE_CHIP_BG } from './Card'
import { useToggleTodo, useUpdateTodo, useDeleteTodo } from '../../hooks'
import type { Todo } from '../../types'

interface Props { todo: Todo; onFullScreen: (t: Todo) => void }

export default function TodoCard({ todo, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(todo.title)
  const [dirty, setDirty]       = useState(false)

  const toggle = useToggleTodo()
  const update = useUpdateTodo()
  const remove = useDeleteTodo()
  const col    = TYPE_COLOR.todo
  const chipBg = TYPE_CHIP_BG.todo

  const save = () => {
    if (!title.trim()) return
    update.mutate(
      { id: todo.id, data: { title, projectId: todo.projectId, tagIds: todo.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <Card type="todo" expanded={expanded} faded={todo.done}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <button onClick={e => { e.stopPropagation(); toggle.mutate(todo.id) }}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: todo.done ? '#7a9a6a' : col, background: todo.done ? '#7a9a6a' : 'transparent' }}>
            {todo.done && <Check size={9} color="#fff" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            {expanded
              ? <input value={title} autoFocus
                  onClick={e => e.stopPropagation()}
                  onChange={e => { setTitle(e.target.value); setDirty(true) }}
                  className="w-full bg-transparent outline-none border-none font-heading font-semibold text-[15px]"
                  style={{ color: '#1a1208', caretColor: col }}
                />
              : <p className="font-heading font-semibold text-[15px] leading-snug"
                  style={{ color: todo.done ? '#b0a090' : '#1a1208', textDecoration: todo.done ? 'line-through' : 'none' }}>
                  {todo.title}
                </p>
            }
          </div>

          {expanded && (
            <button onClick={e => { e.stopPropagation(); onFullScreen(todo) }}
              className="p-1 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: col }}>
              <Expand size={14} />
            </button>
          )}
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: chipBg, color: col }}>
            {todo.done ? 'Done' : 'Todo'}
          </span>
          {todo.projectName && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: chipBg, color: col }}>
              {todo.projectName}
            </span>
          )}
          {todo.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>

        {expanded && (
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: `1px solid ${col}20` }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${todo.title}"?`)) remove.mutate(todo.id) }}
              className="text-[12px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: col }}>Delete</button>
            <div className="flex items-center gap-2.5">
              <button onClick={() => { setExpanded(false); setDirty(false); setTitle(todo.title) }}
                className="text-[12px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: col }}>Close</button>
              {dirty && (
                <button onClick={save} disabled={update.isPending}
                  className="px-4 py-1.5 rounded-full text-[12px] font-bold active:scale-95 disabled:opacity-50"
                  style={{ background: col, color: '#fff' }}>
                  {update.isPending ? '...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
