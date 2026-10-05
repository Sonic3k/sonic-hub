import api from './client'
import type { ChatArchiveResponse } from '../types'

/** Other chats: conversations kept for reading, not linked to anyone in Persons. */
export const otherChatsApi = {
  list: () => api.get<ChatArchiveResponse[]>('/api/chat-archives/others').then(r => r.data),
  /** personId links it to a person; unlink=true makes it an other chat again; counterpart renames */
  patch: (id: string, data: { personId?: string; unlink?: boolean; counterpart?: string }) =>
    api.patch<ChatArchiveResponse>(`/api/chat-archives/${id}`, data).then(r => r.data),
}
