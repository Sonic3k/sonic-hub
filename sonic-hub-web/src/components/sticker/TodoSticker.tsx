import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import StickerBase, { stickerColor, stickerRotation } from './StickerBase'
import EditTodoForm from '../ui/EditTodoForm'
import { useToggleTodo, useDeleteTodo } from '../../hooks/useBoard'
import type { Todo } from '../../types'

interface Props { todo: Todo; index: number }

export default function TodoSticker({ todo, index }: Props) {
  const [editing, setEditing] = useState(false)
  const toggle = useToggleTodo()
  const remove = useDeleteTodo()

  return (
    <>
      <div className="mb-3 group">
        <StickerBase color={stickerColor(index + 2)} rotation={stickerRotation(index + 1)} faded={todo.done}>
          <div className="px-3 pt-2 pb-4 relative z-[1]">
            <button
              onClick={e => { e.stopPropagation(); setEditing(true) }}
              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#9a8070] hover:text-[#5a3e28]">
              <Pencil size={11} />
            </button>

            <p className={clsx('text-[13px] font-medium leading-snug pr-5 pt-1',
              todo.done ? 'line-through text-[#9a8a70]' : 'text-[#2a1e10]')}>
              {todo.title}
            </p>

            {(todo.projectName || todo.tags.length > 0) && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {todo.projectName && (
                  <span className="text-[10px] text-[#8a7055] bg-black/6 px-1.5 py-0.5 rounded">
                    {todo.projectName}
                  </span>
                )}
                {todo.tags.map(tag => (
                  <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: tag.color + '22', color: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={e => { e.stopPropagation(); if (confirm(`Delete "${todo.title}"?`)) remove.mutate(todo.id) }}
              className="absolute bottom-2 right-8 opacity-0 group-hover:opacity-100 text-[#9a8070] hover:text-[#8b3a2a] transition-all">
              <Trash2 size={11} />
            </button>

            <button onClick={() => toggle.mutate(todo.id)}
              className={clsx(
                'absolute bottom-2 right-2 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] transition-all',
                todo.done
                  ? 'bg-[#7a9a6a] border-[#7a9a6a] text-white'
                  : 'border-black/20 text-transparent hover:border-[#7a9a6a] hover:text-[#7a9a6a]'
              )}>
              ✓
            </button>
          </div>
        </StickerBase>
      </div>

      {editing && <EditTodoForm todo={todo} onClose={() => setEditing(false)} />}
    </>
  )
}
