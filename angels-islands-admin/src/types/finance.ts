/** Shapes of /api/finance (see FinanceDto on the API). Times are UTC without a Z. */
export type AccountMode = 'FEED' | 'RECONCILE' | 'POOL'
export type TxnKind = 'EXPENSE' | 'INCOME' | 'TRANSFER'
export type TxnStatus = 'OK' | 'REVIEW'
export type CategoryKind = 'EXPENSE' | 'INCOME'
export type BudgetGroup = 'FIXED' | 'FLEXIBLE' | 'SAVING'
export type RuleDirection = 'ANY' | 'IN' | 'OUT'

export interface FinAccount {
  id: string; name: string; institution: string | null; mode: AccountMode; currency: string; accountNumber: string | null
  balance: number | null; balanceAt: string | null; balanceVnd: number | null; color: string | null
  sortOrder: number; archived: boolean; transactionCount: number
}
export interface FinAccountRequest {
  name?: string; institution?: string; mode?: AccountMode; currency?: string; accountNumber?: string
  color?: string; sortOrder?: number; archived?: boolean
}

export interface FinCategory {
  id: string; code: string; name: string; icon: string | null; kind: CategoryKind; budgetGroup: BudgetGroup | null
  sortOrder: number; system: boolean; archived: boolean
}
export interface FinCategoryRequest { name?: string; icon?: string; kind?: CategoryKind; budgetGroup?: BudgetGroup; sortOrder?: number; archived?: boolean }

export interface FinRule {
  id: string; keywords: string; direction: RuleDirection; categoryId: string | null; categoryName: string | null; categoryIcon: string | null
  transferAccountId: string | null; transferAccountName: string | null; priority: number; origin: 'SEED' | 'USER'; hits: number; active: boolean
  /** a rule about one counterparty (keywords empty); label renames what it matches */
  counterpartyName: string | null; counterpartyAccount: string | null; label: string | null
}
export interface FinRuleRequest {
  keywords?: string; direction?: RuleDirection; categoryId?: string; transferAccountId?: string; priority?: number; active?: boolean
  counterpartyName?: string; counterpartyAccount?: string; label?: string
}

export interface FinTxn {
  id: string; accountId: string; accountName: string; accountMode: AccountMode; currency: string
  occurredAt: string; amount: number; amountVnd: number | null; kind: TxnKind
  categoryId: string | null; categoryName: string | null; categoryIcon: string | null
  description: string | null; bankDescription: string | null; counterparty: string | null; counterpartyAccount: string | null; note: string | null
  source: 'SEPAY' | 'EMAIL' | 'NOTE' | 'MANUAL' | 'RECONCILE' | 'SYSTEM'; status: TxnStatus
  categorizedBy: 'RULE' | 'AI' | 'USER' | 'SYSTEM' | null; aiConfidence: number | null; balanceAfter: number | null
  transferPeerId: string | null; transferAccountName: string | null; suggestedKeywords: string | null; createdAt: string
}
export interface FinTxnRequest {
  accountId?: string; occurredAt?: string; amount?: number; kind?: TxnKind; categoryId?: string
  description?: string; note?: string; transferAccountId?: string; learnKeywords?: string
}

export interface FinSettings {
  flexibleBudget: number | null; usdRate: number | null; usdRateAt: string | null; usdRateManual: boolean
  sepayKeySet: boolean; aiEnabled: boolean; lastSepayAt: string | null
}
export interface FinInbound {
  id: string; source: string; externalId: string | null; status: 'NEW' | 'SAVED' | 'DUPLICATE' | 'IGNORED' | 'FAILED'
  message: string | null; createdAt: string; payload: string; transactionId: string | null
}

export interface FinCategoryLine { categoryId: string | null; code: string | null; name: string; icon: string | null; budgetGroup: string | null; amount: number; count: number }
export interface FinMonthReport {
  month: string; income: number; expense: number; saved: number; net: number
  expenses: FinCategoryLine[]; incomes: FinCategoryLine[]
  accounts: { accountId: string; name: string; mode: AccountMode; out: number; in: number }[]
  budget: { limit: number; spent: number; remaining: number; daysLeft: number; perDay: number | null } | null
  prevExpense: number; prevExpenseToDate: number | null; reviewCount: number
  gaps: { accountId: string; accountName: string; at: string; missing: number }[]; usdRate: number | null
}
