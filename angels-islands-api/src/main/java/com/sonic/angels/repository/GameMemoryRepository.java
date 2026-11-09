package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GameMemoryRepository extends JpaRepository<GameMemory, UUID> {
    @Query("SELECT gm FROM GameMemory gm JOIN FETCH gm.episode WHERE gm.game.id = :gameId ORDER BY gm.sortOrder")
    List<GameMemory> findByGame(@Param("gameId") UUID gameId);

    List<GameMemory> findByGameId(UUID gameId);
}
