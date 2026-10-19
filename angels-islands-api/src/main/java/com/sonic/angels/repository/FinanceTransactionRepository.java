package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface FinanceTransactionRepository extends JpaRepository<FinanceTransaction, UUID>,
        JpaSpecificationExecutor<FinanceTransaction> {

    boolean existsByExternalId(String externalId);

    long countByStatus(FinanceTransaction.Status status);

    long countByAccountId(UUID accountId);

    /** Everything in [from, to) with account and category loaded — what a report reads. */
    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category " +
           "WHERE t.occurredAt >= :from AND t.occurredAt < :to")
    List<FinanceTransaction> findInRange(LocalDateTime from, LocalDateTime to);

    /** The other side of a move between own accounts: same size, opposite sign, close in time, not paired yet. */
    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account " +
           "WHERE t.account.id <> :accountId AND t.amount = :amount AND t.transferPeer IS NULL " +
           "AND t.occurredAt BETWEEN :from AND :to AND t.id <> :selfId")
    List<FinanceTransaction> transferCandidates(UUID selfId, UUID accountId, BigDecimal amount, LocalDateTime from, LocalDateTime to);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM FinanceTransaction t WHERE t.account.id = :accountId AND t.occurredAt > :after")
    BigDecimal sumAfter(UUID accountId, LocalDateTime after);

    /** Bank-reported balances of one account in [from, to), oldest first — consecutive ones must add up. */
    @Query("SELECT t FROM FinanceTransaction t WHERE t.account.id = :accountId AND t.balanceAfter IS NOT NULL " +
           "AND t.occurredAt >= :from AND t.occurredAt < :to ORDER BY t.occurredAt ASC, t.createdAt ASC")
    List<FinanceTransaction> balanceTrail(UUID accountId, LocalDateTime from, LocalDateTime to);

    /** Lines of one account that carry a bank reference, in a time window — what a statement row is matched against. */
    @Query("SELECT t FROM FinanceTransaction t WHERE t.account.id = :accountId AND t.referenceCode IS NOT NULL " +
           "AND t.occurredAt BETWEEN :from AND :to")
    List<FinanceTransaction> withReference(UUID accountId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT t FROM FinanceTransaction t WHERE t.account.id = :accountId AND t.referenceCode = :reference AND t.source = :source")
    List<FinanceTransaction> byReference(UUID accountId, String reference, FinanceTransaction.Source source);

    /** Earlier lines of the account with this memo whose counterparty is known, newest first. */
    @Query("SELECT t FROM FinanceTransaction t WHERE t.account.id = :accountId AND t.counterparty IS NOT NULL " +
           "AND (lower(t.description) = :memo OR lower(t.bankDescription) = :memo) ORDER BY t.occurredAt DESC")
    List<FinanceTransaction> sameMemoWithCounterparty(UUID accountId, String memo, Pageable page);

    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category WHERE t.counterparty IS NOT NULL")
    List<FinanceTransaction> withCounterparty();

    @Query("SELECT MIN(t.occurredAt) FROM FinanceTransaction t")
    LocalDateTime firstOccurredAt();

    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category " +
           "WHERE t.status = :status ORDER BY t.occurredAt DESC")
    List<FinanceTransaction> findWithStatus(FinanceTransaction.Status status);

    /** Latest notes, newest first — the quick-note chips are built from them. */
    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category " +
           "WHERE t.source = :source ORDER BY t.createdAt DESC")
    List<FinanceTransaction> latestBySource(FinanceTransaction.Source source, Pageable page);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE FinanceTransaction t SET t.transferPeer = NULL WHERE t.transferPeer.id = :id")
    int unlinkPeer(UUID id);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE FinanceTransaction t SET t.matchedRule = NULL WHERE t.matchedRule.id = :ruleId")
    int clearRule(UUID ruleId);

    List<FinanceTransaction> findByCategoryId(UUID categoryId);

    /** Lines that carry this tag, put there or brought along by another. */
    @Query("SELECT DISTINCT t FROM FinanceTransaction t JOIN t.tags x WHERE x.tag.id = :tagId")
    List<FinanceTransaction> withTag(UUID tagId);

    /** Lines decided before tags existed: a category, no tags yet. */
    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.category WHERE t.kind <> :transfer AND t.tags IS EMPTY")
    List<FinanceTransaction> categorizedWithoutTags(FinanceTransaction.Kind transfer);

    /** Every line a rule could be about (the bookkeeping side of a move is never one). */
    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category WHERE t.source <> :system")
    List<FinanceTransaction> allExcept(FinanceTransaction.Source system);

    @Query("SELECT t FROM FinanceTransaction t JOIN FETCH t.account LEFT JOIN FETCH t.category WHERE t.id IN :ids")
    List<FinanceTransaction> findAllByIdIn(Collection<UUID> ids);
}
