package com.sonic.angels.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    // ── facets, tags and rules ──

    /** A way of looking at money ("mặt"). main: the classic categories; perTransaction: its tags describe one occasion. */
    public record Facet(UUID id, String code, String name, String icon, int sortOrder, boolean main, boolean perTransaction,
                        boolean system, boolean archived, long tagCount) {}

    public record FacetRequest(String name, String icon, Integer sortOrder, Boolean perTransaction, Boolean archived) {}

    /**
     * A tag ("nhãn") of a facet; the main facet's are the categories (kind EXPENSE/INCOME, with a budget group),
     * the others are kind ANY. impliesIds: tags that come along whenever this one is put on a line.
     */
    public record Category(UUID id, String code, String name, String icon, String kind, String budgetGroup,
                           int sortOrder, boolean system, boolean archived, UUID facetId, List<UUID> impliesIds) {}

    /** facetId only when creating (default: the main facet); impliesIds replaces what it brings along. */
    public record CategoryRequest(String name, String icon, String kind, String budgetGroup, Integer sortOrder, Boolean archived,
                                  UUID facetId, List<UUID> impliesIds) {}

    /** A tag as a line or a rule shows it. by: who put it on the line (RULE, AI, USER, SYSTEM, IMPLIED); null on a rule. */
    public record TagRef(UUID id, String name, String icon, UUID facetId, boolean main, String by) {}

    /** tags: everything the rule gives (category is its main-facet one); fromDate/toDate: an occasion's days. */
    public record Rule(UUID id, String keywords, String direction, UUID categoryId, String categoryName, String categoryIcon,
                       UUID transferAccountId, String transferAccountName, int priority, String origin, int hits, boolean active,
                       String counterpartyName, String counterpartyAccount, String label,
                       List<TagRef> tags, LocalDate fromDate, LocalDate toDate) {}

    /**
     * keywords, or counterpartyName for a rule about one counterparty, and/or fromDate–toDate (Vietnam dates, both
     * included; "" clears) for an occasion; label renames what it matches. tagIds: every tag it gives (categoryId,
     * when sent, is added to them); a rule gives tags or moves money (transferAccountId), not both.
     */
    public record RuleRequest(String keywords, String direction, UUID categoryId, UUID transferAccountId, Integer priority, Boolean active,
                              String counterpartyName, String counterpartyAccount, String label,
                              List<UUID> tagIds, String fromDate, String toDate) {}

    // ── transactions ──

    public record Txn(UUID id, UUID accountId, String accountName, String accountMode, String currency,
                      LocalDateTime occurredAt, BigDecimal amount, BigDecimal amountVnd, String kind,
                      UUID categoryId, String categoryName, String categoryIcon, String description, String bankDescription,
                      String counterparty, String counterpartyAccount, String note, String source, String status, String categorizedBy, Double aiConfidence,
                      BigDecimal balanceAfter, UUID transferPeerId, String transferAccountName, String suggestedKeywords,
                      LocalDateTime createdAt, List<TagRef> tags) {}

    /**
     * Create or edit. occurredAt: ISO; with Z/offset it is converted, bare means UTC. kind TRANSFER needs transferAccountId.
     * tagIds: every tag the line should carry (implied ones come by themselves); each facet that changes becomes his.
     * categoryId alone: the main facet becomes that one category.
     * learnKeywords: also make a rule "these words → these tags" and apply it to what still waits for review.
     * learnCounterparty: the same for everything with this transaction's counterparty, old and new; label renames them.
     * ruleTagIds: the tags such a rule gives (default: the line's tags, but not those of per-transaction facets).
     */
    public record TxnRequest(UUID accountId, String occurredAt, BigDecimal amount, String kind, UUID categoryId,
                             String description, String note, UUID transferAccountId, String learnKeywords,
                             Boolean learnCounterparty, String label, List<UUID> tagIds, List<UUID> ruleTagIds) {}

    /** Many lines at once: these tags put on (his) and/or taken off. Moves between own accounts are skipped. */
    public record TagsRequest(List<UUID> ids, List<UUID> add, List<UUID> remove) {}

    /** A quick note, already understood by the client: amount is signed (negative = spent). */
    public record NoteRequest(String text, BigDecimal amount, UUID accountId, String occurredAt, UUID categoryId) {}

    /** A note worth repeating with one tap, built from recent ones. */
    public record QuickChip(String text, BigDecimal amount, UUID accountId, String accountName,
                            UUID categoryId, String categoryName, String categoryIcon, int uses) {}

    public record Applied(int updated) {}

    // ── counterparties and statements ──

    /**
     * Everyone money went to or came from, with what is still waiting: one decision covers them all.
     * guess* is the category most of its lines already have (from a rule or the AI), if any.
     */
    public record CounterpartyGroup(String key, String name, String account, int accounts, List<UUID> ownAccountIds, long count, long waiting,
                                    long outCount, long inCount, BigDecimal totalOut, BigDecimal totalIn,
                                    LocalDateTime lastAt, String sample, UUID ruleId, String ruleLabel,
                                    UUID guessCategoryId, String guessCategoryName, String guessCategoryIcon) {}

    /** "Everything with this counterparty is …": a category or a move to an own account; more tags, an optional label. */
    public record AssignRequest(String name, UUID categoryId, UUID transferAccountId, String label, List<UUID> tagIds) {}

    /**
     * What a statement file holds and what importing it does (or did): matched = already here from the bank feed
     * (they get the counterparty), created = new lines, already = imported before.
     */
    public record ImportSummary(String bank, String accountNumber, UUID accountId, String accountName, String period,
                                LocalDateTime from, LocalDateTime to, int rows, int matched, int enriched, int created,
                                int already, int withCounterparty, int categorized, int waiting, int skipped, boolean committed) {}

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

    /** One label in a month's spending: every line carrying it counts in full (a parent through its children). */
    public record LabelLine(UUID id, String name, String icon, UUID parentId, BigDecimal amount, long count) {}

    /**
     * A facet's view of the month's spending. A line with two labels of the facet counts under both, so the labels can
     * add up to more than the month's spending; unlabeled is what carries none of them, multi how many lines carry two
     * or more chosen ones.
     */
    public record FacetSpend(UUID facetId, String name, boolean main, List<LabelLine> labels, BigDecimal unlabeled, long multi) {}

    public record MonthReport(String month, BigDecimal income, BigDecimal expense, BigDecimal saved, BigDecimal net,
                              List<CategoryLine> expenses, List<CategoryLine> incomes, List<AccountLine> accounts,
                              Budget budget, BigDecimal prevExpense, BigDecimal prevExpenseToDate, long reviewCount,
                              List<Gap> gaps, BigDecimal usdRate, List<FacetSpend> byLabel, BigDecimal moved) {}

    public record TrendPoint(String month, BigDecimal income, BigDecimal expense, BigDecimal saved, BigDecimal netWorth) {}

    // ── settings and the webhook log ──

    public record Settings(BigDecimal flexibleBudget, BigDecimal usdRate, LocalDateTime usdRateAt, boolean usdRateManual,
                           boolean sepayKeySet, boolean aiEnabled, LocalDateTime lastSepayAt) {}

    /** usdRate null with usdRateAuto true goes back to the daily automatic rate. */
    public record SettingsRequest(BigDecimal flexibleBudget, BigDecimal usdRate, Boolean usdRateAuto) {}

    public record Inbound(UUID id, String source, String externalId, String status, String message,
                          LocalDateTime createdAt, String payload, UUID transactionId) {}
}
