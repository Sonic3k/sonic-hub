import { useState } from 'react'
import { Expand, Check } from 'lucide-react'
import Card, { TagChip, TYPE_COLOR } from './Card'
import { useToggleTodo, useUpdateTodo, useDeleteTodo } from '../../hooks'
import type { Todo } from '../../types'

interface Props {
  todo: Todo
  onFullScreen: (todo: Todo) => void
}

export default function TodoCard({ todo, onFullScreen }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle]       = useState(todo.title)
  const [dirty, setDirty]       = useState(false)

  const toggleTodo = useToggleTodo()
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()

  const save = () => {
    if (!title.trim()) return
    updateTodo.mutate(
      { id: todo.id, data: { title: title.trim(), projectId: todo.projectId, tagIds: todo.tags.map(t => t.id) } },
      { onSuccess: () => { setDirty(false); setExpanded(false) } }
    )
  }

  return (
    <Card type="todo" expanded={expanded} faded={todo.done}
      onClick={() => !expanded && setExpanded(true)}>
      <div className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <button onClick={e => { e.stopPropagation(); toggleTodo.mutate(todo.id) }}
            className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ borderColor: todo.done ? '#7a9a6a' : TYPE_COLOR.todo, background: todo.done ? '#7a9a6a' : 'transparent' }}>
            {todo.done && <Check size={10} color="#fff" strokeWidth={3} />}
          </button>

          {expanded ? (
            <input
              value={title} autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => { setTitle(e.target.value); setDirty(true) }}
              className="flex-1 bg-transparent outline-none font-heading font-semibold text-sm border-none"
              style={{ color: '#1a1208', caretColor: TYPE_COLOR.todo }}
            />
          ) : (
            <p className="flex-1 font-heading font-semibold text-sm leading-snug"
              style={{ color: todo.done ? '#b0a090' : '#1a1208', textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.title}
            </p>
          )}

          {expanded && (
            <button onClick={e => { e.stopPropagation(); onFullScreen(todo) }}
              className="p-1 rounded-lg flex-shrink-0 transition-colors hover:bg-black/5"
              style={{ color: TYPE_COLOR.todo }}>
              <Expand size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap ml-7">
          {todo.projectName && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#e8f0d8', color: '#5a7a4a' }}>
              {todo.projectName}
            </span>
          )}
          {todo.tags.map(tag => <TagChip key={tag.id} name={tag.name} color={tag.color} />)}
        </div>

        {expanded && dirty && (
          <div className="flex justify-end gap-2 mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setExpanded(false); setDirty(false); setTitle(todo.title) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ borderColor: '#e8e0d4', color: '#9a8a7a' }}>
              Discard
            </button>
            <button onClick={save} disabled={updateTodo.isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.todo, color: '#fff' }}>
              {updateTodo.isPending ? '...' : 'Save'}
            </button>
          </div>
        )}
        {expanded && !dirty && (
          <div className="flex justify-between items-center mt-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => { if (confirm(`Delete "${todo.title}"?`)) deleteTodo.mutate(todo.id) }}
              className="text-xs font-medium" style={{ color: '#c0a090' }}>
              Delete
            </button>
            <button onClick={() => setExpanded(false)} className="text-xs font-medium" style={{ color: '#9a8a7a' }}>
              Close
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
