import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, todosApi, problemsApi, projectsApi, tagsApi } from '../api'
import type { TaskStatus, ProblemStatus } from '../types'
import type { TaskPayload, TodoPayload, ProblemPayload } from '../api'

const inv = (qc: ReturnType<typeof useQueryClient>, key: string) =>
  qc.invalidateQueries({ queryKey: [key] })

// ── Shared ──────────────────────────────────────────────────────────────────
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: projectsApi.list, staleTime: 60_000 })
export const useTags = () =>
  useQuery({ queryKey: ['tags'], queryFn: tagsApi.list, staleTime: 60_000 })

// ── Tasks ───────────────────────────────────────────────────────────────────
export const useTasks = (status?: TaskStatus) =>
  useQuery({ queryKey: ['tasks', status], queryFn: () => tasksApi.list(status) })

export const useTaskChildren = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ['tasks', id, 'children'], queryFn: () => tasksApi.children(id), enabled })

export const useCreateTask = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: TaskPayload) => tasksApi.create(d), onSuccess: () => inv(qc, 'tasks') })
}
export const useUpdateTask = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskPayload }) => tasksApi.update(id, data),
    onSuccess: () => inv(qc, 'tasks'),
  })
}
export const useDeleteTask = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => tasksApi.remove(id), onSuccess: () => inv(qc, 'tasks') })
}

// ── Todos ───────────────────────────────────────────────────────────────────
export const useTodos = () =>
  useQuery({ queryKey: ['todos'], queryFn: todosApi.list })

export const useCreateTodo = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: TodoPayload) => todosApi.create(d), onSuccess: () => inv(qc, 'todos') })
}
export const useUpdateTodo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TodoPayload }) => todosApi.update(id, data),
    onSuccess: () => inv(qc, 'todos'),
  })
}
export const useToggleTodo = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => todosApi.toggleDone(id), onSuccess: () => inv(qc, 'todos') })
}
export const useDeleteTodo = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => todosApi.remove(id), onSuccess: () => inv(qc, 'todos') })
}

// ── Problems ────────────────────────────────────────────────────────────────
export const useProblems = (status?: ProblemStatus) =>
  useQuery({ queryKey: ['problems', status], queryFn: () => problemsApi.list(status) })

export const useCreateProblem = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (d: ProblemPayload) => problemsApi.create(d), onSuccess: () => inv(qc, 'problems') })
}
export const useUpdateProblem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProblemPayload }) => problemsApi.update(id, data),
    onSuccess: () => inv(qc, 'problems'),
  })
}
export const useDeleteProblem = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => problemsApi.remove(id), onSuccess: () => inv(qc, 'problems') })
}
