/* /api/finance — the "Tiền" section. Times are UTC without a Z (see lib/money utc()). */
import { get, send } from './client';
import type { Paged } from '../types';

export type Mode = 'FEED' | 'RECONCILE' | 'POOL';

export interface MoneyAccount {
  id: string; name: string; institution: string | null; mode: Mode; currency: string; accountNumber: string | null;
  balance: number | null; balanceAt: string | null; balanceVnd: number | null; color: string | null;
  sortOrder: number; archived: boolean; transactionCount: number;
}
export interface MoneyCategory {
  id: string; code: string; name: string; icon: string | null; kind: 'EXPENSE' | 'INCOME';
  budgetGroup: 'FIXED' | 'FLEXIBLE' | 'SAVING' | null; sortOrder: number; system: boolean; archived: boolean;
}
export interface MoneyRule {
  id: string; keywords: string; direction: 'ANY' | 'IN' | 'OUT'; categoryId: string | null; transferAccountId: string | null; active: boolean; priority: number;
}
export interface Txn {
  id: string; accountId: string; accountName: string; accountMode: Mode; currency: string; occurredAt: string;
  amount: number; amountVnd: number | null; kind: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  categoryId: string | null; categoryName: string | null; categoryIcon: string | null;
  description: string | null; bankDescription: string | null; note: string | null;
  source: string; status: 'OK' | 'REVIEW'; categorizedBy: 'RULE' | 'AI' | 'USER' | 'SYSTEM' | null; aiConfidence: number | null;
  transferPeerId: string | null; transferAccountName: string | null; suggestedKeywords: string | null; createdAt: string;
}
export interface Line { categoryId: string | null; code: string | null; name: string; icon: string | null; budgetGroup: string | null; amount: number; count: number }
export interface MonthReport {
  month: string; income: number; expense: number; saved: number; net: number; expenses: Line[]; incomes: Line[];
  accounts: { accountId: string; name: string; mode: Mode; out: number; in: number }[];
  budget: { limit: number; spent: number; remaining: number; daysLeft: number; perDay: number | null } | null;
  prevExpense: number; prevExpenseToDate: number | null; reviewCount: number;
  gaps: { accountId: string; accountName: string; at: string; missing: number }[]; usdRate: number | null;
}
export interface TrendPoint { month: string; income: number; expense: number; saved: number; netWorth: number | null }
export interface Summary { accounts: MoneyAccount[]; netWorthVnd: number; reviewCount: number; usdRate: number | null; flexibleBudget: number | null; lastFeedAt: string | null }
export interface Chip { text: string; amount: number; accountId: string; accountName: string; categoryId: string | null; categoryName: string | null; categoryIcon: string | null; uses: number }
export interface TxnEdit { accountId?: string; occurredAt?: string; amount?: number; kind?: string; categoryId?: string; description?: string; note?: string; transferAccountId?: string; learnKeywords?: string }

export const moneyApi = {
  summary: () => get<Summary>('/finance/summary'),
  report: (month: string) => get<MonthReport>('/finance/report', { month }),
  trend: (months = 12) => get<TrendPoint[]>('/finance/trend', { months }),
  categories: () => get<MoneyCategory[]>('/finance/categories'),
  rules: () => get<MoneyRule[]>('/finance/rules'),
  review: () => get<Txn[]>('/finance/review'),
  chips: () => get<Chip[]>('/finance/notes/chips', { limit: 8 }),
  transactions: (p: { month?: string; categoryId?: string; accountId?: string; page?: number; size?: number }) => get<Paged<Txn>>('/finance/transactions', p),
  note: (b: { text: string; amount: number; accountId?: string | null; occurredAt?: string; categoryId?: string }) => send<Txn>('POST', '/finance/notes', b),
  update: (id: string, b: TxnEdit) => send<Txn>('PUT', `/finance/transactions/${id}`, b),
  remove: (id: string) => send<void>('DELETE', `/finance/transactions/${id}`),
  confirm: (id: string) => send<Txn>('POST', `/finance/transactions/${id}/confirm`),
  confirmAll: () => send<{ updated: number }>('POST', '/finance/transactions/confirm-all'),
  setBudget: (flexibleBudget: number) => send<unknown>('PUT', '/finance/settings', { flexibleBudget }),
  setBalance: (id: string, balance: number) => send<MoneyAccount>('POST', `/finance/accounts/${id}/balance`, { balance }),
};
