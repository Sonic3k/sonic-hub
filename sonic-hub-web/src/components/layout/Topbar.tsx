import { Zap, Plus } from 'lucide-react'

interface Props {
  onAdd: () => void
  tasksDone: number
  tasksTotal: number
}

export default function Topbar({ onAdd, tasksDone, tasksTotal }: Props) {
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`

  return (
    <header style={{ background: '#faf6ef', borderBottom: '1px solid #ddd5c4' }}
      className="sticky top-0 z-40 h-14 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#2c2010' }}>
            <Zap size={14} color="#faf6ef" />
          </div>
          <span className="text-[15px] font-semibold" style={{ color: '#2c2010' }}>Sonic Hub</span>
        </div>

        <div className="w-px h-5 bg-[#ddd5c4] mx-1" />
        <span className="text-xs" style={{ color: '#9a8a70' }}>{dateStr}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Progress */}
        {tasksTotal > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#9a8a70' }}>{tasksDone}/{tasksTotal} done</span>
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#ddd5c4' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: '#7a9a6a' }} />
            </div>
          </div>
        )}

        <button onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all hover:-translate-y-px active:translate-y-0"
          style={{ background: '#2c2010', color: '#faf6ef', boxShadow: '0 2px 6px rgba(44,32,16,.2)' }}>
          <Plus size={14} />
          New note
        </button>
      </div>
    </header>
  )
}
