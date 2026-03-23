import { NavLink } from 'react-router-dom'
import { CheckSquare, ListTodo, AlertCircle, Zap } from 'lucide-react'
import { useTasks, useTodos, useProblems } from '../../hooks'

const nav = [
  { to: '/',         label: 'Tasks',    icon: CheckSquare, end: true },
  { to: '/todos',    label: 'Todos',    icon: ListTodo },
  { to: '/problems', label: 'Problems', icon: AlertCircle },
]

export default function Sidebar() {
  const { data: tasks    = [] } = useTasks()
  const { data: todos    = [] } = useTodos()
  const { data: problems = [] } = useProblems()

  const counts = {
    '/':        tasks.filter(t => t.status !== 'DONE' && t.status !== 'CLOSED').length,
    '/todos':   todos.filter(t => !t.done).length,
    '/problems':problems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length,
  }

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r" style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: '#e8e0d4' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#c17f3e' }}>
          <Zap size={14} color="#fff" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-sm" style={{ color: '#2a1e10' }}>Sonic Hub</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'font-medium'
                  : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: '#f0e8de', color: '#c17f3e' }
              : { color: '#6b5e4e' }
            }
          >
            <div className="flex items-center gap-2.5">
              <Icon size={15} />
              {label}
            </div>
            {counts[to as keyof typeof counts] > 0 && (
              <span className="text-xs rounded-full px-1.5 py-0.5 font-medium tabular-nums"
                style={{ background: 'rgba(0,0,0,.07)', color: '#8a7a6a' }}>
                {counts[to as keyof typeof counts]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t" style={{ borderColor: '#e8e0d4' }}>
        <span className="text-xs font-mono" style={{ color: '#c0b09a' }}>v0.3.0</span>
      </div>
    </aside>
  )
}
