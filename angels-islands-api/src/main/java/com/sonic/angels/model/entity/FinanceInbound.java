package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * Every payload that reached a finance webhook, kept as it came. It is written before any processing, so a
 * payload that failed (a bug, a format the parser did not know) is never lost and can be replayed later.
 */
@Entity
@Table(name = "finance_inbound", indexes = @Index(name = "idx_finance_inbound_created", columnList = "created_at"))
public class FinanceInbound extends BaseEntity {

    public enum Status { NEW, SAVED, DUPLICATE, IGNORED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "external_id", length = 100)
    private String externalId;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.NEW;

    @Column(name = "message", length = 1000)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private FinanceTransaction transaction;

    public FinanceInbound() {}

    public UUID getId() { return id; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public FinanceTransaction getTransaction() { return transaction; }
    public void setTransaction(FinanceTransaction transaction) { this.transaction = transaction; }
}
