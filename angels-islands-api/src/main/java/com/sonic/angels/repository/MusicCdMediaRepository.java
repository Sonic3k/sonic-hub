package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicCdMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface MusicCdMediaRepository extends JpaRepository<MusicCdMedia, UUID> {
    @Query("SELECT m FROM MusicCdMedia m JOIN FETCH m.media WHERE m.cd.id IN :cdIds ORDER BY m.sortOrder, m.createdAt")
    List<MusicCdMedia> findByCds(@Param("cdIds") Collection<UUID> cdIds);

    List<MusicCdMedia> findByCdId(UUID cdId);
}
