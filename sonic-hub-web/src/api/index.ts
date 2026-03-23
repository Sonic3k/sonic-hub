import client from './client'
import type { Task, Todo, Problem, Project, Tag, TaskStatus, Priority, ProblemStatus } from '../types'

// ── Tasks ───────────────────────────────────────────────────────────────────
export type TaskPayload = {
  title: string; description?: string; status?: TaskStatus; priority?: Priority
  dueDate?: string; parentId?: string; projectId?: string; tagIds?: string[]
}
export const tasksApi = {
  list:     (status?: TaskStatus) =>
    client.get<Task[]>('/api/tasks', { params: status ? { status } : {} }).then(r => r.data),
  children: (id: string) =>
    client.get<Task[]>(`/api/tasks/${id}/children`).then(r => r.data),
  create:   (d: TaskPayload) => client.post<Task>('/api/tasks', d).then(r => r.data),
  update:   (id: string, d: TaskPayload) => client.put<Task>(`/api/tasks/${id}`, d).then(r => r.data),
  remove:   (id: string) => client.delete(`/api/tasks/${id}`),
}

// ── Todos ───────────────────────────────────────────────────────────────────
export type TodoPayload = { title: string; projectId?: string; tagIds?: string[] }
export const todosApi = {
  list:       () => client.get<Todo[]>('/api/todos').then(r => r.data),
  create:     (d: TodoPayload) => client.post<Todo>('/api/todos', d).then(r => r.data),
  update:     (id: string, d: TodoPayload) => client.put<Todo>(`/api/todos/${id}`, d).then(r => r.data),
  toggleDone: (id: string) => client.patch<Todo>(`/api/todos/${id}/done`).then(r => r.data),
  remove:     (id: string) => client.delete(`/api/todos/${id}`),
}

// ── Problems ────────────────────────────────────────────────────────────────
export type ProblemPayload = {
  title: string; note?: string; status?: ProblemStatus; projectId?: string; tagIds?: string[]
}
export const problemsApi = {
  list:   (status?: ProblemStatus) =>
    client.get<Problem[]>('/api/problems', { params: status ? { status } : {} }).then(r => r.data),
  create: (d: ProblemPayload) => client.post<Problem>('/api/problems', d).then(r => r.data),
  update: (id: string, d: ProblemPayload) => client.put<Problem>(`/api/problems/${id}`, d).then(r => r.data),
  remove: (id: string) => client.delete(`/api/problems/${id}`),
}

// ── Projects & Tags ─────────────────────────────────────────────────────────
export const projectsApi = { list: () => client.get<Project[]>('/api/projects').then(r => r.data) }
export const tagsApi     = { list: () => client.get<Tag[]>('/api/tags').then(r => r.data) }
