package com.sonic.angels.repository;

import com.sonic.angels.model.entity.FinanceInbound;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface FinanceInboundRepository extends JpaRepository<FinanceInbound, UUID> {

    Page<FinanceInbound> findAllByOrderByCreatedAtDesc(Pageable page);

    Optional<FinanceInbound> findFirstBySourceOrderByCreatedAtDesc(String source);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE FinanceInbound i SET i.transaction = NULL WHERE i.transaction.id = :transactionId")
    int unlinkTransaction(UUID transactionId);
}
