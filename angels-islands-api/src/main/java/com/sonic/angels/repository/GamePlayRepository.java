package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GamePlay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GamePlayRepository extends JpaRepository<GamePlay, UUID> {
    @Query("SELECT p FROM GamePlay p LEFT JOIN FETCH p.device WHERE p.game.id = :gameId ORDER BY p.startAt, p.sortOrder")
    List<GamePlay> findByGame(@Param("gameId") UUID gameId);

    @Query("SELECT p FROM GamePlay p JOIN FETCH p.game LEFT JOIN FETCH p.device ORDER BY p.startAt")
    List<GamePlay> findAllWithDevice();

    List<GamePlay> findByGameId(UUID gameId);
}
