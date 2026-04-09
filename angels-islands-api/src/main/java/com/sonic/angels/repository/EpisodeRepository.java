package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Episode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, UUID> {
    List<Episode> findByPersonIdOrderByOccurredAtDesc(UUID personId);
    List<Episode> findByPersonIdAndImportanceGreaterThanEqual(UUID personId, Integer importance);
}
