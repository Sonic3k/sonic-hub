package com.sonic.angels.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/**
 * "Delete collection + photos": the album, every album below it, and their photos — in the database and on B2.
 *
 * A photo is kept (only taken out of these albums) when it also sits in an album outside the tree, or when it is
 * in use as a person's avatar / cover / banner or a journal note's cover (the database still points at it).
 * Every other photo goes. All database changes happen in one transaction; the B2 files are deleted only after it
 * has committed, so a refused delete never costs a file.
 */
@Service
public class CollectionDeleteService {

    private static final Logger log = LoggerFactory.getLogger(CollectionDeleteService.class);
    private static final int CHUNK = 1000;
    private static final int MAX_LISTED = 100;

    /** The album and every album below it, with how deep each one sits (0 = the album itself). */
    private static final String TREE = "WITH RECURSIVE tree(id, depth) AS (SELECT id, 0 FROM collections WHERE id = :id " +
        "UNION SELECT c.id, t.depth + 1 FROM collections c JOIN tree t ON c.parent_id = t.id WHERE t.depth < 100), " +
        "tm AS (SELECT DISTINCT cm.media_file_id AS id FROM collection_media cm WHERE cm.collection_id IN (SELECT id FROM tree)) ";

    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final CollectionService collectionService;
    private final StoragePurger storagePurger;

    public CollectionDeleteService(NamedParameterJdbcTemplate jdbc, PlatformTransactionManager txManager,
                                   CollectionService collectionService, StoragePurger storagePurger) {
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(txManager);
        this.collectionService = collectionService;
        this.storagePurger = storagePurger;
    }

    public record InUse(UUID mediaId, String fileName, String usedAs) {}

    public record Preview(UUID id, String name, String path, int albums, int photos, int toDelete, long toDeleteBytes,
                          int keptInOtherAlbums, int keptInUse, List<InUse> inUse) {}

    public record Result(int albumsDeleted, int photosDeleted, int keptInOtherAlbums, int keptInUse,
                         int storageDeleted, int storageFailed) {}

    /** The delete is refused; the message goes back to the admin as it is. */
    public static class Refused extends RuntimeException {
        private final int status;
        public Refused(int status, String message) { super(message); this.status = status; }
        public int status() { return status; }
    }

    private record Photo(UUID id, String fileName, long size, String storageKey, boolean onB2, boolean elsewhere) {}

    private record Plan(UUID id, String name, String path, Map<Integer, List<UUID>> albumsByDepth, List<Photo> photos,
                        Map<UUID, String> inUse) {
        int albums() { return albumsByDepth.values().stream().mapToInt(List::size).sum(); }
        List<UUID> albumIds() { return albumsByDepth.values().stream().flatMap(List::stream).toList(); }
        List<Photo> toDelete() { return photos.stream().filter(p -> !p.elsewhere() && !inUse.containsKey(p.id())).toList(); }
        int keptInOtherAlbums() { return (int) photos.stream().filter(Photo::elsewhere).count(); }
        int keptInUse() { return (int) photos.stream().filter(p -> !p.elsewhere() && inUse.containsKey(p.id())).count(); }
    }

    /** What the delete would do. Changes nothing. */
    public Preview preview(UUID id) {
        Plan p = tx.execute(s -> plan(id));
        List<InUse> inUse = p.photos().stream().filter(ph -> !ph.elsewhere() && p.inUse().containsKey(ph.id()))
            .limit(MAX_LISTED).map(ph -> new InUse(ph.id(), ph.fileName(), p.inUse().get(ph.id()))).toList();
        long bytes = p.toDelete().stream().mapToLong(Photo::size).sum();
        return new Preview(p.id(), p.name(), p.path(), p.albums(), p.photos().size(), p.toDelete().size(), bytes,
            p.keptInOtherAlbums(), p.keptInUse(), inUse);
    }

    /** Deletes the tree and its photos: database first (one transaction), then the B2 files. */
    public Result deleteWithMedia(UUID id) {
        Object[] done;
        try {
            done = tx.execute(s -> deleteRows(id));
        } catch (DataIntegrityViolationException e) {
            String why = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            log.warn("Delete of album {} with photos refused by the database, nothing changed: {}", id, why);
            throw new Refused(409, "The database refused the delete, nothing was changed: " + why);
        }
        int albums = (int) done[0], photos = (int) done[1], keptOther = (int) done[2], keptInUse = (int) done[3];
        @SuppressWarnings("unchecked") List<String> keys = (List<String>) done[4];
        StoragePurger.Result b2 = storagePurger.purge(keys);   // committed — now the files
        return new Result(albums, photos, keptOther, keptInUse, b2.deleted(), b2.failed());
    }

    private Object[] deleteRows(UUID id) {
        Plan p = plan(id);
        List<Photo> photos = p.toDelete();
        List<String> keys = photos.stream().filter(Photo::onB2).map(Photo::storageKey).filter(Objects::nonNull).toList();
        int photosDeleted = 0;
        List<UUID> ids = photos.stream().map(Photo::id).toList();
        for (int i = 0; i < ids.size(); i += CHUNK) {
            MapSqlParameterSource m = new MapSqlParameterSource("ids", ids.subList(i, Math.min(i + CHUNK, ids.size())));
            jdbc.update("DELETE FROM media_file_persons WHERE media_file_id IN (:ids)", m);
            jdbc.update("DELETE FROM media_file_tags WHERE media_file_id IN (:ids)", m);
            jdbc.update("DELETE FROM collection_media WHERE media_file_id IN (:ids)", m);
            jdbc.update("UPDATE collections SET thumbnail_media_file_id = NULL WHERE thumbnail_media_file_id IN (:ids)", m);
            jdbc.update("DELETE FROM media_image_detail WHERE media_file_id IN (:ids)", m);
            jdbc.update("DELETE FROM media_video_detail WHERE media_file_id IN (:ids)", m);
            jdbc.update("DELETE FROM media_location_detail WHERE media_file_id IN (:ids)", m);
            photosDeleted += jdbc.update("DELETE FROM media_files WHERE id IN (:ids)", m);
        }
        // the photos that stay leave these albums; then the albums go, deepest first
        MapSqlParameterSource all = new MapSqlParameterSource("ids", p.albumIds());
        jdbc.update("DELETE FROM collection_media WHERE collection_id IN (:ids)", all);
        jdbc.update("DELETE FROM collection_persons WHERE collection_id IN (:ids)", all);
        jdbc.update("DELETE FROM collection_tags WHERE collection_id IN (:ids)", all);
        int albumsDeleted = 0;
        List<Integer> depths = new ArrayList<>(p.albumsByDepth().keySet());
        depths.sort(Comparator.reverseOrder());
        for (int d : depths)
            albumsDeleted += jdbc.update("DELETE FROM collections WHERE id IN (:ids)",
                new MapSqlParameterSource("ids", p.albumsByDepth().get(d)));
        log.info("Deleted album \"{}\" with photos: {} albums, {} photos ({} B2 files to delete); kept {} in other albums, {} in use",
            p.path(), albumsDeleted, photosDeleted, keys.size(), p.keptInOtherAlbums(), p.keptInUse());
        return new Object[] { albumsDeleted, photosDeleted, p.keptInOtherAlbums(), p.keptInUse(), keys };
    }

    private Plan plan(UUID id) {
        List<String> found = jdbc.queryForList("SELECT name FROM collections WHERE id = :id", Map.of("id", id), String.class);
        if (found.isEmpty()) throw new Refused(404, "Album not found: " + id);
        if (id.equals(collectionService.getRootId())) throw new Refused(400, "The root album cannot be deleted");
        String path = String.join(" / ", collectionService.getBreadcrumb(id).stream().map(c -> c.getName()).toList());

        Map<Integer, List<UUID>> byDepth = new TreeMap<>();
        jdbc.query(TREE + "SELECT DISTINCT id, depth FROM tree", Map.of("id", id), rs -> {
            byDepth.computeIfAbsent(rs.getInt("depth"), k -> new ArrayList<>()).add(rs.getObject("id", UUID.class));
        });
        List<Photo> photos = jdbc.query(TREE +
            "SELECT m.id, m.file_name, COALESCE(m.file_size, 0) AS file_size, m.storage_key, m.storage_provider, " +
            "EXISTS (SELECT 1 FROM collection_media o WHERE o.media_file_id = m.id " +
            "        AND o.collection_id NOT IN (SELECT id FROM tree)) AS elsewhere " +
            "FROM media_files m JOIN tm ON tm.id = m.id",
            Map.of("id", id), (rs, n) -> {
                String provider = rs.getString("storage_provider");
                return new Photo(rs.getObject("id", UUID.class), rs.getString("file_name"), rs.getLong("file_size"),
                    rs.getString("storage_key"), provider == null || "B2".equals(provider), rs.getBoolean("elsewhere"));
            });
        Map<UUID, String> inUse = new LinkedHashMap<>();
        jdbc.query(TREE +
            "SELECT p.avatar_media_file_id AS media_id, 'avatar of ' || COALESCE(p.display_name, p.name) AS used_as " +
            "  FROM persons p JOIN tm ON tm.id = p.avatar_media_file_id " +
            "UNION ALL SELECT p.cover_media_file_id, 'cover of ' || COALESCE(p.display_name, p.name) " +
            "  FROM persons p JOIN tm ON tm.id = p.cover_media_file_id " +
            "UNION ALL SELECT p.banner_media_file_id, 'banner of ' || COALESCE(p.display_name, p.name) " +
            "  FROM persons p JOIN tm ON tm.id = p.banner_media_file_id " +
            "UNION ALL SELECT n.cover_media_id, 'cover of journal note \"' || COALESCE(n.title, '') || '\"' " +
            "  FROM journal_notes n JOIN tm ON tm.id = n.cover_media_id",
            Map.of("id", id), rs -> {
                inUse.merge(rs.getObject("media_id", UUID.class), rs.getString("used_as"), (a, b) -> a + ", " + b);
            });
        return new Plan(id, found.get(0), path.isEmpty() ? found.get(0) : path, byDepth, photos, inUse);
    }
}
