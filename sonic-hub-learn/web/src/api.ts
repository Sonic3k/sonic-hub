import type {
  AnswerInput,
  AnswerResult,
  CourseDetail,
  CreateSessionInput,
  EnrollmentInput,
  LeechView,
  LessonDetail,
  ReadingResponse,
  SessionView,
  StatsView,
  SubjectSummary,
} from '@learn/shared';

/** The API's origin; empty when the web is served next to it (or proxied in development). */
const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data && typeof data.message === 'string' ? data.message : `Lỗi ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  subjects: () => call<SubjectSummary[]>('/subjects'),
  course: (key: string) => call<CourseDetail>(`/courses/${encodeURIComponent(key)}`),
  enroll: (key: string, input: EnrollmentInput) => call<CourseDetail>(`/courses/${encodeURIComponent(key)}/enrollment`, { body: input }),
  lesson: (id: number) => call<LessonDetail>(`/lessons/${id}`),
  saveProgress: (id: number, position: number) => call<{ position: number }>(`/lessons/${id}/progress`, { method: 'PUT', body: { position } }),
  reading: () => call<ReadingResponse>('/reading'),
  expose: (itemKeys: string[]) => call<{ updated: number }>('/exposures', { body: { itemKeys } }),
  daily: () => call<SessionView>('/daily'),
  createSession: (input: CreateSessionInput) => call<SessionView>('/sessions', { body: input }),
  session: (id: number) => call<SessionView>(`/sessions/${id}`),
  answer: (id: number, input: AnswerInput) => call<AnswerResult>(`/sessions/${id}/answers`, { body: input }),
  submit: (id: number) => call<SessionView>(`/sessions/${id}/submit`, { body: {} }),
  stats: () => call<StatsView>('/stats'),
  weak: () => call<LeechView[]>('/leeches?weak=true'),
};
