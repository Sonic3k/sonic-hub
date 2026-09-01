import api from './client'
import type { CollectionResponse, CollectionRequest, MediaFileResponse } from '../types'

export const collectionsApi = {
  getAll: () => api.get<CollectionResponse[]>('/api/collections').then(r => r.data),
  create: (data: CollectionRequest) => api.post<CollectionResponse>('/api/collections', data).then(r => r.data),
  update: (id: string, data: CollectionRequest) => api.put<CollectionResponse>(`/api/collections/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/collections/${id}`),
}

export interface TreeRequest {
  rootName: string
  parentId?: string
  personIds?: string[]
  folders: string[]
}

export interface TreeResponse {
  rootId: string
  pathToId: Record<string, string>
}

export const uploadApi = {
  createTree: (data: TreeRequest) => api.post<TreeResponse>('/api/collections/create-tree', data).then(r => r.data),
  /** Upload 1 file. collectionId → path thật trong B2 theo cây collection + auto-link. */
  uploadFile: (file: File, personId?: string, collectionId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (personId) form.append('personId', personId)
    if (collectionId) form.append('collectionId', collectionId)
    if (file.lastModified) form.append('lastModified', String(file.lastModified))
    return api.post('/api/media-files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  deleteMedia: (ids: string[]) =>
    api.post('/api/media-files/delete-batch', ids).then(r => r.data),
}

export const mediaApi = {
  patch: (id: string, data: { caption?: string; isFavorite?: boolean }) =>
    api.patch<MediaFileResponse>(`/api/media-files/${id}`, data).then(r => r.data),
  favoriteBatch: (ids: string[], value: boolean) =>
    api.post('/api/media-files/batch/favorite', { ids, value }).then(r => r.data),
  moveBatch: (fromCollectionId: string, toCollectionId: string, ids: string[]) =>
    api.post('/api/media-files/batch/move', { fromCollectionId, toCollectionId, ids }).then(r => r.data),
  addPerson: (id: string, personId: string) =>
    api.post<MediaFileResponse>(`/api/media-files/${id}/persons/${personId}`).then(r => r.data),
  removePerson: (id: string, personId: string) =>
    api.delete<MediaFileResponse>(`/api/media-files/${id}/persons/${personId}`).then(r => r.data),
  addPersonBatch: (ids: string[], personId: string) =>
    api.post('/api/media-files/batch/persons', { ids, personId }).then(r => r.data),
  removePersonBatch: (ids: string[], personId: string) =>
    api.delete('/api/media-files/batch/persons', { data: { ids, personId } }).then(r => r.data),
  addToCollectionBatch: (collectionId: string, ids: string[]) =>
    api.post(`/api/collections/${collectionId}/media/batch`, ids).then(r => r.data),
  removeFromCollectionBatch: (collectionId: string, ids: string[]) =>
    api.delete(`/api/collections/${collectionId}/media/batch`, { data: ids }).then(r => r.data),
  setAsCover: (collectionId: string, mediaId: string) =>
    api.post(`/api/collections/${collectionId}/set-thumbnail/${mediaId}`).then(r => r.data),
}

export const collectionBrowseApi = {
  getByPerson: (personId: string) =>
    api.get<CollectionResponse[]>(`/api/collections/person/${personId}`, { params: { inclChildrenCount: true, inclMediaCount: true } }).then(r => r.data),
  getRoot: () => api.get<CollectionResponse>('/api/collections/root').then(r => r.data),
  getTopLevel: () => api.get<CollectionResponse[]>('/api/collections', { params: { inclChildrenCount: true, inclMediaCount: true, inclPersons: true } }).then(r => r.data),
  getById: (id: string) => api.get<CollectionResponse>(`/api/collections/${id}`).then(r => r.data),
  getChildren: (id: string) => api.get<CollectionResponse[]>(`/api/collections/${id}/children`, { params: { inclChildrenCount: true, inclMediaCount: true, inclPersons: true } }).then(r => r.data),
  getBreadcrumb: (id: string) => api.get<CollectionResponse[]>(`/api/collections/${id}/breadcrumb`).then(r => r.data),
  getCollectionMedia: (id: string, sort?: string, sortDir?: string) => api.get(`/api/collections/${id}/media`, { params: { sort, sortDir, inclDetails: true, inclPersons: true } }).then(r => r.data),
}
