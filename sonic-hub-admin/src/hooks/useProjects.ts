import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, type ProjectRequest } from '../api/projects'

export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  tasks: (id: string) => ['projects', id, 'tasks'] as const,
  todos: (id: string) => ['projects', id, 'todos'] as const,
  problems: (id: string) => ['projects', id, 'problems'] as const,
}

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: projectsApi.getAll })
}

export function useProject(id: string) {
  return useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectsApi.getById(id), enabled: !!id })
}

export function useProjectTasks(id: string) {
  return useQuery({ queryKey: projectKeys.tasks(id), queryFn: () => projectsApi.getTasks(id), enabled: !!id })
}

export function useProjectTodos(id: string) {
  return useQuery({ queryKey: projectKeys.todos(id), queryFn: () => projectsApi.getTodos(id), enabled: !!id })
}

export function useProjectProblems(id: string) {
  return useQuery({ queryKey: projectKeys.problems(id), queryFn: () => projectsApi.getProblems(id), enabled: !!id })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectRequest) => projectsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectRequest) => projectsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}
