package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameMatchPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GameMatchPlayerRepository extends JpaRepository<GameMatchPlayer, UUID> {
    /** everyone in every match of one game, each side in the record's order */
    @Query("SELECT p FROM GameMatchPlayer p WHERE p.match.game.id = :gameId ORDER BY p.side, p.position")
    List<GameMatchPlayer> findByGame(@Param("gameId") UUID gameId);

    @Modifying
    @Query("DELETE FROM GameMatchPlayer p WHERE p.match.id IN (SELECT m.id FROM GameMatch m WHERE m.game.id = :gameId)")
    void deleteByGame(@Param("gameId") UUID gameId);
}
