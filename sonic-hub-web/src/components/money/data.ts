/* Shared reads of the Money section. Every write invalidates ['money'] so all of it agrees again. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { moneyApi } from '../../api/money';

const S = 60_000;
export const useSummary = () => useQuery({ queryKey: ['money', 'summary'], queryFn: moneyApi.summary, staleTime: S });
export const useReport = (month: string, currency = 'VND') =>
  useQuery({ queryKey: ['money', 'report', month, currency], queryFn: () => moneyApi.report(month, currency), staleTime: S, placeholderData: p => p });
export const useTrend = (currency = 'VND') => useQuery({ queryKey: ['money', 'trend', currency], queryFn: () => moneyApi.trend(12, currency), staleTime: S });
export const useCategories = () => useQuery({ queryKey: ['money', 'categories'], queryFn: moneyApi.categories, staleTime: 10 * S });
export const useFacets = () => useQuery({ queryKey: ['money', 'facets'], queryFn: moneyApi.facets, staleTime: 10 * S, retry: 1 });
export const useRules = () => useQuery({ queryKey: ['money', 'rules'], queryFn: moneyApi.rules, staleTime: 10 * S });
export const useReview = () => useQuery({ queryKey: ['money', 'review'], queryFn: moneyApi.review, staleTime: S });
export const useCounterparties = () => useQuery({ queryKey: ['money', 'counterparties'], queryFn: moneyApi.counterparties, staleTime: S });
export const useChips = () => useQuery({ queryKey: ['money', 'chips'], queryFn: moneyApi.chips, staleTime: S });
/** a month's lines; with a label, only those carrying it (a parent through its children) */
export const useTxns = (month: string, size: number, categoryId?: string | null) =>
  useQuery({ queryKey: ['money', 'txns', month, size, categoryId ?? ''], queryFn: () => moneyApi.transactions({ month, size, categoryId: categoryId ?? undefined }), staleTime: S, placeholderData: p => p });
/** every line with a payee: what one decision for them covers */
export const useCounterpartyLines = (name: string | null | undefined) =>
  useQuery({ queryKey: ['money', 'cp-lines', name ?? ''], queryFn: () => moneyApi.counterpartyLines(name!), enabled: !!name, staleTime: S });

/** the lines of a move (an exchange), when the line is one */
export const useMove = (id: string | null) =>
  useQuery({ queryKey: ['money', 'move', id ?? ''], queryFn: () => moneyApi.move(id!), enabled: !!id, staleTime: S });
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['money'] });
}

/** The owner's browser shows the Money tab; visitors of the portal never see it. Set by opening /money once. */
export const OWNER_KEY = 'sonic-hub-owner';
export function isOwner(): boolean { try { return localStorage.getItem(OWNER_KEY) === '1'; } catch { return false; } }
export function markOwner() { try { localStorage.setItem(OWNER_KEY, '1'); } catch { /* private mode */ } }
