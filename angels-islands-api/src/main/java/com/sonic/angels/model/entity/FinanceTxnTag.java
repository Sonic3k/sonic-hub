package com.sonic.angels.model.entity;

import jakarta.persistence.*;

import java.util.UUID;

/**
 * One tag on one transaction, and who put it there: a rule, the AI, Ngọc Anh himself, the system — or IMPLIED,
 * brought along by another tag of the line (those are worked out again whenever the line's tags change).
 * A facet in which he chose a tag himself is his: rules no longer touch it.
 */
@Entity
@Table(name = "finance_transaction_tags",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_txn_tag", columnNames = {"transaction_id", "category_id"}),
    indexes = @Index(name = "idx_finance_txn_tag_category", columnList = "category_id"))
public class FinanceTxnTag extends FinanceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false)
    private FinanceTransaction transaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private FinanceCategory tag;

    @Enumerated(EnumType.STRING)
    @Column(name = "decided_by", nullable = false, length = 10)
    private FinanceTransaction.By decidedBy;

    protected FinanceTxnTag() {}

    public FinanceTxnTag(FinanceTransaction transaction, FinanceCategory tag, FinanceTransaction.By decidedBy) {
        this.transaction = transaction; this.tag = tag; this.decidedBy = decidedBy;
    }

    public UUID getId() { return id; }
    public FinanceTransaction getTransaction() { return transaction; }
    public FinanceCategory getTag() { return tag; }
    public FinanceTransaction.By getDecidedBy() { return decidedBy; }
    public void setDecidedBy(FinanceTransaction.By decidedBy) { this.decidedBy = decidedBy; }
    public boolean isImplied() { return decidedBy == FinanceTransaction.By.IMPLIED; }
}
