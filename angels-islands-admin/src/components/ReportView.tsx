import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { ChevronDown, ChevronRight, FileText, X } from 'lucide-react'
import type { PersonReport } from '../types'

const SOURCE_LABEL: Record<string, string> = { deep: 'Nghiên cứu sâu (Claude)' }

/** A long write-up about a person (Markdown), folded to its title until opened. The text is the owner's own data. */
export default function ReportView({ report, onDelete }: { report: PersonReport; onDelete?: () => void }) {
  const [open, setOpen] = useState(false)
  const html = useMemo(() => {
    if (!open) return ''
    const out = marked.parse(report.content, { gfm: true, breaks: false, async: false }) as string
    return out.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>')
  }, [open, report.content])
  const updated = report.updatedAt ? new Date(report.updatedAt).toLocaleDateString('vi-VN') : ''
  return (
    <div className="group bg-white rounded-lg border border-slate-100">
      <div className="flex items-center gap-2 px-3 md:px-4 py-2.5">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          <FileText size={14} className="text-pink-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{report.title}</span>
        </button>
        <span className="text-[11px] text-slate-400 shrink-0">{SOURCE_LABEL[report.source] ?? report.source}{updated && ` · ${updated}`}</span>
        {onDelete && <button onClick={onDelete} title="Xoá bản này"
          className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"><X size={12} /></button>}
      </div>
      {open && <div className="report-content px-4 md:px-6 pb-4 border-t border-slate-50 pt-3" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  )
}
