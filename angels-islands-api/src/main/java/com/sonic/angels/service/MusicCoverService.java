package com.sonic.angels.service;

import com.sonic.angels.model.dto.MusicDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.MusicAlbum;
import com.sonic.angels.model.entity.MusicTrack;
import com.sonic.angels.repository.CollectionRepository;
import com.sonic.angels.repository.MediaFileRepository;
import com.sonic.angels.repository.MusicAlbumRepository;
import com.sonic.angels.repository.MusicTrackRepository;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

/**
 * The covers of his music: the picture of an album, and the picture a song has of its own (a single, a song that is on
 * no album here). None of them is his photo, so each is a MediaFile with mediaCategory ASSET in the album
 * Assets → Music → Covers and never shows among the photos of Sonic Hub. A song shows its own picture, else its
 * album's; with neither, the pages draw the default one.
 *
 * The same file sent for several songs or albums is one asset. A picture replaced or taken off goes with its file once
 * no album and no song points at it; a library picture someone set as a cover by its id is never touched.
 */
@Service
public class MusicCoverService {

    private static final String MUSIC = "Music", COVERS = "Covers";
    private static final Set<String> PICTURE_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif", "avif");

    private final CollectionRepository collectionRepo;
    private final CollectionService collectionService;
    private final MediaFileService mediaFileService;
    private final MediaFileRepository mediaRepo;
    private final MusicTrackRepository tracks;
    private final MusicAlbumRepository albums;
    private final StorageService storage;
    private final NamedParameterJdbcTemplate jdbc;

    public MusicCoverService(CollectionRepository collectionRepo, CollectionService collectionService, MediaFileService mediaFileService,
                             MediaFileRepository mediaRepo, MusicTrackRepository tracks, MusicAlbumRepository albums,
                             StorageService storage, NamedParameterJdbcTemplate jdbc) {
        this.collectionRepo = collectionRepo; this.collectionService = collectionService; this.mediaFileService = mediaFileService;
        this.mediaRepo = mediaRepo; this.tracks = tracks; this.albums = albums; this.storage = storage; this.jdbc = jdbc;
    }

    /** The song's own picture (replaces the one before). */
    @Transactional
    public MusicDto.CoverOut track(String key, MultipartFile file) throws IOException {
        MusicTrack t = tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key));
        Put p = put(file, "track-" + key);
        UUID old = t.getCoverMediaId();
        t.setCoverMediaId(p.media().getId());
        tracks.saveAndFlush(t);
        release(old, p.media().getId(), p.album());
        return out("track", key, p);
    }

    /** The album's cover (replaces the one before). */
    @Transactional
    public MusicDto.CoverOut album(String key, MultipartFile file) throws IOException {
        MusicAlbum a = albums.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Album not found: " + key));
        Put p = put(file, "album-" + key);
        UUID old = a.getCoverMediaId();
        a.setCoverMediaId(p.media().getId());
        albums.saveAndFlush(a);
        release(old, p.media().getId(), p.album());
        return out("album", key, p);
    }

    /** The song goes back to its album's cover, or to the default picture. */
    @Transactional
    public void removeTrack(String key) {
        MusicTrack t = tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key));
        UUID old = t.getCoverMediaId();
        if (old == null) return;
        t.setCoverMediaId(null);
        tracks.saveAndFlush(t);
        release(old, null, covers(false));
    }

    @Transactional
    public void removeAlbum(String key) {
        MusicAlbum a = albums.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Album not found: " + key));
        UUID old = a.getCoverMediaId();
        if (old == null) return;
        a.setCoverMediaId(null);
        albums.saveAndFlush(a);
        release(old, null, covers(false));
    }

    /** The cover of an album or a song that was just deleted: the picture goes too once nothing else shows it. */
    @Transactional
    public void dropped(UUID mediaId) {
        if (mediaId != null) release(mediaId, null, covers(false));
    }

    private record Put(MediaFile media, Collection album, boolean created) {}

    /** The file as an asset of the covers album: the one already there with the same content, else uploaded under the
     *  name given and the start of its hash. The CDN and the browsers keep a picture for a month under its address, so
     *  the address has to change with the content: a cover replaced, or taken off and set again, would otherwise go on
     *  showing the picture before it. */
    private Put put(MultipartFile file, String name) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        String ext = ext(file.getOriginalFilename());
        boolean picture = (file.getContentType() != null && file.getContentType().toLowerCase(Locale.ROOT).startsWith("image/")) || PICTURE_EXT.contains(ext);
        if (!picture) throw new IllegalArgumentException("file: a picture (jpg, png, webp, gif)");
        if (!storage.isConfigured()) throw new IllegalStateException("storage not configured");
        Collection album = covers(true);
        String hash = sha256(file);
        List<MediaFile> same = mediaRepo.findInCollectionByHash(album.getId(), hash);
        if (!same.isEmpty()) return new Put(same.get(0), album, false);
        String as = name + "-" + hash.substring(0, 10) + "." + (PICTURE_EXT.contains(ext) ? ext : "jpg");
        MediaFile mf = mediaFileService.upload(new Named(file, as), null, album.getId(), null, null, hash, null);
        mf.setMediaCategory(MediaFile.MediaCategory.ASSET);
        return new Put(mediaRepo.save(mf), album, true);
    }

    /** A picture nothing points at any more goes with its file — only when it is one of the covers album's assets. */
    private void release(UUID old, UUID now, Collection album) {
        if (old == null || old.equals(now) || album == null) return;
        Integer used = jdbc.queryForObject("SELECT (SELECT COUNT(*) FROM music_albums WHERE cover_media_id = :id)"
            + " + (SELECT COUNT(*) FROM music_tracks WHERE cover_media_id = :id)", new MapSqlParameterSource("id", old), Integer.class);
        if (used != null && used > 0) return;
        MediaFile m = mediaRepo.findById(old).orElse(null);
        if (m == null || m.getMediaCategory() != MediaFile.MediaCategory.ASSET || m.getContentHash() == null) return;
        boolean ours = mediaRepo.findInCollectionByHash(album.getId(), m.getContentHash()).stream().anyMatch(x -> x.getId().equals(old));
        if (ours) mediaFileService.delete(old);
    }

    private MusicDto.CoverOut out(String kind, String key, Put p) {
        return new MusicDto.CoverOut(kind, key, p.media().getId(), storage.buildCdnUrl(p.media().getStorageKey(), p.media().getStorageProvider()), p.created());
    }

    /** Assets → Music → Covers (the Assets album under the root is kept out of the album lists); made on first use
     *  when asked to, else null while there is none. */
    private Collection covers(boolean make) {
        Collection root = collectionService.getRoot();
        List<Collection> found = collectionRepo.findByParentIdAndSlug(root.getId(), CollectionService.ASSETS_SLUG);
        if (found.isEmpty() && !make) return null;
        Collection assets = found.isEmpty() ? child(root, DeskAssetService.ROOT_NAME, "Pictures Sonic Hub itself uses (kept out of the photo streams)", true) : found.get(0);
        Collection music = child(assets, MUSIC, "Pictures of his music that are not his photos", make);
        return music == null ? null : child(music, COVERS, "Covers of albums and songs", make);
    }

    private Collection child(Collection parent, String name, String description, boolean make) {
        List<Collection> kids = collectionRepo.findByParentIdAndName(parent.getId(), name).stream()
            .sorted(Comparator.comparing(Collection::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(c -> c.getId().toString()))
            .toList();
        if (!kids.isEmpty()) return kids.get(0);
        if (!make) return null;
        Collection c = new Collection();
        c.setName(name);
        c.setParent(parent);
        c.setDescription(description);
        c = collectionRepo.save(c);
        collectionService.ensureSlug(c);
        return c;
    }

    private static String ext(String fileName) {
        String n = fileName == null ? "" : fileName.trim().toLowerCase(Locale.ROOT);
        int dot = n.lastIndexOf('.');
        return dot < 0 ? "" : n.substring(dot + 1);
    }

    private static String sha256(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream()) {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[8192];
            for (int k; (k = is.read(buf)) > 0; ) md.update(buf, 0, k);
            return HexFormat.of().formatHex(md.digest());
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
    }

    /** The upload under another file name. */
    private record Named(MultipartFile file, String name) implements MultipartFile {
        @Override public String getName() { return file.getName(); }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType() { return file.getContentType(); }
        @Override public boolean isEmpty() { return file.isEmpty(); }
        @Override public long getSize() { return file.getSize(); }
        @Override public byte[] getBytes() throws IOException { return file.getBytes(); }
        @Override public InputStream getInputStream() throws IOException { return file.getInputStream(); }
        @Override public void transferTo(java.io.File dest) throws IOException { file.transferTo(dest); }
    }
}
