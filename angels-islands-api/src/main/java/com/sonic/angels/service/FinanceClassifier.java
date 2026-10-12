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
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * Decides what a transaction is, in this order: the other half of a move between own accounts, a rule,
 * one of my account numbers in the text — and otherwise it waits for review (and the AI gets a look).
 * Also keeps running balances right (the ledger part): every add, change and removal goes through here.
 * Callers run inside a transaction.
 */
@Service
public class FinanceClassifier {

    private static final Set<Source> FEEDS = Set.of(Source.SEPAY, Source.EMAIL);
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
        FinanceRule rule = match(t, rules());
        if (rule != null) { apply(t, rule); return false; }
        FinanceAccount own = ownAccountMentioned(t);
        if (own != null) { makeTransfer(t, own, By.SYSTEM); return false; }
        t.setKind(t.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
        t.setStatus(Status.REVIEW);
        return true;
    }

    public List<FinanceRule> rules() { return ruleRepo.findAllByOrderByPriorityAscCreatedAtAsc(); }

    /** First active rule whose words appear in the transaction, honouring direction. */
    public FinanceRule match(FinanceTransaction t, List<FinanceRule> rules) {
        String text = FinanceText.padded(t.searchableText());
        if (text.isBlank()) return null;
        boolean out = t.getAmount().signum() < 0;
        for (FinanceRule r : rules) {
            if (!r.isActive()) continue;
            if (r.getDirection() == FinanceRule.Direction.IN && out) continue;
            if (r.getDirection() == FinanceRule.Direction.OUT && !out) continue;
            if (r.getCategory() == null && r.getTransferAccount() == null) continue;
            if (r.getTransferAccount() != null && r.getTransferAccount().getId().equals(t.getAccount().getId())) continue;
            if (FinanceText.matchesAny(text, FinanceText.keywords(r.getKeywords()))) return r;
        }
        return null;
    }

    public void apply(FinanceTransaction t, FinanceRule r) {
        r.setHits(r.getHits() + 1);
        t.setMatchedRule(r);
        if (r.getTransferAccount() != null) {
            makeTransfer(t, r.getTransferAccount(), By.RULE);
        } else {
            setCategory(t, r.getCategory(), By.RULE);
            t.setStatus(Status.OK);
        }
    }

    public void setCategory(FinanceTransaction t, FinanceCategory c, By by) {
        t.setCategory(c);
        t.setKind(c.getKind() == FinanceCategory.Kind.INCOME ? Kind.INCOME : Kind.EXPENSE);
        t.setCategorizedBy(by);
    }

    /**
     * Money moved to (or from) another own account. When that account has no feed of its own, its side is written
     * here (a mirror), so its running balance and the cash pool stay right; a feed account brings its own side later.
     */
    public void makeTransfer(FinanceTransaction t, FinanceAccount target, By by) {
        t.setKind(Kind.TRANSFER);
        t.setCategory(null);
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
            x.setStatus(Status.OK);
            x.setCategorizedBy(By.SYSTEM);
        }
        t.setTransferPeer(best);
        best.setTransferPeer(t);
        return true;
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

    /** A transaction now counts on its account. */
    public void added(FinanceTransaction t) {
        FinanceAccount a = t.getAccount();
        if (a.getMode() == FinanceAccount.Mode.FEED) {
            if (t.getBalanceAfter() != null && (a.getBalanceAt() == null || !t.getOccurredAt().isBefore(a.getBalanceAt()))) {
                a.setBalance(t.getBalanceAfter());
                a.setBalanceAt(t.getOccurredAt());
            }
        } else if (a.getMode() == FinanceAccount.Mode.RECONCILE && a.getBalance() != null) {
            a.setBalance(a.getBalance().add(t.getAmount()));
        }
    }

    /** A transaction no longer counts (deleted, or about to move/change amount). */
    public void removed(FinanceTransaction t) {
        FinanceAccount a = t.getAccount();
        if (a.getMode() == FinanceAccount.Mode.RECONCILE && a.getBalance() != null) {
            a.setBalance(a.getBalance().subtract(t.getAmount()));
        }
    }
}
