import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { Button, Input, Modal, Select, Textarea } from '../ui'
import { apiError, financeApi } from '../../api/finance'
import { fmtDateTime, fromLocalInput, money, toLocalInput } from '../../lib/money'
import type { FinTxn, FinTxnRequest } from '../../types/finance'
import { CategoryOptions, useFinAccounts, useFinCategories } from './shared'

/** Add or edit one transaction. Editing a waiting one can also teach a rule ("remember these words"). */
export default function TxnModal({ txn, onClose }: { txn?: FinTxn; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: accounts = [] } = useFinAccounts()
  const { data: categories = [] } = useFinCategories()
  const isNew = !txn
  const [accountId, setAccountId] = useState(txn?.accountId ?? accounts.find(a => a.mode === 'POOL')?.id ?? accounts[0]?.id ?? '')
  const [when, setWhen] = useState(toLocalInput(txn?.occurredAt))
  const [dir, setDir] = useState<'out' | 'in'>(txn && txn.amount > 0 ? 'in' : 'out')
  const [amount, setAmount] = useState(txn ? String(Math.abs(txn.amount)) : '')
  const [mode, setMode] = useState<'category' | 'transfer'>(txn?.kind === 'TRANSFER' ? 'transfer' : 'category')
  const [categoryId, setCategoryId] = useState(txn?.categoryId ?? '')
  const [transferTo, setTransferTo] = useState('')
  const [description, setDescription] = useState(txn?.description ?? '')
  const [note, setNote] = useState(txn?.note ?? '')
  const [learn, setLearn] = useState(!!txn && txn.status === 'REVIEW' && !!txn.suggestedKeywords)
  const [keywords, setKeywords] = useState(txn?.suggestedKeywords ?? '')
  const [error, setError] = useState('')

  const done = () => { qc.invalidateQueries({ queryKey: ['fin'] }); onClose() }
  const save = useMutation({
    mutationFn: () => {
      const n = Number(amount.replace(/[^\d.]/g, ''))
      if (!n) throw new Error('Amount?')
      const signed = dir === 'out' ? -n : n
      const body: FinTxnRequest = { accountId, occurredAt: fromLocalInput(when), amount: signed, description, note }
      if (mode === 'transfer') {
        if (transferTo) { body.kind = 'TRANSFER'; body.transferAccountId = transferTo }
      } else if (categoryId && categoryId !== txn?.categoryId) body.categoryId = categoryId
      else if (categoryId && txn?.status === 'REVIEW') body.categoryId = categoryId
      else if (txn?.kind === 'TRANSFER' && mode === 'category') body.kind = dir === 'out' ? 'EXPENSE' : 'INCOME'
      if (learn && keywords.trim()) body.learnKeywords = keywords.trim()
      return isNew ? financeApi.createTransaction(body) : financeApi.updateTransaction(txn!.id, body)
    },
    onSuccess: done,
    onError: e => setError(apiError(e)),
  })
  const remove = useMutation({ mutationFn: () => financeApi.deleteTransaction(txn!.id), onSuccess: done, onError: e => setError(apiError(e)) })

  const otherAccounts = accounts.filter(a => a.id !== accountId && !a.archived)

  return (
    <Modal title={isNew ? 'Add transaction' : 'Transaction'} onClose={onClose} size="lg">
      <div className="space-y-4">
        {txn && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span>{txn.source} · {fmtDateTime(txn.occurredAt)}</span>
              {txn.balanceAfter != null && <span className="tabular-nums">balance after {money(txn.balanceAfter, txn.currency)}</span>}
            </div>
            {txn.bankDescription && <p className="text-slate-600 break-words">{txn.bankDescription}</p>}
            {txn.categorizedBy === 'AI' && <p className="flex items-center gap-1 text-violet-600"><Sparkles size={12} />AI guess · {Math.round((txn.aiConfidence ?? 0) * 100)}% sure</p>}
            {txn.transferAccountName && <p>Transfer ↔ {txn.transferAccountName}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Account" value={accountId} onChange={e => setAccountId(e.target.value)}>
            {accounts.filter(a => !a.archived || a.id === accountId).map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </Select>
          <Input label="When (Vietnam time)" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Amount</label>
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 shrink-0">
              {(['out', 'in'] as const).map(d => (
                <button key={d} type="button" onClick={() => setDir(d)}
                  className={clsx('px-3 py-1.5 rounded-md text-xs font-medium', dir === d ? (d === 'out' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600') : 'text-slate-400')}>
                  {d === 'out' ? 'Money out' : 'Money in'}
                </button>
              ))}
            </div>
            <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="35000"
              className="flex-1 min-w-0 px-3 py-2.5 text-sm border rounded-lg outline-none border-slate-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-50 tabular-nums" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-1 text-xs">
            {(['category', 'transfer'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={clsx('px-3 py-1.5 rounded-full font-medium', mode === m ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500')}>
                {m === 'category' ? 'Category' : 'Between my accounts'}
              </button>
            ))}
          </div>
          {mode === 'category' ? (
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">— choose —</option>
              <CategoryOptions categories={categories} />
            </Select>
          ) : (
            <Select value={transferTo} onChange={e => setTransferTo(e.target.value)}>
              <option value="">{txn?.transferAccountName ? `keep: ${txn.transferAccountName}` : '— to / from which account —'}</option>
              {otherAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}
        </div>

        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="cafe với team" />
        <Textarea label="Note" rows={2} value={note} onChange={e => setNote(e.target.value)} />

        {!isNew && (
          <div className="rounded-xl border border-dashed border-slate-200 p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" className="accent-pink-500" checked={learn} onChange={e => setLearn(e.target.checked)} />
              Remember: next time these words mean the same
            </label>
            {learn && <Input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="highlands coffee | phuc long" />}
          </div>
        )}

        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {!isNew ? (
            <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this transaction?')) remove.mutate() }}>
              <Trash2 size={14} />Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { setError(''); save.mutate() }} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
