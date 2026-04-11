package com.sonic.angels.repository;

import com.sonic.angels.model.entity.LifeChapter;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LifeChapterRepository extends JpaRepository<LifeChapter, UUID> {
    List<LifeChapter> findByPersonIdOrderBySortOrderAsc(UUID personId);
}
