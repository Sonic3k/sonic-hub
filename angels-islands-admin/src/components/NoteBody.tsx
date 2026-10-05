import { useState } from 'react'

/** Long writings (a friend's whole blog) fold to a preview until opened. */
export default function NoteBody({ html }: { html: string }) {
  const [open, setOpen] = useState(false)
  const long = html.replace(/<[^>]+>/g, '').length > 1400
  return (
    <div>
      <div className={`journal-content text-sm text-slate-700 leading-relaxed ${long && !open ? 'max-h-72 overflow-hidden relative' : ''}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {long && !open && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />}
      </div>
      {long && (
        <button onClick={() => setOpen(v => !v)} className="mt-1 text-xs text-pink-500 hover:underline">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
