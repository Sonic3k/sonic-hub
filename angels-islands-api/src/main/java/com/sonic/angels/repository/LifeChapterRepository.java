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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM LifeChapter x WHERE x.person.id = :personId AND x.source = :source")
    int deleteByPersonAndSource(@org.springframework.data.repository.query.Param("personId") UUID personId,
                                @org.springframework.data.repository.query.Param("source") String source);
}
