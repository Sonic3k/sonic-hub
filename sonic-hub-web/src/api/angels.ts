import { http } from './client';
import type { ChatArchive, Collection, MediaFile, Paged, Person, PersonDetail, TimelineBucket } from '../types';

const inc = 'inclChildrenCount=true&inclMediaCount=true';

export interface SearchParams {
  collectionId?: string;
  personId?: string;
  type?: 'IMAGE' | 'VIDEO';
  favorite?: boolean;
  featured?: boolean;
  q?: string;
  random?: boolean;
  page?: number;
  size?: number;
  sortBy?: 'effectiveDate' | 'createdAt' | 'fileName';
  sortDir?: 'asc' | 'desc';
}

export const api = {
  persons: () => http.get<Person[]>('/persons').then(r => r.data),
  person: (id: string) => http.get<PersonDetail>(`/persons/${id}`).then(r => r.data),
  personCollections: (id: string) => http.get<Collection[]>(`/collections/person/${id}?${inc}`).then(r => r.data),
  chatArchives: (personId: string) => http.get<ChatArchive[]>(`/persons/${personId}/chat-archives`).then(r => r.data),

  rootCollection: () => http.get<Collection>(`/collections/root?${inc}`).then(r => r.data),
  collection: (id: string) => http.get<Collection>(`/collections/${id}?${inc}`).then(r => r.data),
  children: (id: string) => http.get<Collection[]>(`/collections/${id}/children?${inc}`).then(r => r.data),
  breadcrumb: (id: string) => http.get<Collection[]>(`/collections/${id}/breadcrumb`).then(r => r.data),

  search: (p: SearchParams) => http.get<Paged<MediaFile>>('/media-files/search', { params: p }).then(r => r.data),
  media: (id: string) => http.get<MediaFile>(`/media-files/${id}`).then(r => r.data),
  timelineIndex: () => http.get<TimelineBucket[]>('/media-files/timeline-index', { params: { tz: 'Asia/Ho_Chi_Minh' } }).then(r => r.data),
};
