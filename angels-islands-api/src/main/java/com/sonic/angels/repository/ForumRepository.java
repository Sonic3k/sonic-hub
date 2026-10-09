package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Forum;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ForumRepository extends JpaRepository<Forum, UUID> {
    Optional<Forum> findByKey(String key);
}
