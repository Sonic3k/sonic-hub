package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ForumThread;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ForumThreadRepository extends JpaRepository<ForumThread, UUID> {
    Optional<ForumThread> findByForumIdAndExternalKey(UUID forumId, String externalKey);
}
