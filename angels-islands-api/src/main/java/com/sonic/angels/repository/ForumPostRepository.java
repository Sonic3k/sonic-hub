package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ForumPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ForumPostRepository extends JpaRepository<ForumPost, UUID> {
    List<ForumPost> findByThreadIdOrderBySortOrderAsc(UUID threadId);

    @Modifying
    @Query("delete from ForumPost p where p.thread.id = :threadId")
    void deleteByThreadId(UUID threadId);
}
