package com.sonic.angels.repository;

import com.sonic.angels.model.entity.MusicLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MusicLinkRepository extends JpaRepository<MusicLink, UUID> {
    List<MusicLink> findByTrackIdOrderBySortOrderAsc(UUID trackId);
}
