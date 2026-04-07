package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Episode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, Long> {
    List<Episode> findByPersonIdOrderByOccurredAtDesc(Long personId);
    List<Episode> findByPersonIdAndImportanceGreaterThanEqual(Long personId, Integer importance);
}
