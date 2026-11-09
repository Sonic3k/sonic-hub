package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GameRepository extends JpaRepository<Game, UUID> {
    Optional<Game> findByExternalKey(String externalKey);

    /** every game with its series and the game it comes from, in one read */
    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.series LEFT JOIN FETCH g.basedOn")
    List<Game> findAllWithSeries();
}
