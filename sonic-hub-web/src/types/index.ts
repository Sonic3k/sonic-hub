export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE' | 'CLOSED'
export type Priority   = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ProblemStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'

export interface Tag     { id: string; name: string; color: string }
export interface Project { id: string; name: string; description?: string; color?: string; createdAt: string; updatedAt: string }

export interface Task {
  id: string; title: string; description?: string
  status: TaskStatus; priority: Priority; dueDate?: string
  parentId?: string; childCount: number
  projectId?: string; projectName?: string
  tags: Tag[]; recurringConfig?: Record<string, unknown>
  createdAt: string; updatedAt: string
}

export interface Todo {
  id: string; title: string; done: boolean
  projectId?: string; projectName?: string
  tags: Tag[]; createdAt: string; updatedAt: string
}

export interface Problem {
  id: string; title: string; note?: string
  status: ProblemStatus
  projectId?: string; projectName?: string
  tags: Tag[]; createdAt: string; updatedAt: string
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', SNOOZED: 'Snoozed', DONE: 'Done', CLOSED: 'Closed',
}
export const STATUS_COLOR: Record<TaskStatus, { bg: string; text: string }> = {
  OPEN:        { bg: '#f1f0ed', text: '#6b5e4e' },
  IN_PROGRESS: { bg: '#fef3e2', text: '#a05c1a' },
  SNOOZED:     { bg: '#f0eefc', text: '#6b5cb8' },
  DONE:        { bg: '#edf6ed', text: '#3d7a3d' },
  CLOSED:      { bg: '#f5f0ee', text: '#8a6a5a' },
}
export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: '#b0bec5', MEDIUM: '#78a9d4', HIGH: '#e8924a', URGENT: '#e05252',
}
export const PROBLEM_STATUS_LABEL: Record<ProblemStatus, string> = {
  NEW: 'New', INVESTIGATING: 'Investigating', RESOLVED: 'Resolved', DISMISSED: 'Dismissed',
}
export const PROBLEM_STATUS_COLOR: Record<ProblemStatus, { bg: string; text: string }> = {
  NEW:           { bg: '#fef3e2', text: '#a05c1a' },
  INVESTIGATING: { bg: '#f0eefc', text: '#6b5cb8' },
  RESOLVED:      { bg: '#edf6ed', text: '#3d7a3d' },
  DISMISSED:     { bg: '#f1f0ed', text: '#9a8a7a' },
}
