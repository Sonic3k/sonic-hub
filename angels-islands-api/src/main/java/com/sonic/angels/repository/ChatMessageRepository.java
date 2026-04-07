package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatArchiveIdOrderByTimestampAsc(Long archiveId);
    long countByChatArchiveId(Long archiveId);
}
