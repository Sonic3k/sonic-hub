import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { problemsApi } from '../api/problems'
import type { ProblemRequest, ProblemStatus } from '../types'

export const problemKeys = {
  all: ['problems'] as const,
  detail: (id: string) => ['problems', id] as const,
}

export function useProblems(status?: ProblemStatus) {
  return useQuery({
    queryKey: [...problemKeys.all, { status }],
    queryFn: () => problemsApi.getAll(status),
  })
}

export function useCreateProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProblemRequest) => problemsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: problemKeys.all }),
  })
}

export function useUpdateProblem(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProblemRequest) => problemsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: problemKeys.all }),
  })
}

export function useDeleteProblem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => problemsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: problemKeys.all }),
  })
}
