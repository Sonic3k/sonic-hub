import api from './client'
import type { Paged } from '../types'
import type {
  FinAccount, FinAccountRequest, FinCategory, FinCategoryRequest, FinFacet, FinFacetRequest, FinInbound, FinRule, FinRuleRequest,
  FinMonthReport, FinSettings, FinTxn, FinTxnRequest,
} from '../types/finance'

export interface TxnQuery { month?: string; accountId?: string; categoryId?: string; status?: string; kind?: string; q?: string; page?: number; size?: number }

export const financeApi = {
  report: (month?: string) => api.get<FinMonthReport>('/api/finance/report', { params: { month } }).then(r => r.data),
  accounts: () => api.get<FinAccount[]>('/api/finance/accounts').then(r => r.data),
  createAccount: (d: FinAccountRequest) => api.post<FinAccount>('/api/finance/accounts', d).then(r => r.data),
  updateAccount: (id: string, d: FinAccountRequest) => api.put<FinAccount>(`/api/finance/accounts/${id}`, d).then(r => r.data),
  deleteAccount: (id: string) => api.delete(`/api/finance/accounts/${id}`),
  setBalance: (id: string, balance: number, note?: string) => api.post<FinAccount>(`/api/finance/accounts/${id}/balance`, { balance, note }).then(r => r.data),

  facets: () => api.get<FinFacet[]>('/api/finance/facets').then(r => r.data),
  createFacet: (d: FinFacetRequest) => api.post<FinFacet>('/api/finance/facets', d).then(r => r.data),
  updateFacet: (id: string, d: FinFacetRequest) => api.put<FinFacet>(`/api/finance/facets/${id}`, d).then(r => r.data),
  deleteFacet: (id: string) => api.delete(`/api/finance/facets/${id}`),

  categories: () => api.get<FinCategory[]>('/api/finance/categories').then(r => r.data),
  createCategory: (d: FinCategoryRequest) => api.post<FinCategory>('/api/finance/categories', d).then(r => r.data),
  updateCategory: (id: string, d: FinCategoryRequest) => api.put<FinCategory>(`/api/finance/categories/${id}`, d).then(r => r.data),
  deleteCategory: (id: string) => api.delete(`/api/finance/categories/${id}`),

  rules: () => api.get<FinRule[]>('/api/finance/rules').then(r => r.data),
  createRule: (d: FinRuleRequest) => api.post<FinRule>('/api/finance/rules', d).then(r => r.data),
  updateRule: (id: string, d: FinRuleRequest) => api.put<FinRule>(`/api/finance/rules/${id}`, d).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/api/finance/rules/${id}`),
  applyRules: () => api.post<{ updated: number }>('/api/finance/rules/apply').then(r => r.data),
  /** one rule over every line it fits, decided ones too */
  applyRule: (id: string) => api.post<{ updated: number }>(`/api/finance/rules/${id}/apply`).then(r => r.data),

  transactions: (q: TxnQuery) => api.get<Paged<FinTxn>>('/api/finance/transactions', { params: q }).then(r => r.data),
  createTransaction: (d: FinTxnRequest) => api.post<FinTxn>('/api/finance/transactions', d).then(r => r.data),
  updateTransaction: (id: string, d: FinTxnRequest) => api.put<FinTxn>(`/api/finance/transactions/${id}`, d).then(r => r.data),
  deleteTransaction: (id: string) => api.delete(`/api/finance/transactions/${id}`),
  confirm: (id: string) => api.post<FinTxn>(`/api/finance/transactions/${id}/confirm`).then(r => r.data),
  confirmAll: () => api.post<{ updated: number }>('/api/finance/transactions/confirm-all').then(r => r.data),

  settings: () => api.get<FinSettings>('/api/finance/settings').then(r => r.data),
  updateSettings: (d: { flexibleBudget?: number; usdRate?: number; usdRateAuto?: boolean }) =>
    api.put<FinSettings>('/api/finance/settings', d).then(r => r.data),

  inbound: (page = 0, size = 30) => api.get<Paged<FinInbound>>('/api/finance/inbound', { params: { page, size } }).then(r => r.data),
  replay: (id: string) => api.post<FinInbound>(`/api/finance/inbound/${id}/replay`).then(r => r.data),
}

/** The API answers 400/404 with {error}; show that, not axios' generic text. */
export function apiError(e: unknown): string {
  const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string }
  return err.response?.data?.error || err.response?.data?.message || err.message || 'Failed'
}
