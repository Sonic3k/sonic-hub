package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Dream;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Dreams are listed by DreamService in one SQL statement (a list never reads them one by one). */
public interface DreamRepository extends JpaRepository<Dream, UUID> {
}
