package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceRule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

/** Rules are removed one by one (never in bulk): their tags live in a join table that must go with them. */
public interface FinanceRuleRepository extends JpaRepository<FinanceRule, UUID> {

    @EntityGraph(attributePaths = {"category", "transferAccount", "tags"})
    List<FinanceRule> findAllByOrderByPriorityAscCreatedAtAsc();

    List<FinanceRule> findByTransferAccountId(UUID accountId);

    @Query("SELECT DISTINCT r FROM FinanceRule r LEFT JOIN r.tags x WHERE r.category.id = :tagId OR x.id = :tagId")
    List<FinanceRule> withTag(UUID tagId);
}
