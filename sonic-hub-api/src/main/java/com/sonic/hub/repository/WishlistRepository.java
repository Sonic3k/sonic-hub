package com.sonic.hub.repository;

import com.sonic.hub.model.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WishlistRepository extends JpaRepository<Wishlist, UUID> {

    List<Wishlist> findByArchivedOrderByCreatedAtDesc(boolean archived);

    List<Wishlist> findByCategoryAndArchivedOrderByCreatedAtDesc(String category, boolean archived);

    List<Wishlist> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}
