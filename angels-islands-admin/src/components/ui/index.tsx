import clsx from 'clsx'
import { X } from 'lucide-react'
import { type ReactNode } from 'react'

// --- Badge ---
export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', className)}>
      {children}
    </span>
  )
}

// --- Button ---
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 active:scale-95',
        size === 'sm' ? 'px-3 py-1.5 text-xs min-h-[32px]' : 'px-4 py-2.5 text-sm min-h-[40px]',
        variant === 'primary' && 'bg-pink-500 text-white hover:bg-pink-600 active:bg-pink-700',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
        variant === 'danger' && 'text-rose-500 hover:bg-rose-50 active:bg-rose-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// --- Modal (bottom sheet on mobile, centered on desktop) ---
export function Modal({ title, onClose, children, size = 'md' }: {
  title: string; onClose: () => void; children: ReactNode; size?: 'md' | 'lg'
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative bg-white shadow-xl w-full overflow-hidden',
        'rounded-t-2xl md:rounded-xl',
        'max-h-[90vh] md:max-h-[85vh]',
        size === 'lg' ? 'md:max-w-lg' : 'md:max-w-md',
        'md:mx-4',
        'animate-slide-up md:animate-none'
      )}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 pb-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 md:py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mr-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)] md:max-h-[calc(85vh-80px)]">{children}</div>
      </div>
    </div>
  )
}

// --- Input ---
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <input
        className={clsx(
          'w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors',
          'border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50',
          error && 'border-rose-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

// --- Textarea ---
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <textarea
        className={clsx(
          'w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors resize-none',
          'border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50',
          className
        )}
        {...props}
      />
    </div>
  )
}

// --- Select ---
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <select
        className={clsx(
          'w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-white',
          'border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
