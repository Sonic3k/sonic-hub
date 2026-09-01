import { usePersons } from '../hooks/usePersons'
import type { PersonSummary } from '../types'

export default function PersonSelectModal({ title, onSelect, onClose }: {
  title: string
  onSelect: (person: PersonSummary) => void
  onClose: () => void
}) {
  const { data: persons = [] } = usePersons()
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-xl shadow-xl w-full md:max-w-sm md:mx-4 p-5">
        <div className="flex justify-center pt-0 pb-3 md:hidden"><div className="w-10 h-1 rounded-full bg-slate-200" /></div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
        <div className="flex flex-wrap gap-1.5 mb-4 max-h-60 overflow-y-auto">
          {persons.map((p: PersonSummary) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-pink-300 hover:text-pink-600 transition-colors active:scale-95">
              {p.displayName || p.name}
            </button>
          ))}
          {persons.length === 0 && <p className="text-xs text-slate-400">No persons yet</p>}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  )
}
