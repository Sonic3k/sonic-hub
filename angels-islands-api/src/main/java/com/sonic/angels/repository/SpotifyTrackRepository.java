package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SpotifyTrack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SpotifyTrackRepository extends JpaRepository<SpotifyTrack, UUID> {
}
