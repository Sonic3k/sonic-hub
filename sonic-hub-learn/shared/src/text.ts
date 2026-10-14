/** Cloze markers use Anki syntax: {{c1::answer}}, {{c1::answer|alternative}}, {{c1::answer::hint}}. */
const CLOZE_RE = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;

export interface ClozeBlank {
  index: number;
  /** Accepted answers; the first one is the canonical answer. */
  answers: string[];
  hint: string | null;
}

export type ClozeSegment = { text: string } | { blank: number; hint: string | null };

export interface ParsedCloze {
  blanks: ClozeBlank[];
  segments: ClozeSegment[];
  /** The sentence with every blank filled with its canonical answer. */
  full: string;
}

export function hasCloze(text: string): boolean {
  CLOZE_RE.lastIndex = 0;
  return CLOZE_RE.test(text);
}

export function parseCloze(text: string): ParsedCloze {
  const blanks = new Map<number, ClozeBlank>();
  const segments: ClozeSegment[] = [];
  let full = '';
  let last = 0;
  CLOZE_RE.lastIndex = 0;
  for (let m = CLOZE_RE.exec(text); m; m = CLOZE_RE.exec(text)) {
    const index = Number(m[1]);
    const answers = m[2].split('|').map((s) => s.trim()).filter(Boolean);
    const hint = m[3]?.trim() || null;
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index) });
      full += text.slice(last, m.index);
    }
    segments.push({ blank: index, hint });
    full += answers[0] ?? '';
    if (!blanks.has(index)) blanks.set(index, { index, answers, hint });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last) });
    full += text.slice(last);
  }
  return { blanks: [...blanks.values()].sort((a, b) => a.index - b.index), segments, full };
}

/** The sentence with cloze markers replaced by their canonical answers. */
export function clozeToPlain(text: string): string {
  return parseCloze(text).full;
}

/** Normalizes a typed answer for comparison: case, spacing, quotes and surrounding punctuation. */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s"'.,!?;:()]+|[\s"'.,!?;:()]+$/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export type TypedMatch = 'exact' | 'typo' | 'wrong';

/**
 * Compares a typed answer with the accepted answers. A small typo (one edit for 5+ letters,
 * two edits for 10+ letters) still counts as correct, but is reported so it can be graded Hard.
 */
export function matchTyped(input: string, accepted: string[]): TypedMatch {
  const given = normalizeAnswer(input);
  if (!given) return 'wrong';
  let best: TypedMatch = 'wrong';
  for (const answer of accepted) {
    const target = normalizeAnswer(answer);
    if (!target) continue;
    if (given === target) return 'exact';
    const allowed = target.length >= 10 ? 2 : target.length >= 5 ? 1 : 0;
    if (allowed > 0 && levenshtein(given, target) <= allowed) best = 'typo';
  }
  return best;
}
