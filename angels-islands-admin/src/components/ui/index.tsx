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
        'inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-indigo-500 text-white hover:bg-indigo-600',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'danger' && 'text-rose-500 hover:bg-rose-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// --- Modal ---
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
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
          'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
          'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
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
          'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors resize-none',
          'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
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
          'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors bg-white',
          'border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
