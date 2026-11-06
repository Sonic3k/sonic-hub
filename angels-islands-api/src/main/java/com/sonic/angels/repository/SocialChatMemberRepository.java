package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialChatMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialChatMemberRepository extends JpaRepository<SocialChatMember, UUID> {

    Optional<SocialChatMember> findByExternalKey(String externalKey);

    List<SocialChatMember> findByExternalKeyIn(Collection<String> keys);

    @Query("SELECT m FROM SocialChatMember m JOIN FETCH m.profile WHERE m.archive.id IN :archiveIds ORDER BY m.validFrom NULLS FIRST")
    List<SocialChatMember> findByArchiveIdIn(Collection<UUID> archiveIds);
}
