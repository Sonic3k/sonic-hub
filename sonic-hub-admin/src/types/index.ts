export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE' | 'CLOSED'

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  parentId?: string
  childCount: number
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface TaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  parentId?: string
  tagIds?: string[]
}

export interface MoveRequest {
  parentId: string | null
}

export interface TagRequest {
  name: string
  color?: string
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  SNOOZED: 'Snoozed',
  DONE: 'Done',
  CLOSED: 'Closed',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  SNOOZED: 'bg-amber-50 text-amber-600',
  DONE: 'bg-green-50 text-green-600',
  CLOSED: 'bg-rose-50 text-rose-500',
}
