export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE' | 'CLOSED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProblemStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  dueDateTime?: string
  duePeriod?: string
  someday: boolean
  parentId?: string
  childCount: number
  projectId?: string
  projectName?: string
  tags: Tag[]
  recurringConfig?: Record<string, unknown>
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface TaskRequest {
  title: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  dueDate?: string
  dueDateTime?: string
  duePeriod?: string
  someday?: boolean
  parentId?: string
  projectId?: string
  tagIds?: string[]
  recurringConfig?: Record<string, unknown>
  createdBy?: string
}

export interface MoveRequest {
  parentId: string | null
  projectId?: string | null
}

export interface Todo {
  id: string
  title: string
  done: boolean
  projectId?: string
  projectName?: string
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface TodoRequest {
  title: string
  projectId?: string
  tagIds?: string[]
}

export interface Problem {
  id: string
  title: string
  note?: string
  status: ProblemStatus
  projectId?: string
  projectName?: string
  tags: Tag[]
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface ProblemRequest {
  title: string
  note?: string
  status?: ProblemStatus
  projectId?: string
  tagIds?: string[]
  createdBy?: string
}

export type EntryType = 'NOTE' | 'OCCURRENCE' | 'PROGRESS' | 'MOOD' | 'REMINDER' | 'REMINDER_RESPONSE'

export interface Entry {
  id: string
  entityType: string
  entityId: string
  content: string
  entryType: EntryType
  projectId?: string
  projectName?: string
  tags: Tag[]
  createdBy?: string
  createdAt: string
}

export interface TrackingRule {
  id: string
  entityType: string
  entityId: string
  frequencyType?: string
  currentLimit?: number
  targetLimit?: number
  reminderPattern?: string
  reminderMessage?: string
  active: boolean
  projectId?: string
  projectName?: string
  createdAt: string
  updatedAt: string
}

export interface Wishlist {
  id: string
  title: string
  description?: string
  category: string
  projectId?: string
  projectName?: string
  tags: Tag[]
  archived: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface TagRequest {
  name: string
  color?: string
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', SNOOZED: 'Snoozed', DONE: 'Done', CLOSED: 'Closed',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  SNOOZED: 'bg-amber-50 text-amber-600',
  DONE: 'bg-green-50 text-green-600',
  CLOSED: 'bg-rose-50 text-rose-500',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-blue-50 text-blue-500',
  HIGH: 'bg-orange-50 text-orange-500',
  URGENT: 'bg-rose-50 text-rose-500',
}

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  NEW: 'New', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', DISMISSED: 'Dismissed',
}

export const PROBLEM_STATUS_COLORS: Record<ProblemStatus, string> = {
  NEW: 'bg-slate-100 text-slate-600',
  INVESTIGATING: 'bg-amber-50 text-amber-600',
  RESOLVED: 'bg-green-50 text-green-600',
  DISMISSED: 'bg-slate-100 text-slate-400',
}
