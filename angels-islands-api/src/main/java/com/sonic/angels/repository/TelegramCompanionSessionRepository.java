package com.sonic.angels.repository;

import com.sonic.angels.model.entity.TelegramCompanionSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TelegramCompanionSessionRepository extends JpaRepository<TelegramCompanionSession, Long> {

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM TelegramCompanionSession s WHERE s.personId = :personId")
    void deleteByPersonId(java.util.UUID personId);
}
