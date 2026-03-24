import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import FullScreenPanel from './FullScreenPanel'
import { StatusPills, TagChip, TYPE_COLOR, TYPE_CHIP_BG } from '../card/Card'
import { useUpdateTask, useDeleteTask, useTaskChildren, useTags, useProjects } from '../../hooks'
import { PRIORITY_COLOR } from '../../types'
import type { Task, TaskStatus, Priority } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' }

const label = (text: string) => (
  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#9a8a7a' }}>{text}</p>
)

interface Props { task: Task; onClose: () => void }

export default function TaskDetail({ task, onClose }: Props) {
  const [title, setTitle]     = useState(task.title)
  const [desc, setDesc]       = useState(task.description ?? '')
  const [status, setStatus]   = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [projectId, setProjectId] = useState(task.projectId ?? '')
  const [tagIds, setTagIds]   = useState<Set<string>>(new Set(task.tags.map(t => t.id)))
  const [dirty, setDirty]     = useState(false)
  const [showChildren, setShowChildren] = useState(false)

  const { data: tags     = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const { data: children = [] } = useTaskChildren(task.id, showChildren)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  useEffect(() => {
    setTitle(task.title); setDesc(task.description ?? '')
    setStatus(task.status); setPriority(task.priority)
    setDueDate(task.dueDate ?? ''); setProjectId(task.projectId ?? '')
    setTagIds(new Set(task.tags.map(t => t.id))); setDirty(false)
  }, [task.id])

  const toggleTag = (id: string) => {
    setTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setDirty(true)
  }

  const save = () => {
    if (!title.trim()) return
    updateTask.mutate(
      { id: task.id, data: { title, description: desc || undefined, status, priority, dueDate: dueDate || undefined, projectId: projectId || undefined, tagIds: [...tagIds] } },
      { onSuccess: () => setDirty(false) }
    )
  }

  const isOverdue = dueDate && status !== 'DONE' && status !== 'CLOSED' && new Date(dueDate) < new Date()
  const isToday   = dueDate && new Date(dueDate).toDateString() === new Date().toDateString()

  return (
    <FullScreenPanel type="task" onClose={onClose}>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Title */}
        <textarea value={title} autoFocus rows={2}
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          className="w-full bg-transparent border-none outline-none resize-none font-heading font-semibold text-xl leading-snug"
          style={{ color: '#1a1208', caretColor: TYPE_COLOR.task }}
        />

        {/* Notes */}
        <div>
          {label('Notes')}
          <textarea value={desc} rows={6}
            onChange={e => { setDesc(e.target.value); setDirty(true) }}
            placeholder="Add notes, context, anything..."
            className="w-full bg-white border rounded-2xl px-4 py-3 text-sm outline-none resize-none leading-relaxed"
            style={{ borderColor: '#e8e0d4', color: '#3a2e20', caretColor: TYPE_COLOR.task }}
          />
        </div>

        {/* Status */}
        <div>
          {label('Status')}
          <StatusPills value={status} options={STATUSES}
            color={TYPE_COLOR.task} chipBg={TYPE_CHIP_BG.task}
            onChange={s => { setStatus(s); setDirty(true) }} />
        </div>

        {/* Priority */}
        <div>
          {label('Priority')}
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map(p => (
              <button key={p} onClick={() => { setPriority(p); setDirty(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border"
                style={priority === p
                  ? { background: PRIORITY_COLOR[p] + '20', color: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p], fontWeight: 700 }
                  : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} />
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          {label('Due date')}
          <input type="date" value={dueDate}
            onChange={e => { setDueDate(e.target.value); setDirty(true) }}
            className="bg-white border rounded-xl px-3 py-2 text-sm outline-none"
            style={{
              borderColor: isOverdue ? '#e05252' : '#e8e0d4',
              color: isOverdue ? '#e05252' : isToday ? TYPE_COLOR.task : '#3a2e20',
            }}
          />
          {isOverdue && <p className="text-xs mt-1" style={{ color: '#e05252' }}>Overdue</p>}
          {isToday && !isOverdue && <p className="text-xs mt-1" style={{ color: TYPE_COLOR.task }}>Due today</p>}
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            {label('Project')}
            <div className="flex flex-wrap gap-1.5">
              {[{ id: '', name: 'None', color: undefined }, ...projects].map(p => (
                <button key={p.id} onClick={() => { setProjectId(p.id); setDirty(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border"
                  style={projectId === p.id
                    ? { background: (p.color || '#1a1208') + '20', color: p.color || '#1a1208', borderColor: (p.color || '#1a1208') + '50' }
                    : { background: 'transparent', color: '#9a8a7a', borderColor: '#e8e0d4' }}>
                  {p.color && <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            {label('Tags')}
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className="transition-all active:scale-95"
                  style={{ opacity: tagIds.has(tag.id) ? 1 : 0.4 }}>
                  <TagChip name={tag.name} color={tag.color} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks */}
        {task.childCount > 0 && (
          <div>
            {label(`Subtasks (${task.childCount})`)}
            <button onClick={() => setShowChildren(v => !v)}
              className="text-xs font-semibold mb-2" style={{ color: TYPE_COLOR.task }}>
              {showChildren ? 'Hide' : 'Show subtasks'}
            </button>
            {showChildren && children.map(c => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: '#f0e8e0' }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR.task }} />
                <span className="text-sm" style={{ color: '#3a2e20' }}>{c.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#e8e0d4' }}>
          <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) { deleteTask.mutate(task.id); onClose() } }}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#c0a090' }}>
            <Trash2 size={14} /> Delete
          </button>
          {dirty && (
            <button onClick={save} disabled={updateTask.isPending}
              className="px-5 py-2 rounded-full text-sm font-semibold active:scale-95 disabled:opacity-50"
              style={{ background: TYPE_COLOR.task, color: '#fff' }}>
              {updateTask.isPending ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </FullScreenPanel>
  )
}
