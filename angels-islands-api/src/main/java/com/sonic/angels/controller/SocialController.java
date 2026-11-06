package com.sonic.angels.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.sonic.angels.model.dto.SocialDto;
import com.sonic.angels.service.ImportException;
import com.sonic.angels.service.SocialMediaService;
import com.sonic.angels.service.SocialMessengerService;
import com.sonic.angels.service.SocialReadService;
import com.sonic.angels.service.SocialSyncService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The Social Media portal (Facebook and Messenger first).
 *
 * Writing — the data API (see SocialDto for the shapes):
 *   POST   /api/social/sync                        one bundle: delete, profiles, albums, posts, comments, reactions, connections, chatMembers
 *   DELETE /api/social/{type}?key=                 one thing by key (profiles, albums, posts, comments, reactions, connections, chat-members)
 *   POST   /api/social/media                       multipart file + key [+ owner, lastModified, source, replace] → a SOCIAL photo
 *   POST   /api/social/media/copy                  [{key, from: <library media file id>, owner}] → copies inside the bucket
 *   GET    /api/social/media?keys=a,b              which keys exist
 *   DELETE /api/social/media?key=                  the item and its file
 *   GET    /api/social/raw/profile?key= | raw/post?key=   read back in the shape written
 *   GET    /api/social/keys/{profiles|posts}?prefix=      keys stored
 *   GET    /api/social/status                      counts
 *
 * Reading — every read takes ?at= (default: the newest moment there is data for):
 *   GET /api/social/range · /random-moment
 *   GET /api/social/fb/home · /fb/feed?before= · /fb/search?q=
 *   GET /api/social/fb/profiles/{ref} · /timeline?before= · /friends?q= · /photos · /albums/{albumId} · /notes?before=
 *   GET /api/social/fb/posts/{ref} (id, or ?key=) · /fb/friendship?a=&b=&before=
 *   GET /api/social/messenger/threads?q= · /threads/{archiveId} · /threads/{archiveId}/messages?before=&size=
 * A profile {ref} is its id, its handle or its key; before= is the "next" a page answered with.
 */
@RestController
@RequestMapping("/api/social")
public class SocialController {

    private final SocialSyncService sync;
    private final SocialMediaService media;
    private final SocialReadService read;
    private final SocialMessengerService messenger;

    public SocialController(SocialSyncService sync, SocialMediaService media, SocialReadService read, SocialMessengerService messenger) {
        this.sync = sync;
        this.media = media;
        this.read = read;
        this.messenger = messenger;
    }

    // ── Writing ──────────────────────────────────────────────────────────────

    @PostMapping("/sync")
    public SocialDto.SyncResult sync(@RequestBody JsonNode body) { return sync.sync(body); }

    @DeleteMapping("/{type:profiles|albums|posts|comments|reactions|connections|chat-members}")
    public Map<String, Object> delete(@PathVariable String type, @RequestParam String key) {
        return Map.of("type", type, "key", key, "deleted", sync.deleteOne(type, key));
    }

    @PostMapping(value = "/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public SocialDto.MediaOut upload(@RequestParam("file") MultipartFile file, @RequestParam String key,
                                     @RequestParam(required = false) String owner, @RequestParam(required = false) Long lastModified,
                                     @RequestParam(required = false) String source,
                                     @RequestParam(defaultValue = "false") boolean replace) throws IOException {
        return media.upload(file, key, owner, lastModified, source, replace);
    }

    @PostMapping("/media/copy")
    public List<SocialDto.MediaOut> copy(@RequestBody List<SocialDto.CopyIn> body) { return media.copy(body); }

    @GetMapping("/media")
    public List<SocialDto.MediaOut> findMedia(@RequestParam String keys) {
        return media.find(Arrays.stream(keys.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
    }

    @DeleteMapping("/media")
    public Map<String, Object> deleteMedia(@RequestParam String key) { return Map.of("key", key, "deleted", media.delete(key)); }

    @GetMapping("/raw/profile")
    public Map<String, Object> rawProfile(@RequestParam String key) { return sync.rawProfile(key); }

    @GetMapping("/raw/post")
    public Map<String, Object> rawPost(@RequestParam String key) { return sync.rawPost(key); }

    @GetMapping("/keys/{type}")
    public List<String> keys(@PathVariable String type, @RequestParam(required = false) String prefix) { return sync.keys(type, prefix); }

    @GetMapping("/status")
    public Map<String, Object> status() { return sync.status(); }

    // ── The moment ───────────────────────────────────────────────────────────

    @GetMapping("/range")
    public SocialDto.Range range() { return read.range(); }

    @GetMapping("/random-moment")
    public SocialDto.Moment randomMoment() { return read.randomMoment(); }

    // ── Facebook ─────────────────────────────────────────────────────────────

    @GetMapping("/fb/home")
    public SocialDto.Home home(@RequestParam(required = false) String at) { return read.home(read.at(at)); }

    @GetMapping("/fb/feed")
    public SocialDto.PostPage feed(@RequestParam(required = false) String at, @RequestParam(required = false) String before,
                                   @RequestParam(defaultValue = "10") int size) {
        return read.feed(read.at(at), before, size);
    }

    @GetMapping("/fb/search")
    public List<SocialDto.Ref> search(@RequestParam String q, @RequestParam(required = false) String at,
                                      @RequestParam(defaultValue = "8") int limit) {
        return read.search(q, read.at(at), limit);
    }

    @GetMapping("/fb/profiles/{ref}")
    public SocialDto.Profile profile(@PathVariable String ref, @RequestParam(required = false) String at) {
        return read.profile(ref, read.at(at));
    }

    @GetMapping("/fb/profiles/{ref}/timeline")
    public SocialDto.PostPage timeline(@PathVariable String ref, @RequestParam(required = false) String at,
                                       @RequestParam(required = false) String before, @RequestParam(defaultValue = "10") int size) {
        return read.timeline(ref, read.at(at), before, size);
    }

    @GetMapping("/fb/profiles/{ref}/friends")
    public List<SocialDto.FriendRow> friends(@PathVariable String ref, @RequestParam(required = false) String at,
                                             @RequestParam(required = false) String q) {
        return read.friends(ref, read.at(at), q);
    }

    @GetMapping("/fb/profiles/{ref}/photos")
    public SocialDto.Photos photos(@PathVariable String ref, @RequestParam(required = false) String at) {
        return read.photos(ref, read.at(at));
    }

    @GetMapping("/fb/profiles/{ref}/albums/{albumId}")
    public SocialDto.AlbumPage album(@PathVariable String ref, @PathVariable String albumId, @RequestParam(required = false) String at) {
        return read.album(ref, albumId, read.at(at));
    }

    @GetMapping("/fb/profiles/{ref}/notes")
    public SocialDto.PostPage notes(@PathVariable String ref, @RequestParam(required = false) String at,
                                    @RequestParam(required = false) String before, @RequestParam(defaultValue = "10") int size) {
        return read.notes(ref, read.at(at), before, size);
    }

    @GetMapping({"/fb/posts/{ref}", "/fb/post"})
    public SocialDto.Post post(@PathVariable(required = false) String ref, @RequestParam(required = false) String key,
                               @RequestParam(required = false) String at) {
        return read.post(ref != null ? ref : key, read.at(at));
    }

    @GetMapping("/fb/friendship")
    public SocialDto.FriendshipPage friendship(@RequestParam String a, @RequestParam String b, @RequestParam(required = false) String at,
                                               @RequestParam(required = false) String before, @RequestParam(defaultValue = "10") int size) {
        return read.friendship(a, b, read.at(at), before, size);
    }

    // ── Messenger ────────────────────────────────────────────────────────────

    @GetMapping("/messenger/threads")
    public List<SocialDto.Thread> threads(@RequestParam(required = false) String at, @RequestParam(required = false) String q) {
        return messenger.threads(read.at(at), q);
    }

    @GetMapping("/messenger/threads/{archiveId}")
    public SocialDto.ThreadDetail thread(@PathVariable UUID archiveId, @RequestParam(required = false) String at) {
        return messenger.thread(archiveId, read.at(at));
    }

    @GetMapping("/messenger/threads/{archiveId}/messages")
    public SocialDto.MessagePage messages(@PathVariable UUID archiveId, @RequestParam(required = false) String at,
                                          @RequestParam(required = false) Integer before, @RequestParam(defaultValue = "60") int size) {
        return messenger.messages(archiveId, read.at(at), before, size);
    }

    @ExceptionHandler(ImportException.class)
    public ResponseEntity<Map<String, String>> error(ImportException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
