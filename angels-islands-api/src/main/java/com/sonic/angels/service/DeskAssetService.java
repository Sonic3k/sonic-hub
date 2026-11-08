package com.sonic.angels.service;

import com.sonic.angels.model.dto.DeskDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.repository.CollectionRepository;
import com.sonic.angels.repository.MediaFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * The files the machines use that are not his own — the wallpapers, the photos of the machines themselves, the
 * pieces of the programs (Yahoo! Messenger's skin, emoticons and sounds…). Each is an ordinary MediaFile with
 * mediaCategory ASSET, filed in the album Assets → Desk → <folder> (storage: assets/desk/<folder>/…), so none of
 * them shows among the photos of Sonic Hub.
 *
 * Without a name the same file sent twice is the same asset (matched by its content). With a name (a path such as
 * "skin/images/online.png") the asset is that name in its folder: sent again with other content it replaces the
 * old file, and the folder can be listed by name.
 */
@Service
public class DeskAssetService {

    public static final String ROOT_NAME = "Assets";
    private static final String DESK = "Desk";
    /** folder → album name; any other folder of lowercase letters, digits and dashes is an album of its own name */
    private static final java.util.Map<String, String> FOLDERS = java.util.Map.of("wallpapers", "Wallpapers", "machines", "Machines", "yahoo", "Yahoo");
    private static final java.util.regex.Pattern FOLDER = java.util.regex.Pattern.compile("[a-z0-9][a-z0-9-]{0,31}");

    private final CollectionRepository collectionRepo;
    private final CollectionService collectionService;
    private final MediaFileService mediaFileService;
    private final MediaFileRepository mediaRepo;
    private final StorageService storage;

    public DeskAssetService(CollectionRepository collectionRepo, CollectionService collectionService, MediaFileService mediaFileService,
                            MediaFileRepository mediaRepo, StorageService storage) {
        this.collectionRepo = collectionRepo;
        this.collectionService = collectionService;
        this.mediaFileService = mediaFileService;
        this.mediaRepo = mediaRepo;
        this.storage = storage;
    }

    public static Set<String> folders() { return FOLDERS.keySet(); }

    @Transactional
    public DeskDto.AssetOut upload(MultipartFile file, String folder, Long lastModified, String name) throws IOException {
        String f = folderOf(folder);
        if (file == null || file.isEmpty()) throw new ImportException(400, "file missing");
        if (!storage.isConfigured()) throw new ImportException(503, "storage not configured");
        String n = name == null || name.isBlank() ? null : name.trim();
        if (n != null && (n.length() > 250 || n.startsWith("/") || n.contains("..") || n.contains("\\")))
            throw new ImportException(400, "name: a relative path such as skin/images/online.png");
        Collection album = album(f);
        String hash = sha256(file);
        if (n == null) {
            List<MediaFile> same = mediaRepo.findInCollectionByHash(album.getId(), hash);
            if (!same.isEmpty()) return out(same.get(0), false);
        } else {
            List<MediaFile> named = mediaRepo.findInCollectionByNames(album.getId(), List.of(n));
            for (MediaFile old : named) if (hash.equals(old.getContentHash())) return out(old, false);
            for (MediaFile old : named) mediaFileService.delete(old.getId());   // the same name with other content: the new one replaces it
        }
        MediaFile mf = mediaFileService.upload(file, null, album.getId(), null, lastModified, hash, null);
        mf.setMediaCategory(MediaFile.MediaCategory.ASSET);
        if (n != null) mf.setFileName(n);
        mf = mediaRepo.save(mf);
        return out(mf, true);
    }

    /** Every asset of a folder, by name (an empty list for a folder never used). */
    @Transactional(readOnly = true)
    public List<DeskDto.AssetOut> list(String folder) {
        String f = folderOf(folder);
        Collection root = collectionService.getRoot();
        List<Collection> assets = collectionRepo.findByParentIdAndSlug(root.getId(), CollectionService.ASSETS_SLUG);
        if (assets.isEmpty()) return List.of();
        List<Collection> desk = oldestFirst(collectionRepo.findByParentIdAndName(assets.get(0).getId(), DESK));
        if (desk.isEmpty()) return List.of();
        // albums of the same name made side by side by uploads that started together are read as one, the oldest first
        java.util.Map<String, MediaFile> byName = new java.util.TreeMap<>();
        for (Collection album : oldestFirst(collectionRepo.findByParentIdAndName(desk.get(0).getId(), albumName(f))))
            for (MediaFile m : mediaRepo.findInCollection(album.getId())) byName.putIfAbsent(m.getFileName() == null ? m.getId().toString() : m.getFileName(), m);
        return byName.values().stream().map(m -> out(m, false)).toList();
    }

    private static List<Collection> oldestFirst(List<Collection> list) {
        return list.stream().sorted(java.util.Comparator.comparing(Collection::getCreatedAt, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
            .thenComparing(c -> c.getId().toString())).toList();
    }

    private static String folderOf(String folder) {
        String f = folder == null ? "" : folder.trim().toLowerCase();
        if (!FOLDERS.containsKey(f) && !FOLDER.matcher(f).matches())
            throw new ImportException(400, "folder: " + new java.util.TreeSet<>(FOLDERS.keySet()) + " or another name of lowercase letters, digits and dashes");
        return f;
    }

    private static String albumName(String folder) {
        return FOLDERS.getOrDefault(folder, Character.toUpperCase(folder.charAt(0)) + folder.substring(1));
    }

    /** Assets → Desk → <Folder>, made on first use (the Assets album under the root is kept out of the album lists). */
    private Collection album(String folder) {
        Collection root = collectionService.getRoot();
        List<Collection> found = collectionRepo.findByParentIdAndSlug(root.getId(), CollectionService.ASSETS_SLUG);
        Collection assets = found.isEmpty() ? child(root, ROOT_NAME, "Pictures Sonic Hub itself uses (kept out of the photo streams)") : found.get(0);
        Collection desk = child(assets, DESK, null);
        return child(desk, albumName(folder), null);
    }

    private Collection child(Collection parent, String name, String description) {
        List<Collection> kids = oldestFirst(collectionRepo.findByParentIdAndName(parent.getId(), name));
        if (!kids.isEmpty()) return kids.get(0);
        Collection c = new Collection();
        c.setName(name);
        c.setParent(parent);
        c.setDescription(description);
        c = collectionRepo.save(c);
        collectionService.ensureSlug(c);
        return c;
    }

    private DeskDto.AssetOut out(MediaFile m, boolean created) {
        UUID id = m.getId();
        return new DeskDto.AssetOut(id, storage.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()), m.getFileName(), m.getWidth(), m.getHeight(), created);
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
