import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  ChapterFileSchema,
  CourseFileSchema,
  ItemsFileSchema,
  LessonFrontmatterSchema,
  SubjectFileSchema,
} from './content.js';

/** Writes the content schemas as JSON Schema files, for LLMs and YAML editors to author against. */
const outDir = resolve(process.argv[2] ?? '.');
mkdirSync(outDir, { recursive: true });

const schemas: Record<string, { schema: z.ZodType; title: string }> = {
  subject: { schema: SubjectFileSchema, title: 'subject.yaml' },
  course: { schema: CourseFileSchema, title: 'course.yaml' },
  chapter: { schema: ChapterFileSchema, title: 'chapter.yaml' },
  items: { schema: ItemsFileSchema, title: '<lesson>.items.yaml' },
  'lesson-frontmatter': { schema: LessonFrontmatterSchema, title: '<lesson>.md frontmatter' },
};

for (const [name, { schema, title }] of Object.entries(schemas)) {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  const out = { $id: `${name}.schema.json`, title, ...json };
  writeFileSync(join(outDir, `${name}.schema.json`), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${name}.schema.json`);
}
