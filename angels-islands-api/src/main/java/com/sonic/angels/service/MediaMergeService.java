package com.sonic.angels.service;

import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.repository.MediaFileRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Folds one file into another that holds the same picture, then deletes it.
 * Everything that pointed at the deleted copy moves to the kept one: its albums (and album covers), the memories
 * it illustrated (same place in their photo order), people's avatars, covers and banners, journal covers, desk
 * wallpapers and photos, and the social items made from it. People, tags, caption, photographer, event date,
 * place and the favourite/featured marks are added to the kept file where it has none of its own.
 * By default only files with the same content hash are merged; {@code sameContentOnly = false} is for copies
 * that hold the same picture in another format (a BMP kept next to its PNG conversion), checked by the caller.
 */
@Service
public class MediaMergeService {

    public record Outcome(UUID from, UUID into, boolean merged, String reason) {}

    private final MediaFileRepository mediaRepo;
    private final MediaFileService mediaFileService;

    @PersistenceContext
    private EntityManager em;

    public MediaMergeService(MediaFileRepository mediaRepo, MediaFileService mediaFileService) {
        this.mediaRepo = mediaRepo;
        this.mediaFileService = mediaFileService;
    }

    /** One pair, in its own transaction, so one refused pair does not undo the others. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Outcome merge(UUID fromId, UUID intoId, boolean sameContentOnly) {
        if (fromId == null || intoId == null) return new Outcome(fromId, intoId, false, "missing id");
        if (fromId.equals(intoId)) return new Outcome(fromId, intoId, false, "same file");
        MediaFile from = mediaRepo.findById(fromId).orElse(null);
        MediaFile into = mediaRepo.findById(intoId).orElse(null);
        if (from == null) return new Outcome(fromId, intoId, false, "file to merge not found");
        if (into == null) return new Outcome(fromId, intoId, false, "file to keep not found");
        if (sameContentOnly) {
            String a = from.getContentHash(), b = into.getContentHash();
            if (a == null || b == null) return new Outcome(fromId, intoId, false, "content hash unknown");
            if (!a.equals(b)) return new Outcome(fromId, intoId, false, "content differs");
        }

        into.getPersons().addAll(from.getPersons());
        into.getTags().addAll(from.getTags());
        if (blank(into.getCaption()) && !blank(from.getCaption())) into.setCaption(from.getCaption());
        if (into.getTakenBy() == null && from.getTakenBy() != null) into.setTakenBy(from.getTakenBy());
        if (into.getEventDate() == null && from.getEventDate() != null)
            into.setEvent(from.getEventDate(), from.getEventPrecision(), from.getEventApprox(), from.getEventCollectionId());
        if (Boolean.TRUE.equals(from.getIsFavorite())) into.setIsFavorite(true);
        if (Boolean.TRUE.equals(from.getIsFeatured())) into.setIsFeatured(true);
        if (into.getLatitude() == null && from.getLatitude() != null && from.getLongitude() != null) {
            into.setLatitude(from.getLatitude());
            into.setLongitude(from.getLongitude());
            if (into.getTimezone() == null) into.setTimezone(from.getTimezone());
        }
        if (blank(into.getDisplayedAddress()) && !blank(from.getDisplayedAddress())) into.setDisplayedAddress(from.getDisplayedAddress());
        if (blank(into.getMediaSource()) && !blank(from.getMediaSource())) into.setMediaSource(from.getMediaSource());
        mediaRepo.save(into);
        em.flush();

        // albums: the kept file joins every album the copy was in
        sql("INSERT INTO collection_media (collection_id, media_file_id) SELECT cm.collection_id, :into FROM collection_media cm "
            + "WHERE cm.media_file_id = :from AND NOT EXISTS (SELECT 1 FROM collection_media k WHERE k.collection_id = cm.collection_id AND k.media_file_id = :into)",
            fromId, intoId);
        sql("UPDATE collections SET thumbnail_media_file_id = :into WHERE thumbnail_media_file_id = :from", fromId, intoId);

        // memories: take the copy's place in the photo order; where the kept file is already there, drop the copy and close the gap
        @SuppressWarnings("unchecked")
        List<Object> both = em.createNativeQuery("SELECT DISTINCT a.episode_id FROM episode_media a JOIN episode_media b "
                + "ON a.episode_id = b.episode_id WHERE a.media_file_id = :from AND b.media_file_id = :into")
            .setParameter("from", fromId).setParameter("into", intoId).getResultList();
        sql("UPDATE episode_media SET media_file_id = :into WHERE media_file_id = :from AND episode_id NOT IN "
            + "(SELECT episode_id FROM episode_media WHERE media_file_id = :into)", fromId, intoId);
        if (!both.isEmpty()) {
            em.createNativeQuery("DELETE FROM episode_media WHERE media_file_id = :from").setParameter("from", fromId).executeUpdate();
            for (Object ep : both) renumber(ep);
        }

        // everything else that shows this file
        for (String[] ref : new String[][] {
                {"persons", "avatar_media_file_id"}, {"persons", "cover_media_file_id"}, {"persons", "banner_media_file_id"},
                {"journal_notes", "cover_media_id"}, {"desk_wallpapers", "media_file_id"}, {"desk_devices", "photo_media_id"},
                {"social_albums", "cover_media_file_id"}, {"social_posts", "cover_media_file_id"}, {"social_comments", "media_file_id"},
                {"social_profile_images", "media_file_id"}, {"social_media", "media_file_id"}, {"social_post_media", "media_file_id"}}) {
            sql("UPDATE " + ref[0] + " SET " + ref[1] + " = :into WHERE " + ref[1] + " = :from", fromId, intoId);
        }
        em.flush();
        em.clear();

        mediaFileService.delete(fromId);          // same transaction; its file leaves B2 once this commits
        return new Outcome(fromId, intoId, true, null);
    }

    /** Positions 0..n-1 again after a row left the middle (two steps: the (episode, position) key must stay unique). */
    private void renumber(Object episodeId) {
        em.createNativeQuery("UPDATE episode_media e SET position = -1 - s.rn FROM (SELECT media_file_id, "
                + "ROW_NUMBER() OVER (ORDER BY position) - 1 AS rn FROM episode_media WHERE episode_id = :ep) s "
                + "WHERE e.episode_id = :ep AND e.media_file_id = s.media_file_id")
            .setParameter("ep", episodeId).executeUpdate();
        em.createNativeQuery("UPDATE episode_media SET position = -1 - position WHERE episode_id = :ep")
            .setParameter("ep", episodeId).executeUpdate();
    }

    private void sql(String q, UUID from, UUID into) {
        em.createNativeQuery(q).setParameter("from", from).setParameter("into", into).executeUpdate();
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
}
