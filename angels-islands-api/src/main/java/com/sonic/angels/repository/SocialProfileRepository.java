package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialProfileRepository extends JpaRepository<SocialProfile, UUID> {

    Optional<SocialProfile> findByExternalKey(String externalKey);

    List<SocialProfile> findByExternalKeyIn(Collection<String> keys);

    Optional<SocialProfile> findByPlatformAndHandle(SocialProfile.Platform platform, String handle);

    @Query("SELECT p FROM SocialProfile p LEFT JOIN FETCH p.person WHERE p.id IN :ids")
    List<SocialProfile> findWithPersonByIdIn(Collection<UUID> ids);

    /** The accounts of the owner (the person marked isSelf), oldest first. */
    @Query("SELECT p FROM SocialProfile p JOIN p.person pe WHERE pe.isSelf = true AND p.platform = :platform " +
           "AND p.kind = com.sonic.angels.model.entity.SocialProfile.Kind.USER ORDER BY p.createdAt")
    List<SocialProfile> findSelf(SocialProfile.Platform platform);

    @Query("SELECT p FROM SocialProfile p LEFT JOIN FETCH p.person WHERE p.platform = :platform AND p.person.id IN :personIds " +
           "AND p.kind = com.sonic.angels.model.entity.SocialProfile.Kind.USER")
    List<SocialProfile> findUsersOfPersons(SocialProfile.Platform platform, Collection<UUID> personIds);

    @Query("SELECT p FROM SocialProfile p WHERE p.chatArchive.id IN :archiveIds")
    List<SocialProfile> findByChatArchiveIdIn(Collection<UUID> archiveIds);

    /** id, name of every account of a platform — for search and for knowing a sender by name. */
    @Query("SELECT p.id, p.name FROM SocialProfile p WHERE p.platform = :platform")
    List<Object[]> namesOf(SocialProfile.Platform platform);

    @Query("SELECT p.kind, p.level, COUNT(p) FROM SocialProfile p GROUP BY p.kind, p.level")
    List<Object[]> countByKindAndLevel();

    @Query("SELECT p.externalKey FROM SocialProfile p WHERE p.externalKey LIKE :prefix ORDER BY p.externalKey")
    List<String> keysLike(String prefix);
}
