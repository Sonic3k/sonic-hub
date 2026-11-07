package com.sonic.angels.repository;

import com.sonic.angels.model.entity.LifeEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LifeEventRepository extends JpaRepository<LifeEvent, UUID> {

    List<LifeEvent> findByPersonIdOrderByStartAtAsc(UUID personId);

    List<LifeEvent> findByPersonIdAndSource(UUID personId, String source);

    List<LifeEvent> findByParentIdOrderByStartAtAsc(UUID parentId);

    @Modifying
    @Query(value = "DELETE FROM life_event_persons WHERE person_id = :personId", nativeQuery = true)
    void unlinkPerson(@Param("personId") UUID personId);
}
