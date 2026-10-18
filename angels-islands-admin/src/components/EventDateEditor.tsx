/* When the moment really happened, as far as it is known — for a file or an album.
   date = start of the known span; precision = how far it is known; approx = a guess ("~1970"). */
import { useState } from 'react'
import type { DatePrecision, EventDate } from '../types'

export const PRECISIONS: { value: DatePrecision; label: string }[] = [
  { value: 'DECADE', label: 'Thập niên' }, { value: 'YEAR', label: 'Năm' }, { value: 'SEASON', label: 'Mùa' },
  { value: 'MONTH', label: 'Tháng' }, { value: 'DAY', label: 'Ngày' }, { value: 'HOUR', label: 'Giờ' },
  { value: 'MINUTE', label: 'Phút' }, { value: 'SECOND', label: 'Giây' },
]
const SEASONS = [{ m: 3, label: 'Xuân' }, { m: 6, label: 'Hè' }, { m: 9, label: 'Thu' }, { m: 12, label: 'Đông' }]

/** "14/05/2007 09:12", "08/1995", "Hè 1998", "1993", "Thập niên 70", "~" in front when it is a guess */
export function eventLabel(e?: EventDate | null): string {
  if (!e?.date) return ''
  const d = e.date, y = +d.slice(0, 4), m = +d.slice(5, 7), day = `${d.slice(8, 10)}/${d.slice(5, 7)}/${y}`
  const t: Record<DatePrecision, string> = {
    DECADE: `Thập niên ${String(y).slice(2, 3)}0${y >= 2000 ? ` (${y})` : ''}`, YEAR: `${y}`,
    SEASON: `${SEASONS.find(s => s.m === m)?.label ?? ''} ${m === 12 ? `${y}–${y + 1}` : y}`.trim(), MONTH: `${d.slice(5, 7)}/${y}`, DAY: day,
    HOUR: `${+d.slice(11, 13)}h ${day}`, MINUTE: `${day} ${d.slice(11, 16)}`, SECOND: `${day} ${d.slice(11, 19)}`,
  }
  return (e.approx ? '~' : '') + (t[e.precision] ?? day)
}

/** Builds the yyyy-MM-ddTHH:mm:ss start of the span from what the inputs hold. */
function toIso(p: DatePrecision, year: string, month: string, season: number, day: string, time: string): string | null {
  const y = year.padStart(4, '0')
  if (!/^\d{4}$/.test(y)) return null
  switch (p) {
    case 'DECADE': return `${y.slice(0, 3)}0-01-01T00:00:00`
    case 'YEAR': return `${y}-01-01T00:00:00`
    case 'SEASON': return `${y}-${String(season).padStart(2, '0')}-01T00:00:00`
    case 'MONTH': return /^\d{4}-\d{2}$/.test(month) ? `${month}-01T00:00:00` : null
    case 'DAY': return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T00:00:00` : null
    default: {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time)) return null
      const t = time.length === 16 ? `${time}:00` : time.slice(0, 19)
      return p === 'HOUR' ? `${t.slice(0, 13)}:00:00` : p === 'MINUTE' ? `${t.slice(0, 16)}:00` : t
    }
  }
}

export default function EventDateEditor({ value, dark, onSave, onClose }: {
  value?: EventDate | null; dark?: boolean
  onSave: (e: { date: string; precision?: DatePrecision; approx?: boolean }) => Promise<void> | void
  onClose: () => void
}) {
  const d = value?.date ?? ''
  const [p, setP] = useState<DatePrecision>(value?.precision ?? 'YEAR')
  const [approx, setApprox] = useState(!!value?.approx)
  const [year, setYear] = useState(d.slice(0, 4))
  const [month, setMonth] = useState(d.slice(0, 7))
  const [season, setSeason] = useState(SEASONS.find(s => s.m === +d.slice(5, 7))?.m ?? 6)
  const [day, setDay] = useState(d.slice(0, 10))
  const [time, setTime] = useState(d.slice(0, 19))
  const iso = toIso(p, year, month, season, day, time)
  const field = dark
    ? 'bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white/90 outline-none focus:border-pink-400/50 [color-scheme:dark]'
    : 'px-3 py-2 text-sm border rounded-lg border-slate-200 focus:border-pink-400 outline-none'
  const muted = dark ? 'text-white/50' : 'text-slate-500'
  const save = async () => { if (iso) { await onSave({ date: iso, precision: p, approx }); onClose() } }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={p} onChange={e => setP(e.target.value as DatePrecision)} className={field}>
          {PRECISIONS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
        {(p === 'DECADE' || p === 'YEAR' || p === 'SEASON') && <input type="number" min={1800} max={2100} placeholder="Năm" value={year}
          onChange={e => setYear(e.target.value)} className={`${field} w-24`} />}
        {p === 'SEASON' && <select value={season} onChange={e => setSeason(+e.target.value)} className={field}>
          {SEASONS.map(s => <option key={s.m} value={s.m}>{s.label}</option>)}</select>}
        {p === 'MONTH' && <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={field} />}
        {p === 'DAY' && <input type="date" value={day} onChange={e => setDay(e.target.value)} className={field} />}
        {(p === 'HOUR' || p === 'MINUTE' || p === 'SECOND') && <input type="datetime-local" step={p === 'SECOND' ? 1 : 60} value={time}
          onChange={e => setTime(e.target.value)} className={field} />}
        <label className={`flex items-center gap-1.5 text-xs ${muted}`}>
          <input type="checkbox" checked={approx} onChange={e => setApprox(e.target.checked)} />khoảng (~)
        </label>
      </div>
      <p className={`text-[11px] ${muted}`}>{iso ? eventLabel({ date: iso, precision: p, approx }) : 'Chưa đủ thông tin'}</p>
      <div className="flex gap-2 justify-end">
        {value?.date && <button type="button" onClick={async () => { await onSave({ date: '' }); onClose() }}
          className={`px-3 py-1.5 text-xs rounded-lg ${dark ? 'text-red-300 hover:bg-white/5' : 'text-red-500 hover:bg-red-50'}`}>Xoá ngày sự kiện</button>}
        <button type="button" onClick={onClose} className={`px-3 py-1.5 text-xs rounded-lg ${dark ? 'text-white/60 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}>Huỷ</button>
        <button type="button" onClick={save} disabled={!iso} className="px-3 py-1.5 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">Lưu</button>
      </div>
    </div>
  )
}
