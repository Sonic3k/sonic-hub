import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Gamepad2, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { gamesApi, type GameDetail, type GameIn, type GameLink, type PlayIn } from '../api/games'

const KINDS = ['OFFICIAL', 'FAN', 'HOMEMADE', 'REMAKE']
const PRECISIONS = ['DAY', 'MONTH', 'SEASON', 'YEAR']
const LINK_KINDS = ['WALKTHROUGH', 'LONGPLAY', 'WIKI', 'MANUAL', 'OFFICIAL', 'PLAY', 'SOUNDTRACK', 'VIDEO', 'OTHER']
const DEVICES = ['', 'pc-old', 'pc-school', 'pc-xp', 'pc-fujitsu', 'pc-hp', 'pc-asus', 'pc-thinkpad', 'pc-now', 'phone-nokia', 'phone-iphone6', 'phone-iphone11', 'phone-iphone13']
const input = 'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200'
const label = 'block text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1'

/** a play as the form edits it: the dates as he would type them ("2007-05", "2009-07-07") */
const toForm = (g: GameDetail): PlayIn[] => g.plays.map(p => ({
  start: p.precision === 'YEAR' ? (p.startAt ?? '').slice(0, 4) : p.precision === 'MONTH' || p.precision === 'SEASON' ? (p.startAt ?? '').slice(0, 7) : (p.startAt ?? '').slice(0, 10),
  precision: p.precision, end: p.endAt ? p.endAt.slice(0, 10) : '', device: p.deviceKey ?? '', via: p.via ?? '', version: p.version ?? '',
  evidence: p.evidence ?? '', note: p.note ?? '', approx: p.approx,
}))

/** Kệ game: his games, when and on what machine he played each, what ties them to his memories, what plays them. */
export default function GamesPage() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['games'], queryFn: gamesApi.list })
  const series = useQuery({ queryKey: ['game-series'], queryFn: gamesApi.series })
  const [q, setQ] = useState(''), [key, setKey] = useState<string | null>(null), [creating, setCreating] = useState('')
  const shown = useMemo(() => (list.data ?? []).filter(g => !q || `${g.title} ${g.key} ${g.platform ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title)), [list.data, q])

  const create = async () => {
    const k = creating.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!k) return
    await gamesApi.put(k, { title: creating.trim(), kind: 'OFFICIAL' })
    await qc.invalidateQueries({ queryKey: ['games'] })
    setCreating(''); setKey(k)
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2"><Gamepad2 size={18} className="text-violet-500" />Games</h1>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <input className={input} placeholder="Tìm game…" value={q} onChange={e => setQ(e.target.value)} />
          <div className="flex gap-2">
            <input className={input} placeholder="Game mới (tên)" value={creating} onChange={e => setCreating(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} />
            <button onClick={create} className="shrink-0 rounded-lg bg-violet-600 px-3 text-white"><Plus size={16} /></button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
            {shown.map(g => (
              <button key={g.key} onClick={() => setKey(g.key)} className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 ${key === g.key ? 'bg-violet-50' : ''}`}>
                {g.coverUrl || g.iconUrl ? <img src={(g.coverUrl || g.iconUrl)! + '?width=80'} className="h-8 w-10 rounded object-cover bg-slate-100" /> : <span className="h-8 w-10 rounded bg-slate-100" />}
                <span className="min-w-0 flex-1"><span className={`block truncate text-sm ${g.mine === false ? 'text-slate-400' : 'text-slate-700'}`}>{g.title}</span>
                  <span className="block truncate text-[11px] text-slate-400">{[g.played, g.series?.name, g.kind !== 'OFFICIAL' ? g.kind : ''].filter(Boolean).join(' · ')}</span></span>
              </button>
            ))}
          </div>
        </div>
        <div>{key ? <Editor key={key} gameKey={key} series={series.data ?? []} games={list.data ?? []} onGone={() => setKey(null)} /> : <p className="text-sm text-slate-400">Chọn một game bên trái.</p>}</div>
      </div>
    </div>
  )
}

function Editor({ gameKey, series, games, onGone }: { gameKey: string; series: { key: string; name: string }[]; games: { key: string; title: string }[]; onGone: () => void }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['game', gameKey], queryFn: () => gamesApi.get(gameKey) })
  const [f, setF] = useState<GameIn>({}), [plays, setPlays] = useState<PlayIn[]>([]), [links, setLinks] = useState<GameLink[]>([]), [mems, setMems] = useState<string[]>([])
  const [busy, setBusy] = useState(''), [newMem, setNewMem] = useState('')
  const g = q.data
  useEffect(() => {
    if (!g) return
    setF({ title: g.title, seriesKey: g.series?.key ?? '', seriesOrder: g.seriesOrder ?? 0, kind: g.kind, basedOnKey: g.basedOnKey ?? '', platform: g.platform ?? '',
      releaseYear: g.releaseYear ?? 0, developer: g.developer ?? '', genre: g.genre ?? '', versions: g.versions ?? '', summary: g.summary ?? '', note: g.note ?? '',
      favorite: g.favorite, handName: g.handName ?? '', handOrder: g.handOrder ?? 0 })
    setPlays(toForm(g)); setLinks(g.links.map(l => ({ kind: l.kind, title: l.title ?? '', url: l.url, note: l.note ?? '' }))); setMems(g.memories.map(m => m.id))
  }, [g])
  if (!g) return <p className="text-sm text-slate-400">…</p>
  const set = (k: keyof GameIn, v: unknown) => setF(x => ({ ...x, [k]: v }))
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ['game', gameKey] }); await qc.invalidateQueries({ queryKey: ['games'] }) }
  const save = async () => {
    setBusy('Đang lưu…')
    try {
      await gamesApi.put(gameKey, { ...f, plays: plays.filter(p => p.start).map(p => ({ ...p, end: p.end || undefined, device: p.device || undefined })), links: links.filter(l => l.url), memoryIds: mems })
      await refresh(); setBusy('Đã lưu')
    } catch (e) { setBusy('Lỗi: ' + String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? e)) }
  }
  const remove = async () => { if (!confirm(`Xoá ${g.title}?`)) return; await gamesApi.remove(gameKey); await qc.invalidateQueries({ queryKey: ['games'] }); onGone() }
  const text = (k: keyof GameIn, l: string, area = false) => (
    <label className="block"><span className={label}>{l}</span>
      {area ? <textarea className={input} rows={3} value={String(f[k] ?? '')} onChange={e => set(k, e.target.value)} />
        : <input className={input} value={String(f[k] ?? '')} onChange={e => set(k, e.target.value)} />}</label>)
  const num = (k: keyof GameIn, l: string) => (
    <label className="block"><span className={label}>{l}</span><input type="number" className={input} value={Number(f[k] ?? 0) || ''} onChange={e => set(k, Number(e.target.value) || 0)} /></label>)

  return (
    <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-5">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 truncate text-base font-semibold text-slate-800">{g.title} <span className="text-xs font-normal text-slate-400">{g.key}</span></h2>
        {busy && <span className="text-xs text-slate-500">{busy}</span>}
        <button onClick={save} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white"><Save size={14} />Lưu</button>
        <button onClick={remove} className="rounded-lg border border-red-200 p-1.5 text-red-500"><Trash2 size={14} /></button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {text('title', 'Tên')}
        <label className="block"><span className={label}>Series</span><select className={input} value={f.seriesKey ?? ''} onChange={e => set('seriesKey', e.target.value)}>
          <option value="">—</option>{series.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select></label>
        {num('seriesOrder', 'Thứ tự trong series')}
        <label className="block"><span className={label}>Loại</span><select className={input} value={f.kind ?? 'OFFICIAL'} onChange={e => set('kind', e.target.value)}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></label>
        <label className="block"><span className={label}>Bắt nguồn từ</span><select className={input} value={f.basedOnKey ?? ''} onChange={e => set('basedOnKey', e.target.value)}>
          <option value="">—</option>{games.filter(x => x.key !== gameKey).sort((a, b) => a.title.localeCompare(b.title)).map(x => <option key={x.key} value={x.key}>{x.title}</option>)}</select></label>
        {text('platform', 'Máy / nền tảng')}
        {num('releaseYear', 'Năm ra mắt')}{text('developer', 'Hãng / người làm')}{text('genre', 'Thể loại')}
        {text('versions', 'Phiên bản (cách nhau dấu phẩy)')}{text('handName', 'Tên anh ghi trong danh sách 2004')}{num('handOrder', 'Số trong danh sách 100 trò')}
      </div>
      {text('summary', 'Giới thiệu', true)}
      {text('note', 'Lời anh', true)}
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!f.favorite} onChange={e => set('favorite', e.target.checked)} />Yêu thích</label>

      <section>
        <div className="mb-2 flex items-center"><h3 className="flex-1 text-sm font-semibold text-slate-700">Những lần chơi</h3>
          <button onClick={() => setPlays(p => [...p, { start: '', precision: 'MONTH' }])} className="text-xs text-violet-600">+ Thêm</button></div>
        <div className="space-y-2">{plays.map((p, i) => (
          <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-2 md:grid-cols-[110px_90px_110px_130px_1fr_1fr_28px]">
            <input className={input} placeholder="2007-05" value={p.start} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, start: e.target.value } : y))} />
            <select className={input} value={p.precision ?? 'MONTH'} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, precision: e.target.value } : y))}>{PRECISIONS.map(k => <option key={k}>{k}</option>)}</select>
            <input className={input} placeholder="đến" value={p.end ?? ''} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, end: e.target.value } : y))} />
            <select className={input} value={p.device ?? ''} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, device: e.target.value } : y))}>{DEVICES.map(d => <option key={d} value={d}>{d || '— máy —'}</option>)}</select>
            <input className={input} placeholder="qua (VBA, Switch…)" value={p.via ?? ''} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, via: e.target.value } : y))} />
            <input className={input} placeholder="phiên bản" value={p.version ?? ''} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, version: e.target.value } : y))} />
            <button onClick={() => setPlays(x => x.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
            <input className={`${input} md:col-span-6`} placeholder="Bằng chứng (file save, ảnh, dòng trong danh sách…)" value={p.evidence ?? ''} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, evidence: e.target.value } : y))} />
            <label className="flex items-center gap-1 text-[11px] text-slate-500"><input type="checkbox" checked={!!p.approx} onChange={e => setPlays(x => x.map((y, j) => j === i ? { ...y, approx: e.target.checked } : y))} />~</label>
          </div>))}</div>
      </section>

      <section>
        <div className="mb-2 flex items-center"><h3 className="flex-1 text-sm font-semibold text-slate-700">Link</h3>
          <button onClick={() => setLinks(l => [...l, { kind: 'WALKTHROUGH', title: '', url: '' }])} className="text-xs text-violet-600">+ Thêm</button></div>
        <div className="space-y-2">{links.map((l, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[130px_1fr_1.4fr_1fr_28px]">
            <select className={input} value={l.kind} onChange={e => setLinks(x => x.map((y, j) => j === i ? { ...y, kind: e.target.value } : y))}>{LINK_KINDS.map(k => <option key={k}>{k}</option>)}</select>
            <input className={input} placeholder="tiêu đề" value={l.title ?? ''} onChange={e => setLinks(x => x.map((y, j) => j === i ? { ...y, title: e.target.value } : y))} />
            <input className={input} placeholder="https://…" value={l.url} onChange={e => setLinks(x => x.map((y, j) => j === i ? { ...y, url: e.target.value } : y))} />
            <input className={input} placeholder="ghi chú" value={l.note ?? ''} onChange={e => setLinks(x => x.map((y, j) => j === i ? { ...y, note: e.target.value } : y))} />
            <button onClick={() => setLinks(x => x.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
          </div>))}</div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Ký ức</h3>
        <div className="space-y-1">{mems.map(id => { const m = g.memories.find(x => x.id === id); return (
          <div key={id} className="flex items-center gap-2 text-sm"><span className="flex-1 truncate text-slate-600">{m ? `${m.title ?? ''} · ${m.when ?? ''}` : id}</span>
            <button onClick={() => setMems(x => x.filter(y => y !== id))} className="text-slate-400 hover:text-red-500"><X size={14} /></button></div>) })}</div>
        <div className="mt-2 flex gap-2"><input className={input} placeholder="id ký ức (uuid)" value={newMem} onChange={e => setNewMem(e.target.value)} />
          <button onClick={() => { if (newMem.trim()) { setMems(x => [...x, newMem.trim()]); setNewMem('') } }} className="shrink-0 rounded-lg border border-slate-200 px-3 text-sm">Thêm</button></div>
      </section>

      <section>
        <div className="mb-2 flex items-center gap-3"><h3 className="flex-1 text-sm font-semibold text-slate-700">Hình</h3>
          {(['ART', 'MAP', 'ICON'] as const).map(role => <label key={role} className="flex cursor-pointer items-center gap-1 text-xs text-violet-600"><Upload size={12} />{role}
            <input type="file" accept="image/*" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; await gamesApi.asset(gameKey, file, role); await refresh() }} /></label>)}</div>
        <p className="mb-2 text-[11px] text-slate-400">Ảnh và ảnh chụp màn hình của anh gắn vào game qua game-shelf-src; ở đây thêm bản đồ, hình minh hoạ, biểu tượng.</p>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">{g.media.map(m => (
          <div key={m.linkId} className="group relative"><img src={m.media.cdnUrl + '?width=200'} className="aspect-[4/3] w-full rounded object-cover bg-slate-100" title={m.label ?? m.media.caption ?? ''} />
            <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[9px] font-semibold text-slate-500">{m.role}</span>
            <button onClick={async () => { await gamesApi.unlink(gameKey, m.linkId); await refresh() }} className="absolute right-1 top-1 hidden rounded bg-white/90 p-0.5 text-red-500 group-hover:block"><X size={12} /></button></div>))}</div>
      </section>

      {g.packages.length > 0 && <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Chơi được</h3>
        <div className="divide-y divide-slate-50 rounded-lg border border-slate-100">{g.packages.map(p => (
          <div key={p.key} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
            <span className="w-14 text-[11px] font-semibold text-violet-600">{p.engine}</span>
            <span className="min-w-0 flex-1 truncate text-slate-600">{p.title} <span className="text-slate-400">· {p.key}{p.fileName ? ` · ${p.fileName}` : ''}{p.hasSave ? ` · save ${p.saveAt?.slice(0, 10)}` : ''}</span></span>
            {(['file', 'save'] as const).map(w => <label key={w} className="flex cursor-pointer items-center gap-1 text-xs text-violet-600"><Upload size={12} />{w}
              <input type="file" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; await gamesApi.packageFile(p.key, file, w); await refresh() }} /></label>)}
          </div>))}</div>
      </section>}
    </div>
  )
}
