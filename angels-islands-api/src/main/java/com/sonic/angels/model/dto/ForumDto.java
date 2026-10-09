package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Old forums: the forum, its boards and threads, posts, and the members (nicks) and who they are on the portal. */
public final class ForumDto {
    private ForumDto() {}

    public record PersonRef(UUID id, String name, String displayName, String avatarUrl, boolean isSelf) {}

    public record Summary(String key, String name, String url, String description, long threadCount, long postCount,
                          long memberCount, LocalDateTime firstPostAt, LocalDateTime lastPostAt) {}

    public record Board(String board, long threadCount, long postCount, LocalDateTime lastPostAt) {}

    public record ThreadSummary(UUID id, String title, String board, LocalDateTime startedAt, LocalDateTime lastPostAt,
                                int postCount, String starterNick, PersonRef starter, List<PersonRef> people) {}

    public record Post(UUID id, int sortOrder, String authorNick, PersonRef person, LocalDateTime postedAt, String title,
                       String contentHtml) {}

    public record ThreadDetail(UUID id, String forumKey, String forumName, String title, String board,
                               LocalDateTime startedAt, LocalDateTime lastPostAt, int postCount, List<String> captured,
                               List<Post> posts) {}

    /** A post found by search or listed on a person's page, with its thread. */
    public record PostHit(UUID id, UUID threadId, String threadTitle, String forumKey, String board, String authorNick,
                          PersonRef person, LocalDateTime postedAt, String title, String snippet) {}

    public record Member(UUID id, String nick, String displayName, LocalDateTime joinedAt, String intro,
                         List<Map<String, Object>> awards, Integer topicCount, Integer replyCount, PersonRef person,
                         long postCount) {}

    public record Page<T>(List<T> content, long totalElements, int page, int size) {}

    // ── import ──
    public record ForumIn(String name, String url, String description) {}

    public record PostIn(String externalId, String authorNick, LocalDateTime postedAt, String title, String contentHtml) {}

    public record ThreadIn(String externalKey, String title, String board, List<String> sources, List<String> captured,
                           List<PostIn> posts) {}

    public record ThreadResult(String externalKey, UUID id, String action, int posts) {}

    /** person: a person's slug on the portal; self: the nick is Ngoc Anh. */
    public record MemberIn(String nick, String personSlug, Boolean self, String displayName, LocalDateTime joinedAt,
                           String intro, List<Map<String, Object>> awards, Integer topicCount, Integer replyCount) {}

    public record MemberResult(String nick, String action, UUID personId, String personName, int postsLinked, String warning) {}
}
