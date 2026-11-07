package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * One movement of money on one account. `amount` is signed in the account's currency: negative left the account.
 * kind EXPENSE / INCOME follows the category (a refund is an EXPENSE with a positive amount: it lowers spending);
 * TRANSFER is money between own accounts — never spending, no tags — and `transferPeer` points at the other side.
 * A move of more than two lines (an exchange paid in parts: two Zelle payments for one transfer here) shares one
 * `moveId`; each of its lines points at the biggest line on the other account.
 * `tags`: every tag the line carries, of every facet. `category` is the one main-facet tag that does the counting
 * (spending or saving, budget group) — kept in step with the tags by FinanceTags.settle.
 * Times are UTC, like everywhere else in this database.
 */
@Entity
@Table(name = "finance_transactions",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_txn_external_id", columnNames = "external_id"),
    indexes = {
        @Index(name = "idx_finance_txn_occurred", columnList = "occurred_at"),
        @Index(name = "idx_finance_txn_account_occurred", columnList = "account_id, occurred_at"),
        @Index(name = "idx_finance_txn_status", columnList = "status"),
        @Index(name = "idx_finance_txn_move", columnList = "move_id")
    })
public class FinanceTransaction extends FinanceEntity {

    public enum Kind { EXPENSE, INCOME, TRANSFER }
    /** EMAIL: a bank's notification email; RECEIPT: a merchant's receipt (a Grab ride paid from MoMo), for a wallet with no feed. */
    public enum Source { SEPAY, EMAIL, STATEMENT, NOTE, MANUAL, RECONCILE, SYSTEM, RECEIPT }
    public enum Status { OK, REVIEW }
    /** IMPLIED only on tags: brought along by another tag of the line. */
    public enum By { RULE, AI, USER, SYSTEM, IMPLIED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private FinanceAccount account;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    /**
     * What was paid in another currency, when it was not the account's (a VND card charged 148 SGD; a VND line for
     * 20 USD of Claude): the amount as the merchant charged it (always positive) and its currency. The account's own
     * amount above stays what really moved there.
     */
    @Column(name = "original_amount", precision = 18, scale = 2)
    private BigDecimal originalAmount;

    @Column(name = "original_currency", length = 3)
    private String originalCurrency;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private Kind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FinanceCategory category;

    /**
     * The line's own words: what he wrote about this one payment (or a note's text, or what an email said about it).
     * A bank line has none until someone writes them; rules never touch them.
     */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** What his rules call the other side ("Azzan Coffee (Hoà Lạc)"); rules set and change it, the line's own words stay. */
    @Column(name = "payee_name", length = 200)
    private String payeeName;

    /** What the bank said, as it came (the statement's or the feed's memo). Set once when the line arrives, never renamed. */
    @Column(name = "bank_description", columnDefinition = "TEXT")
    private String bankDescription;

    /**
     * What this payment bought, read from somewhere else (a flight's legs, a hotel stay), as JSON:
     * {kind, title, start, end, items: [{label, value}], source: {kind, id, url, subject, from, date}}.
     * Imports and rules never touch it; it is set (or cleared) as a whole.
     */
    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    /**
     * Who the money went to or came from: the name on the other account (from a bank statement, or inherited from an
     * earlier line with the same memo), or the merchant of a card payment.
     */
    @Column(name = "counterparty", length = 200)
    private String counterparty;

    @Column(name = "counterparty_account", length = 64)
    private String counterpartyAccount;

    /** Ngọc Anh's own remark, added later. */
    @Column(name = "note", length = 1000)
    private String note;

    /** The event this belongs to (a trip, a concert…); null = none. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "life_event_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private LifeEvent lifeEvent;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private Source source;

    /** "sepay:92704" or "stmt:<account>:<code>:<sign+amount>" — the same transaction delivered twice is stored once. */
    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    /** Balance right after this transaction, as the bank reported it. */
    @Column(name = "balance_after", precision = 18, scale = 2)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private Status status = Status.REVIEW;

    @Enumerated(EnumType.STRING)
    @Column(name = "categorized_by", length = 10)
    private By categorizedBy;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_peer_id")
    private FinanceTransaction transferPeer;

    /** set on every line of a move of more than two lines; null on a plain pair */
    @Column(name = "move_id")
    private UUID moveId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_rule_id")
    private FinanceRule matchedRule;

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 200)
    private Set<FinanceTxnTag> tags = new LinkedHashSet<>();

    public FinanceTransaction() {}

    public UUID getId() { return id; }
    public FinanceAccount getAccount() { return account; }
    public void setAccount(FinanceAccount account) { this.account = account; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getOriginalAmount() { return originalAmount; }
    public String getOriginalCurrency() { return originalCurrency; }
    /** Both or neither; a currency that is the account's own clears them (nothing was converted). */
    public void setOriginal(BigDecimal amount, String currency) {
        boolean none = amount == null || currency == null || currency.isBlank() || amount.signum() == 0
            || (this.account != null && currency.equalsIgnoreCase(this.account.getCurrency()));
        this.originalAmount = none ? null : amount.abs();
        this.originalCurrency = none ? null : currency.trim().toUpperCase(java.util.Locale.ROOT);
    }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public FinanceCategory getCategory() { return category; }
    public void setCategory(FinanceCategory category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPayeeName() { return payeeName; }
    public void setPayeeName(String payeeName) { this.payeeName = payeeName; }

    /** What the line is shown as: its own words, else the payee's name here, else the payee, else what the bank said. */
    public String title() {
        for (String s : new String[]{description, payeeName, counterparty, bankDescription}) if (s != null && !s.isBlank()) return s.strip();
        return null;
    }

    public String getBankDescription() { return bankDescription; }
    public void setBankDescription(String bankDescription) { this.bankDescription = bankDescription; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getCounterparty() { return counterparty; }
    public void setCounterparty(String counterparty) { this.counterparty = counterparty; }
    public String getCounterpartyAccount() { return counterpartyAccount; }
    public void setCounterpartyAccount(String counterpartyAccount) { this.counterpartyAccount = counterpartyAccount; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Source getSource() { return source; }
    public void setSource(Source source) { this.source = source; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public String getReferenceCode() { return referenceCode; }
    public void setReferenceCode(String referenceCode) { this.referenceCode = referenceCode; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public By getCategorizedBy() { return categorizedBy; }
    public void setCategorizedBy(By categorizedBy) { this.categorizedBy = categorizedBy; }
    public Double getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Double aiConfidence) { this.aiConfidence = aiConfidence; }
    public FinanceTransaction getTransferPeer() { return transferPeer; }
    public void setTransferPeer(FinanceTransaction transferPeer) { this.transferPeer = transferPeer; }
    public UUID getMoveId() { return moveId; }
    public void setMoveId(UUID moveId) { this.moveId = moveId; }
    public FinanceRule getMatchedRule() { return matchedRule; }
    public void setMatchedRule(FinanceRule matchedRule) { this.matchedRule = matchedRule; }
    /** Change through FinanceTags, which keeps `category` and the implied tags in step. */
    public Set<FinanceTxnTag> getTags() { return tags; }

    /** Memo and bank line together — what rules and the AI read. */
    public String searchableText() {
        StringBuilder sb = new StringBuilder();
        if (description != null) sb.append(description);
        if (bankDescription != null && !bankDescription.equals(description)) sb.append(' ').append(bankDescription);
        if (counterparty != null) sb.append(' ').append(counterparty);
        return sb.toString();
    }
    public LifeEvent getLifeEvent() { return lifeEvent; }
    public void setLifeEvent(LifeEvent lifeEvent) { this.lifeEvent = lifeEvent; }
}
