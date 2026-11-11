package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SpotifySong;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SpotifySongRepository extends JpaRepository<SpotifySong, UUID> {
}
