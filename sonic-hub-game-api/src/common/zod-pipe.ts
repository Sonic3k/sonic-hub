import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Validates a request body or parameter against a Zod schema. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const r = this.schema.safeParse(value);
    if (r.success) return r.data;
    throw new BadRequestException({ error: 'invalid', message: r.error.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ') });
  }
}
