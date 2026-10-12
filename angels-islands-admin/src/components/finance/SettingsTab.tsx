import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { Button, Input } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import { fmtDateTime, vnd } from '../../lib/money'
import { finKeys } from './shared'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

export default function SettingsTab() {
  const qc = useQueryClient()
  const { data: s } = useQuery({ queryKey: finKeys.settings, queryFn: financeApi.settings })
  const [budget, setBudget] = useState('')
  const [rate, setRate] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (s) { setBudget(s.flexibleBudget ? String(s.flexibleBudget) : ''); setRate(s.usdRate ? String(s.usdRate) : '') } }, [s])

  const save = useMutation({
    mutationFn: (body: { flexibleBudget?: number; usdRate?: number; usdRateAuto?: boolean }) => financeApi.updateSettings(body),
    onSuccess: () => { setMsg('Saved'); qc.invalidateQueries({ queryKey: ['fin'] }) },
    onError: e => setMsg(apiError(e)),
  })
  const hook = `${API}/api/finance/hooks/sepay`
  const copy = async () => { try { await navigator.clipboard.writeText(hook); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* no clipboard */ } }
  const card = 'bg-white rounded-2xl border border-slate-100 p-5 space-y-3'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      <div className={card}>
        <h3 className="text-sm font-semibold text-slate-800">Monthly budget for flexible spending</h3>
        <p className="text-xs text-slate-500">Food, coffee, transport, shopping, cash… everything in a Flexible category. Sonic Hub shows what is left and how much a day that leaves. Empty = no budget.</p>
        <div className="flex gap-2 items-end">
          <Input value={budget} onChange={e => setBudget(e.target.value)} inputMode="numeric" placeholder="8000000" className="tabular-nums" />
          <Button onClick={() => save.mutate({ flexibleBudget: Number(budget.replace(/\D/g, '')) || 0 })}>Save</Button>
        </div>
        {s?.flexibleBudget ? <p className="text-xs text-slate-400">Now: {vnd(s.flexibleBudget)} / month</p> : null}
      </div>

      <div className={card}>
        <h3 className="text-sm font-semibold text-slate-800">USD → VND</h3>
        <p className="text-xs text-slate-500">
          For the Bank of America balance. {s?.usdRateManual ? 'Typed by hand — stays until you go back to automatic.' : 'Taken once a day from open.er-api.com.'}
          {s?.usdRateAt && <> Last set {fmtDateTime(s.usdRateAt)}.</>}
        </p>
        <div className="flex gap-2 items-end">
          <Input value={rate} onChange={e => setRate(e.target.value)} inputMode="decimal" className="tabular-nums" />
          <Button onClick={() => save.mutate({ usdRate: Number(rate) })}>Use this rate</Button>
          {s?.usdRateManual && <Button variant="ghost" onClick={() => save.mutate({ usdRateAuto: true })}><RotateCcw size={14} />Auto</Button>}
        </div>
      </div>

      <div className={`${card} lg:col-span-2`}>
        <h3 className="text-sm font-semibold text-slate-800">SePay webhook</h3>
        <p className="text-xs text-slate-500">Paste this URL into SePay → Tích hợp → Webhooks (event: both money in and out). Every transaction of the linked TPBank account then lands here by itself.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate text-xs bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-slate-700">{hook}</code>
          <Button variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">API key</p>
            <p className="font-medium text-slate-700 mt-0.5">{s?.sepayKeySet ? 'Required (SEPAY_API_KEY is set)' : 'Not set — anyone with the URL can post'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">Last payload</p>
            <p className="font-medium text-slate-700 mt-0.5">{s?.lastSepayAt ? fmtDateTime(s.lastSepayAt) : 'nothing yet'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">AI guesses</p>
            <p className="font-medium text-slate-700 mt-0.5">{s?.aiEnabled ? 'On (DeepSeek)' : 'Off — DEEPSEEK_API_KEY not set'}</p>
          </div>
        </div>
      </div>
      {msg && <p className="text-xs text-pink-600 lg:col-span-2">{msg}</p>}
    </div>
  )
}
