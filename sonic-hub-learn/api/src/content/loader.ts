import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  ChapterFileSchema,
  CourseFileSchema,
  ItemDeclarationSchema,
  ItemRefSchema,
  LessonFrontmatterSchema,
  SubjectFileSchema,
  type ChapterFile,
  type CourseFile,
  type ItemDeclarationInput,
  type ItemRefInput,
  type SubjectFile,
} from '@learn/shared';
import matter from 'gray-matter';
import YAML from 'yaml';
import { z } from 'zod';

/*
 * Reads the content tree into memory:
 *   <subject>/subject.yaml, theme.css
 *   <subject>/courses/<course>/course.yaml
 *   <subject>/courses/<course>/<chapter>[/<sub-chapter>...]/chapter.yaml
 *   <chapter>/<lesson>.md | <lesson>.items.yaml | <lesson>.slides.html
 */

export interface Issue {
  level: 'error' | 'warning';
  /** Path relative to the content root. */
  file: string;
  path?: string;
  message: string;
}

export interface LoadedEntry {
  file: string;
  path: string;
  /** Absolute folder of the file; media paths resolve against it. */
  dir: string;
  courseKey: string;
  lessonKey: string | null;
  declaration?: ItemDeclarationInput;
  ref?: ItemRefInput;
}

export interface LoadedLesson {
  key: string;
  stem: string;
  chapterKey: string;
  title: string;
  summary: string | null;
  video: string | null;
  bodyMd: string | null;
  slidesHtml: string | null;
  sort: number;
  dir: string;
  files: { md?: string; items?: string; slides?: string };
  entries: LoadedEntry[];
}

export interface LoadedChapter {
  key: string;
  parentKey: string | null;
  title: string;
  description: string | null;
  sort: number;
  dir: string;
  file: string;
}

export interface LoadedCourse {
  key: string;
  dir: string;
  file: string;
  data: CourseFile;
  subjectKey: string;
  chapters: LoadedChapter[];
  lessons: LoadedLesson[];
  /** Items/refs listed in course.yaml itself. */
  courseEntries: LoadedEntry[];
}

export interface LoadedSubject {
  key: string;
  dir: string;
  file: string;
  data: SubjectFile;
  themeCss: string | null;
  courses: LoadedCourse[];
}

export interface ContentModel {
  root: string;
  subjects: LoadedSubject[];
  issues: Issue[];
}

const LESSON_FILE_RE = /^(.+?)\.(md|items\.ya?ml|slides\.html)$/;
const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

const CourseFileLoose = CourseFileSchema.extend({ items: z.array(z.unknown()).optional() });
const ItemsFileLoose = z.strictObject({ title: z.string().nullish(), items: z.array(z.unknown()).optional() });

function zodPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, p) => (typeof p === 'number' ? `${acc}[${p}]` : acc ? `${acc}.${String(p)}` : String(p)), '');
}

function humanize(stem: string): string {
  const words = stem.replace(/^\d+[-_.\s]*/, '').replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : stem;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function loadContent(root: string): ContentModel {
  const issues: Issue[] = [];
  const rel = (abs: string) => relative(root, abs).split(sep).join('/');
  const issue = (level: Issue['level'], abs: string, message: string, path?: string) =>
    issues.push({ level, file: rel(abs), path, message });

  function readYaml(abs: string): unknown {
    try {
      return YAML.parse(readFileSync(abs, 'utf8'), { prettyErrors: true }) ?? {};
    } catch (e) {
      issue('error', abs, `invalid YAML: ${(e as Error).message.split('\n')[0]}`);
      return undefined;
    }
  }

  function parse<T>(schema: z.ZodType<T>, raw: unknown, abs: string, basePath = ''): T | undefined {
    if (raw === undefined) return undefined;
    const r = schema.safeParse(raw);
    if (r.success) return r.data;
    for (const i of r.error.issues) {
      const p = zodPath(i.path);
      issue('error', abs, i.message, basePath && p ? `${basePath}.${p}` : basePath || p || undefined);
    }
    return undefined;
  }

  function parseEntries(raw: unknown[], abs: string, dir: string, courseKey: string, lessonKey: string | null, listPath: string): LoadedEntry[] {
    const out: LoadedEntry[] = [];
    raw.forEach((value, i) => {
      const path = `${listPath}[${i}]`;
      const base = { file: rel(abs), path, dir, courseKey, lessonKey };
      if (value && typeof value === 'object' && 'ref' in value) {
        const ref = parse(ItemRefSchema, value, abs, path);
        if (ref) out.push({ ...base, ref });
      } else if (value && typeof value === 'object' && 'kind' in value) {
        const declaration = parse(ItemDeclarationSchema, value, abs, path);
        if (declaration) out.push({ ...base, declaration });
      } else {
        issue('error', abs, 'an item needs "id" + "kind" (declaration) or "ref" (reuse)', path);
      }
    });
    return out;
  }

  function loadChapters(course: LoadedCourse, dir: string, parentKey: string | null) {
    const names = readdirSync(dir).filter((n) => isDir(join(dir, n)) && !n.startsWith('.') && !n.startsWith('_')).sort(natural);
    names.forEach((name, index) => {
      const chapterDir = join(dir, name);
      const file = join(chapterDir, 'chapter.yaml');
      if (!existsSync(file)) {
        const strays = readdirSync(chapterDir).filter((n) => LESSON_FILE_RE.test(n));
        if (strays.length) issue('warning', chapterDir, 'folder has lesson files but no chapter.yaml — ignored');
        return;
      }
      const data = parse<ChapterFile>(ChapterFileSchema, readYaml(file), file);
      const key = parentKey ? `${parentKey}/${name}` : name;
      course.chapters.push({
        key,
        parentKey,
        title: data?.title ?? humanize(name),
        description: data?.description ?? null,
        sort: index,
        dir: chapterDir,
        file: rel(file),
      });
      loadLessons(course, chapterDir, key);
      loadChapters(course, chapterDir, key);
    });
  }

  function loadLessons(course: LoadedCourse, dir: string, chapterKey: string) {
    const byStem = new Map<string, LoadedLesson['files']>();
    for (const name of readdirSync(dir)) {
      if (name === 'chapter.yaml' || /^readme\.md$/i.test(name)) continue;
      const m = LESSON_FILE_RE.exec(name);
      if (!m || isDir(join(dir, name))) continue;
      const files = byStem.get(m[1]) ?? {};
      const type = m[2] === 'md' ? 'md' : m[2].startsWith('items') ? 'items' : 'slides';
      files[type] = join(dir, name);
      byStem.set(m[1], files);
    }
    [...byStem.keys()].sort(natural).forEach((stem, index) => {
      const files = byStem.get(stem)!;
      const key = `${chapterKey}/${stem}`;
      let title: string | null = null;
      let summary: string | null = null;
      let video: string | null = null;
      let bodyMd: string | null = null;
      if (files.md) {
        try {
          const fm = matter(readFileSync(files.md, 'utf8'));
          const front = parse(LessonFrontmatterSchema, fm.data, files.md, 'frontmatter');
          title = front?.title ?? null;
          summary = front?.summary ?? null;
          video = front?.video ?? null;
          bodyMd = fm.content.trim() || null;
        } catch (e) {
          issue('error', files.md, `invalid frontmatter: ${(e as Error).message.split('\n')[0]}`);
        }
      }
      let entries: LoadedEntry[] = [];
      if (files.items) {
        const data = parse(ItemsFileLoose, readYaml(files.items), files.items);
        if (data) {
          title ??= data.title ?? null;
          entries = parseEntries(data.items ?? [], files.items, dir, course.key, key, 'items');
        }
      }
      course.lessons.push({
        key,
        stem,
        chapterKey,
        title: title ?? humanize(stem),
        summary,
        video,
        bodyMd,
        slidesHtml: files.slides ? readFileSync(files.slides, 'utf8') : null,
        sort: index,
        dir,
        files,
        entries,
      });
    });
  }

  const subjects: LoadedSubject[] = [];
  if (!isDir(root)) {
    issues.push({ level: 'error', file: '.', message: `content folder not found: ${root}` });
    return { root, subjects, issues };
  }
  for (const name of readdirSync(root).filter((n) => isDir(join(root, n)) && !n.startsWith('.') && !n.startsWith('_')).sort(natural)) {
    const dir = join(root, name);
    const file = join(dir, 'subject.yaml');
    if (!existsSync(file)) {
      issue('warning', dir, 'folder without subject.yaml — ignored');
      continue;
    }
    const data = parse<SubjectFile>(SubjectFileSchema, readYaml(file), file);
    if (!data) continue;
    if (data.id !== name) issue('error', file, `id "${data.id}" must equal the folder name "${name}"`, 'id');
    const themeFile = join(dir, 'theme.css');
    const subject: LoadedSubject = {
      key: name,
      dir,
      file: rel(file),
      data,
      themeCss: existsSync(themeFile) ? readFileSync(themeFile, 'utf8') : null,
      courses: [],
    };
    const coursesDir = join(dir, 'courses');
    if (isDir(coursesDir)) {
      for (const courseName of readdirSync(coursesDir).filter((n) => isDir(join(coursesDir, n)) && !n.startsWith('.')).sort(natural)) {
        const courseDir = join(coursesDir, courseName);
        const courseFile = join(courseDir, 'course.yaml');
        if (!existsSync(courseFile)) {
          issue('warning', courseDir, 'folder without course.yaml — ignored');
          continue;
        }
        const parsed = parse(CourseFileLoose, readYaml(courseFile), courseFile);
        if (!parsed) continue;
        if (parsed.id !== courseName) issue('error', courseFile, `id "${parsed.id}" must equal the folder name "${courseName}"`, 'id');
        const { items: rawItems, ...rest } = parsed;
        const course: LoadedCourse = {
          key: courseName,
          dir: courseDir,
          file: rel(courseFile),
          data: rest as CourseFile,
          subjectKey: name,
          chapters: [],
          lessons: [],
          courseEntries: [],
        };
        course.courseEntries = parseEntries(rawItems ?? [], courseFile, courseDir, courseName, null, 'items');
        if (readdirSync(courseDir).some((n) => LESSON_FILE_RE.test(n)))
          issue('warning', courseDir, 'lesson files must live inside a chapter folder (with chapter.yaml) — ignored');
        loadChapters(course, courseDir, null);
        subject.courses.push(course);
      }
    }
    subjects.push(subject);
  }
  return { root, subjects, issues };
}

/** Every item entry of a course in course order: lessons first, then course.yaml items. */
export function courseEntries(course: LoadedCourse): LoadedEntry[] {
  return [...course.lessons.flatMap((l) => l.entries), ...course.courseEntries];
}

export function entryKey(entry: LoadedEntry): string {
  return entry.declaration ? entry.declaration.id : entry.ref!.ref;
}
