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

    /** Every row of a seq range, EMPTY ones too (what the importer and the move tool work with). */
    List<ChatMessage> findByChatArchiveIdAndSeqBetweenOrderBySeqAsc(UUID archiveId, Integer fromSeq, Integer toSeq, Pageable pageable);

    Page<ChatMessage> findByChatArchiveId(UUID archiveId, Pageable pageable);

    /** Everything but EMPTY rows (Yahoo lines whose emoticon was lost in the export). */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatArchive.id = :archiveId AND (m.kind IS NULL OR m.kind <> :hidden) AND m.seq < :seq")
    long countVisibleBefore(UUID archiveId, ChatMessage.Kind hidden, int seq);

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

    // ── Messenger at a moment (Social Media portal) ──────────────────────────

    /** archive id, seq, sender, sender_type, kind, content, timestamp — the last visible message of each archive by T. */
    @Query(value = "SELECT a.id, m.seq, m.sender, m.sender_type, m.kind, m.content, m.timestamp FROM chat_archives a " +
        "CROSS JOIN LATERAL (SELECT x.seq, x.sender, x.sender_type, x.kind, x.content, x.timestamp FROM chat_messages x " +
        "WHERE x.chat_archive_id = a.id AND x.timestamp <= :t AND (x.kind IS NULL OR x.kind <> 'EMPTY') " +
        "ORDER BY x.timestamp DESC, x.seq DESC LIMIT 1) m WHERE a.id IN (:ids)", nativeQuery = true)
    List<Object[]> lastVisibleBy(java.util.Collection<UUID> ids, java.time.LocalDateTime t);

    /** Visible messages of one archive by T, newest first; before a seq when given. */
    @Query("SELECT m FROM ChatMessage m WHERE m.chatArchive.id = :archiveId AND (m.kind IS NULL OR m.kind <> :hidden) " +
           "AND (m.timestamp IS NULL OR m.timestamp <= :t) AND (:hasBefore = false OR m.seq < :before) ORDER BY m.seq DESC")
    List<ChatMessage> pageBefore(UUID archiveId, ChatMessage.Kind hidden, java.time.LocalDateTime t, boolean hasBefore, int before, Pageable page);

    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.chatArchive.id = :archiveId AND (m.kind IS NULL OR m.kind <> :hidden) " +
           "AND (m.timestamp IS NULL OR m.timestamp <= :t)")
    long countVisibleBy(UUID archiveId, ChatMessage.Kind hidden, java.time.LocalDateTime t);

    /** archive id, how many different people other than the owner wrote in it — two or more is a group chat. */
    @Query(value = "SELECT chat_archive_id, COUNT(DISTINCT sender) FROM chat_messages WHERE chat_archive_id IN (:ids) " +
        "AND sender_type NOT IN ('SELF', 'SYSTEM') GROUP BY chat_archive_id", nativeQuery = true)
    List<Object[]> otherSenderCounts(java.util.Collection<UUID> ids);

    /** sender, sender type, messages, first time — everyone who wrote in an archive by T. */
    @Query("SELECT m.sender, m.senderType, COUNT(m), MIN(m.timestamp) FROM ChatMessage m WHERE m.chatArchive.id = :archiveId " +
           "AND (m.timestamp IS NULL OR m.timestamp <= :t) GROUP BY m.sender, m.senderType")
    List<Object[]> sendersOf(UUID archiveId, java.time.LocalDateTime t);

    /** The time of the first message at or after a seq — a random spot in a conversation. */
    @Query(value = "SELECT timestamp FROM chat_messages WHERE chat_archive_id = :archiveId AND seq >= :seq AND timestamp IS NOT NULL " +
        "ORDER BY seq LIMIT 1", nativeQuery = true)
    List<Object> timeAtOrAfter(UUID archiveId, int seq);

    // ── The desktop at a moment ──────────────────────────────────────────────

    /** Archives among these with a message in (from, to] — who was "online" around a moment. */
    @Query("SELECT DISTINCT m.chatArchive.id FROM ChatMessage m WHERE m.chatArchive.id IN :ids AND m.timestamp > :from AND m.timestamp <= :to")
    List<UUID> activeBetween(java.util.Collection<UUID> ids, java.time.LocalDateTime from, java.time.LocalDateTime to);

    /** archive id, platform, sender, content, kind, timestamp, seq — messages from others that came in during (from, t], newest first. */
    @Query(value = "SELECT a.id, a.platform, m.sender, m.content, m.kind, m.timestamp, m.seq FROM chat_messages m " +
        "JOIN chat_archives a ON a.id = m.chat_archive_id WHERE m.timestamp > :from AND m.timestamp <= :t " +
        "AND m.sender_type = 'PERSON' AND (m.kind IS NULL OR m.kind <> 'EMPTY') AND (a.external_key IS NULL OR a.external_key NOT LIKE 'fbwall:%') " +
        "ORDER BY m.timestamp DESC LIMIT :n", nativeQuery = true)
    List<Object[]> arrivedBy(java.time.LocalDateTime from, java.time.LocalDateTime t, int n);

    /** The seq of the first visible message at or after a time — where to open a conversation for a moment. */
    @Query(value = "SELECT seq FROM chat_messages WHERE chat_archive_id = :archiveId AND timestamp >= :t " +
        "AND (kind IS NULL OR kind <> 'EMPTY') ORDER BY timestamp, seq LIMIT 1", nativeQuery = true)
    List<Object> seqAtOrAfter(UUID archiveId, java.time.LocalDateTime t);
}
