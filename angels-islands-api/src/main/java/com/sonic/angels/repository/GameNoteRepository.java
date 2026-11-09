package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface GameNoteRepository extends JpaRepository<GameNote, UUID> {
    @Query("SELECT gn FROM GameNote gn JOIN FETCH gn.note WHERE gn.game.id = :gameId ORDER BY gn.sortOrder")
    List<GameNote> findByGame(@Param("gameId") UUID gameId);

    List<GameNote> findByGameId(UUID gameId);
}
