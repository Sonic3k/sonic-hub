package com.sonic.angels.repository;

import com.sonic.angels.model.entity.SocialPostTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SocialPostTagRepository extends JpaRepository<SocialPostTag, UUID> {

    @Query("SELECT t FROM SocialPostTag t JOIN FETCH t.profile WHERE t.post.id IN :postIds ORDER BY t.position NULLS LAST")
    List<SocialPostTag> findByPostIdIn(Collection<UUID> postIds);
}
