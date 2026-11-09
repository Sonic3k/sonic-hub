package com.sonic.angels.controller;

import com.sonic.angels.model.dto.MusicDto;
import com.sonic.angels.service.MusicAudioService;
import com.sonic.angels.service.MusicService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * His music.
 *
 *   GET    /api/music/artists                 every artist (with the group a solo artist came from, its members)
 *   GET    /api/music/artists/{key}           one artist: albums, recordings
 *   PUT    /api/music/artists/{key}           create or update (ArtistIn)      DELETE /api/music/artists/{key}
 *   GET    /api/music/albums                  every album                      GET /api/music/albums/{key}: recordings, CDs
 *   PUT    /api/music/albums/{key}            (AlbumIn)                        DELETE /api/music/albums/{key}
 *   GET    /api/music/tracks                  every recording (lists it is in, whether it has a file)
 *   GET    /api/music/tracks/{key}            one recording: links, memories, events, lists, other versions
 *   PUT    /api/music/tracks/{key}            (TrackIn)                        DELETE /api/music/tracks/{key} (its file too)
 *   POST   /api/music/tracks/{key}/audio      multipart file [+ sourcePath, bitrate, durationSec, hash]: its file
 *   DELETE /api/music/tracks/{key}/audio      the file goes, the recording stays
 *   GET    /api/music/tracks/{key}/audio      the file, streamed (honours Range so a player can seek)
 *   GET    /api/music/cds                     the CDs he owns, with their photos and scans
 *   GET    /api/music/cds/{key}   PUT /api/music/cds/{key} (CdIn)   DELETE /api/music/cds/{key}
 *   GET    /api/music/playlists               his lists (checkpoints), in the order of his life
 *   GET    /api/music/playlists/{key}         one list with its songs
 *   PUT    /api/music/playlists/{key}         (PlaylistIn)                     DELETE /api/music/playlists/{key}
 *   GET    /api/music/at?at=2012-06           the music of a moment: the lists that cover it and their songs that play
 *   POST   /api/music/sync                    artists, albums, recordings, CDs and lists at once (matched by key) + deletes
 */
@RestController
@RequestMapping("/api/music")
public class MusicController {

    private final MusicService music;
    private final MusicAudioService audio;

    public MusicController(MusicService music, MusicAudioService audio) {
        this.music = music; this.audio = audio;
    }

    @PostMapping("/sync")
    public MusicDto.SyncResult sync(@RequestBody MusicDto.Sync body) { return music.sync(body); }

    @GetMapping("/at")
    public MusicDto.Moment at(@RequestParam(required = false) String at) {
        return music.at(at == null || at.isBlank() ? LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")) : MusicService.moment(at));
    }

    // ── artists ──────────────────────────────────────────────────────────────

    @GetMapping("/artists")
    public List<MusicDto.Artist> artists() { return music.artists(); }

    @GetMapping("/artists/{key}")
    public MusicDto.ArtistDetail artist(@PathVariable String key) { return music.artist(key); }

    @PutMapping("/artists/{key}")
    public MusicDto.ArtistDetail putArtist(@PathVariable String key, @RequestBody MusicDto.ArtistIn body) { return music.putArtist(key, body); }

    @DeleteMapping("/artists/{key}")
    public ResponseEntity<Void> deleteArtist(@PathVariable String key) { music.deleteArtist(key); return ResponseEntity.noContent().build(); }

    // ── albums ───────────────────────────────────────────────────────────────

    @GetMapping("/albums")
    public List<MusicDto.Album> albums() { return music.albums(); }

    @GetMapping("/albums/{key}")
    public MusicDto.AlbumDetail album(@PathVariable String key) { return music.album(key); }

    @PutMapping("/albums/{key}")
    public MusicDto.AlbumDetail putAlbum(@PathVariable String key, @RequestBody MusicDto.AlbumIn body) { return music.putAlbum(key, body); }

    @DeleteMapping("/albums/{key}")
    public ResponseEntity<Void> deleteAlbum(@PathVariable String key) { music.deleteAlbum(key); return ResponseEntity.noContent().build(); }

    // ── recordings ───────────────────────────────────────────────────────────

    @GetMapping("/tracks")
    public List<MusicDto.Track> tracks() { return music.tracks(); }

    @GetMapping("/tracks/{key}")
    public MusicDto.TrackDetail track(@PathVariable String key) { return music.track(key); }

    @PutMapping("/tracks/{key}")
    public MusicDto.TrackDetail putTrack(@PathVariable String key, @RequestBody MusicDto.TrackIn body) { return music.putTrack(key, body); }

    @DeleteMapping("/tracks/{key}")
    public ResponseEntity<Void> deleteTrack(@PathVariable String key) { music.deleteTrack(key); return ResponseEntity.noContent().build(); }

    @PostMapping(value = "/tracks/{key}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MusicAudioService.AudioOut upload(@PathVariable String key, @RequestParam MultipartFile file,
                                             @RequestParam(required = false) String sourcePath, @RequestParam(required = false) Integer bitrate,
                                             @RequestParam(required = false) Integer durationSec, @RequestParam(required = false) String hash) throws IOException {
        return audio.upload(key, file, sourcePath, bitrate, durationSec, hash);
    }

    @DeleteMapping("/tracks/{key}/audio")
    public ResponseEntity<Void> removeAudio(@PathVariable String key) { audio.remove(key); return ResponseEntity.noContent().build(); }

    /** The file; a single HTTP Range gets 206 so <audio> can seek. The browser may keep it a day. */
    @GetMapping("/tracks/{key}/audio")
    public ResponseEntity<InputStreamResource> play(@PathVariable String key,
                                                    @RequestHeader(value = HttpHeaders.RANGE, required = false) String range,
                                                    @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        MusicAudioService.Stream s = audio.stream(key);
        MediaType type;
        try { type = MediaType.parseMediaType(s.mime() != null ? s.mime() : "application/octet-stream"); }
        catch (Exception e) { type = MediaType.APPLICATION_OCTET_STREAM; }
        String etag = s.etag() == null ? null : "\"" + s.etag() + "\"";
        String disposition = ContentDisposition.inline().filename(s.fileName() == null ? "audio" : s.fileName(), StandardCharsets.UTF_8).build().toString();
        if (range == null && etag != null && etag.equals(ifNoneMatch))
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400").build();
        Long size = s.size();
        long[] r = size != null ? ChatAttachmentController.range(range, size) : null;
        if (r != null && r.length == 0)
            return ResponseEntity.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                .header(HttpHeaders.CONTENT_RANGE, "bytes */" + size).header(HttpHeaders.ACCEPT_RANGES, "bytes").build();
        if (r != null) {
            var partial = ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).contentType(type).contentLength(r[1] - r[0] + 1)
                .header(HttpHeaders.CONTENT_RANGE, "bytes " + r[0] + "-" + r[1] + "/" + size)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes").header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400");
            if (etag != null) partial = partial.eTag(etag);
            return partial.body(new InputStreamResource(audio.open(s, r[0], r[1])));
        }
        var ok = ResponseEntity.ok().contentType(type).header(HttpHeaders.CONTENT_DISPOSITION, disposition)
            .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400");
        if (etag != null) ok = ok.eTag(etag);
        if (size != null) ok = ok.contentLength(size).header(HttpHeaders.ACCEPT_RANGES, "bytes");
        return ok.body(new InputStreamResource(audio.open(s)));
    }

    // ── CDs ──────────────────────────────────────────────────────────────────

    @GetMapping("/cds")
    public List<MusicDto.Cd> cds() { return music.cds(); }

    @GetMapping("/cds/{key}")
    public MusicDto.Cd cd(@PathVariable String key) { return music.cd(key); }

    @PutMapping("/cds/{key}")
    public MusicDto.Cd putCd(@PathVariable String key, @RequestBody MusicDto.CdIn body) { return music.putCd(key, body); }

    @DeleteMapping("/cds/{key}")
    public ResponseEntity<Void> deleteCd(@PathVariable String key) { music.deleteCd(key); return ResponseEntity.noContent().build(); }

    // ── lists ────────────────────────────────────────────────────────────────

    @GetMapping("/playlists")
    public List<MusicDto.Playlist> playlists() { return music.playlists(); }

    @GetMapping("/playlists/{key}")
    public MusicDto.PlaylistDetail playlist(@PathVariable String key) { return music.playlist(key); }

    @PutMapping("/playlists/{key}")
    public MusicDto.PlaylistDetail putPlaylist(@PathVariable String key, @RequestBody MusicDto.PlaylistIn body) { return music.putPlaylist(key, body); }

    @DeleteMapping("/playlists/{key}")
    public ResponseEntity<Void> deletePlaylist(@PathVariable String key) { music.deletePlaylist(key); return ResponseEntity.noContent().build(); }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", String.valueOf(e.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
