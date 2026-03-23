import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  accentColor?: string
}

export default function FullScreenPanel({ title, onClose, children, accentColor = '#c17f3e' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#faf8f5' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: '#e8e0d4', borderLeftWidth: 3, borderLeftColor: accentColor }}>
        <button onClick={onClose}
          className="flex items-center gap-1.5 font-semibold text-sm transition-colors"
          style={{ color: accentColor }}>
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-xs font-medium" style={{ color: '#9a8a7a' }}>{title}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
