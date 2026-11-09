package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicTrackEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MusicTrackEventRepository extends JpaRepository<MusicTrackEvent, UUID> {
    @Query("SELECT m FROM MusicTrackEvent m JOIN FETCH m.event WHERE m.track.id = :trackId ORDER BY m.sortOrder")
    List<MusicTrackEvent> findByTrack(@Param("trackId") UUID trackId);

    List<MusicTrackEvent> findByTrackId(UUID trackId);
}
