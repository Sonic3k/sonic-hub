import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, Landmark, Tags, ListChecks, Settings, Webhook } from 'lucide-react'
import { financeApi } from '../api/finance'
import { vnd } from '../lib/money'
import TransactionsTab from '../components/finance/TransactionsTab'
import AccountsTab from '../components/finance/AccountsTab'
import CategoriesTab from '../components/finance/CategoriesTab'
import RulesTab from '../components/finance/RulesTab'
import SettingsTab from '../components/finance/SettingsTab'
import InboundTab from '../components/finance/InboundTab'

type Tab = 'transactions' | 'accounts' | 'categories' | 'rules' | 'settings' | 'inbound'

const TABS: { key: Tab; label: string; icon: typeof Landmark }[] = [
  { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { key: 'accounts', label: 'Accounts', icon: Landmark },
  { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'rules', label: 'Rules', icon: ListChecks },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'inbound', label: 'Webhook log', icon: Webhook },
]

/** Back office of the money section; the everyday notes and reports live on sonic-hub-web (/money). */
export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('transactions')
  const { data: report } = useQuery({ queryKey: ['fin', 'report-header'], queryFn: () => financeApi.report() })

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <h1 className="text-lg font-semibold text-slate-800">Finance</h1>
        {report && (
          <div className="flex gap-4 text-xs text-slate-500">
            <span>This month out <b className="text-rose-600 tabular-nums">{vnd(report.expense)}</b></span>
            <span>in <b className="text-emerald-600 tabular-nums">{vnd(report.income)}</b></span>
            {report.reviewCount > 0 && <button onClick={() => setTab('transactions')} className="text-amber-600 font-medium">{report.reviewCount} waiting</button>}
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-100 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm shrink-0 font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'inbound' && <InboundTab />}
    </div>
  )
}
