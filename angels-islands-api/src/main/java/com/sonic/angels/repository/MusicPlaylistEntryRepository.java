package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicPlaylistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MusicPlaylistEntryRepository extends JpaRepository<MusicPlaylistEntry, UUID> {
    List<MusicPlaylistEntry> findByPlaylistId(UUID playlistId);

    @Query("SELECT e FROM MusicPlaylistEntry e JOIN FETCH e.playlist WHERE e.track.id = :trackId")
    List<MusicPlaylistEntry> findByTrack(@Param("trackId") UUID trackId);

    @Query("SELECT e FROM MusicPlaylistEntry e WHERE e.playlist.id IN :ids ORDER BY e.position NULLS LAST")
    List<MusicPlaylistEntry> findByPlaylists(@Param("ids") Collection<UUID> ids);
}
