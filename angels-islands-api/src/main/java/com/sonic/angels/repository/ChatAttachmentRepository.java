package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatAttachment;
import com.sonic.angels.model.entity.ImportSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ChatAttachmentRepository extends JpaRepository<ChatAttachment, UUID> {

    List<ChatAttachment> findByMessageIdIn(Collection<UUID> messageIds);

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
