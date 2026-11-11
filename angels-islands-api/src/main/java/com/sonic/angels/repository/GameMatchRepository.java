package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameMatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GameMatchRepository extends JpaRepository<GameMatch, UUID> {
    List<GameMatch> findByGameIdOrderByPlayedAtAscExternalKeyAsc(UUID gameId);

    boolean existsByGameId(UUID gameId);
}
