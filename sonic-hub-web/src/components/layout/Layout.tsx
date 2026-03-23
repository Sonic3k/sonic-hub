import { Outlet, NavLink } from 'react-router-dom'
import { CheckSquare, ListTodo, AlertCircle, Zap } from 'lucide-react'
import { useTasks, useTodos, useProblems } from '../../hooks'

const nav = [
  { to: '/',         label: 'Tasks',    icon: CheckSquare, end: true },
  { to: '/todos',    label: 'Todos',    icon: ListTodo },
  { to: '/problems', label: 'Problems', icon: AlertCircle },
]

function NavCounts() {
  const { data: tasks    = [] } = useTasks()
  const { data: todos    = [] } = useTodos()
  const { data: problems = [] } = useProblems()
  return {
    '/':         tasks.filter(t => t.status !== 'DONE' && t.status !== 'CLOSED').length,
    '/todos':    todos.filter(t => !t.done).length,
    '/problems': problems.filter(p => p.status !== 'RESOLVED' && p.status !== 'DISMISSED').length,
  }
}

export default function Layout() {
  const counts = NavCounts()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f7f4ef' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col border-r"
        style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>
        <div className="px-4 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: '#e8e0d4' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#c17f3e' }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-semibold text-sm" style={{ color: '#2a1e10' }}>Sonic Hub</span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? '' : 'hover:bg-black/5'}`
              }
              style={({ isActive }) => isActive
                ? { background: '#f0e8de', color: '#c17f3e', fontWeight: 600 }
                : { color: '#6b5e4e' }
              }>
              <div className="flex items-center gap-2.5">
                <Icon size={15} />
                {label}
              </div>
              {counts[to as keyof typeof counts] > 0 && (
                <span className="text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums"
                  style={{ background: 'rgba(0,0,0,.07)', color: '#8a7a6a' }}>
                  {counts[to as keyof typeof counts]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t" style={{ borderColor: '#e8e0d4' }}>
          <span className="text-xs font-mono" style={{ color: '#c0b09a' }}>v0.3.0</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0"
          style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#c17f3e' }}>
            <Zap size={12} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-semibold text-sm" style={{ color: '#2a1e10' }}>Sonic Hub</span>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden flex border-t flex-shrink-0 safe-area-pb"
          style={{ background: '#faf8f5', borderColor: '#e8e0d4' }}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1"
              style={({ isActive }) => ({
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '10px 0 12px',
                color: isActive ? '#c17f3e' : '#9a8a7a',
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{label}</span>
                  {counts[to as keyof typeof counts] > 0 && (
                    <span className="absolute top-2 rounded-full text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center"
                      style={{ background: '#c17f3e', marginLeft: 14, marginTop: -4 }}>
                      {counts[to as keyof typeof counts]}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  )
}
