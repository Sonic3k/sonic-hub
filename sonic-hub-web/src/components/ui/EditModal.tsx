import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
  color?: string
  ruleColor?: string
}

export default function EditModal({ onClose, children, color = '#faf5eb', ruleColor = '#b8905a' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        className="relative w-full max-w-lg"
        style={{
          background: color,
          borderRadius: '3px',
          boxShadow: '6px 10px 40px rgba(60,40,10,.25), 0 2px 8px rgba(0,0,0,.1)',
          transform: 'rotate(-0.3deg)',
        }}
      >
        {/* Top rule */}
        <div className="h-1 rounded-t-sm" style={{ background: ruleColor, opacity: 0.7 }} />
        {/* Ruled lines */}
        <div className="absolute inset-0 top-1 pointer-events-none rounded-b-sm overflow-hidden"
          style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(0,0,0,.05) 31px, rgba(0,0,0,.05) 32px)',
            backgroundPositionY: '16px',
          }} />
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-black/8"
          style={{ color: '#b0997a' }}>
          <X size={14} />
        </button>
        <div className="relative z-[1] p-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}
