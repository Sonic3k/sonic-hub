package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialProfile;
import com.sonic.angels.model.entity.SocialProfileName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SocialProfileNameRepository extends JpaRepository<SocialProfileName, UUID> {

    @Query("SELECT n FROM SocialProfileName n WHERE n.profile.id IN :ids")
    List<SocialProfileName> findByProfileIdIn(Collection<UUID> ids);

    @Query("SELECT n FROM SocialProfileName n WHERE n.profile.id = :id ORDER BY n.validFrom NULLS FIRST")
    List<SocialProfileName> findByProfileId(UUID id);

    /** profile id, name of every name window on a platform. */
    @Query("SELECT n.profile.id, n.name FROM SocialProfileName n WHERE n.profile.platform = :platform")
    List<Object[]> namesOf(SocialProfile.Platform platform);

    /** Rows holding any of these keys, whichever profile they are on (a key is unique across all profiles). */
    List<SocialProfileName> findByExternalKeyIn(Collection<String> keys);
}
