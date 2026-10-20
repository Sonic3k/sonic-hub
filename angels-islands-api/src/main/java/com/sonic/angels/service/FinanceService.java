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
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
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

/** Accounts, facets and tags, rules, transactions, quick notes, balance check-ins and settings of the finance module. */
@Service
@Transactional
public class FinanceService {

    static final String BUDGET = "finance.budget.flexible";

    private final FinanceAccountRepository accountRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final FinanceFacetRepository facetRepo;
    private final FinanceRuleRepository ruleRepo;
    private final FinanceTransactionRepository txnRepo;
    private final FinanceInboundRepository inboundRepo;
    private final AppSettingRepository settingRepo;
    private final FinanceClassifier classifier;
    private final FinanceAiService ai;
    private final FinanceRateService rates;
    private final String sepayKey;

    public FinanceService(FinanceAccountRepository accountRepo, FinanceCategoryRepository categoryRepo, FinanceFacetRepository facetRepo,
                          FinanceRuleRepository ruleRepo, FinanceTransactionRepository txnRepo, FinanceInboundRepository inboundRepo,
                          AppSettingRepository settingRepo, FinanceClassifier classifier, FinanceAiService ai, FinanceRateService rates,
                          @Value("${finance.sepay.api-key:}") String sepayKey) {
        this.accountRepo = accountRepo; this.categoryRepo = categoryRepo; this.facetRepo = facetRepo; this.ruleRepo = ruleRepo; this.txnRepo = txnRepo;
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
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Enter an account name");
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
            throw new IllegalArgumentException("This account has transactions — archive it instead");
        for (FinanceRule r : ruleRepo.findByTransferAccountId(id)) { txnRepo.clearRule(r.getId()); ruleRepo.delete(r); }
        accountRepo.delete(a);
    }

    /**
     * "Chốt số dư": the balance seen in the bank or wallet app right now. On a RECONCILE account the difference
     * from the running balance becomes one "Chi chưa rõ" / "Thu chưa rõ" line; the first check-in only sets the start.
     */
    public FinanceDto.Account setBalance(UUID id, FinanceDto.BalanceRequest r) {
        FinanceAccount a = account(id);
        if (r == null || r.balance() == null) throw new IllegalArgumentException("Enter a balance");
        if (a.getMode() == FinanceAccount.Mode.POOL) throw new IllegalArgumentException("Cash doesn't need its balance set");
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
                t.setDescription("Balance adjustment" + (r.note() != null && !r.note().isBlank() ? " · " + r.note().trim() : ""));
                t = txnRepo.save(t);
                if (c != null) {
                    FinanceTags.replace(t, FinanceTags.MAIN, List.of(c), By.SYSTEM);
                    FinanceTags.settle(t);
                    t.setStatus(Status.OK);
                }
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
            if (!c.matches("[A-Z]{3}")) throw new IllegalArgumentException("Currency must be 3 letters, like VND or USD");
            a.setCurrency(c);
        }
        if (r.accountNumber() != null) {
            String n = r.accountNumber().replaceAll("\\s+", "");
            if (!n.isEmpty()) accountRepo.findFirstByAccountNumber(n).filter(o -> !o.getId().equals(a.getId())).ifPresent(o -> {
                throw new IllegalArgumentException("This account number already belongs to " + o.getName());
            });
            a.setAccountNumber(n.isEmpty() ? null : n);
        }
        if (r.color() != null) a.setColor(blankToNull(r.color()));
        if (r.sortOrder() != null) a.setSortOrder(r.sortOrder());
        if (r.archived() != null) a.setArchived(r.archived());
    }

    // ════════════════════════════════ facets and tags ════════════════════════════════

    @Transactional(readOnly = true)
    public List<FinanceDto.Facet> facets() {
        Map<UUID, Long> counts = new HashMap<>();
        UUID main = mainFacet().getId();
        for (FinanceCategory c : categoryRepo.findAll()) counts.merge(c.getFacet() == null ? main : c.getFacet().getId(), 1L, Long::sum);
        return facetRepo.findAllByOrderBySortOrderAscNameAsc().stream().map(f -> toFacet(f, counts.getOrDefault(f.getId(), 0L))).toList();
    }

    public FinanceDto.Facet createFacet(FinanceDto.FacetRequest r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Enter a section name");
        FinanceFacet f = new FinanceFacet();
        f.setName(r.name().trim());
        f.setIcon(blankToNull(r.icon()));
        f.setPerTransaction(Boolean.TRUE.equals(r.perTransaction()));
        f.setSortOrder(r.sortOrder() != null ? r.sortOrder()
            : facetRepo.findAll().stream().mapToInt(FinanceFacet::getSortOrder).max().orElse(0) + 10);
        String base = SlugUtil.slugify(f.getName()), code = base;
        for (int i = 2; facetRepo.existsByCode(code); i++) code = base + "-" + i;
        f.setCode(code);
        return toFacet(facetRepo.save(f), 0);
    }

    public FinanceDto.Facet updateFacet(UUID id, FinanceDto.FacetRequest r) {
        FinanceFacet f = facet(id);
        if (r.name() != null && !r.name().isBlank()) f.setName(r.name().trim());
        if (r.icon() != null) f.setIcon(blankToNull(r.icon()));
        if (r.sortOrder() != null) f.setSortOrder(r.sortOrder());
        if (r.perTransaction() != null && !f.isMain()) f.setPerTransaction(r.perTransaction());
        if (r.archived() != null) {
            if (f.isMain() && r.archived()) throw new IllegalArgumentException("The categories section can't be archived");
            f.setArchived(r.archived());
        }
        return toFacet(f, categoryRepo.countByFacetId(id));
    }

    /** Only an empty facet goes away; one with tags can be archived. */
    public void deleteFacet(UUID id) {
        FinanceFacet f = facet(id);
        if (f.isMain() || f.isSystem()) throw new IllegalArgumentException("This section can't be deleted");
        long n = categoryRepo.countByFacetId(id);
        if (n > 0) throw new IllegalArgumentException("This section still has " + n + (n == 1 ? " label — delete it" : " labels — delete them")
            + " first, or archive the section");
        facetRepo.delete(f);
    }

    @Transactional(readOnly = true)
    public List<FinanceDto.Category> categories() {
        return categoryRepo.findAllByOrderByKindAscSortOrderAscNameAsc().stream().map(FinanceService::toCategory).toList();
    }

    /**
     * A new tag (facetId absent: a category of the main facet). The same name again in the same facet gives back the
     * one that exists (brought back from the archive) — the quick "＋" on the Tiền page relies on it.
     */
    public FinanceDto.Category createCategory(FinanceDto.CategoryRequest r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Enter a label name");
        FinanceFacet f = r.facetId() != null ? facet(r.facetId()) : mainFacet();
        String key = FinanceText.normalize(r.name());
        for (FinanceCategory o : categoryRepo.findAll()) {
            boolean sameFacet = o.isMain() ? f.isMain() : o.getFacet().getId().equals(f.getId());
            if (sameFacet && FinanceText.normalize(o.getName()).equals(key)) { o.setArchived(false); return toCategory(o); }
        }
        FinanceCategory c = new FinanceCategory();
        c.setName(r.name().trim());
        c.setFacet(f);
        if (f.isMain()) {
            c.setKind(r.kind() == null ? FinanceCategory.Kind.EXPENSE : parseEnum(FinanceCategory.Kind.class, r.kind(), "kind"));
            if (c.getKind() == FinanceCategory.Kind.ANY) throw new IllegalArgumentException("A category must be spending or income");
            c.setBudgetGroup(c.getKind() == FinanceCategory.Kind.INCOME ? null
                : r.budgetGroup() == null ? FinanceCategory.BudgetGroup.FLEXIBLE : parseEnum(FinanceCategory.BudgetGroup.class, r.budgetGroup(), "budgetGroup"));
        } else {
            c.setKind(FinanceCategory.Kind.ANY);
            c.setBudgetGroup(null);
        }
        c.setIcon(blankToNull(r.icon()));
        c.setSortOrder(r.sortOrder() != null ? r.sortOrder() : 50);
        String base = SlugUtil.slugify(c.getName()), code = base;
        for (int i = 2; categoryRepo.existsByCode(code); i++) code = base + "-" + i;
        c.setCode(code);
        c = categoryRepo.save(c);
        if (r.impliesIds() != null) setImplies(c, r.impliesIds());
        return toCategory(c);
    }

    public FinanceDto.Category updateCategory(UUID id, FinanceDto.CategoryRequest r) {
        FinanceCategory c = category(id);
        if (r.name() != null && !r.name().isBlank()) c.setName(r.name().trim());
        if (r.icon() != null) c.setIcon(blankToNull(r.icon()));
        if (r.sortOrder() != null) c.setSortOrder(r.sortOrder());
        if (r.archived() != null) {
            if (c.isSystem() && r.archived()) throw new IllegalArgumentException("System categories can't be archived");
            c.setArchived(r.archived());
        }
        if (r.kind() != null && c.isMain()) {
            FinanceCategory.Kind k = parseEnum(FinanceCategory.Kind.class, r.kind(), "kind");
            if (k == FinanceCategory.Kind.ANY) throw new IllegalArgumentException("A category must be spending or income");
            if (k != c.getKind()) {
                if (c.isSystem()) throw new IllegalArgumentException("The kind of a system category can't be changed");
                c.setKind(k);
                if (k == FinanceCategory.Kind.INCOME) c.setBudgetGroup(null);
                else if (c.getBudgetGroup() == null) c.setBudgetGroup(FinanceCategory.BudgetGroup.FLEXIBLE);
            }
        }
        if (r.budgetGroup() != null && c.isMain() && c.getKind() == FinanceCategory.Kind.EXPENSE)
            c.setBudgetGroup(parseEnum(FinanceCategory.BudgetGroup.class, r.budgetGroup(), "budgetGroup"));
        if (r.impliesIds() != null) setImplies(c, r.impliesIds());
        return toCategory(c);
    }

    /** What a tag brings along changed: every line that carries it works its implied tags out again. */
    private void setImplies(FinanceCategory c, List<UUID> ids) {
        Set<UUID> want = new LinkedHashSet<>(ids);
        want.remove(c.getId());
        Set<UUID> have = new HashSet<>();
        c.getImplies().forEach(x -> have.add(x.getId()));
        if (have.equals(want)) return;
        c.getImplies().clear();
        for (UUID x : want) c.getImplies().add(category(x));
        for (FinanceTransaction t : txnRepo.withTag(c.getId())) FinanceTags.settleDecided(t);
    }

    /** The tag comes off every line (those left without a category go back to review) and every rule. */
    public void deleteCategory(UUID id) {
        FinanceCategory c = category(id);
        if (c.isSystem()) throw new IllegalArgumentException("System categories can't be deleted");
        Set<FinanceTransaction> lines = new LinkedHashSet<>(txnRepo.withTag(id));
        lines.addAll(txnRepo.findByCategoryId(id));
        for (FinanceTransaction t : lines) {
            if (t.getCategory() != null && t.getCategory().getId().equals(id)) t.setCategory(null);
            FinanceTags.remove(t, Set.of(id));
            FinanceTags.settle(t);
        }
        for (FinanceRule r : ruleRepo.withTag(id)) {
            r.getTags().removeIf(x -> x.getId().equals(id));
            if (r.getCategory() != null && r.getCategory().getId().equals(id)) r.setCategory(mainOf(r.getTags()));
            if (r.getTags().isEmpty() && r.getCategory() == null && r.getTransferAccount() == null) {
                txnRepo.clearRule(r.getId());
                ruleRepo.delete(r);
            }
        }
        for (FinanceCategory o : categoryRepo.implying(id)) o.getImplies().removeIf(x -> x.getId().equals(id));
        c.getImplies().clear();
        categoryRepo.delete(c);
    }

    /** The main-facet tag among these that does the counting (the same choice a line makes). */
    static FinanceCategory mainOf(java.util.Collection<FinanceCategory> tags) {
        return tags.stream().filter(FinanceCategory::isMain).min(Comparator
            .comparingInt((FinanceCategory c) -> c.getBudgetGroup() == FinanceCategory.BudgetGroup.SAVING ? 0
                : c.getBudgetGroup() == FinanceCategory.BudgetGroup.FIXED ? 1 : 2)
            .thenComparingInt(FinanceCategory::getSortOrder)).orElse(null);
    }

    // ════════════════════════════════ rules ════════════════════════════════

    @Transactional(readOnly = true)
    public List<FinanceDto.Rule> rules() { return ruleRepo.findAllByOrderByPriorityAscCreatedAtAsc().stream().map(FinanceService::toRule).toList(); }

    public FinanceDto.Rule createRule(FinanceDto.RuleRequest r) {
        FinanceRule rule = new FinanceRule();
        rule.setOrigin(FinanceRule.Origin.USER);
        rule.setPriority(10);
        fillRule(rule, r, true);
        if (r.priority() == null && FinanceClassifier.occasion(rule)) rule.setPriority(200);
        return toRule(ruleRepo.save(rule));
    }

    public FinanceDto.Rule updateRule(UUID id, FinanceDto.RuleRequest r) {
        FinanceRule rule = rule(id);
        fillRule(rule, r, false);
        return toRule(rule);
    }

    public void deleteRule(UUID id) {
        FinanceRule rule = rule(id);
        txnRepo.clearRule(id);
        ruleRepo.delete(rule);
    }

    /** Run all rules again over what still waits for review (after adding or editing rules). */
    public FinanceDto.Applied applyRules() {
        List<FinanceRule> rules = classifier.rules();
        int n = 0;
        for (FinanceTransaction t : txnRepo.findWithStatus(Status.REVIEW)) {
            if (t.getCategorizedBy() == By.USER || t.getKind() == Kind.TRANSFER) continue;
            String before = FinanceTags.signature(t);
            classifier.decide(t, classifier.fitting(t, rules));
            if (!before.equals(FinanceTags.signature(t))) n++;
        }
        return new FinanceDto.Applied(n);
    }

    /**
     * One rule over every line it fits, old ones and decided ones too — after giving it a new tag, or for an occasion
     * set up after the trip. Facets he chose himself and moves the system found stay as they are.
     */
    public FinanceDto.Applied applyRule(UUID id) {
        FinanceRule rule = rule(id);
        List<FinanceTransaction> lines;
        if (rule.hasDates()) {
            LocalDateTime from = rule.getFromDate() == null ? LocalDateTime.of(1970, 1, 1, 0, 0) : FinanceText.vnToUtc(rule.getFromDate().atStartOfDay());
            LocalDateTime to = rule.getToDate() == null ? LocalDateTime.of(9999, 1, 1, 0, 0) : FinanceText.vnToUtc(rule.getToDate().plusDays(1).atStartOfDay());
            lines = txnRepo.findInRange(from, to);
        } else lines = rule.isCounterpartyRule() ? txnRepo.withCounterparty() : txnRepo.allExcept(Source.SYSTEM);
        int n = 0;
        for (FinanceTransaction t : lines) {
            if (t.getSource() == Source.SYSTEM) continue;
            if (t.getKind() == Kind.TRANSFER && t.getCategorizedBy() == By.SYSTEM) continue;
            if (!classifier.fits(t, rule)) continue;
            String before = FinanceTags.signature(t);
            classifier.decide(t, List.of(rule));
            if (!before.equals(FinanceTags.signature(t))) n++;
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
        if (r.fromDate() != null) rule.setFromDate(parseDate(r.fromDate()));
        if (r.toDate() != null) rule.setToDate(parseDate(r.toDate()));
        if (rule.getFromDate() != null && rule.getToDate() != null && rule.getFromDate().isAfter(rule.getToDate()))
            throw new IllegalArgumentException("The start date is after the end date");
        if (!rule.isCounterpartyRule() && (r.keywords() != null || creating)) {
            boolean none = r.keywords() == null || FinanceText.keywords(r.keywords()).isEmpty();
            if (none && !rule.hasDates()) throw new IllegalArgumentException("A rule needs at least one keyword, a payee or a date range");
            rule.setKeywords(none ? "" : r.keywords().trim());
        }
        if (r.direction() != null) rule.setDirection(parseEnum(FinanceRule.Direction.class, r.direction(), "direction"));
        if (r.priority() != null) rule.setPriority(r.priority());
        if (r.active() != null) rule.setActive(r.active());
        if (r.transferAccountId() != null && r.categoryId() == null && (r.tagIds() == null || r.tagIds().isEmpty())) {
            rule.setTransferAccount(account(r.transferAccountId()));
            rule.setCategory(null);
            rule.getTags().clear();
        } else if (r.categoryId() != null || r.tagIds() != null) {
            List<FinanceCategory> tags = new ArrayList<>();
            if (r.categoryId() != null) tags.add(category(r.categoryId()));
            if (r.tagIds() != null) for (UUID x : r.tagIds()) if (tags.stream().noneMatch(c -> c.getId().equals(x))) tags.add(category(x));
            rule.getTags().clear();
            rule.getTags().addAll(tags);
            rule.setCategory(mainOf(tags));
            rule.setTransferAccount(null);
        }
        if (rule.givenTags().isEmpty() && rule.getTransferAccount() == null)
            throw new IllegalArgumentException("A rule needs at least one label or a target account");
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s.trim()); }
        catch (java.time.format.DateTimeParseException e) { throw new IllegalArgumentException("Invalid date: " + s); }
    }

    // ════════════════════════════════ transactions ════════════════════════════════

    /** month (2026-10) or from/to (Vietnam dates, inclusive); categoryId: lines carrying that tag, "none" = uncategorized. */
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
        if (r.accountId() == null) throw new IllegalArgumentException("Pick an account");
        if (r.amount() == null || r.amount().signum() == 0) throw new IllegalArgumentException("Enter an amount");
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
            if (r.amount().signum() == 0) throw new IllegalArgumentException("Enter an amount");
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
            List<FinanceCategory> give = target == null ? ruleTags(t, r) : List.of();
            FinanceCategory main = mainOf(give);
            if (target == null && main == null) throw new IllegalArgumentException("Pick a category before applying it to everything with this payee");
            assignCounterparty(new FinanceDto.AssignRequest(t.getCounterparty(), main == null ? null : main.getId(),
                target == null ? null : target.getId(), r.label(), give.stream().map(FinanceCategory::getId).toList()));
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
        if (t.getKind() != Kind.TRANSFER && t.getCategory() == null) throw new IllegalArgumentException("Pick a category first");
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

    /**
     * Tags put on (his) and taken off many lines at once — "everything that evening was with friends". A line that
     * gets a category this way is decided. Moves between own accounts carry no tags and are left out.
     */
    public FinanceDto.Applied tags(FinanceDto.TagsRequest r) {
        if (r.ids() == null || r.ids().isEmpty()) throw new IllegalArgumentException("Pick transactions first");
        List<FinanceCategory> add = r.add() == null ? List.of() : r.add().stream().distinct().map(this::category).toList();
        Set<UUID> remove = r.remove() == null ? Set.of() : new HashSet<>(r.remove());
        if (add.isEmpty() && remove.isEmpty()) throw new IllegalArgumentException("Pick a label");
        int n = 0;
        for (FinanceTransaction t : txnRepo.findAllByIdIn(r.ids())) {
            if (t.getKind() == Kind.TRANSFER || t.getSource() == Source.SYSTEM) continue;
            String before = FinanceTags.signature(t);
            if (!remove.isEmpty()) FinanceTags.remove(t, remove);
            if (!add.isEmpty()) FinanceTags.add(t, add, By.USER);
            FinanceTags.settleDecided(t);
            if (!before.equals(FinanceTags.signature(t))) n++;
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
        if (key.isEmpty()) throw new IllegalArgumentException("Enter a payee");
        if (r.categoryId() == null && r.transferAccountId() == null) throw new IllegalArgumentException("Pick a category or a target account");
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
            if (!c.isMain()) throw new IllegalArgumentException("Pick a category");
            rule.getTags().clear();
            rule.getTags().add(c);
            if (r.tagIds() != null) for (UUID x : r.tagIds()) if (!x.equals(c.getId())) rule.getTags().add(category(x));
            rule.setCategory(c);
            rule.setTransferAccount(null);
            rule.setDirection(c.getKind() == FinanceCategory.Kind.INCOME ? FinanceRule.Direction.IN : FinanceRule.Direction.ANY);
        } else {
            rule.setTransferAccount(account(r.transferAccountId()));
            rule.setCategory(null);
            rule.getTags().clear();
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
            if (t.getKind() == Kind.TRANSFER && t.getCategorizedBy() == By.SYSTEM) continue;
            if (!classifier.fits(t, rule)) continue;
            String before = FinanceTags.signature(t);
            classifier.decide(t, List.of(rule));
            if (!before.equals(FinanceTags.signature(t))) n++;
        }
        return new FinanceDto.Applied(n);
    }

    // ════════════════════════════════ quick notes ════════════════════════════════

    /** A note from the quick box. Default account: cash. No category given → rules, then the AI. */
    public FinanceDto.Txn note(FinanceDto.NoteRequest r) {
        if (r.amount() == null || r.amount().signum() == 0) throw new IllegalArgumentException("Enter an amount");
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
            classifier.setMain(t, category(r.categoryId()), By.USER);
            t.setStatus(Status.OK);
        } else if (!classifier.decide(t, classifier.fitting(t, classifier.rules()))) askAiAfterCommit(t);
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

    /**
     * What the request says the transaction is: a transfer; its tags (tagIds — each facet that changes becomes his,
     * and a line waiting for review whose category is sent is decided); one category (categoryId alone); or back to
     * plain spending/income. A MANUAL line nobody decided yet goes through the rules.
     */
    private void decide(FinanceTransaction t, FinanceDto.TxnRequest r) {
        if ("TRANSFER".equalsIgnoreCase(r.kind())) {
            if (r.transferAccountId() == null) throw new IllegalArgumentException("Pick a target account");
            FinanceAccount target = account(r.transferAccountId());
            if (target.getId().equals(t.getAccount().getId())) throw new IllegalArgumentException("Pick a different target account");
            classifier.breakTransfer(t);
            classifier.makeTransfer(t, target, By.USER);
        } else if (r.tagIds() != null) {
            if (t.getKind() == Kind.TRANSFER) {
                classifier.breakTransfer(t);
                t.setKind(t.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
            }
            List<FinanceCategory> want = new ArrayList<>();
            if (r.categoryId() != null) want.add(category(r.categoryId()));
            for (UUID x : r.tagIds()) if (want.stream().noneMatch(c -> c.getId().equals(x))) want.add(category(x));
            Map<String, List<FinanceCategory>> byFacet = new LinkedHashMap<>();
            for (FinanceCategory c : want) byFacet.computeIfAbsent(FinanceTags.facet(c), k -> new ArrayList<>()).add(c);
            Set<String> facets = new LinkedHashSet<>(byFacet.keySet());
            for (FinanceCategory c : FinanceTags.chosenTags(t)) facets.add(FinanceTags.facet(c));
            if (t.getCategory() != null) facets.add(FinanceTags.MAIN);
            boolean waiting = t.getStatus() == Status.REVIEW;
            for (String f : facets) {
                List<FinanceCategory> next = byFacet.getOrDefault(f, List.of());
                Set<UUID> now = new HashSet<>(), then = new HashSet<>();
                FinanceTags.chosen(t, f).forEach(x -> now.add(x.getTag().getId()));
                if (f.equals(FinanceTags.MAIN) && now.isEmpty() && t.getCategory() != null) now.add(t.getCategory().getId());
                next.forEach(c -> then.add(c.getId()));
                boolean confirm = f.equals(FinanceTags.MAIN) && waiting && !next.isEmpty();
                if (!now.equals(then) || confirm) FinanceTags.replace(t, f, next, By.USER);
            }
            FinanceTags.settleDecided(t);
            // a typed line with tags but no category yet still goes through the rules for one
            if (t.getCategory() == null && t.getSource() == Source.MANUAL && t.getStatus() == Status.REVIEW
                && !classifier.decide(t, classifier.fitting(t, classifier.rules()))) askAiAfterCommit(t);
        } else if (r.categoryId() != null) {
            if (t.getKind() == Kind.TRANSFER) classifier.breakTransfer(t);
            classifier.setMain(t, category(r.categoryId()), By.USER);
            t.setStatus(Status.OK);
        } else if (r.kind() != null && t.getKind() == Kind.TRANSFER) {
            Kind k = parseEnum(Kind.class, r.kind(), "kind");
            classifier.breakTransfer(t);
            t.setKind(k);
            t.setCategory(null);
            t.setCategorizedBy(null);
            t.getTags().clear();
            t.setStatus(Status.REVIEW);
        } else if (t.getSource() == Source.MANUAL && t.getStatus() == Status.REVIEW && t.getCategorizedBy() == null) {
            if (!classifier.decide(t, classifier.fitting(t, classifier.rules()))) askAiAfterCommit(t);
        }
    }

    /**
     * What a rule learned from this line gives: the tags sent for it, else the line's own tags — except those of
     * per-transaction facets (who it was with, the occasion), which are about that one time.
     */
    private List<FinanceCategory> ruleTags(FinanceTransaction t, FinanceDto.TxnRequest r) {
        if (r.ruleTagIds() != null) return r.ruleTagIds().stream().distinct().map(this::category).toList();
        List<FinanceCategory> out = new ArrayList<>(FinanceTags.chosenTags(t).stream()
            .filter(c -> c.isMain() || !c.getFacet().isPerTransaction()).toList());
        if (out.isEmpty() && t.getCategory() != null) out.add(t.getCategory());
        return out;
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
            if (target == null) throw new IllegalArgumentException("Pick a target account");
            rule.setTransferAccount(target);
        } else {
            List<FinanceCategory> give = ruleTags(t, r);
            if (mainOf(give) == null) throw new IllegalArgumentException("Pick a category before remembering these words");
            rule.getTags().addAll(give);
            rule.setCategory(mainOf(give));
        }
        rule.setHits(1);
        rule = ruleRepo.save(rule);
        t.setMatchedRule(rule);
        for (FinanceTransaction other : txnRepo.findWithStatus(Status.REVIEW)) {
            if (other.getId().equals(t.getId()) || other.getCategorizedBy() == By.USER || other.getKind() == Kind.TRANSFER) continue;
            if (classifier.fits(other, rule)) classifier.decide(other, List.of(rule));
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
            .orElseThrow(() -> new IllegalArgumentException("Add an account first"));
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
            else if (categoryId != null && !categoryId.isBlank()) {
                UUID tagId = UUID.fromString(categoryId);
                Subquery<UUID> tagged = query.subquery(UUID.class);
                Root<FinanceTxnTag> x = tagged.from(FinanceTxnTag.class);
                tagged.select(x.get("id")).where(cb.equal(x.get("transaction"), root), cb.equal(x.get("tag").get("id"), tagId));
                ps.add(cb.or(cb.equal(root.get("category").get("id"), tagId), cb.exists(tagged)));
            }
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
    private FinanceFacet facet(UUID id) { return facetRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Facet not found: " + id)); }
    private FinanceRule rule(UUID id) { return ruleRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Rule not found: " + id)); }

    /** The facet of the classic categories (made at start by the seeder). */
    private FinanceFacet mainFacet() {
        return facetRepo.findFirstByMainTrue().orElseThrow(() -> new IllegalStateException("Main facet missing"));
    }
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

    static FinanceDto.Facet toFacet(FinanceFacet f, long tagCount) {
        return new FinanceDto.Facet(f.getId(), f.getCode(), f.getName(), f.getIcon(), f.getSortOrder(), f.isMain(), f.isPerTransaction(),
            f.isSystem(), f.isArchived(), tagCount);
    }

    static FinanceDto.Category toCategory(FinanceCategory c) {
        return new FinanceDto.Category(c.getId(), c.getCode(), c.getName(), c.getIcon(), c.getKind().name(),
            c.getBudgetGroup() == null ? null : c.getBudgetGroup().name(), c.getSortOrder(), c.isSystem(), c.isArchived(),
            c.getFacet() == null ? null : c.getFacet().getId(), c.getImplies().stream().map(FinanceCategory::getId).toList());
    }

    static FinanceDto.TagRef toTag(FinanceCategory c, By by) {
        return new FinanceDto.TagRef(c.getId(), c.getName(), c.getIcon(), c.getFacet() == null ? null : c.getFacet().getId(), c.isMain(),
            by == null ? null : by.name());
    }

    /** Main facet first (the one that counts leading), then facet by facet. */
    private static final Comparator<FinanceCategory> TAG_ORDER = Comparator
        .comparingInt((FinanceCategory c) -> c.isMain() ? Integer.MIN_VALUE : c.getFacet().getSortOrder())
        .thenComparingInt(FinanceCategory::getSortOrder).thenComparing(FinanceCategory::getName);

    static FinanceDto.Rule toRule(FinanceRule r) {
        FinanceCategory c = r.getCategory();
        FinanceAccount a = r.getTransferAccount();
        return new FinanceDto.Rule(r.getId(), r.getKeywords(), r.getDirection().name(),
            c == null ? null : c.getId(), c == null ? null : c.getName(), c == null ? null : c.getIcon(),
            a == null ? null : a.getId(), a == null ? null : a.getName(), r.getPriority(), r.getOrigin().name(), r.getHits(), r.isActive(),
            r.getCounterpartyName(), r.getCounterpartyAccount(), r.getLabel(),
            r.givenTags().stream().sorted(TAG_ORDER).map(x -> toTag(x, null)).toList(), r.getFromDate(), r.getToDate());
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
            peer == null ? null : peer.getId(), peer == null ? null : peer.getAccount().getName(), suggest, t.getCreatedAt(), tagsOf(t));
    }

    /** The line's tags for the UIs: the one that counts first, then facet by facet. */
    static List<FinanceDto.TagRef> tagsOf(FinanceTransaction t) {
        if (t.getKind() == Kind.TRANSFER) return List.of();
        UUID primary = t.getCategory() == null ? null : t.getCategory().getId();
        List<FinanceTxnTag> tags = new ArrayList<>(t.getTags());
        if (primary != null && tags.stream().noneMatch(x -> x.getTag().getId().equals(primary)))    // from before tags existed
            return List.of(toTag(t.getCategory(), t.getCategorizedBy()));
        tags.sort(Comparator.comparing((FinanceTxnTag x) -> !x.getTag().getId().equals(primary))
            .thenComparing(FinanceTxnTag::getTag, TAG_ORDER));
        return tags.stream().map(x -> toTag(x.getTag(), x.getDecidedBy())).toList();
    }

    static FinanceDto.Inbound toInbound(FinanceInbound i) {
        return new FinanceDto.Inbound(i.getId(), i.getSource(), i.getExternalId(), i.getStatus().name(), i.getMessage(),
            i.getCreatedAt(), i.getPayload(), i.getTransaction() == null ? null : i.getTransaction().getId());
    }
}
