package com.sonic.angels.service;

import com.sonic.angels.model.entity.MusicTrack;
import com.sonic.angels.repository.MusicTrackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * The audio of his recordings, in the music folder of the bucket (music/audio/<track key>/<file>): uploaded once per
 * recording (a new file replaces the one before), played through the API with HTTP Range so a player can seek.
 */
@Service
public class MusicAudioService {

    private static final Map<String, String> MIME = Map.of(
        "mp3", "audio/mpeg", "m4a", "audio/mp4", "aac", "audio/aac", "wav", "audio/wav", "flac", "audio/flac",
        "ogg", "audio/ogg", "wma", "audio/x-ms-wma", "mp4", "audio/mp4");

    private final MusicTrackRepository tracks;
    private final StorageService storage;

    public MusicAudioService(MusicTrackRepository tracks, StorageService storage) {
        this.tracks = tracks; this.storage = storage;
    }

    /** What the uploader gets back: where the file is now and whether it was sent to the bucket this time. */
    public record AudioOut(String track, String fileName, Long size, String hash, String mime, Integer bitrate, String url, boolean uploaded) {}

    /**
     * The recording's file (replaces the one before). hash = the SHA-256 the uploader computed: when the recording already
     * has that very file nothing is sent again. sourcePath = where it came from on his disk; bitrate in kbps.
     */
    @Transactional
    public AudioOut upload(String key, MultipartFile file, String sourcePath, Integer bitrate, Integer durationSec, String hash) throws IOException {
        MusicTrack t = tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key));
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("file missing");
        if (!storage.isConfigured()) throw new IllegalStateException("storage not configured");
        boolean same = hash != null && !hash.isBlank() && hash.trim().equalsIgnoreCase(t.getAudioHash()) && t.getAudioStorageKey() != null;
        if (!same) {
            String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().replace('\\', '/');
            original = original.substring(original.lastIndexOf('/') + 1).trim();
            String name = GamePackageService.safeName(original, "audio.mp3");
            String mime = mime(file.getContentType(), name);
            String sk = storage.musicKey("audio/" + t.getExternalKey() + "/" + name);
            String h = put(file, sk, mime);
            String old = t.getAudioStorageKey();
            t.setAudioStorageKey(sk); t.setAudioFileName(original.isBlank() ? name : cut(original, 300)); t.setAudioSize(file.getSize());
            t.setAudioHash(h); t.setAudioMime(mime);
            if (old != null && !old.equals(sk)) {
                try { storage.deleteMusicFile(old); } catch (RuntimeException ignored) { /* a stray file costs nothing */ }
            }
        }
        if (sourcePath != null) t.setAudioSourcePath(sourcePath.isBlank() ? null : cut(sourcePath.trim(), 1000));
        if (bitrate != null) t.setAudioBitrate(bitrate > 0 ? bitrate : null);
        if (durationSec != null && durationSec > 0) t.setDurationSec(durationSec);
        t = tracks.save(t);
        return new AudioOut(t.getExternalKey(), t.getAudioFileName(), t.getAudioSize(), t.getAudioHash(), t.getAudioMime(), t.getAudioBitrate(),
            MusicService.audioPath(t), !same);
    }

    /** The recording loses its file (gone from the bucket too); its links stay. */
    @Transactional
    public void remove(String key) {
        MusicTrack t = tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key));
        String old = t.getAudioStorageKey();
        t.setAudioStorageKey(null); t.setAudioFileName(null); t.setAudioSize(null); t.setAudioHash(null); t.setAudioMime(null);
        t.setAudioBitrate(null);
        tracks.save(t);
        try { storage.deleteMusicFile(old); } catch (RuntimeException ignored) { /* the row is cleared; a stray file costs nothing */ }
    }

    /** What playing a file needs: where it is, its name, size and type, and a tag for the browser's cache. */
    public record Stream(String storageKey, String fileName, Long size, String mime, String etag) {}

    @Transactional(readOnly = true)
    public Stream stream(String key) {
        MusicTrack t = tracks.findByExternalKey(key).orElseThrow(() -> new NoSuchElementException("Recording not found: " + key));
        if (t.getAudioStorageKey() == null) throw new NoSuchElementException("No audio for " + key);
        return new Stream(t.getAudioStorageKey(), t.getAudioFileName(), t.getAudioSize(), t.getAudioMime(), t.getAudioHash());
    }

    public InputStream open(Stream s) { return storage.downloadMusicFile(s.storageKey()); }

    public InputStream open(Stream s, long start, long end) { return storage.downloadMusicRange(s.storageKey(), start, end); }

    private String put(MultipartFile file, String key, String mime) throws IOException {
        try (InputStream raw = file.getInputStream(); DigestInputStream in = new DigestInputStream(raw, MessageDigest.getInstance("SHA-256"))) {
            storage.uploadMusicFile(in, file.getSize(), key, mime);
            return HexFormat.of().formatHex(in.getMessageDigest().digest());
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IOException(e);
        }
    }

    static String mime(String given, String name) {
        int dot = name.lastIndexOf('.');
        String ext = dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
        if (MIME.containsKey(ext)) return MIME.get(ext);
        return given != null && given.startsWith("audio/") ? given : "application/octet-stream";
    }

    private static String cut(String v, int max) { return v.length() <= max ? v : v.substring(0, max); }
}
