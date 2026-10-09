package com.sonic.angels.controller;

import com.sonic.angels.model.dto.ForumDto;
import com.sonic.angels.service.ForumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Old forums (onthi.com…): boards, threads, posts, members, search, and each person's posts. */
@RestController
public class ForumController {

    private final ForumService forumService;

    public ForumController(ForumService forumService) { this.forumService = forumService; }

    @GetMapping("/api/forums")
    public List<ForumDto.Summary> forums() { return forumService.forums(); }

    @GetMapping("/api/forums/{key}")
    public ForumDto.Summary forum(@PathVariable String key) { return forumService.forum(key); }

    @GetMapping("/api/forums/{key}/boards")
    public List<ForumDto.Board> boards(@PathVariable String key) { return forumService.boards(key); }

    /** sort: activity (default) | started | oldest | posts */
    @GetMapping("/api/forums/{key}/threads")
    public ForumDto.Page<ForumDto.ThreadSummary> threads(@PathVariable String key, @RequestParam(required = false) String board,
                                                         @RequestParam(required = false) String q, @RequestParam(required = false) String sort,
                                                         @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return forumService.threads(key, board, q, sort, page, size);
    }

    @GetMapping("/api/forum-threads/{id}")
    public ForumDto.ThreadDetail thread(@PathVariable UUID id) { return forumService.thread(id); }

    /** Search posts of one forum (accent-insensitive), optionally by person or nick. */
    @GetMapping("/api/forums/{key}/posts")
    public ForumDto.Page<ForumDto.PostHit> posts(@PathVariable String key, @RequestParam(required = false) String q,
                                                 @RequestParam(required = false) UUID personId, @RequestParam(required = false) String nick,
                                                 @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return forumService.posts(key, q, personId, nick, page, size);
    }

    @GetMapping("/api/forums/{key}/members")
    public List<ForumDto.Member> members(@PathVariable String key) { return forumService.members(key); }

    /** A person's posts on every forum, newest first, and a summary per forum. */
    @GetMapping("/api/persons/{personId}/forum-posts")
    public ForumDto.Page<ForumDto.PostHit> personPosts(@PathVariable UUID personId, @RequestParam(required = false) String q,
                                                       @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return forumService.posts(null, q, personId, null, page, size);
    }

    @GetMapping("/api/persons/{personId}/forums")
    public List<Map<String, Object>> personForums(@PathVariable UUID personId) { return forumService.personSummary(personId); }

    // ── import ──
    @PutMapping("/api/forums/{key}")
    public ForumDto.Summary upsert(@PathVariable String key, @RequestBody ForumDto.ForumIn in) { return forumService.upsertForum(key, in); }

    @PutMapping("/api/forums/{key}/members")
    public List<ForumDto.MemberResult> upsertMembers(@PathVariable String key, @RequestBody List<ForumDto.MemberIn> in) {
        return forumService.upsertMembers(key, in);
    }

    @PutMapping("/api/forums/{key}/threads")
    public List<ForumDto.ThreadResult> upsertThreads(@PathVariable String key, @RequestBody List<ForumDto.ThreadIn> in) {
        return forumService.upsertThreads(key, in);
    }

    @DeleteMapping("/api/forum-threads/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { forumService.deleteThread(id); return ResponseEntity.noContent().build(); }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("error", e.getMessage())); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.status(400).body(Map.of("error", e.getMessage())); }
}
