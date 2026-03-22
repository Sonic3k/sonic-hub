import api from './client'
import type { Task, TaskRequest, MoveRequest, TaskStatus } from '../types'

export const tasksApi = {
  getRoots: (status?: TaskStatus) =>
    api.get<Task[]>('/api/tasks', { params: status ? { status } : {} }).then(r => r.data),

  getById: (id: string) =>
    api.get<Task>(`/api/tasks/${id}`).then(r => r.data),

  getChildren: (parentId: string) =>
    api.get<Task[]>(`/api/tasks/${parentId}/children`).then(r => r.data),

  create: (data: TaskRequest) =>
    api.post<Task>('/api/tasks', data).then(r => r.data),

  update: (id: string, data: TaskRequest) =>
    api.put<Task>(`/api/tasks/${id}`, data).then(r => r.data),

  move: (id: string, data: MoveRequest) =>
    api.post<Task>(`/api/tasks/${id}/move`, data).then(r => r.data),

  addTag: (taskId: string, tagId: string) =>
    api.post<Task>(`/api/tasks/${taskId}/tags/${tagId}`).then(r => r.data),

  removeTag: (taskId: string, tagId: string) =>
    api.delete<Task>(`/api/tasks/${taskId}/tags/${tagId}`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/api/tasks/${id}`),
}
