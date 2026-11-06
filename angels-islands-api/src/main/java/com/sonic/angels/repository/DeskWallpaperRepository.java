package com.sonic.angels.repository;

import com.sonic.angels.model.entity.DeskWallpaper;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeskWallpaperRepository extends JpaRepository<DeskWallpaper, UUID> {
    Optional<DeskWallpaper> findByExternalKey(String externalKey);
    List<DeskWallpaper> findByExternalKeyIn(Collection<String> keys);
    /** Every row with what it points at, for the in-memory picture of the devices. */
    @Query("SELECT w FROM DeskWallpaper w JOIN FETCH w.device LEFT JOIN FETCH w.mediaFile")
    List<DeskWallpaper> loadAll();
}
