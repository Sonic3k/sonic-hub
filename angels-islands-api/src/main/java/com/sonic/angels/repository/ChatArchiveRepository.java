package com.sonic.angels.repository;

import com.sonic.angels.model.entity.ChatArchive;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatArchiveRepository extends JpaRepository<ChatArchive, UUID> {
    List<ChatArchive> findByPersonId(UUID personId);

    boolean existsByIdAndPersonId(UUID id, UUID personId);

    Optional<ChatArchive> findByPersonIdAndExternalKey(UUID personId, String externalKey);

    @Query("SELECT a FROM ChatArchive a JOIN FETCH a.person p WHERE p.slug IS NOT NULL")
    List<ChatArchive> findAllOfImportedPersons();

    @Query("SELECT a FROM ChatArchive a JOIN FETCH a.person WHERE a.id = :id")
    Optional<ChatArchive> findWithPerson(java.util.UUID id);

    /** An imported other-chat, found again even after it was linked to a person. */
    Optional<ChatArchive> findFirstByCounterpartKeyAndExternalKey(String counterpartKey, String externalKey);

    /** Other chats: everything not linked to a person, plus imported other-chats that were linked later. */
    @Query("SELECT a FROM ChatArchive a LEFT JOIN FETCH a.person WHERE a.person IS NULL OR a.counterpartKey IS NOT NULL " +
           "ORDER BY a.counterpart, a.platform, a.title")
    List<ChatArchive> findOthers();

    /** a deleted chat archive leaves the memories that quote it: the words stay, only the link goes */
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE episode_sources SET chat_archive_id = NULL WHERE chat_archive_id = :id", nativeQuery = true)
    int detachEpisodeSources(@org.springframework.data.repository.query.Param("id") java.util.UUID id);

    /** Messenger conversations: Facebook archives that are not the 2017 wall pages ("fbwall:…"). */
    @Query("SELECT a FROM ChatArchive a LEFT JOIN FETCH a.person WHERE a.platform = com.sonic.angels.model.entity.ChatArchive.Platform.FACEBOOK " +
           "AND (a.externalKey IS NULL OR a.externalKey NOT LIKE 'fbwall:%')")
    List<ChatArchive> messengerThreads();

    List<ChatArchive> findByExternalKey(String externalKey);
}
