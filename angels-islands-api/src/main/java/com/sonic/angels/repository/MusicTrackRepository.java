package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusicTrackRepository extends JpaRepository<MusicTrack, UUID> {
    Optional<MusicTrack> findByExternalKey(String externalKey);

    /** every recording with its artist, album (and the album's artist) and the recording it is a version of */
    @Query("SELECT t FROM MusicTrack t LEFT JOIN FETCH t.artist LEFT JOIN FETCH t.album al LEFT JOIN FETCH al.artist LEFT JOIN FETCH t.versionOf")
    List<MusicTrack> findAllFull();

    @Query("SELECT t FROM MusicTrack t LEFT JOIN FETCH t.artist LEFT JOIN FETCH t.album al LEFT JOIN FETCH al.artist LEFT JOIN FETCH t.versionOf WHERE t.id IN :ids")
    List<MusicTrack> findFullByIds(@Param("ids") Collection<UUID> ids);

    List<MusicTrack> findByVersionOfId(UUID versionOfId);
}
