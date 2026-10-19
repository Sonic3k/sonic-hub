package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceInbound;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceInboundRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.FinanceText;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * SePay webhook → a transaction. The raw payload is written first, in its own transaction, so nothing is lost
 * when processing fails; a failed one is marked FAILED with the reason and can be replayed from admin.
 * The same SePay id twice (retries, resends) is stored once.
 */
@Service
public class FinanceIngestService {

    private static final Logger log = LoggerFactory.getLogger(FinanceIngestService.class);

    private final FinanceInboundRepository inboundRepo;
    private final FinanceTransactionRepository txnRepo;
    private final FinanceAccountRepository accountRepo;
    private final FinanceClassifier classifier;
    private final FinanceAiService ai;
    private final TransactionTemplate tx;
    private final ObjectMapper om = new ObjectMapper();

    public FinanceIngestService(FinanceInboundRepository inboundRepo, FinanceTransactionRepository txnRepo,
                                FinanceAccountRepository accountRepo, FinanceClassifier classifier, FinanceAiService ai,
                                PlatformTransactionManager txManager) {
        this.inboundRepo = inboundRepo; this.txnRepo = txnRepo; this.accountRepo = accountRepo;
        this.classifier = classifier; this.ai = ai;
        this.tx = new TransactionTemplate(txManager);
    }

    public FinanceInbound.Status receiveSepay(String raw) {
        UUID inboundId = tx.execute(s -> {
            FinanceInbound in = new FinanceInbound();
            in.setSource("SEPAY");
            in.setPayload(raw == null ? "" : raw);
            in.setExternalId(idOf(raw));
            return inboundRepo.save(in).getId();
        });
        return process(inboundId);
    }

    /**
     * (Re)process one stored payload. Never throws: a failure is written on the payload itself.
     * One at a time: the two halves of a move between two own bank accounts arrive together, and the second must
     * see the first (to pair with it, and so both do not claim the same account).
     */
    public synchronized FinanceInbound.Status process(UUID inboundId) {
        try {
            return tx.execute(s -> sepay(inboundId));
        } catch (Exception e) {
            log.warn("SePay payload {} failed: {}", inboundId, e.toString());
            String msg = e.getClass().getSimpleName() + ": " + e.getMessage();
            tx.executeWithoutResult(s -> inboundRepo.findById(inboundId).ifPresent(in -> {
                in.setStatus(FinanceInbound.Status.FAILED);
                in.setMessage(msg.length() > 990 ? msg.substring(0, 990) : msg);
            }));
            return FinanceInbound.Status.FAILED;
        }
    }

    private FinanceInbound.Status sepay(UUID inboundId) {
        FinanceInbound in = inboundRepo.findById(inboundId).orElseThrow();
        JsonNode j;
        try { j = om.readTree(in.getPayload()); }
        catch (Exception e) { return done(in, FinanceInbound.Status.IGNORED, "Không phải JSON"); }

        String id = text(j, "id");
        if (id.isEmpty()) return done(in, FinanceInbound.Status.IGNORED, "Thiếu id");
        String externalId = "sepay:" + id;
        if (txnRepo.existsByExternalId(externalId)) return done(in, FinanceInbound.Status.DUPLICATE, "Đã có " + externalId);

        BigDecimal amount = number(j, "transferAmount");
        if (amount == null || amount.signum() == 0) return done(in, FinanceInbound.Status.IGNORED, "Số tiền 0");
        boolean out = "out".equalsIgnoreCase(text(j, "transferType"));

        FinanceAccount account = resolveAccount(text(j, "gateway"), text(j, "accountNumber"));
        String content = text(j, "content").trim(), description = text(j, "description").trim();
        BigDecimal signed = out ? amount.abs().negate() : amount.abs();
        String reference = text(j, "referenceCode").trim();

        // a statement imported earlier may already hold this line (the feed was late, or retried)
        if (!reference.isEmpty()) {
            FinanceTransaction known = txnRepo.byReference(account.getId(), reference, FinanceTransaction.Source.STATEMENT).stream()
                .filter(x -> x.getAmount().compareTo(signed) == 0).findFirst().orElse(null);
            if (known != null) {
                in.setTransaction(known);
                return done(in, FinanceInbound.Status.DUPLICATE, "Đã có từ sao kê");
            }
        }

        FinanceTransaction t = new FinanceTransaction();
        t.setAccount(account);
        t.setOccurredAt(FinanceText.parseSepayTime(text(j, "transactionDate")));
        t.setAmount(signed);
        t.setDescription(!content.isEmpty() ? content : description);
        if (!description.isEmpty() && !description.equals(t.getDescription())) t.setBankDescription(description);
        t.setReferenceCode(reference.isEmpty() ? null : reference);
        counterparty(t);
        BigDecimal balance = number(j, "accumulated");
        t.setBalanceAfter(balance != null && balance.signum() != 0 ? balance : null);   // 0 = the bank did not say
        t.setExternalId(externalId);
        t.setSource(FinanceTransaction.Source.SEPAY);
        t.setStatus(FinanceTransaction.Status.REVIEW);
        t.setKind(out ? FinanceTransaction.Kind.EXPENSE : FinanceTransaction.Kind.INCOME);
        t = txnRepo.save(t);
        classifier.added(t);
        boolean askAi = classifier.classify(t);

        in.setTransaction(t);
        NumberFormat nf = NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN"));
        String what = t.getKind() == FinanceTransaction.Kind.TRANSFER ? "chuyển nội bộ"
            : t.getCategory() != null ? t.getCategory().getName() : "chờ duyệt";
        done(in, FinanceInbound.Status.SAVED, account.getName() + " " + (out ? "−" : "+") + nf.format(amount.abs()) + " → " + what);

        if (askAi) {
            UUID txnId = t.getId();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { ai.categorizeLater(txnId); }
            });
        }
        return FinanceInbound.Status.SAVED;
    }

    /**
     * The account a SePay line belongs to: by number; else the first account of that bank without a number yet
     * (it takes the number); else a new one. An account that receives a feed becomes a FEED account.
     */
    private FinanceAccount resolveAccount(String gateway, String number) {
        if (!number.isEmpty()) {
            FinanceAccount a = accountRepo.findFirstByAccountNumber(number).orElse(null);
            if (a != null) { a.setMode(FinanceAccount.Mode.FEED); return a; }
        }
        String g = FinanceText.normalize(gateway).replace(" ", "");
        if (!g.isEmpty()) {
            for (FinanceAccount a : accountRepo.findAllByOrderBySortOrderAscCreatedAtAsc()) {
                if (a.isArchived() || (a.getAccountNumber() != null && !a.getAccountNumber().isBlank())) continue;
                String inst = FinanceText.normalize(a.getInstitution()).replace(" ", "");
                String name = FinanceText.normalize(a.getName()).replace(" ", "");
                if ((!inst.isEmpty() && (inst.contains(g) || g.contains(inst))) || (!name.isEmpty() && (name.contains(g) || g.contains(name)))) {
                    a.setAccountNumber(number.isEmpty() ? null : number);
                    a.setMode(FinanceAccount.Mode.FEED);
                    return a;
                }
            }
        }
        FinanceAccount a = new FinanceAccount();
        String label = gateway.isEmpty() ? "Tài khoản" : gateway;
        a.setName(number.length() >= 4 ? label + " ••" + number.substring(number.length() - 4) : label);
        a.setInstitution(gateway.isEmpty() ? null : gateway);
        a.setAccountNumber(number.isEmpty() ? null : number);
        a.setMode(FinanceAccount.Mode.FEED);
        a.setCurrency("VND");
        a.setSortOrder(accountRepo.findAll().stream().mapToInt(FinanceAccount::getSortOrder).max().orElse(0) + 1);
        return accountRepo.save(a);
    }

    /**
     * The feed does not say who the other side was. A card payment names its merchant; and a memo seen before with
     * one and the same counterparty every time (a shop's fixed QR, a code someone always uses) is that counterparty
     * again. A memo shared by several counterparties ("… chuyen tien QR") says nothing — the next statement will.
     */
    private void counterparty(FinanceTransaction t) {
        String merchant = FinanceText.cardMerchant(t.getDescription());
        if (merchant != null) { t.setCounterparty(merchant); return; }
        String memo = t.getDescription();
        if (memo == null || memo.isBlank()) return;
        List<FinanceTransaction> same = txnRepo.sameMemoWithCounterparty(t.getAccount().getId(), memo.trim().toLowerCase(Locale.ROOT),
            PageRequest.of(0, 30));
        if (same.isEmpty()) return;
        Set<String> who = new HashSet<>();
        Set<String> accounts = new HashSet<>();
        for (FinanceTransaction x : same) {
            who.add(FinanceText.counterpartyKey(x.getCounterparty()));
            if (x.getCounterpartyAccount() != null) accounts.add(x.getCounterpartyAccount());
        }
        boolean looksLikeCode = memo.matches(".*[A-Za-z]+\\d{4,}.*");
        if (who.size() != 1 || (!looksLikeCode && same.size() < 3)) return;
        t.setCounterparty(same.get(0).getCounterparty());
        if (accounts.size() == 1) t.setCounterpartyAccount(accounts.iterator().next());
    }

    private FinanceInbound.Status done(FinanceInbound in, FinanceInbound.Status status, String message) {
        in.setStatus(status);
        in.setMessage(message);
        return status;
    }

    private String idOf(String raw) {
        try { String id = text(om.readTree(raw), "id"); return id.isEmpty() ? null : "sepay:" + id; }
        catch (Exception e) { return null; }
    }

    private static String text(JsonNode j, String field) {
        JsonNode v = j.path(field);
        return v.isMissingNode() || v.isNull() ? "" : v.asText("").trim();
    }

    private static BigDecimal number(JsonNode j, String field) {
        JsonNode v = j.path(field);
        if (v.isNumber()) return v.decimalValue();
        if (v.isTextual()) {
            String s = v.asText().replaceAll("[^0-9.-]", "");
            try { return s.isEmpty() ? null : new BigDecimal(s); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }
}
