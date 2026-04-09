import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoryApi } from '../api/memory'
import type { FactRequest, EpisodeRequest, ChapterRequest, TraitRequest } from '../types'

export function useFacts(pid: number) { return useQuery({ queryKey: ['facts', pid], queryFn: () => memoryApi.getFacts(pid), enabled: !!pid }) }
export function useEpisodes(pid: number) { return useQuery({ queryKey: ['episodes', pid], queryFn: () => memoryApi.getEpisodes(pid), enabled: !!pid }) }
export function useChapters(pid: number) { return useQuery({ queryKey: ['chapters', pid], queryFn: () => memoryApi.getChapters(pid), enabled: !!pid }) }
export function useTraits(pid: number) { return useQuery({ queryKey: ['traits', pid], queryFn: () => memoryApi.getTraits(pid), enabled: !!pid }) }
export function useArchives(pid: number) { return useQuery({ queryKey: ['archives', pid], queryFn: () => memoryApi.getArchives(pid), enabled: !!pid }) }

export function useCreateFact(pid: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: FactRequest) => memoryApi.createFact(pid, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['facts', pid] }) })
}
export function useCreateEpisode(pid: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: EpisodeRequest) => memoryApi.createEpisode(pid, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['episodes', pid] }) })
}
export function useCreateChapter(pid: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: ChapterRequest) => memoryApi.createChapter(pid, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['chapters', pid] }) })
}
export function useCreateTrait(pid: number) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: TraitRequest) => memoryApi.createTrait(pid, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['traits', pid] }) })
}
