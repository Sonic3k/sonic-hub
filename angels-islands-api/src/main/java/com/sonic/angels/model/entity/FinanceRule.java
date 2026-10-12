package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * "When the text says one of these words, it is that." Keywords are separated by |, matched as whole words
 * with accents and case ignored, against a transaction's memo and bank description.
 * A rule either sets a category, or says the money moved to another own account (ATM → cash, top-up → MoMo).
 * Lower priority numbers are tried first; rules learned from a correction get 10, the built-in ones 100.
 */
@Entity
@Table(name = "finance_rules")
public class FinanceRule extends FinanceEntity {

    public enum Direction { ANY, IN, OUT }
    public enum Origin { SEED, USER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "keywords", nullable = false, length = 1000)
    private String keywords;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", nullable = false, length = 10)
    private Direction direction = Direction.ANY;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FinanceCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_account_id")
    private FinanceAccount transferAccount;

    @Column(name = "priority", nullable = false)
    private int priority = 100;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false, length = 10)
    private Origin origin = Origin.USER;

    @Column(name = "hits", nullable = false)
    private int hits = 0;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public FinanceRule() {}

    public UUID getId() { return id; }
    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    public Direction getDirection() { return direction; }
    public void setDirection(Direction direction) { this.direction = direction; }
    public FinanceCategory getCategory() { return category; }
    public void setCategory(FinanceCategory category) { this.category = category; }
    public FinanceAccount getTransferAccount() { return transferAccount; }
    public void setTransferAccount(FinanceAccount transferAccount) { this.transferAccount = transferAccount; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
    public Origin getOrigin() { return origin; }
    public void setOrigin(Origin origin) { this.origin = origin; }
    public int getHits() { return hits; }
    public void setHits(int hits) { this.hits = hits; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
