import { useState } from 'react'
import EditModal from './EditModal'
import { useUpdateTask, useTags, useProjects } from '../../hooks/useBoard'
import { STATUS_LABELS, PRIORITY_DOT } from '../../types'
import type { Task, TaskStatus, Priority } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const PRIORITY_LABELS: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' }

interface Props { task: Task; onClose: () => void }

const field = "w-full bg-black/5 rounded px-3 py-2 text-sm outline-none border border-transparent focus:border-[#b8905a] transition-colors text-[#2a1e10] placeholder:text-[#b0997a]"
const label = "block text-[10px] font-semibold uppercase tracking-wider mb-1"

export default function EditTaskForm({ task, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [projectId, setProjectId] = useState(task.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(task.tags.map(t => t.id)))

  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const updateTask = useUpdateTask()

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateTask.mutate({
      id: task.id,
      data: {
        title: title.trim(),
        description: description || undefined,
        status, priority,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        tagIds: [...selectedTagIds],
      },
    }, { onSuccess: onClose })
  }

  return (
    <EditModal title="Edit Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={label} style={{ color: '#9a8a70' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className={field}
            placeholder="Task title..." autoFocus required />
        </div>

        <div>
          <label className={label} style={{ color: '#9a8a70' }}>Notes</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className={`${field} resize-none font-hand text-[13px]`} placeholder="Description..." />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={field}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={field}>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Project</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={field}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className={label} style={{ color: '#9a8a70' }}>Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: 'rgba(0,0,0,.15)', color: '#9a8a70' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ background: 'rgba(0,0,0,.07)', color: '#6b5c44' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateTask.isPending || !title.trim()}
            className="px-4 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateTask.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
