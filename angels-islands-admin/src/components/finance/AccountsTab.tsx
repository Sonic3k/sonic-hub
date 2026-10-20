import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Scale, Archive, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input, Modal, Select } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import { fmtDateTime, MODE_HELP, MODE_LABEL, money, vnd } from '../../lib/money'
import type { AccountMode, FinAccount } from '../../types/finance'
import { AccountDot, MODE_TONE, useFinAccounts } from './shared'

/** Where money sits: balances, how each one gets its numbers, and the balance check-in for wallets without a feed. */
export default function AccountsTab() {
  const { data: accounts = [], isLoading } = useFinAccounts()
  const [editing, setEditing] = useState<FinAccount | 'new' | null>(null)
  const [checkIn, setCheckIn] = useState<FinAccount | null>(null)
  const live = accounts.filter(a => !a.archived), archived = accounts.filter(a => a.archived)
  const worth = live.filter(a => a.mode !== 'POOL' && a.balanceVnd != null).reduce((s, a) => s + (a.balanceVnd ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Net worth (bank + wallets, cash not counted): <b className="text-slate-800 tabular-nums">{vnd(worth)}</b></p>
        <Button size="sm" onClick={() => setEditing('new')}><Plus size={14} />Add account</Button>
      </div>
      {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...live, ...archived].map(a => (
            <div key={a.id} className={clsx('bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3', a.archived && 'opacity-50')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><AccountDot account={a} size={10} />{a.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{a.accountNumber || a.institution || '—'} · {a.currency}</p>
                </div>
                <span className={clsx('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', MODE_TONE[a.mode])}>{MODE_LABEL[a.mode]}</span>
              </div>
              {a.mode === 'POOL' ? (
                <p className="text-xs text-slate-400 leading-relaxed">Withdrawals count as spent; cash notes split them into categories.</p>
              ) : (
                <div>
                  <p className="text-xl font-semibold text-slate-800 tabular-nums">{a.balance == null ? <span className="text-slate-300 text-base">no balance yet</span> : money(a.balance, a.currency)}</p>
                  {a.currency !== 'VND' && a.balanceVnd != null && <p className="text-xs text-slate-400 tabular-nums">≈ {vnd(a.balanceVnd)}</p>}
                  {a.balanceAt && <p className="text-[11px] text-slate-400 mt-0.5">as of {fmtDateTime(a.balanceAt)}</p>}
                </div>
              )}
              <div className="flex items-center gap-1 mt-auto text-xs text-slate-400">
                <span className="mr-auto">{a.transactionCount} transactions</span>
                {a.mode !== 'POOL' && (
                  <button onClick={() => setCheckIn(a)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-pink-600 hover:bg-pink-50">
                    <Scale size={13} />Check-in
                  </button>
                )}
                <button onClick={() => setEditing(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 text-xs text-slate-500 space-y-1.5">
        {(['FEED', 'RECONCILE', 'POOL'] as const).map(m => <p key={m}><b className="text-slate-700">{MODE_LABEL[m]}</b> — {MODE_HELP[m]}</p>)}
      </div>
      {editing && <AccountModal account={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {checkIn && <CheckInModal account={checkIn} onClose={() => setCheckIn(null)} />}
    </div>
  )
}

function AccountModal({ account, onClose }: { account?: FinAccount; onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({
    name: account?.name ?? '', institution: account?.institution ?? '', mode: (account?.mode ?? 'RECONCILE') as AccountMode,
    currency: account?.currency ?? 'VND', accountNumber: account?.accountNumber ?? '', color: account?.color ?? '#64748b',
    sortOrder: String(account?.sortOrder ?? ''),
  })
  const [error, setError] = useState('')
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }))
  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, sortOrder: f.sortOrder === '' ? undefined : Number(f.sortOrder) }
      return account ? financeApi.updateAccount(account.id, body) : financeApi.createAccount(body)
    },
    onSuccess: done, onError: e => setError(apiError(e)),
  })
  const archive = useMutation({ mutationFn: () => financeApi.updateAccount(account!.id, { archived: !account!.archived }), onSuccess: done, onError: e => setError(apiError(e)) })
  const remove = useMutation({ mutationFn: () => financeApi.deleteAccount(account!.id), onSuccess: done, onError: e => setError(apiError(e)) })

  return (
    <Modal title={account ? account.name : 'New account'} onClose={onClose}>
      <div className="space-y-3">
        <Input label="Name" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Vietcombank" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bank / wallet (as SePay calls it)" value={f.institution} onChange={e => set('institution', e.target.value)} placeholder="TPBank" />
          <Input label="Currency" value={f.currency} maxLength={3} onChange={e => set('currency', e.target.value.toUpperCase())} />
        </div>
        <Select label="How its numbers arrive" value={f.mode} onChange={e => set('mode', e.target.value)}>
          {(['FEED', 'RECONCILE', 'POOL'] as const).map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </Select>
        <p className="text-xs text-slate-400 -mt-1">{MODE_HELP[f.mode]}</p>
        <Input label="Account number (links SePay lines and spots transfers)" value={f.accountNumber} onChange={e => set('accountNumber', e.target.value)} className="font-mono" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Colour</label>
            <input type="color" value={f.color} onChange={e => set('color', e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 bg-white" />
          </div>
          <Input label="Order" inputMode="numeric" value={f.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {account ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => archive.mutate()}><Archive size={14} />{account.archived ? 'Unarchive' : 'Archive'}</Button>
              {account.transactionCount === 0 && <Button size="sm" variant="danger" onClick={() => { if (confirm('Delete this account?')) remove.mutate() }}><Trash2 size={14} />Delete</Button>}
            </div>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={save.isPending || !f.name.trim()}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function CheckInModal({ account, onClose }: { account: FinAccount; onClose: () => void }) {
  const qc = useQueryClient()
  const [value, setValue] = useState(account.balance != null ? String(account.balance) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const save = useMutation({
    mutationFn: () => financeApi.setBalance(account.id, Number(value.replace(/[^\d.-]/g, '')), note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() },
    onError: e => setError(apiError(e)),
  })
  const reconcile = account.mode === 'RECONCILE' && account.balance != null
  return (
    <Modal title={`Check-in · ${account.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          {reconcile
            ? `Type the balance the ${account.name} app shows now. The difference from ${money(account.balance, account.currency)} becomes one line of unexplained spending or income.`
            : account.mode === 'FEED'
              ? 'This account gets its balance from the bank feed; set it by hand only to start before the first transaction arrives.'
              : 'The first check-in only sets where the balance starts.'}
        </p>
        <Input label={`Balance (${account.currency})`} inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} autoFocus className="tabular-nums text-lg" />
        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { setError(''); save.mutate() }} disabled={!value.trim() || save.isPending}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
