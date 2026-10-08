package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Ranking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RankingRepository extends JpaRepository<Ranking, UUID> {
    Optional<Ranking> findByBoardAndPeriodAndVariant(String board, String period, String variant);

    List<Ranking> findByBoardOrderByTakenOnAscPeriodAsc(String board);

    List<Ranking> findAllByOrderByBoardAscTakenOnAscPeriodAsc();

    /** ranking id -> number of rows, for every ranking. */
    @Query("SELECT e.ranking.id, COUNT(e) FROM RankingEntry e GROUP BY e.ranking.id")
    List<Object[]> entryCounts();
}
