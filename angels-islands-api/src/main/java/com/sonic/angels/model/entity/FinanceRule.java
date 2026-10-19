package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * "When the text says one of these words, it is that." Keywords are separated by |, matched as whole words
 * with accents and case ignored, against a transaction's memo, bank description and counterparty.
 * A rule may instead name a counterparty ("everything with NGUYEN VAN A"): then keywords stay empty and the
 * counterparty's name decides. A rule may also (or only) hold a span of days, Vietnam dates, both ends included —
 * an occasion: "everything 12–15/11 is Dịp: Đà Lạt".
 * A rule either gives tags — of any facets, `category` being the main-facet one among them — or says the money moved
 * to another own account (ATM → cash, top-up → MoMo), and may also give the transaction a label ("Tiền nhà").
 * Lower priority numbers are tried first: counterparty rules 5, rules learned from a correction 10, built-in 50–100,
 * occasions 200. For each facet the first rule that has tags there decides it.
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
    private String keywords = "";

    /** Display name of the counterparty this rule is about; matched by {@code FinanceText.counterpartyKey}. */
    @Column(name = "counterparty_name", length = 200)
    private String counterpartyName;

    /** When set, only this account number of the counterparty matches. */
    @Column(name = "counterparty_account", length = 64)
    private String counterpartyAccount;

    /** Replaces the transaction's description (the bank memo is kept as its bank line). */
    @Column(name = "label", length = 200)
    private String label;

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

    /** Every tag the rule gives, the main-facet one (`category`) included. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "finance_rule_tags",
        joinColumns = @JoinColumn(name = "rule_id"), inverseJoinColumns = @JoinColumn(name = "category_id"))
    @BatchSize(size = 100)
    private Set<FinanceCategory> tags = new LinkedHashSet<>();

    @Column(name = "from_date")
    private LocalDate fromDate;

    @Column(name = "to_date")
    private LocalDate toDate;

    public FinanceRule() {}

    public UUID getId() { return id; }
    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    public String getCounterpartyName() { return counterpartyName; }
    public void setCounterpartyName(String counterpartyName) { this.counterpartyName = counterpartyName; }
    public String getCounterpartyAccount() { return counterpartyAccount; }
    public void setCounterpartyAccount(String counterpartyAccount) { this.counterpartyAccount = counterpartyAccount; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public boolean isCounterpartyRule() { return counterpartyName != null && !counterpartyName.isBlank(); }
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
    public Set<FinanceCategory> getTags() { return tags; }
    public LocalDate getFromDate() { return fromDate; }
    public void setFromDate(LocalDate fromDate) { this.fromDate = fromDate; }
    public LocalDate getToDate() { return toDate; }
    public void setToDate(LocalDate toDate) { this.toDate = toDate; }
    public boolean hasDates() { return fromDate != null || toDate != null; }
    public boolean hasKeywords() { return keywords != null && !keywords.isBlank(); }

    /**
     * What the rule gives. Rows from before tags existed only have `category`: that is their one tag.
     */
    public Set<FinanceCategory> givenTags() {
        if (!tags.isEmpty() || category == null) return tags;
        return Set.of(category);
    }
}
