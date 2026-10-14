package com.sonic.angels.repository;

import com.sonic.angels.model.entity.TuViReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface TuViReadingRepository extends JpaRepository<TuViReading, UUID> {

    List<TuViReading> findByProfileIdOrderByCreatedAtDesc(UUID profileId);

    @Modifying
    @Transactional
    void deleteByProfileId(UUID profileId);

    /** The older reading of the same chart, scope and year, before a new one is stored. */
    @Modifying
    @Transactional
    void deleteByProfileIdAndScopeAndViewYear(UUID profileId, String scope, int viewYear);
}
