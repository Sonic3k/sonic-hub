package com.sonic.angels.model.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Request and response shapes of /api/finance. Amounts are in the account's currency unless the name says Vnd. */
public final class FinanceDto {

    private FinanceDto() {}

    // ── accounts ──

    public record Account(UUID id, String name, String institution, String mode, String currency, String accountNumber,
                          BigDecimal balance, LocalDateTime balanceAt, BigDecimal balanceVnd, String color,
                          int sortOrder, boolean archived, long transactionCount) {}

    public record AccountRequest(String name, String institution, String mode, String currency, String accountNumber,
                                 String color, Integer sortOrder, Boolean archived) {}

    /** "Chốt số dư": the balance seen in the app right now. */
    public record BalanceRequest(BigDecimal balance, String note) {}

    // ── categories and rules ──

    public record Category(UUID id, String code, String name, String icon, String kind, String budgetGroup,
                           int sortOrder, boolean system, boolean archived) {}

    public record CategoryRequest(String name, String icon, String kind, String budgetGroup, Integer sortOrder, Boolean archived) {}

    public record Rule(UUID id, String keywords, String direction, UUID categoryId, String categoryName, String categoryIcon,
                       UUID transferAccountId, String transferAccountName, int priority, String origin, int hits, boolean active) {}

    public record RuleRequest(String keywords, String direction, UUID categoryId, UUID transferAccountId, Integer priority, Boolean active) {}

    // ── transactions ──

    public record Txn(UUID id, UUID accountId, String accountName, String accountMode, String currency,
                      LocalDateTime occurredAt, BigDecimal amount, BigDecimal amountVnd, String kind,
                      UUID categoryId, String categoryName, String categoryIcon, String description, String bankDescription,
                      String counterparty, String note, String source, String status, String categorizedBy, Double aiConfidence,
                      BigDecimal balanceAfter, UUID transferPeerId, String transferAccountName, String suggestedKeywords,
                      LocalDateTime createdAt) {}

    /**
     * Create or edit. occurredAt: ISO; with Z/offset it is converted, bare means UTC. kind TRANSFER needs transferAccountId.
     * learnKeywords: also make a rule "these words → this category" and apply it to what still waits for review.
     */
    public record TxnRequest(UUID accountId, String occurredAt, BigDecimal amount, String kind, UUID categoryId,
                             String description, String note, UUID transferAccountId, String learnKeywords) {}

    /** A quick note, already understood by the client: amount is signed (negative = spent). */
    public record NoteRequest(String text, BigDecimal amount, UUID accountId, String occurredAt, UUID categoryId) {}

    /** A note worth repeating with one tap, built from recent ones. */
    public record QuickChip(String text, BigDecimal amount, UUID accountId, String accountName,
                            UUID categoryId, String categoryName, String categoryIcon, int uses) {}

    public record Applied(int updated) {}

    // ── reports ──

    public record Summary(List<Account> accounts, BigDecimal netWorthVnd, long reviewCount, BigDecimal usdRate,
                          BigDecimal flexibleBudget, LocalDateTime lastFeedAt) {}

    /** One category in a month; amount is positive for money spent (or received, on the income side). */
    public record CategoryLine(UUID categoryId, String code, String name, String icon, String budgetGroup,
                               BigDecimal amount, long count) {}

    public record AccountLine(UUID accountId, String name, String mode, BigDecimal out, BigDecimal in) {}

    /** Bank balances that do not add up: money moved that no transaction here explains. */
    public record Gap(UUID accountId, String accountName, LocalDateTime at, BigDecimal missing) {}

    public record Budget(BigDecimal limit, BigDecimal spent, BigDecimal remaining, int daysLeft, BigDecimal perDay) {}

    public record MonthReport(String month, BigDecimal income, BigDecimal expense, BigDecimal saved, BigDecimal net,
                              List<CategoryLine> expenses, List<CategoryLine> incomes, List<AccountLine> accounts,
                              Budget budget, BigDecimal prevExpense, BigDecimal prevExpenseToDate, long reviewCount,
                              List<Gap> gaps, BigDecimal usdRate) {}

    public record TrendPoint(String month, BigDecimal income, BigDecimal expense, BigDecimal saved, BigDecimal netWorth) {}

    // ── settings and the webhook log ──

    public record Settings(BigDecimal flexibleBudget, BigDecimal usdRate, LocalDateTime usdRateAt, boolean usdRateManual,
                           boolean sepayKeySet, boolean aiEnabled, LocalDateTime lastSepayAt) {}

    /** usdRate null with usdRateAuto true goes back to the daily automatic rate. */
    public record SettingsRequest(BigDecimal flexibleBudget, BigDecimal usdRate, Boolean usdRateAuto) {}

    public record Inbound(UUID id, String source, String externalId, String status, String message,
                          LocalDateTime createdAt, String payload, UUID transactionId) {}
}
