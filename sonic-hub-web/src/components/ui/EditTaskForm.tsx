import { useState, useRef, useEffect } from 'react'
import EditModal from './EditModal'
import { useUpdateTask, useTags, useProjects } from '../../hooks/useBoard'
import { STATUS_LABELS } from '../../types'
import type { Task, TaskStatus, Priority } from '../../types'

const STATUSES: TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'SNOOZED', 'DONE', 'CLOSED']
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const PRIORITY_LABELS: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' }
const PRIORITY_DOT: Record<Priority, string> = { LOW: '#94a3b8', MEDIUM: '#60a5fa', HIGH: '#f97316', URGENT: '#f43f5e' }

interface Props { task: Task; onClose: () => void }

export default function EditTaskForm({ task, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [projectId, setProjectId] = useState(task.projectId ?? '')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(task.tags.map(t => t.id)))
  

  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const { data: tags = [] } = useTags()
  const { data: projects = [] } = useProjects()
  const updateTask = useUpdateTask()

  useEffect(() => { titleRef.current?.focus() }, [])

  // Auto-expand if task already has meta filled
  useEffect(() => {
    if (task.dueDate || task.projectId || task.tags.length > 0 || task.priority !== 'MEDIUM') {
    }
  }, [])

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
    <EditModal onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {/* Title — large, prominent */}
        <input
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full bg-transparent border-none outline-none text-[17px] font-semibold text-[#2a1e10] placeholder:text-[#c0aa88] mb-3"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          required
        />

        {/* Description — the star of the show */}
        <textarea
          ref={descRef}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Write anything here — context, notes, ideas..."
          rows={6}
          className="w-full bg-transparent border-none outline-none resize-none text-[14px] leading-[32px] text-[#5a3e28] placeholder:text-[#c0aa88]"
          style={{ fontFamily: "'Caveat', cursive", fontSize: '16px', lineHeight: '32px' }}
        />

        {/* Divider */}
        <div className="border-t border-black/8 mt-2 pt-3 space-y-3">

          {/* Status row — pill toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                style={status === s
                  ? { background: '#2c2010', color: '#faf5eb' }
                  : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Priority dots */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9a8a70] w-14">Priority</span>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  title={PRIORITY_LABELS[p]}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-all"
                  style={priority === p
                    ? { background: PRIORITY_DOT[p] + '22', color: PRIORITY_DOT[p], fontWeight: 600 }
                    : { color: '#b0997a' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_DOT[p] }} />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9a8a70] w-14">Due</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="bg-transparent text-[12px] text-[#5a3e28] outline-none border-none" />
          </div>

          {/* Project */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#9a8a70] w-14">Project</span>
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" onClick={() => setProjectId('')}
                className="px-2 py-1 rounded text-[11px] transition-all"
                style={projectId === ''
                  ? { background: '#2c2010', color: '#faf5eb' }
                  : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                None
              </button>
              {projects.map(p => (
                <button key={p.id} type="button" onClick={() => setProjectId(p.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                  style={projectId === p.id
                    ? { background: (p.color || '#6366f1') + '33', color: p.color || '#6366f1', fontWeight: 600 }
                    : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || '#94a3b8' }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[#9a8a70] w-14">Tags</span>
              <div className="flex gap-1.5 flex-wrap">
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-all"
                    style={selectedTagIds.has(tag.id)
                      ? { background: tag.color + '30', color: tag.color, fontWeight: 600 }
                      : { background: 'rgba(0,0,0,.07)', color: '#8a7055' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-black/8">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded text-[12px] transition-colors"
            style={{ color: '#9a8a70' }}>
            Cancel
          </button>
          <button type="submit" disabled={updateTask.isPending || !title.trim()}
            className="px-5 py-1.5 rounded text-[12px] font-medium transition-all disabled:opacity-50 hover:-translate-y-px"
            style={{ background: '#2c2010', color: '#faf5eb' }}>
            {updateTask.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </EditModal>
  )
}
