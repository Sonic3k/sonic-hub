package com.sonic.angels.service;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceFacet;
import com.sonic.angels.model.entity.FinanceInbound;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Source;
import com.sonic.angels.model.entity.FinanceTxnTag;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceFacetRepository;
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
 *  - TRANSFER never counts as spending or income. Cash is a wallet like any account: taking money out at an ATM is a
 *    move into it, and a payment from it counts when it is noted, in its month, under its labels. Cash nobody notes
 *    spending does not count — no one keeps the wallet's balance.
 *  - SAVING categories are reported as "để dành", apart from spending.
 *  - A refund is an EXPENSE with a positive amount: it lowers its category.
 *  - By label (byLabel): a spending line counts in full under every label it carries, a parent through the children
 *    that bring it, so the labels of a facet can add up to more than the month; the month itself counts each line once.
 * Everything is converted to VND (USD at the current rate).
 */
@Service
@Transactional(readOnly = true)
public class FinanceReportService {

    private static final Set<Source> FEEDS = Set.of(Source.SEPAY, Source.EMAIL);

    private final FinanceTransactionRepository txnRepo;
    private final FinanceAccountRepository accountRepo;
    private final FinanceFacetRepository facetRepo;
    private final FinanceInboundRepository inboundRepo;
    private final FinanceRateService rates;
    private final FinanceService finance;

    public FinanceReportService(FinanceTransactionRepository txnRepo, FinanceAccountRepository accountRepo,
                                FinanceFacetRepository facetRepo, FinanceInboundRepository inboundRepo, FinanceRateService rates, FinanceService finance) {
        this.txnRepo = txnRepo; this.accountRepo = accountRepo; this.facetRepo = facetRepo;
        this.inboundRepo = inboundRepo; this.rates = rates; this.finance = finance;
    }

    /** Accounts with balances, net worth, how much waits for review. */
    public FinanceDto.Summary summary() {
        FinanceFx fx = rates.fx();
        BigDecimal usd = rates.usdValue();
        List<FinanceDto.Account> accounts = accountRepo.findAllByOrderBySortOrderAscCreatedAtAsc().stream()
            .map(a -> FinanceService.toAccount(a, fx, txnRepo.countByAccountId(a.getId()))).toList();
        BigDecimal net = accounts.stream()
            .filter(a -> !a.archived() && !"POOL".equals(a.mode()) && a.balanceVnd() != null)
            .map(FinanceDto.Account::balanceVnd).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime lastFeed = inboundRepo.findFirstBySourceOrderByCreatedAtDesc("SEPAY").map(FinanceInbound::getCreatedAt).orElse(null);
        return new FinanceDto.Summary(accounts, net, txnRepo.countByStatus(FinanceTransaction.Status.REVIEW), usd, finance.flexibleBudget(), lastFeed);
    }

    /**
     * A month in a currency (VND unless asked): every line counts with the rate of its own day, so a dollar spent in
     * 2019 is worth what it was then. The budget is a VND budget: only the VND view has one.
     */
    public FinanceDto.MonthReport month(YearMonth m, String currency) {
        FinanceFx fx = rates.fx();
        String in = reportCurrency(currency);
        LocalDateTime from = FinanceText.monthStartUtc(m), to = FinanceText.monthStartUtc(m.plusMonths(1));
        Totals cur = totals(txnRepo.findInRange(from, to), fx, in);
        List<FinanceDto.CategoryLine> expenses = cur.expenseLines();
        List<FinanceDto.CategoryLine> incomes = cur.incomeLines();

        YearMonth now = FinanceText.currentMonth();
        // the month before, whole and up to the same point in time (for "so với tháng trước")
        YearMonth prev = m.minusMonths(1);
        LocalDateTime pFrom = FinanceText.monthStartUtc(prev), pTo = FinanceText.monthStartUtc(m);
        List<FinanceTransaction> prevTx = txnRepo.findInRange(pFrom, pTo);
        BigDecimal prevExpense = totals(prevTx, fx, in).expense();
        BigDecimal prevToDate = null;
        if (m.equals(now)) {
            Duration elapsed = Duration.between(from, FinanceText.nowUtc());
            LocalDateTime cut = pFrom.plus(elapsed);
            prevToDate = totals(prevTx.stream().filter(t -> t.getOccurredAt().isBefore(cut)).toList(), fx, in).expense();
        }

        BigDecimal limit = FinanceFx.VND.equals(in) ? finance.flexibleBudget() : null;
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
            txnRepo.countByStatus(FinanceTransaction.Status.REVIEW), gaps(from, to), rates.usdValue(), byLabel(cur), cur.moved, in);
    }

    /** Each live facet's view of the spending: its labels, and what carries none. */
    private List<FinanceDto.FacetSpend> byLabel(Totals cur) {
        List<FinanceDto.FacetSpend> out = new ArrayList<>();
        for (FinanceFacet f : facetRepo.findAllByOrderBySortOrderAscNameAsc()) {
            if (f.isArchived()) continue;
            String key = f.isMain() ? FinanceTags.MAIN : f.getId().toString();
            List<FinanceDto.LabelLine> labels = new ArrayList<>();
            for (Map.Entry<UUID, Line> e : cur.spentByTag.entrySet()) {
                FinanceCategory c = cur.tagById.get(e.getKey());
                if (!key.equals(FinanceTags.facet(c)) || (e.getValue().amount.signum() == 0 && e.getValue().count == 0)) continue;
                labels.add(new FinanceDto.LabelLine(c.getId(), c.getName(), c.getIcon(), parentOf(c), e.getValue().amount, e.getValue().count));
            }
            BigDecimal none = cur.spentLines.subtract(cur.labeled.getOrDefault(key, BigDecimal.ZERO));
            labels.sort((a, b) -> b.amount().compareTo(a.amount()));
            out.add(new FinanceDto.FacetSpend(f.getId(), f.getName(), f.isMain(), labels, none, cur.multi.getOrDefault(key, 0L)));
        }
        return out;
    }

    /** The label of the same facet that this one brings along: its parent. */
    private static UUID parentOf(FinanceCategory c) {
        String f = FinanceTags.facet(c);
        return c.getImplies().stream().filter(p -> !p.isArchived() && f.equals(FinanceTags.facet(p))).map(FinanceCategory::getId).findFirst().orElse(null);
    }

    /** The last `months` months (oldest first): income, spending, saving, and net worth at each month's end. */
    public List<FinanceDto.TrendPoint> trend(int months, String currency) {
        FinanceFx fx = rates.fx();
        String in = reportCurrency(currency);
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
            Totals t = totals(byMonth.getOrDefault(m, List.of()), fx, in);
            LocalDateTime end = m.equals(now) ? FinanceText.nowUtc() : FinanceText.monthStartUtc(m.plusMonths(1));
            BigDecimal worth = BigDecimal.ZERO;
            boolean known = false;
            for (FinanceAccount a : worthAccounts) {
                BigDecimal later = all.stream()
                    .filter(x -> x.getAccount().getId().equals(a.getId()) && !x.getOccurredAt().isBefore(end))
                    .map(FinanceTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal v = fx.convert(a.getBalance().subtract(later), a.getCurrency(), in, end);   // worth then, at that day's rates
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
        BigDecimal income = BigDecimal.ZERO, saved = BigDecimal.ZERO, spent = BigDecimal.ZERO;
        /** moved: money between own accounts, cash included; spentLines: every spending line once */
        BigDecimal moved = BigDecimal.ZERO, spentLines = BigDecimal.ZERO;
        final Map<UUID, Line> spentByTag = new LinkedHashMap<>();
        final Map<UUID, FinanceCategory> tagById = new HashMap<>();
        final Map<String, BigDecimal> labeled = new HashMap<>();
        final Map<String, Long> multi = new HashMap<>();
        final Map<Key, Line> expense = new LinkedHashMap<>(), incomeBy = new LinkedHashMap<>();
        final Map<UUID, Acc> accounts = new LinkedHashMap<>();

        BigDecimal expense() { return spent; }

        List<FinanceDto.CategoryLine> expenseLines() {
            return expense.entrySet().stream().filter(e -> e.getValue().amount.signum() != 0 || e.getValue().count > 0)
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

        /** One spending line, in full, under each of its labels; per facet, how much carries any label and who carries two. */
        void byLabel(FinanceTransaction t, BigDecimal spent) {
            spentLines = spentLines.add(spent);
            Set<String> facets = new HashSet<>();
            Map<String, Integer> chosen = new HashMap<>();
            for (FinanceTxnTag x : t.getTags()) {
                FinanceCategory c = x.getTag();
                tagById.putIfAbsent(c.getId(), c);
                Line l = spentByTag.computeIfAbsent(c.getId(), k -> new Line());
                l.amount = l.amount.add(spent); l.count++;
                String f = FinanceTags.facet(c);
                facets.add(f);
                if (!x.isImplied()) chosen.merge(f, 1, Integer::sum);
            }
            for (String f : facets) labeled.merge(f, spent, BigDecimal::add);
            chosen.forEach((f, n) -> { if (n >= 2) multi.merge(f, 1L, Long::sum); });
        }

        private static FinanceDto.CategoryLine line(Key k, Line l) {
            return new FinanceDto.CategoryLine(k.id(), k.code(), k.name(), k.icon(), k.group(), l.amount, l.count);
        }
    }

    private static Key key(FinanceCategory c) {
        if (c == null) return new Key(null, null, "Uncategorized", "❔", null);
        return new Key(c.getId(), c.getCode(), c.getName(), c.getIcon(), c.getBudgetGroup() == null ? null : c.getBudgetGroup().name());
    }

    /** "VND" unless another three-letter currency is asked for. */
    static String reportCurrency(String currency) {
        if (currency == null || currency.isBlank()) return FinanceFx.VND;
        String c = currency.trim().toUpperCase(Locale.ROOT);
        if (!c.matches("[A-Z]{3}")) throw new IllegalArgumentException("Not a currency code: " + currency);
        return c;
    }

    /** Each line in `in`, with the rate of its own day; a line whose currency has no rate yet is left out. */
    private static Totals totals(List<FinanceTransaction> txns, FinanceFx fx, String in) {
        Totals s = new Totals();
        for (FinanceTransaction t : txns) {
            FinanceAccount a = t.getAccount();
            BigDecimal v = fx.convert(t.getAmount(), a.getCurrency(), in, t.getOccurredAt());
            if (v == null) continue;                                  // a currency without a rate yet
            if (t.getKind() != Kind.TRANSFER) {
                Acc acc = s.accounts.computeIfAbsent(a.getId(), k -> { Acc x = new Acc(); x.name = a.getName(); x.mode = a.getMode().name(); return x; });
                if (v.signum() < 0) acc.out = acc.out.add(v.negate()); else acc.in = acc.in.add(v);
            }
            switch (t.getKind()) {
                case TRANSFER -> { if (v.signum() < 0) s.moved = s.moved.add(v.negate()); }   // each move once: its outgoing side
                case INCOME -> {
                    s.income = s.income.add(v);
                    Line l = s.incomeBy.computeIfAbsent(key(t.getCategory()), k -> new Line());
                    l.amount = l.amount.add(v); l.count++;
                }
                case EXPENSE -> {
                    BigDecimal spent = v.negate();
                    FinanceCategory c = t.getCategory();
                    boolean saving = c != null && c.getBudgetGroup() == FinanceCategory.BudgetGroup.SAVING;
                    if (saving) s.saved = s.saved.add(spent);
                    else {
                        s.spent = s.spent.add(spent);
                        Line l = s.expense.computeIfAbsent(key(c), k -> new Line());
                        l.amount = l.amount.add(spent); l.count++;
                        s.byLabel(t, spent);
                    }
                }
            }
        }
        return s;
    }
}
