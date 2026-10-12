package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceRule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FinanceRuleRepository extends JpaRepository<FinanceRule, UUID> {

    @EntityGraph(attributePaths = {"category", "transferAccount"})
    List<FinanceRule> findAllByOrderByPriorityAscCreatedAtAsc();

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM FinanceRule r WHERE r.category.id = :categoryId")
    int deleteByCategoryId(UUID categoryId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM FinanceRule r WHERE r.transferAccount.id = :accountId")
    int deleteByTransferAccountId(UUID accountId);
}
