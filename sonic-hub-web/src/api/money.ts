/* /api/finance — the Money section. Times are UTC without a Z (see lib/money utc()). */
import { get, send, upload } from './client';
import type { Paged } from '../types';

export type Mode = 'FEED' | 'RECONCILE' | 'POOL';

export interface MoneyAccount {
  id: string; name: string; institution: string | null; mode: Mode; currency: string; accountNumber: string | null;
  balance: number | null; balanceAt: string | null; balanceVnd: number | null; color: string | null;
  sortOrder: number; archived: boolean; transactionCount: number;
}
/** A way of looking at money (a facet). The main one holds the categories; perTransaction ones describe one occasion. */
export interface MoneyFacet {
  id: string; code: string; name: string; icon: string | null; sortOrder: number; main: boolean; perTransaction: boolean;
  system: boolean; archived: boolean; tagCount: number;
}
/**
 * A tag (a "label" on screen). Those of the main facet are the categories (EXPENSE/INCOME); the other facets' are ANY.
 * impliesIds: labels that come along with it — one of the same facet is its parent. uses: lines that carry it.
 */
export interface MoneyCategory {
  id: string; code: string; name: string; icon: string | null; kind: 'EXPENSE' | 'INCOME' | 'ANY';
  budgetGroup: 'FIXED' | 'FLEXIBLE' | 'SAVING' | null; sortOrder: number; system: boolean; archived: boolean;
  facetId: string | null; impliesIds: string[]; uses?: number;
}
/** A tag on a line, and who put it there (IMPLIED: brought along by another tag). */
export interface TagRef {
  id: string; name: string; icon: string | null; facetId: string | null; main: boolean;
  by: 'RULE' | 'AI' | 'USER' | 'SYSTEM' | 'IMPLIED' | null;
}
export interface MoneyRule {
  id: string; keywords: string; direction: 'ANY' | 'IN' | 'OUT'; categoryId: string | null; transferAccountId: string | null; active: boolean; priority: number;
}
export interface Txn {
  id: string; accountId: string; accountName: string; accountMode: Mode; currency: string; occurredAt: string;
  amount: number; amountVnd: number | null; kind: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  categoryId: string | null; categoryName: string | null; categoryIcon: string | null;
  description: string | null; bankDescription: string | null; note: string | null;
  counterparty: string | null; counterpartyAccount: string | null;
  source: string; status: 'OK' | 'REVIEW'; categorizedBy: 'RULE' | 'AI' | 'USER' | 'SYSTEM' | null; aiConfidence: number | null;
  transferPeerId: string | null; transferAccountName: string | null; suggestedKeywords: string | null; createdAt: string;
  /** every tag of the line, the one that counts (categoryId) first */
  tags: TagRef[];
  /** a move: the other own account */
  transferAccountId?: string | null;
}
export interface Line { categoryId: string | null; code: string | null; name: string; icon: string | null; budgetGroup: string | null; amount: number; count: number }
/** One label in a month's spending: every line carrying it counts in full (a parent through its children). */
export interface LabelLine { id: string | null; name: string; icon: string | null; parentId: string | null; amount: number; count: number }
/** A section's view of the spending: unlabeled carries none of its labels, multi carries two or more. */
export interface FacetSpend { facetId: string; name: string; main: boolean; labels: LabelLine[]; unlabeled: number; multi: number }
export interface MonthReport {
  month: string; income: number; expense: number; saved: number; net: number; expenses: Line[]; incomes: Line[];
  accounts: { accountId: string; name: string; mode: Mode; out: number; in: number }[];
  budget: { limit: number; spent: number; remaining: number; daysLeft: number; perDay: number | null } | null;
  prevExpense: number; prevExpenseToDate: number | null; reviewCount: number;
  gaps: { accountId: string; accountName: string; at: string; missing: number }[]; usdRate: number | null;
  /** spending by label, section by section; moved: money between own accounts */
  byLabel?: FacetSpend[]; moved?: number;
}
export interface TrendPoint { month: string; income: number; expense: number; saved: number; netWorth: number | null }
export interface Summary { accounts: MoneyAccount[]; netWorthVnd: number; reviewCount: number; usdRate: number | null; flexibleBudget: number | null; lastFeedAt: string | null }
export interface Chip { text: string; amount: number; accountId: string; accountName: string; categoryId: string | null; categoryName: string | null; categoryIcon: string | null; uses: number }
/** tagIds: every tag the line should carry (implied ones come by themselves); ruleTagIds: what a learned rule gives. */
export interface TxnEdit {
  accountId?: string; occurredAt?: string; amount?: number; kind?: string; categoryId?: string; description?: string; note?: string;
  transferAccountId?: string; learnKeywords?: string; learnCounterparty?: boolean; label?: string;
  tagIds?: string[]; ruleTagIds?: string[];
}
/** Everyone money went to or came from, with what still waits; one decision covers all their lines. */
export interface CounterpartyGroup {
  key: string; name: string; account: string | null; accounts: number; ownAccountIds: string[]; count: number; waiting: number;
  outCount: number; inCount: number; totalOut: number; totalIn: number; lastAt: string; sample: string | null;
  ruleId: string | null; ruleLabel: string | null; guessCategoryId: string | null; guessCategoryName: string | null; guessCategoryIcon: string | null;
  /** the way one decision for them goes, how many of their lines go that way, and the waiting lines added up (signed) */
  direction?: 'OUT' | 'IN'; scope?: number; waitingAmount?: number;
}
export interface ImportSummary {
  bank: string; accountNumber: string | null; accountId: string; accountName: string; period: string | null; from: string; to: string;
  rows: number; matched: number; enriched: number; created: number; already: number; withCounterparty: number;
  categorized: number; waiting: number; skipped: number; committed: boolean;
}

export const moneyApi = {
  summary: () => get<Summary>('/finance/summary'),
  report: (month: string) => get<MonthReport>('/finance/report', { month }),
  trend: (months = 12) => get<TrendPoint[]>('/finance/trend', { months }),
  categories: () => get<MoneyCategory[]>('/finance/categories'),
  facets: () => get<MoneyFacet[]>('/finance/facets'),
  /** the same name again in the same facet gives back the tag that exists */
  createTag: (b: { name: string; facetId: string; icon?: string; kind?: 'EXPENSE' | 'INCOME'; impliesIds?: string[]; sortOrder?: number }) =>
    send<MoneyCategory>('POST', '/finance/categories', b),
  /** impliesIds replaces what it brings along (its parent among them) */
  updateTag: (id: string, b: { name?: string; icon?: string; impliesIds?: string[]; archived?: boolean; sortOrder?: number }) =>
    send<MoneyCategory>('PUT', `/finance/categories/${id}`, b),
  createFacet: (b: { name: string; perTransaction?: boolean }) => send<MoneyFacet>('POST', '/finance/facets', b),
  updateFacet: (id: string, b: { name?: string; perTransaction?: boolean; archived?: boolean }) => send<MoneyFacet>('PUT', `/finance/facets/${id}`, b),
  /** many lines at once; moves between own accounts are skipped */
  tags: (b: { ids: string[]; add?: string[]; remove?: string[] }) => send<{ updated: number }>('POST', '/finance/transactions/tags', b),
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
  counterparties: () => get<CounterpartyGroup[]>('/finance/counterparties', { waiting: true }),
  /** every line with them, newest first */
  counterpartyLines: (name: string) => get<Txn[]>('/finance/counterparties/lines', { name }),
  /** in each section given, their labels become these (or they all move to an account); direction: which of their lines */
  assign: (b: { name: string; categoryId?: string; transferAccountId?: string; label?: string; tagIds?: string[]; direction?: 'OUT' | 'IN' | 'ANY' }) =>
    send<{ updated: number }>('POST', '/finance/counterparties/assign', b),
  importPreview: (file: File, accountId?: string) => upload<ImportSummary>('/finance/import/preview', file, { accountId }),
  importStatement: (file: File, accountId?: string) => upload<ImportSummary>('/finance/import', file, { accountId }),
};
