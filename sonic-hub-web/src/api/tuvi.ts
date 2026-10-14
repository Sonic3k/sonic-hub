/* Tử vi on the API (angels-islands-api, the shared database): saved birth profiles and the AI readings of their charts.
   The chart and the matching of grandma's notes happen in the browser; only these two things are stored. */
import { get, send } from './client';

export interface TuViProfile {
  id: string; name: string; gender: 'nam' | 'nu'; calendar: 'solar' | 'lunar';
  year: number; month: number; day: number; leap: boolean; hour: number; minute: number | null;
  variant: 'ba' | 'sach'; leapRule: 'same' | 'split15'; tyNextDay: boolean;
  personId: string | null; personName: string | null; note: string | null; createdAt: string; updatedAt: string;
}
export type TuViProfileInput = Omit<TuViProfile, 'id' | 'personName' | 'createdAt' | 'updatedAt'>;

export interface AiSection { title: string; ba: { text: string; refs: string[] }[]; them: { text: string }[] }
export interface AiReading {
  id: string | null; profileId: string | null; scope: string; viewYear: number; inputHash: string; model: string;
  content: { sections: AiSection[]; caution?: string }; createdAt: string | null;
}
export interface AiRequest {
  profileId: string | null; scope: string; viewYear: number; inputHash: string; chart: string;
  lines: { ref: string; palace: string; source: 'ba' | 'bo-sung'; text: string; why: string }[];
}

export const tuviApi = {
  profiles: () => get<TuViProfile[]>('/tuvi/profiles'),
  profile: (id: string) => get<TuViProfile>(`/tuvi/profiles/${id}`),
  create: (p: TuViProfileInput) => send<TuViProfile>('POST', '/tuvi/profiles', p),
  update: (id: string, p: TuViProfileInput) => send<TuViProfile>('PUT', `/tuvi/profiles/${id}`, p),
  remove: (id: string) => send<void>('DELETE', `/tuvi/profiles/${id}`),
  readings: (id: string) => get<AiReading[]>(`/tuvi/profiles/${id}/readings`),
  generate: (r: AiRequest) => send<AiReading>('POST', '/tuvi/readings', r),
  removeReading: (id: string) => send<void>('DELETE', `/tuvi/readings/${id}`),
  status: () => get<{ ai: boolean; model: string }>('/tuvi/status'),
};
