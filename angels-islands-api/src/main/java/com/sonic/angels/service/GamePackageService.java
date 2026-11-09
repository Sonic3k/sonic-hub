package com.sonic.angels.service;

import com.sonic.angels.model.dto.GameDto;
import com.sonic.angels.model.entity.GamePackage;
import com.sonic.angels.repository.GamePackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * The files that play games for real, in the private games bucket (packages/<key>/…): never behind the CDN, read only
 * through /api/game-packages/{key}/file and /save. Each package holds one file (a DOS game bundled for DOSBox, a .swf,
 * a ROM, a Windows game's folder) and optionally his own save from back then.
 *
 * The bucket also keeps what runs the Windows games (runtime/<name>: Boxedwine's engine and the Wine file system it
 * starts from), read through /api/game-runtime/{name}. Their names carry their version, so a browser keeps them.
 */
@Service
public class GamePackageService {

    private final GamePackageRepository packages;
    private final GameService games;
    private final StorageService storage;

    public GamePackageService(GamePackageRepository packages, GameService games, StorageService storage) {
        this.packages = packages; this.games = games; this.storage = storage;
    }

    @Transactional(readOnly = true)
    public GameDto.Package get(String key) { return GameService.pkg(find(key)); }

    @Transactional(readOnly = true)
    public List<GameDto.Package> list() { return packages.findAllWithGame().stream().map(GameService::pkg).toList(); }

    @Transactional
    public GameDto.Package put(String key, GameDto.PackageIn in) {
        in.key = key;
        return GameService.pkg(games.putPackage(in));
    }

    @Transactional
    public void delete(String key) { games.deletePackage(find(key)); }

    /** The package's file (replaces the one before). */
    @Transactional
    public GameDto.Package uploadFile(String key, MultipartFile file) throws IOException {
        GamePackage p = find(key);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        String name = safeName(file.getOriginalFilename(), "game.bin");
        String sk = "packages/" + p.getExternalKey() + "/" + name;
        String hash = put(file, sk);
        if (p.getStorageKey() != null && !p.getStorageKey().equals(sk)) storage.deleteGameFile(p.getStorageKey());
        p.setStorageKey(sk); p.setFileName(name); p.setFileSize(file.getSize()); p.setContentHash(hash);
        return GameService.pkg(packages.save(p));
    }

    /** His save from back then; lastModified = the file's own date (epoch ms), kept as when he last saved. */
    @Transactional
    public GameDto.Package uploadSave(String key, MultipartFile file, Long lastModified) throws IOException {
        GamePackage p = find(key);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        String name = safeName(file.getOriginalFilename(), "save.bin");
        String sk = "packages/" + p.getExternalKey() + "/save/" + name;
        put(file, sk);
        if (p.getSaveStorageKey() != null && !p.getSaveStorageKey().equals(sk)) storage.deleteGameFile(p.getSaveStorageKey());
        p.setSaveStorageKey(sk); p.setSaveFileName(name); p.setSaveSize(file.getSize());
        p.setSaveAt(lastModified == null ? null : LocalDateTime.ofInstant(Instant.ofEpochMilli(lastModified), ZoneOffset.UTC));
        return GameService.pkg(packages.save(p));
    }

    /** What streaming a file needs: where it is, its name and size, and a tag for the browser's cache. */
    public record Stream(String storageKey, String fileName, Long size, String etag) {}

    @Transactional(readOnly = true)
    public Stream file(String key) {
        GamePackage p = find(key);
        if (p.getStorageKey() == null) throw new NoSuchElementException("No file for package " + key);
        return new Stream(p.getStorageKey(), p.getFileName(), p.getFileSize(), p.getContentHash());
    }

    @Transactional(readOnly = true)
    public Stream save(String key) {
        GamePackage p = find(key);
        if (p.getSaveStorageKey() == null) throw new NoSuchElementException("No save for package " + key);
        String tag = p.getSaveAt() == null ? null : Long.toHexString(p.getSaveAt().toEpochSecond(ZoneOffset.UTC)) + "-" + p.getSaveSize();
        return new Stream(p.getSaveStorageKey(), p.getSaveFileName(), p.getSaveSize(), tag);
    }

    public InputStream open(Stream s) { return storage.downloadGameFile(s.storageKey()); }

    private static final java.util.regex.Pattern RUNTIME_NAME = java.util.regex.Pattern.compile("[a-z0-9][a-z0-9._-]{0,79}");

    /** A file of the Windows games' runtime (boxedwine-2020.wasm, winroot-v1.zip…). */
    public Stream runtime(String name) {
        String n = runtimeName(name);
        StorageService.ObjectInfo info = storage.gameFileInfo("runtime/" + n);
        if (info == null) throw new NoSuchElementException("No runtime file " + n);
        return new Stream("runtime/" + n, n, info.size(), info.etag());
    }

    /** Puts a file of the runtime (replacing the one of that name). */
    public Stream uploadRuntime(String name, MultipartFile file) throws IOException {
        String n = runtimeName(name);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        try (InputStream in = file.getInputStream()) {
            storage.uploadGameFile(in, file.getSize(), "runtime/" + n, runtimeType(n));
        }
        return runtime(n);
    }

    /** What a runtime file is served as: the engine's script and module, or a plain file (the zips). */
    public static String runtimeType(String name) {
        if (name.endsWith(".wasm")) return "application/wasm";
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".zip")) return "application/zip";
        return "application/octet-stream";
    }

    private static String runtimeName(String name) {
        String n = name == null ? "" : name.trim();
        if (!RUNTIME_NAME.matcher(n).matches() || n.contains("..")) throw new IllegalArgumentException("bad runtime name: " + name);
        return n;
    }

    private GamePackage find(String key) {
        return packages.findByKey(key).orElseThrow(() -> new NoSuchElementException("Package not found: " + key));
    }

    private String put(MultipartFile file, String key) throws IOException {
        try (InputStream raw = file.getInputStream(); DigestInputStream in = new DigestInputStream(raw, MessageDigest.getInstance("SHA-256"))) {
            storage.uploadGameFile(in, file.getSize(), key, "application/octet-stream");
            return HexFormat.of().formatHex(in.getMessageDigest().digest());
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
    }

    /** A file name kept as it was where it is safe in a key ("Pokemon Emerald (U).gba" stays readable). */
    static String safeName(String original, String fallback) {
        String n = original == null ? "" : original.replace('\\', '/');
        n = n.substring(n.lastIndexOf('/') + 1).trim();
        n = n.replaceAll("[^A-Za-z0-9 ._()\\[\\]&+,!-]", "_");
        if (n.isBlank() || n.equals(".") || n.equals("..")) return fallback;
        return n.length() > 200 ? n.substring(n.length() - 200) : n;
    }
}
