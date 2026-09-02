package com.sonic.angels.repository;

import com.sonic.angels.model.entity.TelegramCompanionSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TelegramCompanionSessionRepository extends JpaRepository<TelegramCompanionSession, Long> {
}
