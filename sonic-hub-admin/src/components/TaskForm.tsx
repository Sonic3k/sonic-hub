import { useState } from 'react'
import { Button, Input, Textarea, Select, Modal } from './ui'
import { useTags } from '../hooks/useTags'
import { useProjects } from '../hooks/useProjects'
import type { Task, TaskRequest, TaskStatus, Priority } from '../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', SNOOZED: 'Snoozed', DONE: 'Done', CLOSED: 'Closed',
}
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
}

interface Props {
  task?: Task
  parentId?: string
  defaultProjectId?: string
  onSubmit: (data: TaskRequest) => void
  onClose: () => void
  isLoading?: boolean
}

export default function TaskForm({ task, parentId, defaultProjectId, onSubmit, onClose, isLoading }: Props) {
  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'OPEN')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'MEDIUM')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(task?.tags.map(t => t.id) ?? [])
  )

  const toggleTag = (id: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
      parentId: task?.parentId ?? parentId,
      projectId: projectId || undefined,
      tagIds: [...selectedTagIds],
    })
  }

  return (
    <Modal title={task ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Task title..." autoFocus required />
        <Textarea label="Description" value={description}
          onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={3} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
          <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <Select label="Project" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>

        {tags.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all"
                  style={selectedTagIds.has(tag.id)
                    ? { background: tag.color + '22', borderColor: tag.color, color: tag.color }
                    : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color || '#94a3b8' }} />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !title.trim()}>
            {isLoading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
