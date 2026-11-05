package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialProfileImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SocialProfileImageRepository extends JpaRepository<SocialProfileImage, UUID> {

    @Query("SELECT i FROM SocialProfileImage i JOIN FETCH i.mediaFile WHERE i.profile.id IN :ids")
    List<SocialProfileImage> findByProfileIdIn(Collection<UUID> ids);

    @Query("SELECT i FROM SocialProfileImage i JOIN FETCH i.mediaFile LEFT JOIN FETCH i.post WHERE i.profile.id = :id " +
           "ORDER BY i.kind, i.validFrom NULLS FIRST")
    List<SocialProfileImage> findByProfileId(UUID id);

    @Query("SELECT i FROM SocialProfileImage i WHERE i.post.id IN :postIds")
    List<SocialProfileImage> findByPostIdIn(Collection<UUID> postIds);

    /** Rows holding any of these keys, whichever profile they are on (a key is unique across all profiles). */
    List<SocialProfileImage> findByExternalKeyIn(Collection<String> keys);
}
