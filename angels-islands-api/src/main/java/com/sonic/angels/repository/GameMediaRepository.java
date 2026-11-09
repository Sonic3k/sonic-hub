package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GameMediaRepository extends JpaRepository<GameMedia, UUID> {
    @Query("SELECT gm FROM GameMedia gm JOIN FETCH gm.media WHERE gm.game.id = :gameId ORDER BY gm.sortOrder, gm.createdAt")
    List<GameMedia> findByGame(@Param("gameId") UUID gameId);

    List<GameMedia> findByGameId(UUID gameId);
}
