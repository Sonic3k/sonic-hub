package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatMessage;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByChatArchiveIdOrderBySeqAsc(UUID archiveId);

    Page<ChatMessage> findByChatArchiveId(UUID archiveId, Pageable pageable);

    Page<ChatMessage> findByChatArchiveIdAndContentContainingIgnoreCase(UUID archiveId, String q, Pageable pageable);
    long countByChatArchiveId(UUID archiveId);
}
