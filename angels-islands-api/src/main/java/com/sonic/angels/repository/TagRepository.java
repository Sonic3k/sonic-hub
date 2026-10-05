package com.sonic.angels.repository;

import com.sonic.angels.model.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {
    Optional<Tag> findByName(String name);

    /** id, name, color, media count, album count, note count — most-used first. */
    @org.springframework.data.jpa.repository.Query(value = "SELECT t.id, t.name, t.color, " +
        "(SELECT COUNT(*) FROM media_file_tags x WHERE x.tag_id = t.id), " +
        "(SELECT COUNT(*) FROM collection_tags x WHERE x.tag_id = t.id), " +
        "(SELECT COUNT(*) FROM journal_note_tags x WHERE x.tag_id = t.id) " +
        "FROM tags t ORDER BY 4 DESC, t.name", nativeQuery = true)
    java.util.List<Object[]> stats();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM media_file_tags WHERE tag_id = :id", nativeQuery = true)
    void unlinkMedia(java.util.UUID id);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM collection_tags WHERE tag_id = :id", nativeQuery = true)
    void unlinkCollections(java.util.UUID id);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM journal_note_tags WHERE tag_id = :id", nativeQuery = true)
    void unlinkNotes(java.util.UUID id);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM person_tags WHERE tag_id = :id", nativeQuery = true)
    void unlinkPersons(java.util.UUID id);
}
