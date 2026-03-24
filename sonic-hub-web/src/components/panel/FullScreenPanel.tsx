import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { TYPE_BG, TYPE_COLOR } from '../card/Card'
import type { CardType } from '../card/Card'

interface Props {
  type: CardType
  onClose: () => void
  children: ReactNode
}

export default function FullScreenPanel({ type, onClose, children }: Props) {
  const col = TYPE_COLOR[type]
  const bg  = TYPE_BG[type]

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: bg }}>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: col + '30' }}>
        <button onClick={onClose}
          className="flex items-center gap-1.5 font-bold text-sm"
          style={{ color: col }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
