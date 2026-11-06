package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialConnectionRepository extends JpaRepository<SocialConnection, UUID> {

    String AT = " AND (c.validFrom IS NULL OR c.validFrom <= :t) AND (c.validTo IS NULL OR c.validTo > :t)";

    Optional<SocialConnection> findByExternalKey(String externalKey);

    List<SocialConnection> findByExternalKeyIn(Collection<String> keys);

    /** Links from or to a profile that stand at T, of the given kinds. */
    @Query("SELECT c FROM SocialConnection c JOIN FETCH c.from JOIN FETCH c.to WHERE (c.from.id = :pid OR c.to.id = :pid) AND c.kind IN :kinds" + AT)
    List<SocialConnection> touching(UUID pid, Collection<SocialConnection.Kind> kinds, LocalDateTime t);

    /** Links from a profile that stand at T. */
    @Query("SELECT c FROM SocialConnection c JOIN FETCH c.to WHERE c.from.id = :pid AND c.kind IN :kinds" + AT)
    List<SocialConnection> from(UUID pid, Collection<SocialConnection.Kind> kinds, LocalDateTime t);

    /** Links to a profile that stand at T (members of a group, likes of a page). */
    @Query("SELECT c FROM SocialConnection c JOIN FETCH c.from WHERE c.to.id = :pid AND c.kind IN :kinds" + AT)
    List<SocialConnection> to(UUID pid, Collection<SocialConnection.Kind> kinds, LocalDateTime t);

    /** Every link of a profile, whatever the time — for raw reads. */
    @Query("SELECT c FROM SocialConnection c JOIN FETCH c.from JOIN FETCH c.to WHERE c.from.id = :pid OR c.to.id = :pid ORDER BY c.kind, c.validFrom NULLS FIRST")
    List<SocialConnection> allOf(UUID pid);
}
