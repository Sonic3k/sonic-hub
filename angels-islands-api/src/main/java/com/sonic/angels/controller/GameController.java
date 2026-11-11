package com.sonic.angels.controller;

import com.sonic.angels.model.dto.GameDto;
import com.sonic.angels.service.GameAssetService;
import com.sonic.angels.service.GamePackageService;
import com.sonic.angels.service.GameService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * The game shelf ("Kệ game").
 *
 *   GET    /api/games                          every game as the shelf lists it
 *   GET    /api/games/traces                   every play that left a trace (its evidence), oldest first, with its game
 *   GET    /api/games/{key}                    one game: plays, pictures, memories, notes, links, packages, where it plays
 *   PUT    /api/games/{key}                    create or update one game (GameIn)
 *   DELETE /api/games/{key}
 *   POST   /api/games/{key}/assets             multipart file, role (MAP | ART | ICON), label, sortOrder, lastModified, name
 *   DELETE /api/games/{key}/media/{linkId}     a picture taken off the game
 *   POST   /api/games/sync                     series, games, packages at once (matched by key) + deletes
 *   GET    /api/game-series                    every series with its games
 *   GET    /api/game-series/{key}
 *   PUT    /api/game-series/{key}  DELETE /api/game-series/{key}
 *   GET    /api/game-packages                  every package (no files)
 *   GET    /api/game-packages/{key}            one package
 *   PUT    /api/game-packages/{key}  DELETE /api/game-packages/{key}
 *   POST   /api/game-packages/{key}/file       multipart file: the game's file (private games bucket)
 *   POST   /api/game-packages/{key}/save       multipart file [+ lastModified]: his save from back then
 *   GET    /api/game-packages/{key}/file       the file itself, streamed from the private bucket
 *   GET    /api/game-packages/{key}/save       his save, streamed
 *   GET    /api/game-runtime/{name}            what runs the Windows games (Boxedwine, the Wine files), kept a year
 *   POST   /api/game-runtime/{name}            multipart file: put one of them
 */
@RestController
@RequestMapping("/api")
public class GameController {

    private final GameService games;
    private final GamePackageService packages;
    private final GameAssetService assets;

    public GameController(GameService games, GamePackageService packages, GameAssetService assets) {
        this.games = games; this.packages = packages; this.assets = assets;
    }

    @GetMapping("/games")
    public List<GameDto.Card> list() { return games.list(); }

    @PostMapping("/games/sync")
    public GameDto.SyncResult sync(@RequestBody GameDto.Sync body) { return games.sync(body); }

    @GetMapping("/games/traces")
    public List<GameDto.Trace> traces() { return games.traces(); }

    @GetMapping("/games/{key}")
    public GameDto.Detail get(@PathVariable String key) { return games.detail(key); }

    @PutMapping("/games/{key}")
    public GameDto.Detail put(@PathVariable String key, @RequestBody GameDto.GameIn body) { return games.put(key, body); }

    @DeleteMapping("/games/{key}")
    public ResponseEntity<Void> delete(@PathVariable String key) { games.delete(key); return ResponseEntity.noContent().build(); }

    @PostMapping(value = "/games/{key}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GameDto.AssetOut> asset(@PathVariable String key, @RequestParam MultipartFile file,
                                                  @RequestParam(required = false) String role, @RequestParam(required = false) String label,
                                                  @RequestParam(required = false) Integer sortOrder, @RequestParam(required = false) Long lastModified,
                                                  @RequestParam(required = false) String name) throws IOException {
        GameDto.AssetOut out = assets.upload(key, file, role, label, sortOrder, lastModified, name);
        return ResponseEntity.status(out.created() ? HttpStatus.CREATED : HttpStatus.OK).body(out);
    }

    @DeleteMapping("/games/{key}/media/{linkId}")
    public ResponseEntity<Void> unlink(@PathVariable String key, @PathVariable UUID linkId) {
        games.unlinkMedia(key, linkId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/game-series")
    public List<GameDto.Series> series() { return games.seriesList(); }

    @GetMapping("/game-series/{key}")
    public GameDto.Series series(@PathVariable String key) { return games.series(key); }

    @PutMapping("/game-series/{key}")
    public GameDto.Series putSeries(@PathVariable String key, @RequestBody GameDto.SeriesIn body) { return games.putSeries(key, body); }

    @DeleteMapping("/game-series/{key}")
    public ResponseEntity<Void> deleteSeries(@PathVariable String key) { games.deleteSeries(key); return ResponseEntity.noContent().build(); }

    @GetMapping("/game-packages")
    public List<GameDto.Package> packages() { return packages.list(); }

    @GetMapping("/game-packages/{key}")
    public GameDto.Package pkg(@PathVariable String key) { return packages.get(key); }

    @PutMapping("/game-packages/{key}")
    public GameDto.Package putPackage(@PathVariable String key, @RequestBody GameDto.PackageIn body) { return packages.put(key, body); }

    @DeleteMapping("/game-packages/{key}")
    public ResponseEntity<Void> deletePackage(@PathVariable String key) { packages.delete(key); return ResponseEntity.noContent().build(); }

    @PostMapping(value = "/game-packages/{key}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public GameDto.Package uploadFile(@PathVariable String key, @RequestParam MultipartFile file) throws IOException {
        return packages.uploadFile(key, file);
    }

    @PostMapping(value = "/game-packages/{key}/save", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public GameDto.Package uploadSave(@PathVariable String key, @RequestParam MultipartFile file,
                                      @RequestParam(required = false) Long lastModified) throws IOException {
        return packages.uploadSave(key, file, lastModified);
    }

    @GetMapping("/game-packages/{key}/file")
    public ResponseEntity<InputStreamResource> file(@PathVariable String key,
                                                    @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return stream(packages.file(key), ifNoneMatch);
    }

    @GetMapping("/game-packages/{key}/save")
    public ResponseEntity<InputStreamResource> save(@PathVariable String key,
                                                    @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        return stream(packages.save(key), ifNoneMatch);
    }

    @GetMapping("/game-runtime/{name}")
    public ResponseEntity<InputStreamResource> runtime(@PathVariable String name,
                                                       @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        GamePackageService.Stream s = packages.runtime(name);
        String etag = s.etag() == null ? null : "\"" + s.etag() + "\"";
        CacheControl cache = CacheControl.maxAge(Duration.ofDays(365)).cachePublic();
        if (etag != null && etag.equals(ifNoneMatch)) return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).cacheControl(cache).build();
        var r = ResponseEntity.ok().contentType(MediaType.parseMediaType(GamePackageService.runtimeType(s.fileName()))).cacheControl(cache);
        if (etag != null) r = r.eTag(etag);
        if (s.size() != null) r = r.contentLength(s.size());
        return r.body(new InputStreamResource(packages.open(s)));
    }

    @PostMapping(value = "/game-runtime/{name}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadRuntime(@PathVariable String name, @RequestParam MultipartFile file) throws IOException {
        GamePackageService.Stream s = packages.uploadRuntime(name, file);
        return Map.of("name", s.fileName(), "size", s.size(), "etag", String.valueOf(s.etag()));
    }

    /** A file of the games bucket to the browser; it may keep it a day, and asks again with its tag after that.
     *  Always as plain bytes, never as a page: a package may be someone else's HTML (engine HTML), and opened straight
     *  from this address it must not run as a page of the API — "nosniff" keeps a browser from guessing it is one, and
     *  the sandbox policy leaves it without this origin even if one did. */
    private ResponseEntity<InputStreamResource> stream(GamePackageService.Stream s, String ifNoneMatch) {
        String etag = s.etag() == null ? null : "\"" + s.etag() + "\"";
        CacheControl cache = CacheControl.maxAge(Duration.ofDays(1)).cachePrivate();
        if (etag != null && etag.equals(ifNoneMatch)) return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).cacheControl(cache).build();
        var r = ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).cacheControl(cache)
            .header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "sandbox")
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + s.fileName().replace("\"", "") + "\"");
        if (etag != null) r = r.eTag(etag);
        if (s.size() != null) r = r.contentLength(s.size());
        return r.body(new InputStreamResource(packages.open(s)));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", String.valueOf(e.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
