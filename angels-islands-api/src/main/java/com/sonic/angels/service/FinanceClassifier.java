package com.sonic.angels.service;

import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceRule;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.By;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Source;
import com.sonic.angels.model.entity.FinanceTransaction.Status;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceRuleRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.FinanceText;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

/**
 * Decides what a transaction is, in this order: the other half of a move between own accounts, money to one of my
 * own account numbers (the statement's counterparty), the rules, one of my account numbers in the text — and otherwise
 * it waits for review (and the AI gets a look). The rules decide facet by facet: the first fitting rule that is a move
 * or has a main-facet tag says what the line is; every other facet takes the tags of the first fitting rule that has
 * some there. A facet whose tags Ngọc Anh chose himself is never touched by a rule.
 * Also keeps running balances right (the ledger part): every add, change and removal goes through here.
 * Callers run inside a transaction.
 */
@Service
public class FinanceClassifier {

    private static final Set<Source> FEEDS = Set.of(Source.SEPAY, Source.EMAIL, Source.STATEMENT);
    private static final Duration PAIR_WINDOW = Duration.ofMinutes(90);

    private final FinanceRuleRepository ruleRepo;
    private final FinanceTransactionRepository txnRepo;
    private final FinanceAccountRepository accountRepo;

    public FinanceClassifier(FinanceRuleRepository ruleRepo, FinanceTransactionRepository txnRepo, FinanceAccountRepository accountRepo) {
        this.ruleRepo = ruleRepo; this.txnRepo = txnRepo; this.accountRepo = accountRepo;
    }

    /** A saved transaction that nobody has decided on yet. Returns true when the AI should guess its category. */
    public boolean classify(FinanceTransaction t) {
        if (FEEDS.contains(t.getSource()) && pairWithExisting(t)) return false;
        FinanceAccount mine = ownAccountByCounterparty(t);
        if (mine != null) { makeTransfer(t, mine, By.SYSTEM); return false; }
        if (decide(t, fitting(t, rules()))) return false;
        FinanceAccount own = ownAccountMentioned(t);
        if (own != null) { makeTransfer(t, own, By.SYSTEM); return false; }
        FinanceTags.settle(t);                 // waits for review — with whatever tags rules gave its other facets
        t.setStatus(Status.REVIEW);
        return true;
    }

    public List<FinanceRule> rules() { return ruleRepo.findAllByOrderByPriorityAscCreatedAtAsc(); }

    /** Every active rule that fits the line, in priority order. */
    public List<FinanceRule> fitting(FinanceTransaction t, List<FinanceRule> rules) {
        return rules.stream().filter(r -> fits(t, r)).toList();
    }

    /**
     * Does this rule speak about this line? Direction first; then the counterparty (a counterparty rule), the words
     * (in the memo, bank line or counterparty), and the days (an occasion) — whichever the rule has, all of them.
     */
    public boolean fits(FinanceTransaction t, FinanceRule r) {
        if (!r.isActive()) return false;
        boolean out = t.getAmount().signum() < 0;
        if (r.getDirection() == FinanceRule.Direction.IN && out) return false;
        if (r.getDirection() == FinanceRule.Direction.OUT && !out) return false;
        if (r.givenTags().isEmpty() && r.getTransferAccount() == null) return false;
        if (r.getTransferAccount() != null && r.getTransferAccount().getId().equals(t.getAccount().getId())) return false;
        if (r.hasDates()) {
            LocalDate d = FinanceText.utcToVn(t.getOccurredAt()).toLocalDate();
            if (r.getFromDate() != null && d.isBefore(r.getFromDate())) return false;
            if (r.getToDate() != null && d.isAfter(r.getToDate())) return false;
        }
        if (r.isCounterpartyRule()) {
            String who = FinanceText.counterpartyKey(t.getCounterparty());
            if (who.isEmpty() || !who.equals(FinanceText.counterpartyKey(r.getCounterpartyName()))) return false;
            String acc = r.getCounterpartyAccount();
            return acc == null || acc.isBlank() || acc.equals(t.getCounterpartyAccount());
        }
        if (r.hasKeywords()) {
            String text = FinanceText.padded(t.searchableText());
            return !text.isBlank() && FinanceText.matchesAny(text, FinanceText.keywords(r.getKeywords()));
        }
        return r.hasDates();
    }

    /** Would these rules say what the line is (a move, or a main-facet tag)? */
    public boolean decides(List<FinanceRule> fitting) {
        return fitting.stream().anyMatch(r -> r.getTransferAccount() != null || r.givenTags().stream().anyMatch(FinanceCategory::isMain));
    }

    /**
     * The rules' word on a line (see the class comment). Facets he chose himself stay; a move the system found
     * itself stays (callers leave those out). An occasion — a rule of days only — leaves bills and savings alone.
     * Returns whether the rules said what the line is: it is a move now, or its main facet came from a rule.
     */
    public boolean decide(FinanceTransaction t, List<FinanceRule> fitting) {
        if (fitting.isEmpty()) return false;
        boolean mainHis = t.getKind() == Kind.TRANSFER ? t.getCategorizedBy() == By.USER : FinanceTags.his(t, FinanceTags.MAIN);
        FinanceRule head = fitting.stream()
            .filter(r -> r.getTransferAccount() != null || r.givenTags().stream().anyMatch(FinanceCategory::isMain))
            .findFirst().orElse(null);
        List<FinanceRule> used = new ArrayList<>();
        boolean decided = false;
        if (head != null && !mainHis) {
            if (head.getTransferAccount() != null) {
                boolean same = t.getKind() == Kind.TRANSFER && t.getTransferPeer() != null
                    && t.getTransferPeer().getAccount().getId().equals(head.getTransferAccount().getId());
                if (!same) {
                    if (t.getKind() == Kind.TRANSFER) breakTransfer(t);
                    makeTransfer(t, head.getTransferAccount(), By.RULE);
                }
                t.setMatchedRule(head);
                head.setHits(head.getHits() + 1);
                relabelBy(t, List.of(head));
                return true;
            }
            if (t.getKind() == Kind.TRANSFER) { breakTransfer(t); t.setKind(t.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME); }
            FinanceTags.replace(t, FinanceTags.MAIN, head.givenTags(), By.RULE);
            t.setMatchedRule(head);
            used.add(head);
            decided = true;
        }
        if (t.getKind() == Kind.TRANSFER) return false;          // a move carries no tags
        FinanceTags.settle(t);
        Map<String, FinanceRule> byFacet = new LinkedHashMap<>();
        for (FinanceRule r : fitting) {
            if (r.getTransferAccount() != null) continue;
            for (FinanceCategory c : r.givenTags()) if (!c.isMain()) byFacet.putIfAbsent(FinanceTags.facet(c), r);
        }
        FinanceCategory.BudgetGroup group = t.getCategory() == null ? null : t.getCategory().getBudgetGroup();
        boolean billOrSaving = group == FinanceCategory.BudgetGroup.FIXED || group == FinanceCategory.BudgetGroup.SAVING;
        for (Map.Entry<String, FinanceRule> e : byFacet.entrySet()) {
            FinanceRule r = e.getValue();
            if (FinanceTags.his(t, e.getKey())) continue;
            if (billOrSaving && occasion(r)) continue;
            FinanceTags.replace(t, e.getKey(), r.givenTags(), By.RULE);
            if (!used.contains(r)) used.add(r);
        }
        for (FinanceRule r : used) r.setHits(r.getHits() + 1);
        relabelBy(t, used);
        if (decided) FinanceTags.settleDecided(t); else FinanceTags.settle(t);
        return decided;
    }

    /** A rule of days only: "everything 12–15/11 is the trip". */
    static boolean occasion(FinanceRule r) { return r.hasDates() && !r.hasKeywords() && !r.isCounterpartyRule(); }

    /** The first of these rules that names its lines ("Tiền nhà") names this one. */
    private static void relabelBy(FinanceTransaction t, List<FinanceRule> rules) {
        for (FinanceRule r : rules) {
            if (r.getLabel() != null && !r.getLabel().isBlank()) { relabel(t, r.getLabel().trim()); return; }
        }
    }

    /** The rule's name for it becomes the description; the bank's words stay as the bank line. */
    public static void relabel(FinanceTransaction t, String label) {
        if (label.equals(t.getDescription())) return;
        if (t.getBankDescription() == null || t.getBankDescription().isBlank()) t.setBankDescription(t.getDescription());
        t.setDescription(label);
    }

    /** The main facet becomes this one category — the classic one-category decision. */
    public void setMain(FinanceTransaction t, FinanceCategory c, By by) {
        if (t.getKind() == Kind.TRANSFER) t.setKind(t.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
        FinanceTags.replace(t, FinanceTags.MAIN, List.of(c), by);
        FinanceTags.settle(t);
    }

    /**
     * Money moved to (or from) another own account. When that account has no feed of its own, its side is written
     * here (a mirror), so its running balance and the cash pool stay right; a feed account brings its own side later.
     */
    public void makeTransfer(FinanceTransaction t, FinanceAccount target, By by) {
        t.setKind(Kind.TRANSFER);
        t.setCategory(null);
        t.getTags().clear();
        t.setStatus(Status.OK);
        t.setCategorizedBy(by);
        if (target.getMode() == FinanceAccount.Mode.FEED) return;
        if (!target.getCurrency().equalsIgnoreCase(t.getAccount().getCurrency())) return;
        FinanceTransaction m = new FinanceTransaction();
        m.setAccount(target);
        m.setAmount(t.getAmount().negate());
        m.setOccurredAt(t.getOccurredAt());
        m.setKind(Kind.TRANSFER);
        m.setDescription(t.getDescription());
        m.setSource(Source.SYSTEM);
        m.setStatus(Status.OK);
        m.setCategorizedBy(By.SYSTEM);
        m.setTransferPeer(t);
        m = txnRepo.save(m);
        t.setTransferPeer(m);
        added(m);
    }

    /** Undo a transfer: the mirror goes away, a real other half goes back to waiting for review. */
    public void breakTransfer(FinanceTransaction t) {
        FinanceTransaction peer = t.getTransferPeer();
        t.setTransferPeer(null);
        if (peer == null) return;
        peer.setTransferPeer(null);
        if (peer.getSource() == Source.SYSTEM) {
            removed(peer);
            txnRepo.unlinkPeer(peer.getId());
            txnRepo.delete(peer);
        } else {
            peer.setKind(peer.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
            peer.setStatus(Status.REVIEW);
            peer.setCategorizedBy(null);
        }
    }

    /** Pair with a feed transaction of the same size and opposite sign on another feed account, close in time. */
    private boolean pairWithExisting(FinanceTransaction t) {
        BigDecimal opposite = t.getAmount().negate();
        List<FinanceTransaction> candidates = txnRepo.transferCandidates(t.getId(), t.getAccount().getId(), opposite,
            t.getOccurredAt().minus(PAIR_WINDOW), t.getOccurredAt().plus(PAIR_WINDOW));
        FinanceTransaction best = candidates.stream()
            .filter(c -> FEEDS.contains(c.getSource()) && c.getAccount().getMode() == FinanceAccount.Mode.FEED)
            .filter(c -> c.getKind() == Kind.TRANSFER || c.getCategorizedBy() != By.USER)
            .min(Comparator.comparing(c -> Duration.between(c.getOccurredAt(), t.getOccurredAt()).abs()))
            .orElse(null);
        if (best == null) return false;
        for (FinanceTransaction x : List.of(t, best)) {
            x.setKind(Kind.TRANSFER);
            x.setCategory(null);
            x.getTags().clear();
            x.setStatus(Status.OK);
            x.setCategorizedBy(By.SYSTEM);
        }
        t.setTransferPeer(best);
        best.setTransferPeer(t);
        return true;
    }

    /** The statement says the other account is one of mine. */
    private FinanceAccount ownAccountByCounterparty(FinanceTransaction t) {
        String n = t.getCounterpartyAccount();
        if (n == null || n.isBlank()) return null;
        return accountRepo.findFirstByAccountNumber(n.trim())
            .filter(a -> !a.isArchived() && !a.getId().equals(t.getAccount().getId()))
            .orElse(null);
    }

    /** One of my other account numbers in the memo or bank line means money went there. */
    private FinanceAccount ownAccountMentioned(FinanceTransaction t) {
        String text = t.searchableText().replaceAll("\\s+", "");
        if (text.isEmpty()) return null;
        for (FinanceAccount a : accountRepo.findAll()) {
            String n = a.getAccountNumber();
            if (a.isArchived() || n == null || n.length() < 6 || a.getId().equals(t.getAccount().getId())) continue;
            if (text.contains(n)) return a;
        }
        return null;
    }

    // ── running balances ──

    /**
     * A transaction now counts on its account. On a check-in account only what happened after the last check-in
     * moves the balance — the check-in already contains everything before it (old statement lines, back-dated notes).
     */
    public void added(FinanceTransaction t) {
        FinanceAccount a = t.getAccount();
        if (a.getMode() == FinanceAccount.Mode.FEED) {
            if (t.getBalanceAfter() != null && (a.getBalanceAt() == null || !t.getOccurredAt().isBefore(a.getBalanceAt()))) {
                a.setBalance(t.getBalanceAfter());
                a.setBalanceAt(t.getOccurredAt());
            }
        } else if (afterCheckIn(a, t)) {
            a.setBalance(a.getBalance().add(t.getAmount()));
        }
    }

    /** A transaction no longer counts (deleted, or about to move/change amount). */
    public void removed(FinanceTransaction t) {
        FinanceAccount a = t.getAccount();
        if (afterCheckIn(a, t)) a.setBalance(a.getBalance().subtract(t.getAmount()));
    }

    private static boolean afterCheckIn(FinanceAccount a, FinanceTransaction t) {
        return a.getMode() == FinanceAccount.Mode.RECONCILE && a.getBalance() != null
            && (a.getBalanceAt() == null || t.getOccurredAt().isAfter(a.getBalanceAt()));
    }
}
