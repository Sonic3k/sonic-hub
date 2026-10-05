package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ImportSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportSourceRepository extends JpaRepository<ImportSource, UUID> {

    Optional<ImportSource> findByLabelAndPath(String label, String path);

    List<ImportSource> findByLabelAndPathIn(String label, Collection<String> paths);

    /** [label, file count, total bytes] per label. */
    @Query("SELECT s.label, COUNT(s), COALESCE(SUM(s.sizeBytes), 0) FROM ImportSource s GROUP BY s.label ORDER BY s.label")
    List<Object[]> totalsByLabel();
}
