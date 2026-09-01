package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatArchive;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatArchiveRepository extends JpaRepository<ChatArchive, UUID> {
    List<ChatArchive> findByPersonId(UUID personId);

    @Query("SELECT a FROM ChatArchive a JOIN FETCH a.person WHERE a.id = :id")
    Optional<ChatArchive> findWithPerson(java.util.UUID id);
}
