package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ForumMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ForumMemberRepository extends JpaRepository<ForumMember, UUID> {
    List<ForumMember> findByForumId(UUID forumId);
    Optional<ForumMember> findByForumIdAndNickLower(UUID forumId, String nickLower);
}
