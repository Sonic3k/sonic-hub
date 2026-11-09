package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicPlaylist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusicPlaylistRepository extends JpaRepository<MusicPlaylist, UUID> {
    Optional<MusicPlaylist> findByExternalKey(String externalKey);

    @Query("SELECT p FROM MusicPlaylist p LEFT JOIN FETCH p.device LEFT JOIN FETCH p.event")
    List<MusicPlaylist> findAllWithRefs();
}
