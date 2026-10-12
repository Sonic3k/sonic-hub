/* Shared reads of the "Tiền" section. Every write invalidates ['money'] so all of it agrees again. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { moneyApi } from '../../api/money';

const S = 60_000;
export const useSummary = () => useQuery({ queryKey: ['money', 'summary'], queryFn: moneyApi.summary, staleTime: S });
export const useReport = (month: string) => useQuery({ queryKey: ['money', 'report', month], queryFn: () => moneyApi.report(month), staleTime: S, placeholderData: p => p });
export const useTrend = () => useQuery({ queryKey: ['money', 'trend'], queryFn: () => moneyApi.trend(12), staleTime: S });
export const useCategories = () => useQuery({ queryKey: ['money', 'categories'], queryFn: moneyApi.categories, staleTime: 10 * S });
export const useRules = () => useQuery({ queryKey: ['money', 'rules'], queryFn: moneyApi.rules, staleTime: 10 * S });
export const useReview = () => useQuery({ queryKey: ['money', 'review'], queryFn: moneyApi.review, staleTime: S });
export const useChips = () => useQuery({ queryKey: ['money', 'chips'], queryFn: moneyApi.chips, staleTime: S });
export const useTxns = (month: string, size: number) =>
  useQuery({ queryKey: ['money', 'txns', month, size], queryFn: () => moneyApi.transactions({ month, size }), staleTime: S, placeholderData: p => p });

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['money'] });
}

/** The owner's browser shows the "Tiền" tab; visitors of the portal never see it. Set by opening /money once. */
export const OWNER_KEY = 'sonic-hub-owner';
export function isOwner(): boolean { try { return localStorage.getItem(OWNER_KEY) === '1'; } catch { return false; } }
export function markOwner() { try { localStorage.setItem(OWNER_KEY, '1'); } catch { /* private mode */ } }
