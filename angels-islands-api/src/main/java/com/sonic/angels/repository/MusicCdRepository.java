package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicCd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusicCdRepository extends JpaRepository<MusicCd, UUID> {
    Optional<MusicCd> findByExternalKey(String externalKey);

    @Query("SELECT c FROM MusicCd c LEFT JOIN FETCH c.album al LEFT JOIN FETCH al.artist")
    List<MusicCd> findAllWithAlbum();

    @Query("SELECT c FROM MusicCd c LEFT JOIN FETCH c.album al LEFT JOIN FETCH al.artist WHERE al.id = :albumId")
    List<MusicCd> findByAlbum(@Param("albumId") UUID albumId);
}
