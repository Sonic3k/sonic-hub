import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import type { TaskRequest, MoveRequest, TaskStatus } from '../types'

export const taskKeys = {
  roots: (status?: TaskStatus) => ['tasks', 'roots', status] as const,
  detail: (id: string) => ['tasks', id] as const,
  children: (parentId: string) => ['tasks', parentId, 'children'] as const,
}

export function useRootTasks(status?: TaskStatus) {
  return useQuery({
    queryKey: taskKeys.roots(status),
    queryFn: () => tasksApi.getRoots(status),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
  })
}

export function useTaskChildren(parentId: string) {
  return useQuery({
    queryKey: taskKeys.children(parentId),
    queryFn: () => tasksApi.getChildren(parentId),
    enabled: !!parentId,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskRequest) => tasksApi.create(data),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks', 'roots'] })
      if (task.parentId) {
        qc.invalidateQueries({ queryKey: taskKeys.children(task.parentId) })
        qc.invalidateQueries({ queryKey: taskKeys.detail(task.parentId) })
      }
    },
  })
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskRequest) => tasksApi.update(id, data),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useMoveTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MoveRequest) => tasksApi.move(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useAddTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      tasksApi.addTag(taskId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useRemoveTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      tasksApi.removeTag(taskId, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
