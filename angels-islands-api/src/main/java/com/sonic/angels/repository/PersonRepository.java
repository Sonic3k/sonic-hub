package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Person;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonRepository extends JpaRepository<Person, UUID> {
    java.util.Optional<Person> findByIsSelfTrue();

    /** Person is the inverse side of these ManyToMany joins — Hibernate won't clean them on delete. */
    @Modifying
    @Query(value = "DELETE FROM media_file_persons WHERE person_id = :personId", nativeQuery = true)
    void clearMediaLinks(java.util.UUID personId);

    @Modifying
    @Query(value = "DELETE FROM collection_persons WHERE person_id = :personId", nativeQuery = true)
    void clearCollectionLinks(java.util.UUID personId);
}
