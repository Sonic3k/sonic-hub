package com.sonic.angels.repository;

import com.sonic.angels.model.entity.RankingEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RankingEntryRepository extends JpaRepository<RankingEntry, UUID> {

    @Query("SELECT e FROM RankingEntry e JOIN FETCH e.ranking r WHERE e.person.id = :personId ORDER BY r.board, r.takenOn, r.period, e.sortOrder")
    List<RankingEntry> findByPersonWithRanking(@Param("personId") UUID personId);

    @Query("SELECT e FROM RankingEntry e LEFT JOIN FETCH e.person WHERE e.ranking.id = :rankingId ORDER BY e.sortOrder")
    List<RankingEntry> findByRankingWithPerson(@Param("rankingId") UUID rankingId);

    /** Every row of every list of one board, in one query (the overview page reads a whole board at once). */
    @Query("SELECT e FROM RankingEntry e JOIN FETCH e.ranking r LEFT JOIN FETCH e.person WHERE r.board = :board ORDER BY e.sortOrder")
    List<RankingEntry> findByBoardWithPerson(@Param("board") String board);

    /** A person being deleted keeps their rows in old rankings, as a nick only. */
    @Modifying
    @Query("UPDATE RankingEntry e SET e.person = NULL WHERE e.person.id = :personId")
    int detachPerson(@Param("personId") UUID personId);
}
