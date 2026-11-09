package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicTrackMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MusicTrackMemoryRepository extends JpaRepository<MusicTrackMemory, UUID> {
    @Query("SELECT m FROM MusicTrackMemory m JOIN FETCH m.episode WHERE m.track.id = :trackId ORDER BY m.sortOrder")
    List<MusicTrackMemory> findByTrack(@Param("trackId") UUID trackId);

    List<MusicTrackMemory> findByTrackId(UUID trackId);
}
