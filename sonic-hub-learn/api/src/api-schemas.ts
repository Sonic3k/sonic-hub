import { FACETS } from '@learn/shared';
import { z } from 'zod';

/* Request bodies, validated at the edge. Types match the shared API contract. */

export const CreateSessionBody = z.strictObject({
  mode: z.enum(['quiz', 'flashcard', 'exam']),
  courseKey: z.string().min(1).optional(),
  scope: z
    .strictObject({
      lessonIds: z.array(z.number().int().positive()).max(500).optional(),
      chapterKeys: z.array(z.string().min(1)).max(200).optional(),
      tags: z.array(z.string().min(1)).max(50).optional(),
      itemKeys: z.array(z.string().min(1)).max(2000).optional(),
      weak: z.boolean().optional(),
    })
    .optional(),
  facets: z.array(z.enum(FACETS)).optional(),
  size: z.number().int().min(1).max(200).optional(),
});

export const AnswerBody = z.strictObject({
  sessionCardId: z.number().int().positive(),
  optionIds: z.array(z.string().max(40)).max(50).optional(),
  value: z.boolean().optional(),
  text: z.string().max(1000).optional(),
  blanks: z.record(z.string(), z.string().max(300)).optional(),
  order: z.array(z.string().max(40)).max(50).optional(),
  pairs: z.record(z.string(), z.string().max(40)).optional(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  timeMs: z.number().int().min(0).max(24 * 3_600_000).optional(),
  hintUsed: z.boolean().optional(),
  clientId: z.string().min(1).max(100).optional(),
});

export const EnrollmentBody = z.strictObject({
  enrolled: z.boolean(),
  dailyEnabled: z.boolean().optional(),
  newPerDay: z.number().int().min(0).max(500).nullable().optional(),
});

export const ExposureBody = z.strictObject({
  itemKeys: z.array(z.string().min(1)).min(1).max(2000),
});

export const ReadingProgressBody = z.strictObject({
  position: z.number().min(0).max(1),
});
