package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SpotifyPlay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SpotifyPlayRepository extends JpaRepository<SpotifyPlay, UUID> {
}
