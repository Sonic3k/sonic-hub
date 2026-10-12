package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One movement of money on one account. `amount` is signed in the account's currency: negative left the account.
 * kind EXPENSE / INCOME follows the category (a refund is an EXPENSE with a positive amount: it lowers spending);
 * TRANSFER is money between own accounts — never spending — and `transferPeer` points at the other side.
 * Times are UTC, like everywhere else in this database.
 */
@Entity
@Table(name = "finance_transactions",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_txn_external_id", columnNames = "external_id"),
    indexes = {
        @Index(name = "idx_finance_txn_occurred", columnList = "occurred_at"),
        @Index(name = "idx_finance_txn_account_occurred", columnList = "account_id, occurred_at"),
        @Index(name = "idx_finance_txn_status", columnList = "status")
    })
public class FinanceTransaction extends FinanceEntity {

    public enum Kind { EXPENSE, INCOME, TRANSFER }
    public enum Source { SEPAY, EMAIL, NOTE, MANUAL, RECONCILE, SYSTEM }
    public enum Status { OK, REVIEW }
    public enum By { RULE, AI, USER, SYSTEM }

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

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private Kind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FinanceCategory category;

    /** The memo: what was typed when paying, or the note's own words. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** The bank's full line (SePay "description"), kept apart from the memo. */
    @Column(name = "bank_description", columnDefinition = "TEXT")
    private String bankDescription;

    @Column(name = "counterparty", length = 200)
    private String counterparty;

    /** Ngọc Anh's own remark, added later. */
    @Column(name = "note", length = 1000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private Source source;

    /** "sepay:92704" — the same transaction delivered twice is stored once. */
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_rule_id")
    private FinanceRule matchedRule;

    public FinanceTransaction() {}

    public UUID getId() { return id; }
    public FinanceAccount getAccount() { return account; }
    public void setAccount(FinanceAccount account) { this.account = account; }
    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public FinanceCategory getCategory() { return category; }
    public void setCategory(FinanceCategory category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getBankDescription() { return bankDescription; }
    public void setBankDescription(String bankDescription) { this.bankDescription = bankDescription; }
    public String getCounterparty() { return counterparty; }
    public void setCounterparty(String counterparty) { this.counterparty = counterparty; }
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
    public FinanceRule getMatchedRule() { return matchedRule; }
    public void setMatchedRule(FinanceRule matchedRule) { this.matchedRule = matchedRule; }

    /** Memo and bank line together — what rules and the AI read. */
    public String searchableText() {
        StringBuilder sb = new StringBuilder();
        if (description != null) sb.append(description);
        if (bankDescription != null && !bankDescription.equals(description)) sb.append(' ').append(bankDescription);
        if (counterparty != null) sb.append(' ').append(counterparty);
        return sb.toString();
    }
}
