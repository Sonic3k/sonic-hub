import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { TypeChip, TagChip, TYPE_COLOR } from './Card'
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
      <div className="p-4 pb-3">
        <div className="flex items-start gap-2.5">
          <button onClick={e => { e.stopPropagation(); toggle.mutate(todo.id) }}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: todo.done ? '#7a9a6a' : col, background: todo.done ? '#7a9a6a' : 'transparent' }}>
            {todo.done && <Check size={10} color="#fff" strokeWidth={3} />}
          </button>

          {expanded
            ? <input value={title} autoFocus
                onClick={e => e.stopPropagation()}
                onChange={e => { setTitle(e.target.value); setDirty(true) }}
                className="flex-1 bg-transparent outline-none font-heading font-semibold text-[14px] border-none"
                style={{ color: '#1a1208', caretColor: col }} />
            : <p className="flex-1 font-heading font-semibold text-[14px] leading-snug"
                style={{ color: todo.done ? '#9a8a7a' : '#1a1208', textDecoration: todo.done ? 'line-through' : 'none' }}>
                {todo.title}
              </p>
          }

          {expanded && (
            <button onClick={e => { e.stopPropagation(); onFullScreen(todo) }}
              className="p-1 rounded-lg flex-shrink-0" style={{ color: col }}>
              <Expand size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-2.5 ml-[30px]">
          {!expanded && !todo.done && <TypeChip type="todo" label="Todo" />}
          {todo.done && <TypeChip type="todo" label="Done" />}
          {todo.projectName && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(122,154,106,.18)', color: col }}>{todo.projectName}</span>
          )}
          {todo.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>

        {expanded && (
          <div className="flex items-center justify-between mt-3 ml-[30px]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${todo.title}"?`)) remove.mutate(todo.id) }}
              className="text-[12px] font-semibold" style={{ color: col + '80' }}>Delete</button>
            <div className="flex gap-2">
              <button onClick={() => { setExpanded(false); setDirty(false); setTitle(todo.title) }}
                className="text-[12px] font-semibold" style={{ color: col + '80' }}>Close</button>
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
