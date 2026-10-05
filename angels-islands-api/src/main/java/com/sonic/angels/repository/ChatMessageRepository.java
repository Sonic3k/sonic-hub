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

    /** Everything but EMPTY rows (Yahoo lines whose emoticon was lost in the export). */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatArchive.id = :archiveId AND (m.kind IS NULL OR m.kind <> :hidden)")
    Page<ChatMessage> findVisibleByArchive(UUID archiveId, ChatMessage.Kind hidden, Pageable pageable);

    List<ChatMessage> findByChatArchiveIdAndExternalIdIn(UUID archiveId, java.util.Collection<String> externalIds);

    @Query("SELECT m.id, m.externalId FROM ChatMessage m WHERE m.chatArchive.id = :archiveId")
    List<Object[]> findIdAndExternalIdByArchive(UUID archiveId);

    /** [visible count, min timestamp, max timestamp] of one archive. */
    @Query("SELECT COUNT(m), MIN(m.timestamp), MAX(m.timestamp) FROM ChatMessage m " +
           "WHERE m.chatArchive.id = :archiveId AND (m.kind IS NULL OR m.kind <> :hidden)")
    List<Object[]> visibleStats(UUID archiveId, ChatMessage.Kind hidden);

    @Query("SELECT m.chatArchive.id, COUNT(m) FROM ChatMessage m WHERE m.chatArchive.id IN :archiveIds GROUP BY m.chatArchive.id")
    List<Object[]> countByArchiveIds(java.util.Collection<UUID> archiveIds);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.id IN :ids")
    int deleteByIds(java.util.Collection<UUID> ids);

    /** Bulk delete; their attachments go with them (ON DELETE CASCADE). */
    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.chatArchive.id = :archiveId")
    int deleteByArchiveId(UUID archiveId);

    Page<ChatMessage> findByChatArchiveIdAndContentContainingIgnoreCase(UUID archiveId, String q, Pageable pageable);
    long countByChatArchiveId(UUID archiveId);

    /** Random sample of one side's lines across all archives of a person — style reference for the companion. */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatArchive.person.id = :personId AND m.senderType = :senderType AND m.content <> '' ORDER BY FUNCTION('RANDOM')")
    List<ChatMessage> sampleByPersonAndSender(UUID personId, com.sonic.angels.model.entity.ChatMessage.SenderType senderType, org.springframework.data.domain.Pageable pageable);

    /** All messages (both sides) of a person across archives, global chronological-ish order. */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatArchive.person.id = :personId ORDER BY m.chatArchive.id, m.seq")
    List<ChatMessage> findAllByPersonOrdered(UUID personId);
}
