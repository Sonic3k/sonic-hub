import { existsSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { KIND_FACETS, normalizeAnswer, type Facet, type ItemKind, type QuestionInput } from '@learn/shared';
import { courseEntries, entryKey, type ContentModel, type Issue, type LoadedCourse, type LoadedEntry, type LoadedSubject } from './loader.js';
import { findTextRefs, isRelativeRef, MEDIA_EXTENSIONS } from './media.js';

export interface MediaUse {
  abs: string;
  file: string;
  path: string;
}

export interface ContentIndex {
  courses: Map<string, LoadedCourse>;
  subjectOfCourse: Map<string, LoadedSubject>;
  /** Item id → the entry that declares it. */
  declarations: Map<string, LoadedEntry>;
  /** Every referenced media file (absolute path → first use). */
  media: Map<string, MediaUse>;
}

export function defaultFacet(kind: ItemKind): Facet {
  return kind === 'vocab' ? 'use' : 'apply';
}

export function questionFacet(q: QuestionInput, kind: ItemKind): Facet {
  return q.facet ?? defaultFacet(kind);
}

/** Media used by one item entry: [relative ref, field path]. */
function entryMediaRefs(e: LoadedEntry): [string, string][] {
  const out: [string, string][] = [];
  const add = (ref: string | null | undefined, path: string) => ref && out.push([ref, path]);
  const addText = (text: string | null | undefined, path: string) => findTextRefs(text).forEach((r) => out.push([r, path]));
  const d = e.declaration;
  if (d) {
    add(d.image, `${e.path}.image`);
    add(d.audio, `${e.path}.audio`);
    if (d.kind !== 'vocab') {
      addText(d.front, `${e.path}.front`);
      addText(d.back, `${e.path}.back`);
    }
  }
  const src = d ?? e.ref!;
  addText(src.note, `${e.path}.note`);
  (src.examples ?? []).forEach((ex, i) => typeof ex !== 'string' && add(ex.audio, `${e.path}.examples[${i}].audio`));
  (src.questions ?? []).forEach((q, qi) => {
    const p = `${e.path}.questions[${qi}]`;
    add(q.image, `${p}.image`);
    add(q.audio, `${p}.audio`);
    addText(q.prompt, `${p}.prompt`);
    addText(q.explanation, `${p}.explanation`);
    addText(q.back, `${p}.back`);
    (q.options ?? []).forEach((o, oi) => {
      addText(o.text, `${p}.options[${oi}].text`);
      addText(o.why, `${p}.options[${oi}].why`);
      addText(o.match, `${p}.options[${oi}].match`);
    });
  });
  return out;
}

export function checkContent(model: ContentModel): { issues: Issue[]; index: ContentIndex } {
  const issues: Issue[] = [...model.issues];
  const err = (file: string, message: string, path?: string) => issues.push({ level: 'error', file, path, message });
  const warn = (file: string, message: string, path?: string) => issues.push({ level: 'warning', file, path, message });
  const rel = (abs: string) => relative(model.root, abs).split(sep).join('/');

  const index: ContentIndex = { courses: new Map(), subjectOfCourse: new Map(), declarations: new Map(), media: new Map() };

  const useMedia = (ref: string, baseDir: string, file: string, path: string) => {
    if (!isRelativeRef(ref)) return err(file, `media must be a relative path: ${ref}`, path);
    const abs = resolve(baseDir, ref.split(/[?#]/)[0]);
    if (!rel(abs) || rel(abs).startsWith('..')) return err(file, `media path leaves the content folder: ${ref}`, path);
    if (!MEDIA_EXTENSIONS.has(extname(abs).toLowerCase())) return err(file, `unsupported media type: ${ref}`, path);
    if (!existsSync(abs) || !statSync(abs).isFile()) return err(file, `media file not found: ${ref}`, path);
    if (!index.media.has(abs)) index.media.set(abs, { abs, file, path });
  };

  // Subjects and courses ---------------------------------------------------------------------
  const prefixes = new Map<string, string>();
  for (const s of model.subjects) {
    const other = prefixes.get(s.data.prefix);
    if (other) err(s.file, `prefix "${s.data.prefix}" is already used by subject "${other}"`, 'prefix');
    prefixes.set(s.data.prefix, s.key);
    findTextRefs(s.themeCss).forEach((r) => useMedia(r, s.dir, `${s.key}/theme.css`, 'url()'));
    for (const c of s.courses) {
      const other = index.courses.get(c.key);
      if (other) err(c.file, `course id "${c.key}" is already used by ${other.file}`, 'id');
      else {
        index.courses.set(c.key, c);
        index.subjectOfCourse.set(c.key, s);
      }
    }
  }

  // Declarations ------------------------------------------------------------------------------
  const allEntries: LoadedEntry[] = [];
  for (const s of model.subjects) {
    for (const c of s.courses) {
      for (const e of courseEntries(c)) {
        allEntries.push(e);
        if (!e.declaration) continue;
        const id = e.declaration.id;
        if (!id.startsWith(`${s.data.prefix}.`)) err(e.file, `item id must start with "${s.data.prefix}." in subject ${s.key}`, `${e.path}.id`);
        const first = index.declarations.get(id);
        if (first) err(e.file, `item "${id}" is already declared in ${first.file} — use "ref: ${id}" here`, `${e.path}.id`);
        else index.declarations.set(id, e);
      }
      for (const l of c.lessons) {
        findTextRefs(l.bodyMd).forEach((r) => useMedia(r, l.dir, rel(l.files.md!), 'body'));
        findTextRefs(l.slidesHtml).forEach((r) => useMedia(r, l.dir, rel(l.files.slides!), 'slides'));
        if (l.video && !/^https?:\/\//.test(l.video)) err(rel(l.files.md!), 'video must be an http(s) URL', 'frontmatter.video');
      }
    }
  }

  // References, questions, media ---------------------------------------------------------------
  const questionKeys = new Map<string, string>();
  for (const e of allEntries) {
    const key = entryKey(e);
    const decl = index.declarations.get(key);
    if (e.ref && !decl) {
      err(e.file, `ref "${key}" does not match any declared item`, `${e.path}.ref`);
      continue;
    }
    const kind = (decl?.declaration?.kind ?? 'concept') as ItemKind;
    for (const r of e.declaration?.related ?? []) {
      const id = typeof r === 'string' ? r : r.id;
      if (!index.declarations.has(id)) err(e.file, `related item "${id}" is not declared`, `${e.path}.related`);
      if (id === key) err(e.file, 'an item cannot be related to itself', `${e.path}.related`);
    }
    (e.declaration ?? e.ref!).questions?.forEach((q, qi) => {
      const qKey = `${key}#${q.id}`;
      const seen = questionKeys.get(qKey);
      if (seen) err(e.file, `question id "${q.id}" is already used for ${key} in ${seen}`, `${e.path}.questions[${qi}].id`);
      questionKeys.set(qKey, e.file);
      const facet = questionFacet(q, kind);
      if (!KIND_FACETS[kind].includes(facet))
        err(e.file, `facet "${facet}" is not valid for a ${kind} item (use: ${KIND_FACETS[kind].join(', ')})`, `${e.path}.questions[${qi}].facet`);
    });
    for (const [ref, path] of entryMediaRefs(e)) useMedia(ref, e.dir, e.file, path);
  }

  // Collections and exams ---------------------------------------------------------------------------
  for (const c of index.courses.values()) {
    (c.data.include ?? []).forEach((rule, ri) => {
      for (const target of rule.courses) {
        if (target === c.key) err(c.file, 'a course cannot include itself', `include[${ri}].courses`);
        else if (!index.courses.has(target)) err(c.file, `included course "${target}" does not exist`, `include[${ri}].courses`);
      }
    });
    const exam = c.data.exam;
    if (exam?.domains?.length) {
      const total = exam.domains.reduce((sum, d) => sum + d.weight, 0);
      if (Math.abs(total - 100) > 0.5) warn(c.file, `exam domain weights add up to ${total}, not 100`, 'exam.domains');
      const tagsInCourse = new Set<string>();
      for (const e of courseEntries(c)) {
        const decl = index.declarations.get(entryKey(e))?.declaration;
        decl?.tags?.forEach((t) => tagsInCourse.add(t));
        decl?.questions?.forEach((q) => q.tags?.forEach((t) => tagsInCourse.add(t)));
        e.ref?.questions?.forEach((q) => q.tags?.forEach((t) => tagsInCourse.add(t)));
      }
      exam.domains.forEach((d, di) => {
        if (!tagsInCourse.has(d.tag)) warn(c.file, `no item or question in this course is tagged "${d.tag}" yet`, `exam.domains[${di}].tag`);
      });
    }
    if (!courseEntries(c).length && !c.data.include?.length) warn(c.file, 'course has no items yet');
  }

  // Likely duplicates: same term + part of speech declared under different ids ------------------
  const terms = new Map<string, LoadedEntry>();
  for (const e of index.declarations.values()) {
    const d = e.declaration;
    if (d?.kind !== 'vocab') continue;
    const k = `${d.id.split('.')[0]}|${normalizeAnswer(d.term)}|${(d.pos ?? '').toLowerCase()}`;
    const other = terms.get(k);
    if (other) warn(e.file, `"${d.term}" (${d.pos ?? 'no pos'}) is also declared as ${entryKey(other)} in ${other.file} — same item? use ref`, `${e.path}.term`);
    else terms.set(k, e);
  }

  return { issues, index };
}

export function formatIssues(issues: Issue[], github = false): string {
  return issues
    .map((i) => {
      if (github) return `::${i.level} file=sonic-hub-learn/content/${i.file},title=content::${i.path ? `${i.path}: ` : ''}${i.message}`;
      return `${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.file}${i.path ? ` › ${i.path}` : ''}  ${i.message}`;
    })
    .join('\n');
}
