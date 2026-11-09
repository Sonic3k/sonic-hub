package com.sonic.angels.service;

import com.sonic.angels.model.dto.GameDto;
import com.sonic.angels.model.entity.Collection;
import com.sonic.angels.model.entity.Game;
import com.sonic.angels.model.entity.GameMedia;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.repository.CollectionRepository;
import com.sonic.angels.repository.GameMediaRepository;
import com.sonic.angels.repository.MediaFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

/**
 * Files of the shelf that are not his own pictures — the stage maps he collected, a program's icon, art — uploaded for a
 * game and linked to it (MAP, ART, ICON). Each is a MediaFile with mediaCategory ASSET in the album
 * Assets → Games → <game title>, so none of them shows among the photos of Sonic Hub. The same file sent twice is the
 * same asset; with a name (a path such as "Angel Island/AIZ1.png") the asset is that name in its album and replaced
 * when sent again with other content.
 */
@Service
public class GameAssetService {

    private static final String GAMES = "Games";

    private final CollectionRepository collectionRepo;
    private final CollectionService collectionService;
    private final MediaFileService mediaFileService;
    private final MediaFileRepository mediaRepo;
    private final GameMediaRepository gameMedia;
    private final GameService games;
    private final StorageService storage;

    public GameAssetService(CollectionRepository collectionRepo, CollectionService collectionService, MediaFileService mediaFileService,
                            MediaFileRepository mediaRepo, GameMediaRepository gameMedia, GameService games, StorageService storage) {
        this.collectionRepo = collectionRepo; this.collectionService = collectionService; this.mediaFileService = mediaFileService;
        this.mediaRepo = mediaRepo; this.gameMedia = gameMedia; this.games = games; this.storage = storage;
    }

    @Transactional
    public GameDto.AssetOut upload(String gameKey, MultipartFile file, String role, String label, Integer sortOrder,
                                   Long lastModified, String name) throws IOException {
        Game g = games.get(gameKey);
        GameMedia.Role r;
        try { r = role == null || role.isBlank() ? GameMedia.Role.MAP : GameMedia.Role.valueOf(role.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("role: MAP, ART or ICON"); }
        if (r.own()) throw new IllegalArgumentException("role: MAP, ART or ICON (his own pictures go into his albums and are linked by sync)");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        if (!storage.isConfigured()) throw new IllegalStateException("storage not configured");
        String n = name == null || name.isBlank() ? null : name.trim();
        if (n != null && (n.length() > 250 || n.startsWith("/") || n.contains("..") || n.contains("\\")))
            throw new IllegalArgumentException("name: a relative path such as Angel Island/AIZ1.png");
        Collection album = album(g);
        String hash = sha256(file);
        MediaFile mf = null;
        boolean created = false;
        if (n == null) {
            List<MediaFile> same = mediaRepo.findInCollectionByHash(album.getId(), hash);
            if (!same.isEmpty()) mf = same.get(0);
        } else {
            List<MediaFile> named = mediaRepo.findInCollectionByNames(album.getId(), List.of(n));
            for (MediaFile old : named) if (hash.equals(old.getContentHash())) mf = old;
            if (mf == null) for (MediaFile old : named) mediaFileService.delete(old.getId());
        }
        if (mf == null) {
            mf = mediaFileService.upload(file, null, album.getId(), null, lastModified, hash, null);
            mf.setMediaCategory(MediaFile.MediaCategory.ASSET);
            if (n != null) mf.setFileName(n);
            mf = mediaRepo.save(mf);
            created = true;
        }
        MediaFile file0 = mf;
        GameMedia link = gameMedia.findByGameId(g.getId()).stream().filter(x -> x.getMedia().getId().equals(file0.getId())).findFirst().orElse(null);
        if (link == null) { link = new GameMedia(); link.setGame(g); link.setMedia(mf); }
        link.setRole(r);
        if (label != null) link.setLabel(label.isBlank() ? null : label.trim());
        if (sortOrder != null) link.setSortOrder(sortOrder);
        link = gameMedia.save(link);
        return new GameDto.AssetOut(link.getId(), mf.getId(), storage.buildCdnUrl(mf.getStorageKey(), mf.getStorageProvider()), r.name(), link.getLabel(), created);
    }

    /** Assets → Games → <game title>, made on first use (the Assets album is kept out of the album lists). */
    private Collection album(Game g) {
        Collection root = collectionService.getRoot();
        List<Collection> found = collectionRepo.findByParentIdAndSlug(root.getId(), CollectionService.ASSETS_SLUG);
        Collection assets = found.isEmpty() ? child(root, DeskAssetService.ROOT_NAME, "Pictures Sonic Hub itself uses (kept out of the photo streams)") : found.get(0);
        Collection games = child(assets, GAMES, "Files of the game shelf: stage maps, icons");
        return child(games, g.getTitle(), null);
    }

    private Collection child(Collection parent, String name, String description) {
        List<Collection> kids = collectionRepo.findByParentIdAndName(parent.getId(), name).stream()
            .sorted(Comparator.comparing(Collection::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).thenComparing(c -> c.getId().toString()))
            .toList();
        if (!kids.isEmpty()) return kids.get(0);
        Collection c = new Collection();
        c.setName(name);
        c.setParent(parent);
        c.setDescription(description);
        c = collectionRepo.save(c);
        collectionService.ensureSlug(c);
        return c;
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
}
