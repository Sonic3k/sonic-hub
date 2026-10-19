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
import java.time.LocalDateTime;
import java.util.*;

/**
 * A bank statement (the .xlsx the bank's app exports) into the ledger. Each row is either a line the bank feed
 * already brought — matched by the bank's transaction code and amount, it gets the counterparty the feed did not
 * have — or a new line (history from before the feed, or something the feed missed). Importing the same file
 * again changes nothing. The statement says who the other side was, so counterparty rules decide most lines.
 */
@Service
@Transactional
public class FinanceStatementService {

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
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Chọn file sao kê (.xlsx)");
        try (InputStream in = file.getInputStream()) {
            BankStatementParser.Statement st = BankStatementParser.parse(XlsxReader.firstSheet(in));
            if (st.rows().isEmpty()) throw new IllegalArgumentException("Sao kê không có giao dịch nào");
            return st;
        } catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage() == null ? "Không đọc được file" : e.getMessage());
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

        // what the bank feed already brought, by (code, amount), oldest first
        Map<String, Deque<FinanceTransaction>> feed = new HashMap<>();
        for (FinanceTransaction t : txnRepo.withReference(account.getId(), from.minusDays(3), to.plusDays(3))) {
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
        int matched = 0, enriched = 0, created = 0, already = 0, withCp = 0, categorized = 0, waiting = 0;
        for (Row row : rows) {
            String k = key(row.reference(), row.amount());
            int dup = seen.merge(k, 1, Integer::sum) - 1;
            String who = FinanceText.cleanCounterparty(row.counterpartyName());
            if (who == null) who = FinanceText.cardMerchant(row.description());
            String whoAccount = trim(row.counterpartyAccount(), 64);
            if (who != null) withCp++;

            Deque<FinanceTransaction> fromFeed = feed.get(k);
            FinanceTransaction t = fromFeed == null ? null : fromFeed.pollFirst();
            if (t != null) {
                matched++;
                boolean newWho = who != null && !FinanceText.counterpartyKey(who).equals(FinanceText.counterpartyKey(t.getCounterparty()));
                boolean newAccount = whoAccount != null && !whoAccount.equals(t.getCounterpartyAccount());
                if (newWho || newAccount) {
                    enriched++;
                    if (commit) {
                        if (who != null) t.setCounterparty(who);
                        if (whoAccount != null) t.setCounterpartyAccount(whoAccount);
                        if (t.getStatus() == Status.REVIEW || t.getCategorizedBy() == By.RULE || t.getCategorizedBy() == By.AI) redo(t, rules);
                    }
                }
                if (t.getStatus() == Status.OK) categorized++; else waiting++;
                continue;
            }

            String externalId = "stmt:" + accountKey + ":" + row.reference() + ":" + plain(row.amount()) + (dup > 0 ? ":" + dup : "");
            if (txnRepo.existsByExternalId(externalId)) { already++; continue; }
            created++;
            FinanceTransaction n = new FinanceTransaction();
            n.setAccount(account);
            n.setOccurredAt(FinanceText.vnToUtc(row.occurredAtVn()));
            n.setAmount(row.amount());
            n.setDescription(row.description());
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
            rows.size(), matched, enriched, created, already, withCp, categorized, waiting, st.skipped(), commit);
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
                throw new IllegalArgumentException("Sao kê này của tài khoản " + byNumber.getName() + ", không phải " + chosen.getName());
            return chosen;
        }
        if (byNumber != null) return byNumber;
        throw new IllegalArgumentException(number == null ? "Không thấy số tài khoản trong sao kê — chọn tài khoản để nhập vào"
            : "Chưa có tài khoản nào số ••" + number.substring(Math.max(0, number.length() - 4)) + " — chọn tài khoản để nhập vào");
    }

    private static String key(String reference, BigDecimal amount) { return reference.trim() + "|" + plain(amount); }

    private static String plain(BigDecimal v) { return v.stripTrailingZeros().toPlainString(); }

    private static String trim(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
