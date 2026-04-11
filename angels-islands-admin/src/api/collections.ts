import api from './client'
import type { CollectionResponse, CollectionRequest } from '../types'

export const collectionsApi = {
  getAll: () => api.get<CollectionResponse[]>('/api/collections').then(r => r.data),
  create: (data: CollectionRequest) => api.post<CollectionResponse>('/api/collections', data).then(r => r.data),
  update: (id: string, data: CollectionRequest) => api.put<CollectionResponse>(`/api/collections/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/collections/${id}`),
}

export interface TreeRequest {
  rootName: string
  personIds?: string[]
  folders: string[]
}

export interface TreeResponse {
  rootId: string
  pathToId: Record<string, string>
}

export const uploadApi = {
  createTree: (data: TreeRequest) => api.post<TreeResponse>('/api/collections/create-tree', data).then(r => r.data),
  uploadFile: (file: File, personId?: string, subFolder?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (personId) form.append('personId', personId)
    if (subFolder) form.append('subFolder', subFolder)
    if (file.lastModified) form.append('lastModified', String(file.lastModified))
    return api.post('/api/media-files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  linkMediaToCollection: (collectionId: string, mediaId: string) =>
    api.post(`/api/collections/${collectionId}/media/${mediaId}`),
  deleteMedia: (ids: string[]) =>
    api.post('/api/media-files/delete-batch', ids).then(r => r.data),
}

export const collectionBrowseApi = {
  getTopLevel: () => api.get<CollectionResponse[]>('/api/collections').then(r => r.data),
  getById: (id: string) => api.get<CollectionResponse>(`/api/collections/${id}`).then(r => r.data),
  getChildren: (id: string) => api.get<CollectionResponse[]>(`/api/collections/${id}/children`).then(r => r.data),
  getBreadcrumb: (id: string) => api.get<CollectionResponse[]>(`/api/collections/${id}/breadcrumb`).then(r => r.data),
  getCollectionMedia: (id: string, sort?: string, sortDir?: string) => api.get(`/api/collections/${id}/media`, { params: { sort, sortDir } }).then(r => r.data),
}
