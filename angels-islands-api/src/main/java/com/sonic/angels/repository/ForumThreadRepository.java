package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ForumThread;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ForumThreadRepository extends JpaRepository<ForumThread, UUID> {
    Optional<ForumThread> findByForumIdAndExternalKey(UUID forumId, String externalKey);

    /** a deleted thread leaves the memories that quote it: the words stay, only the link goes */
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE episode_sources SET forum_thread_id = NULL WHERE forum_thread_id = :id", nativeQuery = true)
    int detachEpisodeSources(@org.springframework.data.repository.query.Param("id") java.util.UUID id);
}
