import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personsApi } from '../api/persons'
import type { PersonRequest } from '../types'

export const personKeys = { all: ['persons'] as const, detail: (id: number) => ['persons', id] as const }

export function usePersons() { return useQuery({ queryKey: personKeys.all, queryFn: personsApi.getAll }) }
export function usePerson(id: number) { return useQuery({ queryKey: personKeys.detail(id), queryFn: () => personsApi.getById(id), enabled: !!id }) }

export function useCreatePerson() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: PersonRequest) => personsApi.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: personKeys.all }) })
}

export function useUpdatePerson(id: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: PersonRequest) => personsApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: personKeys.all }); qc.invalidateQueries({ queryKey: personKeys.detail(id) }) } })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => personsApi.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: personKeys.all }) })
}
