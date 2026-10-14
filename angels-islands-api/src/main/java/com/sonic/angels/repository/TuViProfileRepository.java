package com.sonic.angels.repository;

import com.sonic.angels.model.entity.TuViProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TuViProfileRepository extends JpaRepository<TuViProfile, UUID> {

    @EntityGraph(attributePaths = "person")
    List<TuViProfile> findAllByOrderByUpdatedAtDesc();

    /** A person being deleted leaves their charts behind, belonging to no one. */
    @Modifying
    @Query("update TuViProfile p set p.person = null where p.person.id = :personId")
    int detachPerson(@Param("personId") UUID personId);
}
