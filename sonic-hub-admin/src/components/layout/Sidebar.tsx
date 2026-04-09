import { NavLink } from 'react-router-dom'
import { CheckSquare, Tag, Zap, FolderOpen, ListTodo, AlertCircle, Heart, X, Star, Activity, Bell, BookOpen, Calendar } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Tasks', icon: CheckSquare, end: true },
  { to: '/todos', label: 'Todos', icon: ListTodo },
  { to: '/problems', label: 'Problems', icon: AlertCircle },
  { to: '/wishlists', label: 'Wishlists', icon: Star },
  { to: '/entries', label: 'Entries', icon: Activity },
  { to: '/tracking-rules', label: 'Tracking Rules', icon: Bell },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/daily-log', label: 'Daily Log', icon: Calendar },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/companion', label: 'Companion', icon: Heart },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay - mobile only */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      )}

      <aside className={clsx(
        'fixed z-50 top-0 left-0 h-screen w-56 bg-[#0f1117] flex flex-col transition-transform duration-200 ease-in-out',
        'md:sticky md:translate-x-0 md:flex-shrink-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="px-5 py-5 border-b border-[#1e2130] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">Sonic Hub</span>
          </div>
          <button onClick={onClose} className="text-[#8b92a8] hover:text-white md:hidden">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive ? 'bg-[#1e2130] text-white' : 'text-[#8b92a8] hover:bg-[#1a1d27] hover:text-[#c4c9d9]'
              )}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[#1e2130]">
          <p className="text-[#3d4358] text-xs font-mono">v0.2.0</p>
        </div>
      </aside>
    </>
  )
}
