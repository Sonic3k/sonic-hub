import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function EditModal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4"
        style={{ background: '#faf5eb', borderRadius: '3px', boxShadow: '4px 8px 24px rgba(80,50,10,.22)' }}>
        <div className="h-[3px] rounded-t-sm opacity-60" style={{ background: '#b8905a' }} />
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9a8a70' }}>{title}</span>
          <button onClick={onClose} style={{ color: '#9a8a70' }} className="hover:text-[#5a3e28] transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5 pt-3">{children}</div>
      </div>
    </div>
  )
}
