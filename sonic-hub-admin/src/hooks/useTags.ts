import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '../api/tags'
import type { TagRequest } from '../types'

export const tagKeys = {
  all: ['tags'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: tagsApi.getAll,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TagRequest) => tagsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  })
}

export function useUpdateTag(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TagRequest) => tagsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  })
}
