package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One place money sits: a bank account, a wallet, the cash in the pocket.
 * The mode says how its numbers arrive:
 *   FEED      — every transaction comes in by itself (SePay, a parsed email); the balance is the bank's own figure.
 *   RECONCILE — notes are optional; a balance typed in now and then turns the gap into "chưa rõ" spending or income.
 *   POOL      — cash: money going in counts as spent at once; a cash note only moves part of it to its real category.
 */
@Entity
@Table(name = "finance_accounts")
public class FinanceAccount extends FinanceEntity {

    public enum Mode { FEED, RECONCILE, POOL }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    /** Bank or wallet name as SePay calls it ("TPBank"); also matched against the webhook's gateway. */
    @Column(name = "institution", length = 80)
    private String institution;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 20)
    private Mode mode = Mode.RECONCILE;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "VND";

    /** Full account number: links SePay transactions to this account and spots transfers between own accounts. */
    @Column(name = "account_number", length = 40)
    private String accountNumber;

    /** Current balance in the account's currency; null until first known. */
    @Column(name = "balance", precision = 18, scale = 2)
    private BigDecimal balance;

    @Column(name = "balance_at")
    private LocalDateTime balanceAt;

    @Column(name = "color", length = 20)
    private String color;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    public FinanceAccount() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getInstitution() { return institution; }
    public void setInstitution(String institution) { this.institution = institution; }
    public Mode getMode() { return mode; }
    public void setMode(Mode mode) { this.mode = mode; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public LocalDateTime getBalanceAt() { return balanceAt; }
    public void setBalanceAt(LocalDateTime balanceAt) { this.balanceAt = balanceAt; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
