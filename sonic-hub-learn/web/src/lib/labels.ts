import type { Facet, RatingValue, SourceType } from '@learn/shared';

export const FACET_LABEL: Record<Facet, string> = {
  recognize: 'Nhận diện',
  recall: 'Nhớ lại',
  use: 'Dùng trong câu',
  listen: 'Nghe',
  apply: 'Vận dụng',
};

export const RATING_LABEL: Record<RatingValue, string> = { 1: 'Quên', 2: 'Khó', 3: 'Nhớ', 4: 'Dễ' };

/** Shown under the self-grade buttons when the API sends no preview (rare). */
export const RATING_FALLBACK: Record<RatingValue, string> = { 1: '1 phút', 2: '6 phút', 3: 'ngày mai', 4: '3 ngày' };

export const SOURCE_LABEL: Record<SourceType, string> = { self: 'Tự soạn', book: 'Sách', website: 'Website', 'online-course': 'Khóa online' };

export const RATINGS: RatingValue[] = [1, 2, 3, 4];

/** The learner's name in greetings (one learner per deployment). */
export const LEARNER_NAME = import.meta.env.VITE_LEARNER_NAME ?? 'Ngọc Anh';
