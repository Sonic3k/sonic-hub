package com.sonic.angels.service;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.model.entity.*;
import com.sonic.angels.model.entity.FinanceTransaction.By;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Source;
import com.sonic.angels.model.entity.FinanceTransaction.Status;
import com.sonic.angels.repository.*;
import com.sonic.angels.util.FinanceText;
import com.sonic.angels.util.SlugUtil;
import jakarta.persistence.criteria.Fetch;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/** Accounts, categories, rules, transactions, quick notes, balance check-ins and settings of the finance module. */
@Service
@Transactional
public class FinanceService {

    static final String BUDGET = "finance.budget.flexible";

    private final FinanceAccountRepository accountRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final FinanceRuleRepository ruleRepo;
    private final FinanceTransactionRepository txnRepo;
    private final FinanceInboundRepository inboundRepo;
    private final AppSettingRepository settingRepo;
    private final FinanceClassifier classifier;
    private final FinanceAiService ai;
    private final FinanceRateService rates;
    private final String sepayKey;

    public FinanceService(FinanceAccountRepository accountRepo, FinanceCategoryRepository categoryRepo, FinanceRuleRepository ruleRepo,
                          FinanceTransactionRepository txnRepo, FinanceInboundRepository inboundRepo, AppSettingRepository settingRepo,
                          FinanceClassifier classifier, FinanceAiService ai, FinanceRateService rates,
                          @Value("${finance.sepay.api-key:}") String sepayKey) {
        this.accountRepo = accountRepo; this.categoryRepo = categoryRepo; this.ruleRepo = ruleRepo; this.txnRepo = txnRepo;
        this.inboundRepo = inboundRepo; this.settingRepo = settingRepo; this.classifier = classifier; this.ai = ai;
        this.rates = rates; this.sepayKey = sepayKey == null ? "" : sepayKey.trim();
    }

    // ════════════════════════════════ accounts ════════════════════════════════

    @Transactional(readOnly = true)
    public List<FinanceDto.Account> accounts() {
        BigDecimal usd = rates.usdValue();
        return accountRepo.findAllByOrderBySortOrderAscCreatedAtAsc().stream()
            .map(a -> toAccount(a, usd, txnRepo.countByAccountId(a.getId()))).toList();
    }

    public FinanceDto.Account createAccount(FinanceDto.AccountRequest r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Tên tài khoản?");
        FinanceAccount a = new FinanceAccount();
        a.setSortOrder(accountRepo.findAll().stream().mapToInt(FinanceAccount::getSortOrder).max().orElse(0) + 1);
        fill(a, r);
        return toAccount(accountRepo.save(a), rates.usdValue(), 0);
    }

    public FinanceDto.Account updateAccount(UUID id, FinanceDto.AccountRequest r) {
        FinanceAccount a = account(id);
        fill(a, r);
        return toAccount(a, rates.usdValue(), txnRepo.countByAccountId(id));
    }

    public void deleteAccount(UUID id) {
        FinanceAccount a = account(id);
        if (txnRepo.countByAccountId(id) > 0)
            throw new IllegalArgumentException("Tài khoản đã có giao dịch — hãy lưu trữ thay vì xoá");
        ruleRepo.deleteByTransferAccountId(id);
        accountRepo.delete(a);
    }

    /**
     * "Chốt số dư": the balance seen in the bank or wallet app right now. On a RECONCILE account the difference
     * from the running balance becomes one "Chi chưa rõ" / "Thu chưa rõ" line; the first check-in only sets the start.
     */
    public FinanceDto.Account setBalance(UUID id, FinanceDto.BalanceRequest r) {
        FinanceAccount a = account(id);
        if (r == null || r.balance() == null) throw new IllegalArgumentException("Số dư?");
        if (a.getMode() == FinanceAccount.Mode.POOL) throw new IllegalArgumentException("Tiền mặt không cần chốt số dư");
        LocalDateTime now = FinanceText.nowUtc();
        if (a.getMode() == FinanceAccount.Mode.RECONCILE && a.getBalance() != null) {
            BigDecimal diff = r.balance().subtract(a.getBalance());
            if (diff.signum() != 0) {
                FinanceTransaction t = new FinanceTransaction();
                t.setAccount(a);
                t.setAmount(diff);
                t.setOccurredAt(now);
                t.setSource(Source.RECONCILE);
                t.setStatus(Status.OK);
                t.setCategorizedBy(By.SYSTEM);
                String code = diff.signum() < 0 ? FinanceCategory.UNKNOWN_EXPENSE : FinanceCategory.UNKNOWN_INCOME;
                FinanceCategory c = categoryRepo.findByCode(code).orElse(null);
                t.setKind(diff.signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
                t.setCategory(c);
                t.setDescription("Chênh lệch khi chốt số dư" + (r.note() != null && !r.note().isBlank() ? " · " + r.note().trim() : ""));
                txnRepo.save(t);
            }
        }
        a.setBalance(r.balance());
        a.setBalanceAt(now);
        return toAccount(a, rates.usdValue(), txnRepo.countByAccountId(id));
    }

    private void fill(FinanceAccount a, FinanceDto.AccountRequest r) {
        if (r.name() != null && !r.name().isBlank()) a.setName(r.name().trim());
        if (r.institution() != null) a.setInstitution(blankToNull(r.institution()));
        if (r.mode() != null) a.setMode(parseEnum(FinanceAccount.Mode.class, r.mode(), "mode"));
        if (r.currency() != null) {
            String c = r.currency().trim().toUpperCase(Locale.ROOT);
            if (!c.matches("[A-Z]{3}")) throw new IllegalArgumentException("Tiền tệ là 3 chữ cái, ví dụ VND, USD");
            a.setCurrency(c);
        }
        if (r.accountNumber() != null) {
            String n = r.accountNumber().replaceAll("\\s+", "");
            if (!n.isEmpty()) accountRepo.findFirstByAccountNumber(n).filter(o -> !o.getId().equals(a.getId())).ifPresent(o -> {
                throw new IllegalArgumentException("Số tài khoản này đã thuộc " + o.getName());
            });
            a.setAccountNumber(n.isEmpty() ? null : n);
        }
        if (r.color() != null) a.setColor(blankToNull(r.color()));
        if (r.sortOrder() != null) a.setSortOrder(r.sortOrder());
        if (r.archived() != null) a.setArchived(r.archived());
    }

    // ════════════════════════════════ categories ════════════════════════════════

    @Transactional(readOnly = true)
    public List<FinanceDto.Category> categories() {
        return categoryRepo.findAllByOrderByKindAscSortOrderAscNameAsc().stream().map(FinanceService::toCategory).toList();
    }

    public FinanceDto.Category createCategory(FinanceDto.CategoryRequest r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Tên hạng mục?");
        FinanceCategory c = new FinanceCategory();
        c.setName(r.name().trim());
        c.setKind(r.kind() == null ? FinanceCategory.Kind.EXPENSE : parseEnum(FinanceCategory.Kind.class, r.kind(), "kind"));
        c.setBudgetGroup(c.getKind() == FinanceCategory.Kind.INCOME ? null
            : r.budgetGroup() == null ? FinanceCategory.BudgetGroup.FLEXIBLE : parseEnum(FinanceCategory.BudgetGroup.class, r.budgetGroup(), "budgetGroup"));
        c.setIcon(blankToNull(r.icon()));
        c.setSortOrder(r.sortOrder() != null ? r.sortOrder() : 50);
        String base = SlugUtil.slugify(c.getName()), code = base;
        for (int i = 2; categoryRepo.existsByCode(code); i++) code = base + "-" + i;
        c.setCode(code);
        return toCategory(categoryRepo.save(c));
    }

    public FinanceDto.Category updateCategory(UUID id, FinanceDto.CategoryRequest r) {
        FinanceCategory c = categoryRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Category not found: " + id));
        if (r.name() != null && !r.name().isBlank()) c.setName(r.name().trim());
        if (r.icon() != null) c.setIcon(blankToNull(r.icon()));
        if (r.sortOrder() != null) c.setSortOrder(r.sortOrder());
        if (r.archived() != null) {
            if (c.isSystem() && r.archived()) throw new IllegalArgumentException("Hạng mục hệ thống không lưu trữ được");
            c.setArchived(r.archived());
        }
        if (r.kind() != null) {
            FinanceCategory.Kind k = parseEnum(FinanceCategory.Kind.class, r.kind(), "kind");
            if (k != c.getKind()) {
                if (c.isSystem()) throw new IllegalArgumentException("Không đổi loại của hạng mục hệ thống");
                c.setKind(k);
                if (k == FinanceCategory.Kind.INCOME) c.setBudgetGroup(null);
                else if (c.getBudgetGroup() == null) c.setBudgetGroup(FinanceCategory.BudgetGroup.FLEXIBLE);
            }
        }
        if (r.budgetGroup() != null && c.getKind() == FinanceCategory.Kind.EXPENSE)
            c.setBudgetGroup(parseEnum(FinanceCategory.BudgetGroup.class, r.budgetGroup(), "budgetGroup"));
        return toCategory(c);
    }

    /** Its transactions go back to review; rules pointing at it go away. */
    public void deleteCategory(UUID id) {
        FinanceCategory c = categoryRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Category not found: " + id));
        if (c.isSystem()) throw new IllegalArgumentException("Hạng mục hệ thống không xoá được");
        txnRepo.uncategorize(id, Status.REVIEW);
        List<FinanceRule> doomed = ruleRepo.findAllByOrderByPriorityAscCreatedAtAsc().stream()
            .filter(r -> r.getCategory() != null && r.getCategory().getId().equals(id)).toList();
        for (FinanceRule r : doomed) txnRepo.clearRule(r.getId());
        ruleRepo.deleteByCategoryId(id);
        categoryRepo.delete(c);
    }

    // ════════════════════════════════ rules ════════════════════════════════

    @Transactional(readOnly = true)
    public List<FinanceDto.Rule> rules() { return ruleRepo.findAllByOrderByPriorityAscCreatedAtAsc().stream().map(FinanceService::toRule).toList(); }

    public FinanceDto.Rule createRule(FinanceDto.RuleRequest r) {
        FinanceRule rule = new FinanceRule();
        rule.setOrigin(FinanceRule.Origin.USER);
        rule.setPriority(10);
        fillRule(rule, r, true);
        return toRule(ruleRepo.save(rule));
    }

    public FinanceDto.Rule updateRule(UUID id, FinanceDto.RuleRequest r) {
        FinanceRule rule = ruleRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Rule not found: " + id));
        fillRule(rule, r, false);
        return toRule(rule);
    }

    public void deleteRule(UUID id) {
        FinanceRule rule = ruleRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Rule not found: " + id));
        txnRepo.clearRule(id);
        ruleRepo.delete(rule);
    }

    /** Run all rules again over what still waits for review (after adding or editing rules). */
    public FinanceDto.Applied applyRules() {
        List<FinanceRule> rules = classifier.rules();
        int n = 0;
        for (FinanceTransaction t : txnRepo.findWithStatus(Status.REVIEW)) {
            if (t.getCategorizedBy() == By.USER || t.getKind() == Kind.TRANSFER) continue;
            FinanceRule r = classifier.match(t, rules);
            if (r != null) { classifier.apply(t, r); n++; }
        }
        return new FinanceDto.Applied(n);
    }

    private void fillRule(FinanceRule rule, FinanceDto.RuleRequest r, boolean creating) {
        if (r.counterpartyName() != null) {
            String who = FinanceText.cleanCounterparty(r.counterpartyName());
            rule.setCounterpartyName(who);
            if (who != null) rule.setKeywords("");
        }
        if (r.counterpartyAccount() != null) rule.setCounterpartyAccount(blankToNull(r.counterpartyAccount()));
        if (r.label() != null) rule.setLabel(blankToNull(r.label()));
        if (!rule.isCounterpartyRule() && (r.keywords() != null || creating)) {
            if (r.keywords() == null || FinanceText.keywords(r.keywords()).isEmpty())
                throw new IllegalArgumentException("Cần ít nhất một từ khoá (hoặc một người nhận)");
            rule.setKeywords(r.keywords().trim());
        }
        if (r.direction() != null) rule.setDirection(parseEnum(FinanceRule.Direction.class, r.direction(), "direction"));
        if (r.priority() != null) rule.setPriority(r.priority());
        if (r.active() != null) rule.setActive(r.active());
        if (r.categoryId() != null) {
            rule.setCategory(categoryRepo.findById(r.categoryId()).orElseThrow(() -> new IllegalArgumentException("Không có hạng mục này")));
            rule.setTransferAccount(null);
        } else if (r.transferAccountId() != null) {
            rule.setTransferAccount(account(r.transferAccountId()));
            rule.setCategory(null);
        }
        if (rule.getCategory() == null && rule.getTransferAccount() == null)
            throw new IllegalArgumentException("Quy tắc cần một hạng mục hoặc một tài khoản đích");
    }

    // ════════════════════════════════ transactions ════════════════════════════════

    /** month (2026-10) or from/to (Vietnam dates, inclusive); categoryId "none" = uncategorized. */
    @Transactional(readOnly = true)
    public Page<FinanceDto.Txn> transactions(String month, String from, String to, UUID accountId, String categoryId,
                                             String status, String kind, String q, int page, int size) {
        LocalDateTime f = null, t = null;
        if (month != null && !month.isBlank()) {
            YearMonth m = FinanceText.parseMonth(month);
            f = FinanceText.monthStartUtc(m); t = FinanceText.monthStartUtc(m.plusMonths(1));
        }
        if (from != null && !from.isBlank()) f = FinanceText.vnToUtc(LocalDate.parse(from.trim()).atStartOfDay());
        if (to != null && !to.isBlank()) t = FinanceText.vnToUtc(LocalDate.parse(to.trim()).plusDays(1).atStartOfDay());
        Specification<FinanceTransaction> spec = spec(f, t, accountId, categoryId, status, kind, q);
        PageRequest pr = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200),
            Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "createdAt")));
        BigDecimal usd = rates.usdValue();
        return txnRepo.findAll(spec, pr).map(x -> toTxn(x, usd));
    }

    @Transactional(readOnly = true)
    public List<FinanceDto.Txn> review() {
        BigDecimal usd = rates.usdValue();
        return txnRepo.findWithStatus(Status.REVIEW).stream().map(x -> toTxn(x, usd)).toList();
    }

    @Transactional(readOnly = true)
    public FinanceDto.Txn transaction(UUID id) { return toTxn(txn(id), rates.usdValue()); }

    /** Typed in admin. Without a category it goes through the rules like everything else. */
    public FinanceDto.Txn createTransaction(FinanceDto.TxnRequest r) {
        if (r.accountId() == null) throw new IllegalArgumentException("Chọn tài khoản");
        if (r.amount() == null || r.amount().signum() == 0) throw new IllegalArgumentException("Số tiền?");
        FinanceTransaction t = new FinanceTransaction();
        t.setAccount(account(r.accountId()));
        t.setAmount(r.amount());
        t.setOccurredAt(FinanceText.parseClientTime(r.occurredAt()));
        t.setDescription(blankToNull(r.description()));
        t.setNote(blankToNull(r.note()));
        t.setSource(Source.MANUAL);
        t.setKind(r.amount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
        t.setStatus(Status.REVIEW);
        t = txnRepo.save(t);
        classifier.added(t);
        decide(t, r);
        learn(t, r);
        return toTxn(t, rates.usdValue());
    }

    public FinanceDto.Txn updateTransaction(UUID id, FinanceDto.TxnRequest r) {
        FinanceTransaction t = txn(id);
        if (r.accountId() != null && !r.accountId().equals(t.getAccount().getId())) {
            classifier.removed(t);
            t.setAccount(account(r.accountId()));
            t.setBalanceAfter(null);                       // the bank's figure belonged to the old account
            classifier.added(t);
        }
        if (r.amount() != null && r.amount().compareTo(t.getAmount()) != 0) {
            if (r.amount().signum() == 0) throw new IllegalArgumentException("Số tiền?");
            classifier.removed(t);
            t.setAmount(r.amount());
            classifier.added(t);
            FinanceTransaction peer = t.getTransferPeer();
            if (peer != null && peer.getSource() == Source.SYSTEM) {
                classifier.removed(peer);
                peer.setAmount(r.amount().negate());
                classifier.added(peer);
            }
        }
        if (r.occurredAt() != null && !r.occurredAt().isBlank()) {
            t.setOccurredAt(FinanceText.parseClientTime(r.occurredAt()));
            if (t.getTransferPeer() != null && t.getTransferPeer().getSource() == Source.SYSTEM) t.getTransferPeer().setOccurredAt(t.getOccurredAt());
        }
        if (r.description() != null) t.setDescription(blankToNull(r.description()));
        if (r.note() != null) t.setNote(blankToNull(r.note()));
        decide(t, r);
        learn(t, r);
        if (Boolean.TRUE.equals(r.learnCounterparty()) && t.getCounterparty() != null) {
            FinanceAccount target = t.getKind() == Kind.TRANSFER && t.getTransferPeer() != null ? t.getTransferPeer().getAccount()
                : t.getKind() == Kind.TRANSFER && r.transferAccountId() != null ? account(r.transferAccountId()) : null;
            if (target == null && t.getCategory() == null) throw new IllegalArgumentException("Chọn hạng mục trước khi áp cho cả người nhận");
            assignCounterparty(new FinanceDto.AssignRequest(t.getCounterparty(), target == null ? t.getCategory().getId() : null,
                target == null ? null : target.getId(), r.label()));
        }
        if (r.label() != null && !r.label().isBlank()) FinanceClassifier.relabel(t, r.label().trim());
        return toTxn(t, rates.usdValue());
    }

    public void deleteTransaction(UUID id) {
        FinanceTransaction t = txn(id);
        classifier.breakTransfer(t);
        classifier.removed(t);
        inboundRepo.unlinkTransaction(id);
        txnRepo.unlinkPeer(id);
        txnRepo.delete(t);
    }

    /** One tap: the guess (AI or rule) is right. */
    public FinanceDto.Txn confirm(UUID id) {
        FinanceTransaction t = txn(id);
        if (t.getKind() != Kind.TRANSFER && t.getCategory() == null) throw new IllegalArgumentException("Chọn hạng mục trước");
        t.setStatus(Status.OK);
        return toTxn(t, rates.usdValue());
    }

    /** Every pre-filled guess still waiting is taken as right. */
    public FinanceDto.Applied confirmAll() {
        int n = 0;
        for (FinanceTransaction t : txnRepo.findWithStatus(Status.REVIEW)) {
            if (t.getKind() == Kind.TRANSFER || t.getCategory() != null) { t.setStatus(Status.OK); n++; }
        }
        return new FinanceDto.Applied(n);
    }

    // ════════════════════════════════ counterparties ════════════════════════════════

    /**
     * Who the money went to or came from, grouped by name — the ones with lines still waiting for review first.
     * waitingOnly leaves out counterparties whose lines are all decided.
     */
    @Transactional(readOnly = true)
    public List<FinanceDto.CounterpartyGroup> counterparties(boolean waitingOnly) {
        Map<String, List<FinanceTransaction>> groups = new LinkedHashMap<>();
        for (FinanceTransaction t : txnRepo.withCounterparty()) {
            if (t.getSource() == Source.SYSTEM) continue;
            String key = FinanceText.counterpartyKey(t.getCounterparty());
            if (!key.isEmpty()) groups.computeIfAbsent(key, k -> new ArrayList<>()).add(t);
        }
        Map<String, FinanceRule> ruleByKey = new HashMap<>();
        for (FinanceRule r : classifier.rules())
            if (r.isCounterpartyRule()) ruleByKey.putIfAbsent(FinanceText.counterpartyKey(r.getCounterpartyName()), r);
        List<FinanceDto.CounterpartyGroup> out = new ArrayList<>();
        for (Map.Entry<String, List<FinanceTransaction>> e : groups.entrySet()) {
            List<FinanceTransaction> g = e.getValue();
            long waiting = g.stream().filter(t -> t.getStatus() == Status.REVIEW).count();
            if (waitingOnly && waiting == 0) continue;
            Map<String, Long> names = new HashMap<>();
            Set<String> accounts = new HashSet<>();
            Set<UUID> own = new LinkedHashSet<>();
            Map<UUID, Long> cats = new HashMap<>();
            Map<UUID, FinanceCategory> catById = new HashMap<>();
            BigDecimal totalOut = BigDecimal.ZERO, totalIn = BigDecimal.ZERO;
            long outCount = 0, inCount = 0;
            FinanceTransaction last = g.get(0);
            for (FinanceTransaction t : g) {
                names.merge(FinanceText.cleanCounterparty(t.getCounterparty()), 1L, Long::sum);
                if (t.getCounterpartyAccount() != null) accounts.add(t.getCounterpartyAccount());
                own.add(t.getAccount().getId());
                if (t.getAmount().signum() < 0) { outCount++; totalOut = totalOut.add(t.getAmount().negate()); }
                else { inCount++; totalIn = totalIn.add(t.getAmount()); }
                if (t.getCategory() != null && t.getKind() != Kind.TRANSFER) {
                    cats.merge(t.getCategory().getId(), 1L, Long::sum);
                    catById.put(t.getCategory().getId(), t.getCategory());
                }
                if (t.getOccurredAt().isAfter(last.getOccurredAt())) last = t;
            }
            String name = names.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(last.getCounterparty());
            FinanceCategory guess = cats.entrySet().stream().max(Map.Entry.comparingByValue()).map(x -> catById.get(x.getKey())).orElse(null);
            FinanceRule rule = ruleByKey.get(e.getKey());
            String sample = last.getBankDescription() != null && rule != null && rule.getLabel() != null ? last.getBankDescription() : last.getDescription();
            out.add(new FinanceDto.CounterpartyGroup(e.getKey(), name, accounts.size() == 1 ? accounts.iterator().next() : null,
                accounts.size(), List.copyOf(own), g.size(), waiting, outCount, inCount, totalOut, totalIn, last.getOccurredAt(), sample,
                rule == null ? null : rule.getId(), rule == null ? null : rule.getLabel(),
                guess == null ? null : guess.getId(), guess == null ? null : guess.getName(), guess == null ? null : guess.getIcon()));
        }
        out.sort(Comparator.comparingLong(FinanceDto.CounterpartyGroup::waiting).reversed()
            .thenComparing(Comparator.comparingLong(FinanceDto.CounterpartyGroup::count).reversed()));
        return out;
    }

    /**
     * "Everything with this counterparty is …": one rule (made, or the existing one changed) and every line with that
     * counterparty follows it — old and new — except lines decided one by one and moves the system found itself.
     */
    public FinanceDto.Applied assignCounterparty(FinanceDto.AssignRequest r) {
        String key = FinanceText.counterpartyKey(r.name());
        if (key.isEmpty()) throw new IllegalArgumentException("Người nhận?");
        if (r.categoryId() == null && r.transferAccountId() == null) throw new IllegalArgumentException("Chọn hạng mục hoặc tài khoản đích");
        FinanceRule rule = classifier.rules().stream()
            .filter(x -> x.isCounterpartyRule() && key.equals(FinanceText.counterpartyKey(x.getCounterpartyName())))
            .findFirst().orElseGet(FinanceRule::new);
        rule.setCounterpartyName(FinanceText.cleanCounterparty(r.name()));
        rule.setKeywords("");
        rule.setOrigin(FinanceRule.Origin.USER);
        rule.setPriority(5);
        rule.setActive(true);
        rule.setLabel(blankToNull(r.label()));
        if (r.categoryId() != null) {
            FinanceCategory c = category(r.categoryId());
            rule.setCategory(c);
            rule.setTransferAccount(null);
            rule.setDirection(c.getKind() == FinanceCategory.Kind.INCOME ? FinanceRule.Direction.IN : FinanceRule.Direction.ANY);
        } else {
            rule.setTransferAccount(account(r.transferAccountId()));
            rule.setCategory(null);
            rule.setDirection(FinanceRule.Direction.ANY);
        }
        // money only went one way with them (what still waits, else everything): the rule keeps to that way, so an
        // interest line from one's own savings or a refund does not follow a "→ Techcombank" or a spending rule
        List<FinanceTransaction> lines = txnRepo.withCounterparty().stream()
            .filter(t -> t.getSource() != Source.SYSTEM && key.equals(FinanceText.counterpartyKey(t.getCounterparty()))).toList();
        List<FinanceTransaction> basis = lines.stream().anyMatch(t -> t.getStatus() == Status.REVIEW)
            ? lines.stream().filter(t -> t.getStatus() == Status.REVIEW).toList() : lines;
        boolean anyOut = basis.stream().anyMatch(t -> t.getAmount().signum() < 0), anyIn = basis.stream().anyMatch(t -> t.getAmount().signum() > 0);
        if (rule.getCategory() == null || rule.getCategory().getKind() != FinanceCategory.Kind.INCOME)
            rule.setDirection(anyOut && !anyIn ? FinanceRule.Direction.OUT : anyIn && !anyOut ? FinanceRule.Direction.IN : FinanceRule.Direction.ANY);
        rule = ruleRepo.save(rule);
        int n = 0;
        for (FinanceTransaction t : lines) {
            if (t.getCategorizedBy() == By.USER) continue;
            if (t.getKind() == Kind.TRANSFER && t.getCategorizedBy() == By.SYSTEM) continue;
            if (classifier.match(t, List.of(rule)) == null) continue;
            if (t.getKind() == Kind.TRANSFER) classifier.breakTransfer(t);
            classifier.apply(t, rule);
            n++;
        }
        return new FinanceDto.Applied(n);
    }

    // ════════════════════════════════ quick notes ════════════════════════════════

    /** A note from the quick box. Default account: cash. No category given → rules, then the AI. */
    public FinanceDto.Txn note(FinanceDto.NoteRequest r) {
        if (r.amount() == null || r.amount().signum() == 0) throw new IllegalArgumentException("Số tiền?");
        FinanceAccount a = r.accountId() != null ? account(r.accountId()) : defaultNoteAccount();
        FinanceTransaction t = new FinanceTransaction();
        t.setAccount(a);
        t.setAmount(r.amount());
        t.setOccurredAt(FinanceText.parseClientTime(r.occurredAt()));
        t.setDescription(blankToNull(r.text()));
        t.setSource(Source.NOTE);
        t.setKind(r.amount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
        t.setStatus(Status.REVIEW);
        t = txnRepo.save(t);
        classifier.added(t);
        if (r.categoryId() != null) {
            classifier.setCategory(t, category(r.categoryId()), By.USER);
            t.setStatus(Status.OK);
        } else {
            FinanceRule rule = classifier.match(t, classifier.rules());
            if (rule != null) classifier.apply(t, rule);
            else askAiAfterCommit(t);
        }
        return toTxn(t, rates.usdValue());
    }

    /** The notes typed most often lately — one tap writes them again. */
    @Transactional(readOnly = true)
    public List<FinanceDto.QuickChip> chips(int limit) {
        record Key(String text, BigDecimal amount, UUID account) {}
        Map<Key, List<FinanceTransaction>> groups = new LinkedHashMap<>();
        for (FinanceTransaction t : txnRepo.latestBySource(Source.NOTE, PageRequest.of(0, 300))) {
            if (t.getDescription() == null || t.getDescription().isBlank()) continue;
            Key k = new Key(FinanceText.normalize(t.getDescription()), t.getAmount().stripTrailingZeros(), t.getAccount().getId());
            groups.computeIfAbsent(k, x -> new ArrayList<>()).add(t);
        }
        return groups.values().stream()
            .sorted(Comparator.comparingInt((List<FinanceTransaction> g) -> g.size()).reversed())
            .limit(Math.max(1, Math.min(limit, 20)))
            .map(g -> {
                FinanceTransaction t = g.get(0);
                FinanceCategory c = t.getCategory();
                return new FinanceDto.QuickChip(t.getDescription().trim(), t.getAmount(), t.getAccount().getId(), t.getAccount().getName(),
                    c == null ? null : c.getId(), c == null ? null : c.getName(), c == null ? null : c.getIcon(), g.size());
            }).toList();
    }

    // ════════════════════════════════ settings and the webhook log ════════════════════════════════

    @Transactional(readOnly = true)
    public FinanceDto.Settings settings() {
        FinanceRateService.Rate rate = rates.usd();
        LocalDateTime lastSepay = inboundRepo.findFirstBySourceOrderByCreatedAtDesc("SEPAY").map(FinanceInbound::getCreatedAt).orElse(null);
        return new FinanceDto.Settings(flexibleBudget(), rate == null ? null : rate.value(), rate == null ? null : rate.at(),
            rate != null && rate.manual(), !sepayKey.isEmpty(), ai.enabled(), lastSepay);
    }

    public FinanceDto.Settings updateSettings(FinanceDto.SettingsRequest r) {
        if (r.flexibleBudget() != null) {
            AppSetting s = settingRepo.findById(BUDGET).orElseGet(() -> new AppSetting(BUDGET, ""));
            s.setValue(r.flexibleBudget().signum() > 0 ? r.flexibleBudget().toPlainString() : "");
            settingRepo.save(s);
        }
        if (Boolean.TRUE.equals(r.usdRateAuto())) rates.setManual(null);
        else if (r.usdRate() != null) rates.setManual(r.usdRate());
        return settings();
    }

    public BigDecimal flexibleBudget() {
        return settingRepo.findById(BUDGET).map(AppSetting::getValue).filter(v -> !v.isBlank()).map(v -> {
            try { return new BigDecimal(v); } catch (NumberFormatException e) { return null; }
        }).orElse(null);
    }

    @Transactional(readOnly = true)
    public Page<FinanceDto.Inbound> inbound(int page, int size) {
        return inboundRepo.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)))
            .map(FinanceService::toInbound);
    }

    @Transactional(readOnly = true)
    public FinanceDto.Inbound inboundOne(UUID id) {
        return toInbound(inboundRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Payload not found: " + id)));
    }

    // ════════════════════════════════ internals ════════════════════════════════

    /** What the request says the transaction is: a transfer, a category, or back to plain spending/income. */
    private void decide(FinanceTransaction t, FinanceDto.TxnRequest r) {
        if ("TRANSFER".equalsIgnoreCase(r.kind())) {
            if (r.transferAccountId() == null) throw new IllegalArgumentException("Chuyển sang tài khoản nào?");
            FinanceAccount target = account(r.transferAccountId());
            if (target.getId().equals(t.getAccount().getId())) throw new IllegalArgumentException("Tài khoản đích phải khác");
            classifier.breakTransfer(t);
            classifier.makeTransfer(t, target, By.USER);
        } else if (r.categoryId() != null) {
            if (t.getKind() == Kind.TRANSFER) classifier.breakTransfer(t);
            classifier.setCategory(t, category(r.categoryId()), By.USER);
            t.setStatus(Status.OK);
        } else if (r.kind() != null && t.getKind() == Kind.TRANSFER) {
            Kind k = parseEnum(Kind.class, r.kind(), "kind");
            classifier.breakTransfer(t);
            t.setKind(k);
            t.setCategory(null);
            t.setCategorizedBy(null);
            t.setStatus(Status.REVIEW);
        } else if (t.getSource() == Source.MANUAL && t.getStatus() == Status.REVIEW && t.getCategorizedBy() == null) {
            FinanceRule rule = classifier.match(t, classifier.rules());
            if (rule != null) classifier.apply(t, rule);
            else askAiAfterCommit(t);
        }
    }

    /** "Remember this": a rule from these words to what the transaction is now, applied to everything still waiting. */
    private void learn(FinanceTransaction t, FinanceDto.TxnRequest r) {
        String keywords = r.learnKeywords();
        if (keywords == null || FinanceText.keywords(keywords).isEmpty()) return;
        FinanceRule rule = new FinanceRule();
        rule.setKeywords(keywords.trim());
        rule.setDirection(t.getAmount().signum() < 0 ? FinanceRule.Direction.OUT : FinanceRule.Direction.IN);
        rule.setPriority(10);
        rule.setOrigin(FinanceRule.Origin.USER);
        if (t.getKind() == Kind.TRANSFER) {
            FinanceAccount target = t.getTransferPeer() != null ? t.getTransferPeer().getAccount()
                : r.transferAccountId() != null ? account(r.transferAccountId()) : null;
            if (target == null) throw new IllegalArgumentException("Chuyển sang tài khoản nào?");
            rule.setTransferAccount(target);
        } else if (t.getCategory() != null) rule.setCategory(t.getCategory());
        else throw new IllegalArgumentException("Chọn hạng mục trước khi ghi nhớ");
        rule.setHits(1);
        rule = ruleRepo.save(rule);
        t.setMatchedRule(rule);
        for (FinanceTransaction other : txnRepo.findWithStatus(Status.REVIEW)) {
            if (other.getId().equals(t.getId()) || other.getCategorizedBy() == By.USER || other.getKind() == Kind.TRANSFER) continue;
            if (classifier.match(other, List.of(rule)) != null) classifier.apply(other, rule);
        }
    }

    private void askAiAfterCommit(FinanceTransaction t) {
        if (!ai.enabled() || !TransactionSynchronizationManager.isSynchronizationActive()) return;
        UUID id = t.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { ai.categorizeLater(id); }
        });
    }

    private FinanceAccount defaultNoteAccount() {
        return accountRepo.findFirstByModeAndArchivedFalseOrderBySortOrderAsc(FinanceAccount.Mode.POOL)
            .or(() -> accountRepo.findAllByOrderBySortOrderAscCreatedAtAsc().stream().filter(a -> !a.isArchived()).findFirst())
            .orElseThrow(() -> new IllegalArgumentException("Chưa có tài khoản nào"));
    }

    private Specification<FinanceTransaction> spec(LocalDateTime from, LocalDateTime to, UUID accountId, String categoryId,
                                                   String status, String kind, String q) {
        return (root, query, cb) -> {
            Class<?> rt = query.getResultType();
            if (rt != Long.class && rt != long.class) {
                root.fetch("account", JoinType.INNER);
                root.fetch("category", JoinType.LEFT);
                Fetch<?, ?> peer = root.fetch("transferPeer", JoinType.LEFT);
                peer.fetch("account", JoinType.LEFT);
            }
            List<Predicate> ps = new ArrayList<>();
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            if (to != null) ps.add(cb.lessThan(root.get("occurredAt"), to));
            if (accountId != null) ps.add(cb.equal(root.get("account").get("id"), accountId));
            if ("none".equalsIgnoreCase(categoryId)) ps.add(cb.isNull(root.get("category")));
            else if (categoryId != null && !categoryId.isBlank()) ps.add(cb.equal(root.get("category").get("id"), UUID.fromString(categoryId)));
            if (status != null && !status.isBlank()) ps.add(cb.equal(root.get("status"), parseEnum(Status.class, status, "status")));
            if (kind != null && !kind.isBlank()) ps.add(cb.equal(root.get("kind"), parseEnum(Kind.class, kind, "kind")));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("bankDescription")), like),
                    cb.like(cb.lower(root.get("counterparty")), like),
                    cb.like(cb.lower(root.get("note")), like)));
            }
            return cb.and(ps.toArray(Predicate[]::new));
        };
    }

    private FinanceAccount account(UUID id) { return accountRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Account not found: " + id)); }
    private FinanceCategory category(UUID id) { return categoryRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Category not found: " + id)); }
    private FinanceTransaction txn(UUID id) { return txnRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Transaction not found: " + id)); }

    private static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    static <E extends Enum<E>> E parseEnum(Class<E> type, String value, String field) {
        try { return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Bad " + field + ": " + value); }
    }

    // ── mapping (inside the transaction: relations are lazy) ──

    static FinanceDto.Account toAccount(FinanceAccount a, BigDecimal usd, long count) {
        return new FinanceDto.Account(a.getId(), a.getName(), a.getInstitution(), a.getMode().name(), a.getCurrency(), a.getAccountNumber(),
            a.getBalance(), a.getBalanceAt(), FinanceRateService.toVnd(a.getBalance(), a.getCurrency(), usd), a.getColor(),
            a.getSortOrder(), a.isArchived(), count);
    }

    static FinanceDto.Category toCategory(FinanceCategory c) {
        return new FinanceDto.Category(c.getId(), c.getCode(), c.getName(), c.getIcon(), c.getKind().name(),
            c.getBudgetGroup() == null ? null : c.getBudgetGroup().name(), c.getSortOrder(), c.isSystem(), c.isArchived());
    }

    static FinanceDto.Rule toRule(FinanceRule r) {
        FinanceCategory c = r.getCategory();
        FinanceAccount a = r.getTransferAccount();
        return new FinanceDto.Rule(r.getId(), r.getKeywords(), r.getDirection().name(),
            c == null ? null : c.getId(), c == null ? null : c.getName(), c == null ? null : c.getIcon(),
            a == null ? null : a.getId(), a == null ? null : a.getName(), r.getPriority(), r.getOrigin().name(), r.getHits(), r.isActive(),
            r.getCounterpartyName(), r.getCounterpartyAccount(), r.getLabel());
    }

    static FinanceDto.Txn toTxn(FinanceTransaction t, BigDecimal usd) {
        FinanceAccount a = t.getAccount();
        FinanceCategory c = t.getCategory();
        FinanceTransaction peer = t.getTransferPeer();
        String suggest = t.getStatus() == Status.REVIEW ? FinanceText.suggestKeywords(t.getDescription() != null ? t.getDescription() : t.getBankDescription()) : null;
        return new FinanceDto.Txn(t.getId(), a.getId(), a.getName(), a.getMode().name(), a.getCurrency(), t.getOccurredAt(), t.getAmount(),
            FinanceRateService.toVnd(t.getAmount(), a.getCurrency(), usd), t.getKind().name(),
            c == null ? null : c.getId(), c == null ? null : c.getName(), c == null ? null : c.getIcon(),
            t.getDescription(), t.getBankDescription(), t.getCounterparty(), t.getCounterpartyAccount(), t.getNote(), t.getSource().name(), t.getStatus().name(),
            t.getCategorizedBy() == null ? null : t.getCategorizedBy().name(), t.getAiConfidence(), t.getBalanceAfter(),
            peer == null ? null : peer.getId(), peer == null ? null : peer.getAccount().getName(), suggest, t.getCreatedAt());
    }

    static FinanceDto.Inbound toInbound(FinanceInbound i) {
        return new FinanceDto.Inbound(i.getId(), i.getSource(), i.getExternalId(), i.getStatus().name(), i.getMessage(),
            i.getCreatedAt(), i.getPayload(), i.getTransaction() == null ? null : i.getTransaction().getId());
    }
}
