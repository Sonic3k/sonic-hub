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

    /** [person_id, value]: one column of a board's sheets (a key of the rows' metrics) per person, as the latest sheet
     *  that has a value for them gives it — "year" of the relationship board is the year he got to know each of them.
     *  Re-scored copies of a sheet (variants) are left out; rows of someone with no page here have no person. */
    @Query(value = "SELECT DISTINCT ON (e.person_id) e.person_id, e.metrics ->> :key " +
        "FROM ranking_entries e JOIN rankings r ON r.id = e.ranking_id " +
        "WHERE r.board = :board AND r.variant = '' AND e.person_id IS NOT NULL AND COALESCE(e.metrics ->> :key, '') <> '' " +
        "ORDER BY e.person_id, r.taken_on DESC NULLS LAST, r.period DESC", nativeQuery = true)
    List<Object[]> latestColumn(@Param("board") String board, @Param("key") String key);

    /** A person being deleted keeps their rows in old rankings, as a nick only. */
    @Modifying
    @Query("UPDATE RankingEntry e SET e.person = NULL WHERE e.person.id = :personId")
    int detachPerson(@Param("personId") UUID personId);
}
