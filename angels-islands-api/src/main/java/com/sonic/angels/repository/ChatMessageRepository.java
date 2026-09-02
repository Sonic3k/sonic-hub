package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatMessage;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByChatArchiveIdOrderBySeqAsc(UUID archiveId);

    Page<ChatMessage> findByChatArchiveId(UUID archiveId, Pageable pageable);

    Page<ChatMessage> findByChatArchiveIdAndContentContainingIgnoreCase(UUID archiveId, String q, Pageable pageable);
    long countByChatArchiveId(UUID archiveId);

    /** Random sample of one side's lines across all archives of a person — style reference for the companion. */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatArchive.person.id = :personId AND m.senderType = :senderType ORDER BY FUNCTION('RANDOM')")
    List<ChatMessage> sampleByPersonAndSender(UUID personId, com.sonic.angels.model.entity.ChatMessage.SenderType senderType, org.springframework.data.domain.Pageable pageable);
}
