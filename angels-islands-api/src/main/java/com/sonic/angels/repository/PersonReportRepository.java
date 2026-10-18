package com.sonic.angels.repository;

import com.sonic.angels.model.entity.PersonReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonReportRepository extends JpaRepository<PersonReport, UUID> {
    List<PersonReport> findByPersonIdOrderBySourceAsc(UUID personId);
    Optional<PersonReport> findByPersonIdAndSource(UUID personId, String source);

    @Modifying
    @Query("DELETE FROM PersonReport r WHERE r.person.id = :personId")
    int deleteByPersonId(@Param("personId") UUID personId);
}
