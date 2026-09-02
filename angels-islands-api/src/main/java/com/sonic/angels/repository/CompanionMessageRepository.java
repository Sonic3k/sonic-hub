package com.sonic.angels.repository;

import com.sonic.angels.model.entity.CompanionMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

public interface CompanionMessageRepository extends JpaRepository<CompanionMessage, UUID> {
    Page<CompanionMessage> findByPersonId(UUID personId, Pageable pageable);
    List<CompanionMessage> findTop60ByPersonIdOrderByCreatedAtDesc(UUID personId);

    @Modifying
    @Transactional
    void deleteByPersonId(UUID personId);
}
