package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GameSeries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GameSeriesRepository extends JpaRepository<GameSeries, UUID> {
    Optional<GameSeries> findByExternalKey(String externalKey);
}
