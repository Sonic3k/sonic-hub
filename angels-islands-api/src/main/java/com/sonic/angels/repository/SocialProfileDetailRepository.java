package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialProfileDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SocialProfileDetailRepository extends JpaRepository<SocialProfileDetail, UUID> {

    @Query("SELECT d FROM SocialProfileDetail d LEFT JOIN FETCH d.related WHERE d.profile.id = :id " +
           "ORDER BY d.kind, d.sortOrder NULLS LAST, d.startDate DESC NULLS LAST")
    List<SocialProfileDetail> findByProfileId(UUID id);

    @Query("SELECT d FROM SocialProfileDetail d WHERE d.profile.id IN :ids AND d.kind = :kind")
    List<SocialProfileDetail> findByProfileIdInAndKind(Collection<UUID> ids, SocialProfileDetail.Kind kind);

    /** Rows holding any of these keys, whichever profile they are on (a key is unique across all profiles). */
    List<SocialProfileDetail> findByExternalKeyIn(Collection<String> keys);
}
