import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, todosApi, problemsApi, projectsApi, tagsApi } from '../api'
import type { TaskStatus, ProblemStatus } from '../types'

export function useTasks(status?: TaskStatus) {
  return useQuery({ queryKey: ['tasks', status], queryFn: () => tasksApi.getRoots(status) })
}

export function useTaskChildren(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['tasks', id, 'children'],
    queryFn: () => tasksApi.getChildren(id),
    enabled,
  })
}

export function useTodos() {
  return useQuery({ queryKey: ['todos'], queryFn: todosApi.getAll })
}

export function useProblems(status?: ProblemStatus) {
  return useQuery({ queryKey: ['problems', status], queryFn: () => problemsApi.getAll(status) })
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: projectsApi.getAll })
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: tagsApi.getAll })
}

// Mutations
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof tasksApi.update>[1] }) =>
      tasksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todosApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todosApi.toggleDone,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: todosApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useCreateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: problemsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problems'] }),
  })
}

export function useDeleteProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: problemsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['problems'] }),
  })
}
