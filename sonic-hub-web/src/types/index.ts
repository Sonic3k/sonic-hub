export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE' | 'CLOSED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProblemStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'

export interface Tag {
  id: string; name: string; color: string
}

export interface Project {
  id: string; name: string; description?: string; color?: string
  createdAt: string; updatedAt: string
}

export interface Task {
  id: string; title: string; description?: string
  status: TaskStatus; priority: Priority; dueDate?: string
  parentId?: string; childCount: number
  projectId?: string; projectName?: string
  tags: Tag[]
  recurringConfig?: Record<string, unknown>
  createdAt: string; updatedAt: string
}

export interface Todo {
  id: string; title: string; done: boolean
  projectId?: string; projectName?: string
  tags: Tag[]
  createdAt: string; updatedAt: string
}

export interface Problem {
  id: string; title: string; note?: string
  status: ProblemStatus
  projectId?: string; projectName?: string
  tags: Tag[]
  createdAt: string; updatedAt: string
}

// sticker color assignment
export const STICKER_COLORS = ['sk-ecru','sk-blush','sk-mist','sk-dusk','sk-wheat','sk-sage','sk-ivory'] as const
export type StickerColor = typeof STICKER_COLORS[number]

export const ROTATIONS = ['r-n2','r-1','r-n1','r-2','r-n3','r-3','r-0'] as const

export const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', SNOOZED: 'Snoozed', DONE: 'Done', CLOSED: 'Closed',
}

export const PRIORITY_DOT: Record<Priority, string> = {
  LOW: '#94a3b8', MEDIUM: '#60a5fa', HIGH: '#f97316', URGENT: '#f43f5e',
}

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  NEW: 'New', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', DISMISSED: 'Dismissed',
}
