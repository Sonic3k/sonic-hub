package com.sonic.angels.repository;

import com.sonic.angels.model.entity.LifeChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LifeChapterRepository extends JpaRepository<LifeChapter, Long> {
    List<LifeChapter> findByPersonIdOrderBySortOrderAsc(Long personId);
}
