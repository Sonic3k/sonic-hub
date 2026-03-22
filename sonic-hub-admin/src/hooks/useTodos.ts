import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { todosApi } from '../api/todos'
import type { TodoRequest } from '../types'

export const todoKeys = {
  all: ['todos'] as const,
  detail: (id: string) => ['todos', id] as const,
}

export function useTodos(standalone?: boolean) {
  return useQuery({
    queryKey: [...todoKeys.all, { standalone }],
    queryFn: () => todosApi.getAll(standalone),
  })
}

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TodoRequest) => todosApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useUpdateTodo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TodoRequest) => todosApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => todosApi.toggleDone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useDeleteTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => todosApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}
