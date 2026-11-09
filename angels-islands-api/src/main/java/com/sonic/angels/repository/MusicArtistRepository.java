package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicArtist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusicArtistRepository extends JpaRepository<MusicArtist, UUID> {
    Optional<MusicArtist> findByExternalKey(String externalKey);

    @Query("SELECT a FROM MusicArtist a LEFT JOIN FETCH a.parent")
    List<MusicArtist> findAllWithParent();
}
