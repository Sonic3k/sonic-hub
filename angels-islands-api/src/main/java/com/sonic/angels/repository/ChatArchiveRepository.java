package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatArchive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatArchiveRepository extends JpaRepository<ChatArchive, Long> {
    List<ChatArchive> findByPersonId(Long personId);
}
