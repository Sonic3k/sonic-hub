package com.sonic.angels.repository;

import com.sonic.angels.model.entity.CompanionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanionConfigRepository extends JpaRepository<CompanionConfig, UUID> {
    Optional<CompanionConfig> findByPersonId(UUID personId);

    @Query("SELECT c FROM CompanionConfig c JOIN FETCH c.person WHERE c.enabled = true")
    List<CompanionConfig> findAllEnabled();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByPersonId(UUID personId);
}
