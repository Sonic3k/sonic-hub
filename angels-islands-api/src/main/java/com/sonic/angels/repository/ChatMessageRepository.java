package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatMessage;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByChatArchiveIdOrderByTimestampAsc(UUID archiveId);
    long countByChatArchiveId(UUID archiveId);
}
