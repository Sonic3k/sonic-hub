package com.sonic.angels.service;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceRule;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.By;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Source;
import com.sonic.angels.model.entity.FinanceTransaction.Status;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.BankStatementParser;
import com.sonic.angels.util.BankStatementParser.Row;
import com.sonic.angels.util.FinanceText;
import com.sonic.angels.util.XlsxReader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * A bank statement (the .xlsx the bank's app exports) into the ledger. Each row is either a line the bank feed
 * already brought — matched by the bank's transaction code and amount, it gets the counterparty the feed did not
 * have — or a new line (history from before the feed, or something the feed missed). Importing the same file
 * again changes nothing: a row is already here when a line with its bank code and amount is a few days from it. The
 * statement says who the other side was, so counterparty rules decide most lines; a line an earlier statement brought
 * without it (one converted from a PDF, which leaves the names out) gets it too.
 */
@Service
@Transactional
public class FinanceStatementService {

    /** How far apart two statements may date the same row (a day apart has been seen). */
    private static final Duration SAME_ROW = Duration.ofDays(3);

    private final FinanceAccountRepository accountRepo;
    private final FinanceTransactionRepository txnRepo;
    private final FinanceClassifier classifier;

    public FinanceStatementService(FinanceAccountRepository accountRepo, FinanceTransactionRepository txnRepo, FinanceClassifier classifier) {
        this.accountRepo = accountRepo; this.txnRepo = txnRepo; this.classifier = classifier;
    }

    /** What importing would do; nothing is written. */
    @Transactional(readOnly = true)
    public FinanceDto.ImportSummary preview(MultipartFile file, UUID accountId) { return run(read(file), accountId, false); }

    public FinanceDto.ImportSummary commit(MultipartFile file, UUID accountId) { return run(read(file), accountId, true); }

    private BankStatementParser.Statement read(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Pick a statement file (.xlsx)");
        try (InputStream in = file.getInputStream()) {
            BankStatementParser.Statement st = BankStatementParser.parse(XlsxReader.firstSheet(in));
            if (st.rows().isEmpty()) throw new IllegalArgumentException("The statement has no transactions");
            return st;
        } catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage() == null ? "Couldn't read the file" : e.getMessage());
        }
    }

    private FinanceDto.ImportSummary run(BankStatementParser.Statement st, UUID accountId, boolean commit) {
        String number = st.accountNumber();
        FinanceAccount account = resolve(number, accountId);
        if (commit && number != null && (account.getAccountNumber() == null || account.getAccountNumber().isBlank()))
            account.setAccountNumber(number);
        String accountKey = number != null ? number : account.getId().toString();

        List<Row> rows = new ArrayList<>(st.rows());
        rows.sort(Comparator.comparing(Row::occurredAtVn).thenComparing(Comparator.comparingInt(Row::line).reversed()));
        LocalDateTime from = FinanceText.vnToUtc(rows.get(0).occurredAtVn());
        LocalDateTime to = FinanceText.vnToUtc(rows.get(rows.size() - 1).occurredAtVn());

        // what the bank feed already brought, by (code, amount), oldest first; and what earlier statements brought
        Map<String, Deque<FinanceTransaction>> feed = new HashMap<>();
        Map<String, List<FinanceTransaction>> earlier = new HashMap<>();
        for (FinanceTransaction t : txnRepo.withReference(account.getId(), from.minusDays(3), to.plusDays(3))) {
            if (t.getSource() == Source.STATEMENT) earlier.computeIfAbsent(key(t.getReferenceCode(), t.getAmount()), k -> new ArrayList<>()).add(t);
            if (t.getSource() != Source.SEPAY && t.getSource() != Source.EMAIL) continue;
            feed.computeIfAbsent(key(t.getReferenceCode(), t.getAmount()), k -> new ArrayDeque<>()).add(t);
        }
        feed.values().forEach(d -> {
            List<FinanceTransaction> l = new ArrayList<>(d);
            l.sort(Comparator.comparing(FinanceTransaction::getOccurredAt));
            d.clear(); d.addAll(l);
        });

        List<FinanceRule> rules = classifier.rules();
        Map<String, Integer> seen = new HashMap<>();
        int matched = 0, enriched = 0, created = 0, already = 0, alreadyEnriched = 0, withCp = 0, categorized = 0, waiting = 0;
        for (Row row : rows) {
            String k = key(row.reference(), row.amount());
            int dup = seen.merge(k, 1, Integer::sum) - 1;
            String who = FinanceText.cleanCounterparty(row.counterpartyName());
            if (who == null) who = FinanceText.cardMerchant(row.description());
            String whoAccount = FinanceText.middleman(row.counterpartyName()) ? null : trim(row.counterpartyAccount(), 64);
            if (who != null) withCp++;

            Deque<FinanceTransaction> fromFeed = feed.get(k);
            FinanceTransaction t = fromFeed == null ? null : fromFeed.pollFirst();
            if (t != null) {
                matched++;
                if (fillIn(t, who, whoAccount, commit, rules)) enriched++;
                if (t.getStatus() == Status.OK) categorized++; else waiting++;
                continue;
            }

            // an earlier statement brought this row: same code and amount, a few days apart at most
            FinanceTransaction before = closest(earlier.get(k), FinanceText.vnToUtc(row.occurredAtVn()));
            if (before != null) {
                already++;
                // that statement may not have named the other side (one converted from a PDF): this one does
                if (fillIn(before, who, whoAccount, commit, rules)) {
                    alreadyEnriched++;
                    boolean decided = commit ? before.getStatus() == Status.OK
                        : before.getStatus() == Status.OK || decidable(withOtherSide(before, who, whoAccount), rules);
                    if (decided) categorized++; else waiting++;
                }
                continue;
            }
            String externalId = "stmt:" + accountKey + ":" + row.reference() + ":" + plain(row.amount()) + (dup > 0 ? ":" + dup : "");
            // the bank uses some codes again and again (a yearly card fee, the same amount each year): when a row of
            // another day has the id, this one is told apart by its date
            if (txnRepo.existsByExternalId(externalId)) externalId += "@" + row.occurredAtVn().toLocalDate();
            if (txnRepo.existsByExternalId(externalId)) { already++; continue; }
            created++;
            FinanceTransaction n = new FinanceTransaction();
            n.setAccount(account);
            n.setOccurredAt(FinanceText.vnToUtc(row.occurredAtVn()));
            n.setAmount(row.amount());
            n.setBankDescription(row.description());
            n.setCounterparty(who);
            n.setCounterpartyAccount(whoAccount);
            n.setReferenceCode(trim(row.reference(), 100));
            n.setBalanceAfter(row.balance());
            n.setExternalId(externalId);
            n.setSource(Source.STATEMENT);
            n.setStatus(Status.REVIEW);
            n.setKind(row.amount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
            if (commit) {
                n = txnRepo.save(n);
                if (account.getMode() != FinanceAccount.Mode.FEED) classifier.added(n);
                classifier.classify(n);
                if (n.getStatus() == Status.OK) categorized++; else waiting++;
            } else if (decidable(n, rules)) categorized++;
            else waiting++;
        }
        if (commit && account.getMode() == FinanceAccount.Mode.FEED) latestBalance(account, st.rows());
        return new FinanceDto.ImportSummary(st.bank(), number, account.getId(), account.getName(), st.period(), from, to,
            rows.size(), matched, enriched, created, already, alreadyEnriched, withCp, categorized, waiting, st.skipped(), commit);
    }

    /**
     * The statement names the other side of a line already here (the bank feed's, or an earlier statement's): the line
     * takes the name and account, and what he did not decide himself is decided again. False when it says nothing new.
     */
    private boolean fillIn(FinanceTransaction t, String who, String whoAccount, boolean commit, List<FinanceRule> rules) {
        boolean newWho = who != null && !FinanceText.counterpartyKey(who).equals(FinanceText.counterpartyKey(t.getCounterparty()));
        boolean newAccount = whoAccount != null && !whoAccount.equals(t.getCounterpartyAccount());
        if (!newWho && !newAccount) return false;
        if (commit) {
            if (who != null) t.setCounterparty(who);
            if (whoAccount != null) t.setCounterpartyAccount(whoAccount);
            if (t.getStatus() == Status.REVIEW || t.getCategorizedBy() == By.RULE || t.getCategorizedBy() == By.AI) redo(t, rules);
        }
        return true;
    }

    /**
     * Of the lines an earlier statement made with this code and amount, the one closest in time, a few days apart at
     * most (one statement can date a line a day off another); it is taken, so a repeated code is matched once.
     */
    private static FinanceTransaction closest(List<FinanceTransaction> lines, LocalDateTime at) {
        if (lines == null) return null;
        FinanceTransaction best = lines.stream()
            .filter(t -> Duration.between(t.getOccurredAt(), at).abs().compareTo(SAME_ROW) <= 0)
            .min(Comparator.comparing(t -> Duration.between(t.getOccurredAt(), at).abs())).orElse(null);
        if (best != null) lines.remove(best);
        return best;
    }

    /** Preview only: the line as it would be with the other side's name, to ask the rules without changing it. */
    private static FinanceTransaction withOtherSide(FinanceTransaction t, String who, String whoAccount) {
        FinanceTransaction c = new FinanceTransaction();
        c.setAccount(t.getAccount());
        c.setAmount(t.getAmount());
        c.setOccurredAt(t.getOccurredAt());
        c.setDescription(t.getDescription());
        c.setBankDescription(t.getBankDescription());
        c.setCounterparty(who != null ? who : t.getCounterparty());
        c.setCounterpartyAccount(whoAccount != null ? whoAccount : t.getCounterpartyAccount());
        return c;
    }

    /**
     * A feed account's balance is the bank's own figure, so it comes from the statement's latest posting — the row the
     * bank lists at the newest end — not from row times (a card line's time can be later than lines posted after it).
     * It only replaces what the feed said if it is newer.
     */
    private static void latestBalance(FinanceAccount account, List<Row> fileOrder) {
        Row first = fileOrder.get(0), last = fileOrder.get(fileOrder.size() - 1);
        Row newest = first.occurredAtVn().toLocalDate().isBefore(last.occurredAtVn().toLocalDate()) ? last : first;
        LocalDateTime at = FinanceText.vnToUtc(newest.occurredAtVn());
        if (newest.balance() != null && (account.getBalanceAt() == null || at.isAfter(account.getBalanceAt()))) {
            account.setBalance(newest.balance());
            account.setBalanceAt(at);
        }
    }

    /** The statement told us more about a line the feed brought: decide it again — what he decided himself stays. */
    private void redo(FinanceTransaction t, List<FinanceRule> rules) {
        if (t.getKind() == Kind.TRANSFER && t.getCategorizedBy() == By.SYSTEM) return;
        FinanceAccount mine = own(t);
        if (mine != null) {
            if (t.getCategorizedBy() == By.USER) return;
            if (t.getKind() == Kind.TRANSFER) classifier.breakTransfer(t);
            classifier.makeTransfer(t, mine, By.SYSTEM);
            return;
        }
        classifier.decide(t, classifier.fitting(t, rules));
    }

    /** Preview only: would a rule or an own account number decide this line? */
    private boolean decidable(FinanceTransaction t, List<FinanceRule> rules) {
        return own(t) != null || classifier.decides(classifier.fitting(t, rules));
    }

    private FinanceAccount own(FinanceTransaction t) {
        String n = t.getCounterpartyAccount();
        if (n == null) return null;
        return accountRepo.findFirstByAccountNumber(n)
            .filter(a -> !a.isArchived() && !a.getId().equals(t.getAccount().getId())).orElse(null);
    }

    private FinanceAccount resolve(String number, UUID accountId) {
        FinanceAccount byNumber = number == null ? null : accountRepo.findFirstByAccountNumber(number).orElse(null);
        if (accountId != null) {
            FinanceAccount chosen = accountRepo.findById(accountId).orElseThrow(() -> new NoSuchElementException("Account not found: " + accountId));
            if (byNumber != null && !byNumber.getId().equals(chosen.getId()))
                throw new IllegalArgumentException("This statement is for " + byNumber.getName() + ", not " + chosen.getName());
            return chosen;
        }
        if (byNumber != null) return byNumber;
        throw new IllegalArgumentException(number == null ? "Couldn't find an account number in the statement — pick the account to import into"
            : "No account with number ••" + number.substring(Math.max(0, number.length() - 4)) + " yet — pick the account to import into");
    }

    private static String key(String reference, BigDecimal amount) { return reference.trim() + "|" + plain(amount); }

    private static String plain(BigDecimal v) { return v.stripTrailingZeros().toPlainString(); }

    private static String trim(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
