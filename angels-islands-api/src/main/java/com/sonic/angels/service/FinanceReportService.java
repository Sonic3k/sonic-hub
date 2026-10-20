package com.sonic.angels.service;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceInbound;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Source;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceCategoryRepository;
import com.sonic.angels.repository.FinanceInboundRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.FinanceText;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;

/**
 * Month report, trend and net worth. The counting rules, in one place:
 *  - TRANSFER never counts as spending or income — except money going INTO the cash pool, which counts as spent.
 *  - A cash note (EXPENSE on the POOL account) does not add spending: it moves that much from "Tiền mặt lặt vặt"
 *    to its real category, so the total stays what left the bank.
 *  - SAVING categories are reported as "để dành", apart from spending.
 *  - A refund is an EXPENSE with a positive amount: it lowers its category.
 * Everything is converted to VND (USD at the current rate).
 */
@Service
@Transactional(readOnly = true)
public class FinanceReportService {

    private static final Set<Source> FEEDS = Set.of(Source.SEPAY, Source.EMAIL);

    private final FinanceTransactionRepository txnRepo;
    private final FinanceAccountRepository accountRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final FinanceInboundRepository inboundRepo;
    private final FinanceRateService rates;
    private final FinanceService finance;

    public FinanceReportService(FinanceTransactionRepository txnRepo, FinanceAccountRepository accountRepo, FinanceCategoryRepository categoryRepo,
                                FinanceInboundRepository inboundRepo, FinanceRateService rates, FinanceService finance) {
        this.txnRepo = txnRepo; this.accountRepo = accountRepo; this.categoryRepo = categoryRepo;
        this.inboundRepo = inboundRepo; this.rates = rates; this.finance = finance;
    }

    /** Accounts with balances, net worth, how much waits for review. */
    public FinanceDto.Summary summary() {
        BigDecimal usd = rates.usdValue();
        List<FinanceDto.Account> accounts = accountRepo.findAllByOrderBySortOrderAscCreatedAtAsc().stream()
            .map(a -> FinanceService.toAccount(a, usd, txnRepo.countByAccountId(a.getId()))).toList();
        BigDecimal net = accounts.stream()
            .filter(a -> !a.archived() && !"POOL".equals(a.mode()) && a.balanceVnd() != null)
            .map(FinanceDto.Account::balanceVnd).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime lastFeed = inboundRepo.findFirstBySourceOrderByCreatedAtDesc("SEPAY").map(FinanceInbound::getCreatedAt).orElse(null);
        return new FinanceDto.Summary(accounts, net, txnRepo.countByStatus(FinanceTransaction.Status.REVIEW), usd, finance.flexibleBudget(), lastFeed);
    }

    public FinanceDto.MonthReport month(YearMonth m) {
        BigDecimal usd = rates.usdValue();
        LocalDateTime from = FinanceText.monthStartUtc(m), to = FinanceText.monthStartUtc(m.plusMonths(1));
        Totals cur = totals(txnRepo.findInRange(from, to), usd);
        FinanceCategory cash = categoryRepo.findByCode(FinanceCategory.CASH).orElse(null);
        List<FinanceDto.CategoryLine> expenses = cur.expenseLines(cash);
        List<FinanceDto.CategoryLine> incomes = cur.incomeLines();

        YearMonth now = FinanceText.currentMonth();
        // the month before, whole and up to the same point in time (for "so với tháng trước")
        YearMonth prev = m.minusMonths(1);
        LocalDateTime pFrom = FinanceText.monthStartUtc(prev), pTo = FinanceText.monthStartUtc(m);
        List<FinanceTransaction> prevTx = txnRepo.findInRange(pFrom, pTo);
        BigDecimal prevExpense = totals(prevTx, usd).expense();
        BigDecimal prevToDate = null;
        if (m.equals(now)) {
            Duration elapsed = Duration.between(from, FinanceText.nowUtc());
            LocalDateTime cut = pFrom.plus(elapsed);
            prevToDate = totals(prevTx.stream().filter(t -> t.getOccurredAt().isBefore(cut)).toList(), usd).expense();
        }

        BigDecimal limit = finance.flexibleBudget();
        FinanceDto.Budget budget = null;
        if (limit != null) {
            BigDecimal spent = expenses.stream()
                .filter(l -> l.budgetGroup() == null || "FLEXIBLE".equals(l.budgetGroup()))
                .map(FinanceDto.CategoryLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal remaining = limit.subtract(spent);
            int daysLeft = 0;
            BigDecimal perDay = null;
            if (m.equals(now)) {
                daysLeft = m.lengthOfMonth() - LocalDate.now(FinanceText.VN).getDayOfMonth() + 1;
                perDay = remaining.signum() > 0 ? remaining.divide(BigDecimal.valueOf(daysLeft), 0, RoundingMode.DOWN) : BigDecimal.ZERO;
            }
            budget = new FinanceDto.Budget(limit, spent, remaining, daysLeft, perDay);
        }

        return new FinanceDto.MonthReport(m.toString(), cur.income, cur.expense(), cur.saved, cur.income.subtract(cur.expense()),
            expenses, incomes, cur.accountLines(), budget, prevExpense, prevToDate,
            txnRepo.countByStatus(FinanceTransaction.Status.REVIEW), gaps(from, to), usd);
    }

    /** The last `months` months (oldest first): income, spending, saving, and net worth at each month's end. */
    public List<FinanceDto.TrendPoint> trend(int months) {
        BigDecimal usd = rates.usdValue();
        YearMonth now = FinanceText.currentMonth();
        YearMonth start = now.minusMonths(Math.max(1, Math.min(months, 36)) - 1);
        LocalDateTime first = txnRepo.firstOccurredAt();
        if (first != null) {
            YearMonth firstMonth = YearMonth.from(FinanceText.utcToVn(first));
            if (firstMonth.isAfter(start)) start = firstMonth.isAfter(now) ? now : firstMonth;
        } else start = now;

        List<FinanceTransaction> all = txnRepo.findInRange(FinanceText.monthStartUtc(start), LocalDateTime.of(9999, 1, 1, 0, 0));
        Map<YearMonth, List<FinanceTransaction>> byMonth = new TreeMap<>();
        for (FinanceTransaction t : all) byMonth.computeIfAbsent(YearMonth.from(FinanceText.utcToVn(t.getOccurredAt())), k -> new ArrayList<>()).add(t);

        List<FinanceAccount> worthAccounts = accountRepo.findAll().stream()
            .filter(a -> !a.isArchived() && a.getMode() != FinanceAccount.Mode.POOL && a.getBalance() != null).toList();

        List<FinanceDto.TrendPoint> out = new ArrayList<>();
        for (YearMonth m = start; !m.isAfter(now); m = m.plusMonths(1)) {
            Totals t = totals(byMonth.getOrDefault(m, List.of()), usd);
            LocalDateTime end = m.equals(now) ? FinanceText.nowUtc() : FinanceText.monthStartUtc(m.plusMonths(1));
            BigDecimal worth = BigDecimal.ZERO;
            boolean known = false;
            for (FinanceAccount a : worthAccounts) {
                BigDecimal later = all.stream()
                    .filter(x -> x.getAccount().getId().equals(a.getId()) && !x.getOccurredAt().isBefore(end))
                    .map(FinanceTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal v = FinanceRateService.toVnd(a.getBalance().subtract(later), a.getCurrency(), usd);
                if (v != null) { worth = worth.add(v); known = true; }
            }
            out.add(new FinanceDto.TrendPoint(m.toString(), t.income, t.expense(), t.saved, known ? worth : null));
        }
        return out;
    }

    /**
     * Where a feed account's reported balances do not add up between two transactions, something moved that no
     * transaction here explains (a missed webhook, a fee) — shown so it can be fixed instead of silently wrong.
     */
    private List<FinanceDto.Gap> gaps(LocalDateTime from, LocalDateTime to) {
        List<FinanceDto.Gap> out = new ArrayList<>();
        for (FinanceAccount a : accountRepo.findAll()) {
            if (a.getMode() != FinanceAccount.Mode.FEED) continue;
            List<FinanceTransaction> trail = txnRepo.balanceTrail(a.getId(), from.minusDays(45), to).stream()
                .filter(t -> FEEDS.contains(t.getSource())).toList();
            for (int i = 1; i < trail.size(); i++) {
                FinanceTransaction prev = trail.get(i - 1), cur = trail.get(i);
                if (cur.getOccurredAt().isBefore(from)) continue;
                BigDecimal expected = prev.getBalanceAfter().add(cur.getAmount());
                BigDecimal missing = cur.getBalanceAfter().subtract(expected);
                if (missing.abs().compareTo(BigDecimal.ONE) >= 0)
                    out.add(new FinanceDto.Gap(a.getId(), a.getName(), cur.getOccurredAt(), missing));
            }
        }
        return out;
    }

    // ── the counting ──

    private record Key(UUID id, String code, String name, String icon, String group) {}

    private static final class Line { BigDecimal amount = BigDecimal.ZERO; long count; }

    private static final class Acc { String name, mode; BigDecimal out = BigDecimal.ZERO, in = BigDecimal.ZERO; }

    private static final class Totals {
        BigDecimal income = BigDecimal.ZERO, saved = BigDecimal.ZERO;
        BigDecimal nonPoolSpent = BigDecimal.ZERO, poolInflow = BigDecimal.ZERO, poolNotes = BigDecimal.ZERO, poolSaving = BigDecimal.ZERO;
        long poolInflowCount;
        final Map<Key, Line> expense = new LinkedHashMap<>(), incomeBy = new LinkedHashMap<>();
        final Map<UUID, Acc> accounts = new LinkedHashMap<>();

        BigDecimal expense() { return nonPoolSpent.add(poolInflow).subtract(poolSaving); }

        List<FinanceDto.CategoryLine> expenseLines(FinanceCategory cash) {
            Map<Key, Line> all = new LinkedHashMap<>(expense);
            BigDecimal bucket = poolInflow.subtract(poolNotes);
            if (bucket.signum() != 0 || poolInflowCount > 0) {
                Key k = cash != null ? new Key(cash.getId(), cash.getCode(), cash.getName(), cash.getIcon(), "FLEXIBLE")
                    : new Key(null, FinanceCategory.CASH, "Petty Cash", "💵", "FLEXIBLE");
                Line l = all.computeIfAbsent(k, x -> new Line());
                l.amount = l.amount.add(bucket);
                l.count += poolInflowCount;
            }
            return all.entrySet().stream().filter(e -> e.getValue().amount.signum() != 0 || e.getValue().count > 0)
                .sorted((a, b) -> b.getValue().amount.compareTo(a.getValue().amount))
                .map(e -> line(e.getKey(), e.getValue())).toList();
        }

        List<FinanceDto.CategoryLine> incomeLines() {
            return incomeBy.entrySet().stream().sorted((a, b) -> b.getValue().amount.compareTo(a.getValue().amount))
                .map(e -> line(e.getKey(), e.getValue())).toList();
        }

        List<FinanceDto.AccountLine> accountLines() {
            return accounts.entrySet().stream().map(e -> new FinanceDto.AccountLine(e.getKey(), e.getValue().name, e.getValue().mode,
                e.getValue().out, e.getValue().in)).toList();
        }

        private static FinanceDto.CategoryLine line(Key k, Line l) {
            return new FinanceDto.CategoryLine(k.id(), k.code(), k.name(), k.icon(), k.group(), l.amount, l.count);
        }
    }

    private static Key key(FinanceCategory c) {
        if (c == null) return new Key(null, null, "Uncategorized", "❔", null);
        return new Key(c.getId(), c.getCode(), c.getName(), c.getIcon(), c.getBudgetGroup() == null ? null : c.getBudgetGroup().name());
    }

    private static Totals totals(List<FinanceTransaction> txns, BigDecimal usd) {
        Totals s = new Totals();
        for (FinanceTransaction t : txns) {
            FinanceAccount a = t.getAccount();
            BigDecimal v = FinanceRateService.toVnd(t.getAmount(), a.getCurrency(), usd);
            if (v == null) continue;                                  // a currency without a rate yet
            boolean pool = a.getMode() == FinanceAccount.Mode.POOL;
            if (t.getKind() != Kind.TRANSFER) {
                Acc acc = s.accounts.computeIfAbsent(a.getId(), k -> { Acc x = new Acc(); x.name = a.getName(); x.mode = a.getMode().name(); return x; });
                if (v.signum() < 0) acc.out = acc.out.add(v.negate()); else acc.in = acc.in.add(v);
            }
            switch (t.getKind()) {
                case TRANSFER -> { if (pool) { s.poolInflow = s.poolInflow.add(v); s.poolInflowCount++; } }
                case INCOME -> {
                    s.income = s.income.add(v);
                    Line l = s.incomeBy.computeIfAbsent(key(t.getCategory()), k -> new Line());
                    l.amount = l.amount.add(v); l.count++;
                    if (pool) { s.poolInflow = s.poolInflow.add(v); s.poolInflowCount++; }
                }
                case EXPENSE -> {
                    BigDecimal spent = v.negate();
                    FinanceCategory c = t.getCategory();
                    boolean saving = c != null && c.getBudgetGroup() == FinanceCategory.BudgetGroup.SAVING;
                    if (saving) s.saved = s.saved.add(spent);
                    else {
                        Line l = s.expense.computeIfAbsent(key(c), k -> new Line());
                        l.amount = l.amount.add(spent); l.count++;
                    }
                    if (pool) { s.poolNotes = s.poolNotes.add(spent); if (saving) s.poolSaving = s.poolSaving.add(spent); }
                    else if (!saving) s.nonPoolSpent = s.nonPoolSpent.add(spent);
                }
            }
        }
        return s;
    }
}
