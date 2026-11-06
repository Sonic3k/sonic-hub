package com.sonic.angels.service;

import com.sonic.angels.model.dto.SocialDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.SocialMediaItem;
import com.sonic.angels.model.entity.SocialProfile;
import com.sonic.angels.model.entity.SocialSource;
import com.sonic.angels.repository.CollectionRepository;
import com.sonic.angels.repository.MediaFileRepository;
import com.sonic.angels.repository.SocialMediaItemRepository;
import com.sonic.angels.repository.SocialProfileRepository;
import com.sonic.angels.util.SlugUtil;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

/**
 * The photos and videos of the Social Media portal. Each one is an ordinary MediaFile with mediaCategory SOCIAL,
 * filed in the album Social Media → <platform> → <profile> (B2: social-media/<platform>/<profile>/…), and known to
 * the data API by its key. Kept apart this way, none of them shows among the photos of Sonic Hub.
 */
@Service
public class SocialMediaService {

    public static final String ROOT_NAME = "Social Media";
    public static final String ROOT_SLUG = CollectionService.SOCIAL_SLUG;
    private static final String SHARED = "Shared";

    private final SocialMediaItemRepository itemRepo;
    private final SocialProfileRepository profileRepo;
    private final MediaFileRepository mediaRepo;
    private final CollectionRepository collectionRepo;
    private final CollectionService collectionService;
    private final MediaFileService mediaFileService;
    private final StorageService storage;
    private final EntityManager em;

    public SocialMediaService(SocialMediaItemRepository itemRepo, SocialProfileRepository profileRepo,
                              MediaFileRepository mediaRepo, CollectionRepository collectionRepo,
                              CollectionService collectionService, MediaFileService mediaFileService,
                              StorageService storage, EntityManager em) {
        this.itemRepo = itemRepo;
        this.profileRepo = profileRepo;
        this.mediaRepo = mediaRepo;
        this.collectionRepo = collectionRepo;
        this.collectionService = collectionService;
        this.mediaFileService = mediaFileService;
        this.storage = storage;
        this.em = em;
    }

    // ── Albums ───────────────────────────────────────────────────────────────

    /** The "Social Media" album under the root, made on first use; null while it does not exist (for reads). */
    public Collection socialRoot(boolean create) {
        Collection root = collectionService.getRoot();
        List<Collection> found = collectionRepo.findByParentIdAndSlug(root.getId(), ROOT_SLUG);
        if (!found.isEmpty()) return found.get(0);
        if (!create) return null;
        return child(root, ROOT_NAME);
    }

    /** Social Media → platform → the owner's own album, remembered on the profile (made again if it was deleted). */
    private Collection albumOf(SocialProfile owner) {
        if (owner != null && owner.getCollectionId() != null) {
            Optional<Collection> kept = collectionRepo.findById(owner.getCollectionId());
            if (kept.isPresent()) return kept.get();
        }
        Collection platform = child(socialRoot(true), owner == null ? SHARED : platformName(owner.getPlatform()));
        if (owner == null) return platform;
        String base = owner.getName() == null || owner.getName().isBlank() ? owner.getExternalKey() : owner.getName().trim();
        String name = base;
        // two people of the same name each get their own album
        for (int i = 2; !collectionRepo.findByParentIdAndName(platform.getId(), name).isEmpty() && i < 100; i++) name = base + " (" + i + ")";
        Collection mine = newChild(platform, name);
        owner.setCollectionId(mine.getId());
        profileRepo.save(owner);
        return mine;
    }

    private Collection child(Collection parent, String name) {
        List<Collection> kids = collectionRepo.findByParentIdAndName(parent.getId(), name);
        return kids.isEmpty() ? newChild(parent, name) : kids.get(0);
    }

    private Collection newChild(Collection parent, String name) {
        Collection c = new Collection();
        c.setName(name);
        c.setParent(parent);
        c.setDescription(parent.getParent() == null ? "Photos of the Social Media portal (kept out of the photo streams)" : null);
        c = collectionRepo.save(c);
        collectionService.ensureSlug(c);
        return c;
    }

    static String platformName(SocialProfile.Platform p) {
        return switch (p) {
            case FACEBOOK -> "Facebook";
            case YAHOO -> "Yahoo";
            case INSTAGRAM -> "Instagram";
            case THREADS -> "Threads";
            case SMS -> "SMS";
            case ZALO -> "Zalo";
            case SKYPE -> "Skype";
        };
    }

    // ── Upload / copy ────────────────────────────────────────────────────────

    /** One file under a key. A key already there answers with what it has (created=false), unless replace: then the
     *  new file takes the old one's place everywhere it is used, and the old file is deleted. */
    @Transactional
    public SocialDto.MediaOut upload(MultipartFile file, String key, String ownerKey, Long lastModified, String source,
                                     boolean replace) throws IOException {
        String k = requireKey(key);
        if (file == null || file.isEmpty()) throw new ImportException(400, "file missing");
        if (!storage.isConfigured()) throw new ImportException(503, "storage not configured");
        SocialMediaItem existing = itemRepo.findByExternalKey(k).orElse(null);
        if (existing != null && !replace) return out(existing, false);

        SocialProfile owner = owner(ownerKey);
        Collection album = albumOf(owner);
        MediaFile mf = mediaFileService.upload(file, null, album.getId(), null, lastModified, sha256(file), null);
        mf.setMediaCategory(MediaFile.MediaCategory.SOCIAL);
        mf = mediaRepo.save(mf);
        return out(register(existing, k, mf, owner, null, source), true);
    }

    /** Library photos copied into the portal: the bytes are copied inside the bucket, the original stays where it is. */
    @Transactional
    public List<SocialDto.MediaOut> copy(List<SocialDto.CopyIn> items) {
        if (items == null || items.isEmpty()) return List.of();
        if (!storage.isConfigured()) throw new ImportException(503, "storage not configured");
        List<SocialDto.MediaOut> out = new ArrayList<>();
        for (SocialDto.CopyIn in : items) {
            String k = requireKey(in.key());
            SocialMediaItem existing = itemRepo.findByExternalKey(k).orElse(null);
            if (existing != null) { out.add(out(existing, false)); continue; }
            if (in.from() == null) throw new ImportException(400, "copy " + k + ": from (a media file id) is required");
            MediaFile src = mediaRepo.findById(in.from()).orElseThrow(() -> new ImportException(404, "copy " + k + ": no media file " + in.from()));
            if (src.getStorageKey() == null || (src.getStorageProvider() != null && src.getStorageProvider() != MediaFile.StorageProvider.B2))
                throw new ImportException(400, "copy " + k + ": the file is not on B2");
            SocialProfile owner = owner(in.owner());
            Collection album = albumOf(owner);
            MediaFile mf = cloneOf(src, album);
            out.add(out(register(null, k, mf, owner, src.getId(), in.source()), true));
        }
        return out;
    }

    private MediaFile cloneOf(MediaFile src, Collection album) {
        String dir = collectionService.storagePath(album.getId());
        String name = src.getStorageKey().substring(src.getStorageKey().lastIndexOf('/') + 1);
        MediaFile c = new MediaFile();
        c.setStorageKey(storage.copy(src.getStorageKey(), uniqueKey(dir, name)));
        c.setStorageProvider(MediaFile.StorageProvider.B2);
        if (src.getPosterStorageKey() != null) {
            String p = src.getPosterStorageKey();
            c.setPosterStorageKey(storage.copy(p, uniqueKey(dir, p.substring(p.lastIndexOf('/') + 1))));
        }
        c.setFileName(src.getFileName());
        c.setFileExtension(src.getFileExtension());
        c.setFileType(src.getFileType());
        c.setMimeType(src.getMimeType());
        c.setFileSize(src.getFileSize());
        c.setWidth(src.getWidth());
        c.setHeight(src.getHeight());
        c.setOrientation(src.getOrientation());
        c.setAspectRatio(src.getAspectRatio());
        c.setDuration(src.getDuration());
        c.setIsAnimated(src.getIsAnimated());
        c.setDateTaken(src.getDateTaken());
        c.setFileDateCreated(src.getFileDateCreated());
        c.setFileDateModified(src.getFileDateModified());
        c.setContentHash(src.getContentHash());
        c.setTimezone(src.getTimezone());
        c.setLatitude(src.getLatitude());
        c.setLongitude(src.getLongitude());
        c.setDisplayedAddress(src.getDisplayedAddress());
        c.setMediaSource(src.getMediaSource());
        c.setUploadedAt(LocalDateTime.now(com.sonic.angels.util.SocialTime.VN));
        c.setMediaCategory(MediaFile.MediaCategory.SOCIAL);
        c = mediaRepo.save(c);
        collectionRepo.linkMedia(album.getId(), c.getId());
        collectionService.setCoverIfMissing(album.getId(), c);
        return c;
    }

    /** dir/name, or dir/name-2… when the key is taken. */
    private String uniqueKey(String dir, String fileName) {
        String safe = SlugUtil.slugifyFileName(fileName);
        int dot = safe.lastIndexOf('.');
        String base = dot > 0 ? safe.substring(0, dot) : safe, ext = dot > 0 ? safe.substring(dot) : "";
        String folder = dir == null || dir.isBlank() ? "" : dir + "/";
        String candidate = folder + safe;
        for (int i = 2; mediaRepo.existsByStorageKey(storage.withPrefix(candidate)) && i < 1000; i++) candidate = folder + base + "-" + i + ext;
        return candidate;
    }

    private SocialMediaItem register(SocialMediaItem existing, String key, MediaFile mf, SocialProfile owner, UUID origin, String source) {
        SocialMediaItem item = existing != null ? existing : new SocialMediaItem();
        UUID old = existing != null ? existing.getMediaFile().getId() : null;
        item.setExternalKey(key);
        item.setMediaFile(mf);
        item.setOwner(owner);
        item.setOriginMediaId(origin);
        item.setSource(source(source));
        item = itemRepo.save(item);
        if (old != null && !old.equals(mf.getId())) {
            repoint(old, mf.getId());
            mediaFileService.delete(old);
        }
        return item;
    }

    /** Every place the portal uses the old file now uses the new one (deleting the old one would take them away). */
    private void repoint(UUID from, UUID to) {
        for (String sql : List.of(
            "UPDATE social_profile_images SET media_file_id = :to WHERE media_file_id = :from",
            "UPDATE social_post_media SET media_file_id = :to WHERE media_file_id = :from",
            "UPDATE social_comments SET media_file_id = :to WHERE media_file_id = :from",
            "UPDATE social_posts SET cover_media_file_id = :to WHERE cover_media_file_id = :from",
            "UPDATE social_albums SET cover_media_file_id = :to WHERE cover_media_file_id = :from"))
            em.createNativeQuery(sql).setParameter("to", to).setParameter("from", from).executeUpdate();
        em.flush();
        em.clear();
    }

    /** Deletes the item and its file (database now, B2 once this commits). Whatever used it loses it. */
    @Transactional
    public boolean delete(String key) {
        SocialMediaItem item = itemRepo.findByExternalKey(key).orElse(null);
        if (item == null) return false;
        UUID file = item.getMediaFile().getId();
        itemRepo.delete(item);
        itemRepo.flush();
        mediaFileService.delete(file);
        return true;
    }

    @Transactional(readOnly = true)
    public List<SocialDto.MediaOut> find(List<String> keys) {
        if (keys == null || keys.isEmpty()) return List.of();
        return itemRepo.findByExternalKeyIn(keys).stream().map(i -> out(i, false)).toList();
    }

    private SocialDto.MediaOut out(SocialMediaItem i, boolean created) {
        MediaFile m = i.getMediaFile();
        return new SocialDto.MediaOut(i.getExternalKey(), m.getId(), storage.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()),
            m.getFileType() == null ? null : m.getFileType().name(), m.getWidth(), m.getHeight(), created,
            i.getOwner() == null ? null : i.getOwner().getExternalKey());
    }

    private SocialProfile owner(String key) {
        if (key == null || key.isBlank()) return null;
        return profileRepo.findByExternalKey(key.trim()).orElseThrow(() -> new ImportException(404, "unknown profile " + key));
    }

    static String requireKey(String key) {
        if (key == null || key.isBlank()) throw new ImportException(400, "key missing");
        String k = key.trim();
        if (k.length() > 300) throw new ImportException(400, "key too long: " + k);
        return k;
    }

    static SocialSource source(String s) {
        if (s == null || s.isBlank()) return SocialSource.REAL;
        try { return SocialSource.valueOf(s.trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new ImportException(400, "unknown source " + s + " (REAL, RECONSTRUCTED, SIMULATED)"); }
    }

    private static String sha256(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream()) {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[8192];
            for (int n; (n = is.read(buf)) > 0; ) md.update(buf, 0, n);
            return HexFormat.of().formatHex(md.digest());
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
    }
}
