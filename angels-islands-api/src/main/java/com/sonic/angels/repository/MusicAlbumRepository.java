package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicAlbum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusicAlbumRepository extends JpaRepository<MusicAlbum, UUID> {
    Optional<MusicAlbum> findByExternalKey(String externalKey);

    @Query("SELECT a FROM MusicAlbum a LEFT JOIN FETCH a.artist")
    List<MusicAlbum> findAllWithArtist();

    @Query("SELECT a FROM MusicAlbum a LEFT JOIN FETCH a.artist WHERE a.artist.id = :artistId")
    List<MusicAlbum> findByArtist(@Param("artistId") UUID artistId);
}
