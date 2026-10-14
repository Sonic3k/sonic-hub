import { Marked } from 'marked';

/* Markdown from the content repo (trusted: written by us) rendered to HTML. */

const marked = new Marked({ gfm: true, breaks: false });
marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      return `<a href="${href}"${title ? ` title="${title}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    },
  },
});

export function mdBlock(src: string | null | undefined): string {
  return src ? (marked.parse(src, { async: false }) as string) : '';
}

export function mdInline(src: string | null | undefined): string {
  return src ? (marked.parseInline(src, { async: false }) as string) : '';
}

/** HTML-escapes plain text (for the few places that build HTML strings). */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
