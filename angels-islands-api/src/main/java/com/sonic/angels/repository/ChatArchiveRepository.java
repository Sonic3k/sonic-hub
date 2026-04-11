package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatArchive;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatArchiveRepository extends JpaRepository<ChatArchive, UUID> {
    List<ChatArchive> findByPersonId(UUID personId);
}
