package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GameLinkRepository extends JpaRepository<GameLink, UUID> {
    List<GameLink> findByGameIdOrderBySortOrderAsc(UUID gameId);
}
