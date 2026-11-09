package com.sonic.angels.repository;

import com.sonic.angels.model.entity.GamePackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GamePackageRepository extends JpaRepository<GamePackage, UUID> {
    @Query("SELECT p FROM GamePackage p JOIN FETCH p.game WHERE p.externalKey = :key")
    Optional<GamePackage> findByKey(@org.springframework.data.repository.query.Param("key") String key);

    Optional<GamePackage> findByExternalKey(String externalKey);

    List<GamePackage> findByGameIdOrderBySortOrderAsc(UUID gameId);

    @Query("SELECT p FROM GamePackage p JOIN FETCH p.game")
    List<GamePackage> findAllWithGame();
}
