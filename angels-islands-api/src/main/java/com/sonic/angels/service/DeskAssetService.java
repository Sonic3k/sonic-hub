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
 * The pictures the machines use that are not his photos — the wallpapers, the photos of the machines themselves.
 * Each is an ordinary MediaFile with mediaCategory ASSET, filed in the album Assets → Desk → <folder>
 * (storage: assets/desk/<folder>/…), so none of them shows among the photos of Sonic Hub. The same file sent twice
 * is the same asset (matched by its content).
 */
@Service
public class DeskAssetService {

    public static final String ROOT_NAME = "Assets";
    private static final String DESK = "Desk";
    /** folder → album name */
    private static final java.util.Map<String, String> FOLDERS = java.util.Map.of("wallpapers", "Wallpapers", "machines", "Machines");

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
    public DeskDto.AssetOut upload(MultipartFile file, String folder, Long lastModified) throws IOException {
        String f = folder == null ? "" : folder.trim().toLowerCase();
        if (!FOLDERS.containsKey(f)) throw new ImportException(400, "folder: one of " + new java.util.TreeSet<>(FOLDERS.keySet()));
        if (file == null || file.isEmpty()) throw new ImportException(400, "file missing");
        if (!storage.isConfigured()) throw new ImportException(503, "storage not configured");
        Collection album = album(f);
        String hash = sha256(file);
        List<MediaFile> same = mediaRepo.findInCollectionByHash(album.getId(), hash);
        if (!same.isEmpty()) return out(same.get(0), false);
        MediaFile mf = mediaFileService.upload(file, null, album.getId(), null, lastModified, hash, null);
        mf.setMediaCategory(MediaFile.MediaCategory.ASSET);
        mf = mediaRepo.save(mf);
        return out(mf, true);
    }

    /** Assets → Desk → <Folder>, made on first use (the Assets album under the root is kept out of the album lists). */
    private Collection album(String folder) {
        Collection root = collectionService.getRoot();
        List<Collection> found = collectionRepo.findByParentIdAndSlug(root.getId(), CollectionService.ASSETS_SLUG);
        Collection assets = found.isEmpty() ? child(root, ROOT_NAME, "Pictures Sonic Hub itself uses (kept out of the photo streams)") : found.get(0);
        Collection desk = child(assets, DESK, null);
        return child(desk, FOLDERS.get(folder), null);
    }

    private Collection child(Collection parent, String name, String description) {
        List<Collection> kids = collectionRepo.findByParentIdAndName(parent.getId(), name);
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
