package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatAttachment;
import com.sonic.angels.model.entity.ImportSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ChatAttachmentRepository extends JpaRepository<ChatAttachment, UUID> {

    List<ChatAttachment> findByMessageIdIn(Collection<UUID> messageIds);

    /** Row for ChatAttachmentDto.Item.of — attachment, its stored file (if any) and its message, in one query. */
    String ITEM = "SELECT a.id, m.id, a.type, a.fileName, a.url, s.id, s.contentType, s.sizeBytes, m.timestamp, m.senderType, m.seq " +
                  "FROM ChatAttachment a JOIN a.message m LEFT JOIN a.importSource s ";

    /** Attachments of these messages of one archive, in conversation order. */
    @Query(ITEM + "WHERE m.chatArchive.id = :archiveId AND m.id IN :messageIds ORDER BY m.seq, a.id")
    List<Object[]> itemsOfMessages(UUID archiveId, Collection<UUID> messageIds);

    /** One archive's attachments of the given types, a page at a time (order comes with the pageable). */
    @Query(value = ITEM + "WHERE m.chatArchive.id = :archiveId AND a.type IN :types",
           countQuery = "SELECT COUNT(a) FROM ChatAttachment a WHERE a.message.chatArchive.id = :archiveId AND a.type IN :types")
    Page<Object[]> itemsOfArchive(UUID archiveId, Collection<ChatAttachment.Type> types, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ChatAttachment a WHERE a.message.id IN :messageIds")
    int deleteByMessageIds(Collection<UUID> messageIds);

    /** Point every attachment that came from this raw file at its stored copy. */
    @Modifying
    @Query("UPDATE ChatAttachment a SET a.importSource = :source " +
           "WHERE a.sourceLabel = :label AND a.sourcePath = :path AND (a.importSource IS NULL OR a.importSource <> :source)")
    int linkSource(ImportSource source, String label, String path);

    long countByImportSourceIsNotNull();

    long countBySourcePathIsNotNull();
}
