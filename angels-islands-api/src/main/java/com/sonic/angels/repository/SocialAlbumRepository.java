package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialAlbum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialAlbumRepository extends JpaRepository<SocialAlbum, UUID> {

    Optional<SocialAlbum> findByExternalKey(String externalKey);

    @Query("SELECT a FROM SocialAlbum a LEFT JOIN FETCH a.cover WHERE a.profile.id = :id ORDER BY a.publishedAt DESC NULLS LAST")
    List<SocialAlbum> findByProfileId(UUID id);
}
