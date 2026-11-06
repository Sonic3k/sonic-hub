package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialMediaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialMediaItemRepository extends JpaRepository<SocialMediaItem, UUID> {

    @Query("SELECT s FROM SocialMediaItem s JOIN FETCH s.mediaFile WHERE s.externalKey = :key")
    Optional<SocialMediaItem> findByExternalKey(String key);

    @Query("SELECT s FROM SocialMediaItem s JOIN FETCH s.mediaFile WHERE s.externalKey IN :keys")
    List<SocialMediaItem> findByExternalKeyIn(Collection<String> keys);

    /** media file id, key — to give each picture in a read its key back. */
    @Query("SELECT s.mediaFile.id, s.externalKey FROM SocialMediaItem s WHERE s.mediaFile.id IN :mediaIds")
    List<Object[]> keysOf(Collection<UUID> mediaIds);

    long count();
}
