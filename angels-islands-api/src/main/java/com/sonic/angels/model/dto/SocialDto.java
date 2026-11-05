package com.sonic.angels.model.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Payloads of the Social Media portal (/api/social/**).
 *
 * Writing — everything is addressed by key and every write is an upsert, so sending the same thing twice changes
 * nothing. A field left out of an item keeps what is stored; a field sent as null clears it. A list sent (names,
 * images, details of a profile; media and tags of a post) replaces the stored list; a list left out is kept.
 * Profiles are referred to by key; where only a name is known (…Name fields) a STUB profile is made for it.
 *
 * Times are ISO-8601. With Z or an offset they are absolute; without, they are Vietnam wall-clock. A shorter value
 * says how much is known: "2012" (YEAR), "2012-03" (MONTH), "2012-03-12" (DAY), "2012-03-12T21:30" (MINUTE).
 *
 * Reading — every read takes ?at= (the moment the portal is looking from; default the newest moment there is data
 * for) and answers as things stood then. Times come back as UTC without a zone, like the rest of the API.
 */
public final class SocialDto {

    private SocialDto() {}

    // ════════════════════════════════════════════════════════════════════════
    // Writing
    // ════════════════════════════════════════════════════════════════════════

    public record ProfileIn(
        String key, String platform, String kind, String level,
        /** The Angels Islands person: by slug, or by id. */
        String person, UUID personId,
        String name, String handle, String platformId, String gender,
        String joinedAt, String closedAt, String privacy, String category, Boolean verified, Integer declaredCount,
        /** CHAT only: the Messenger archive (its id or its externalKey). */
        String chatArchive,
        String source, String note,
        List<NameIn> names, List<ImageIn> images, List<DetailIn> details) {}

    public record NameIn(String key, String name, String from, String to, String source) {}

    /** media = the key of a social media item (see /api/social/media). announce: a window with a start gets a
     *  "updated … picture" post (key: <image key>#post) unless false; caption and audience go on that post. */
    public record ImageIn(String key, String kind, String media, String from, String to, Boolean isDefault,
                          Float focusX, Float focusY, Boolean announce, String caption, String audience, String source) {}

    /** start/end: the fact's own time ("2005", "2008-06"); precision optional (read from the values). from/to: when it
     *  stood on the profile (default: from the start). */
    public record DetailIn(String key, String kind, String title, String subtitle, String body,
                           String related, String relatedName, String start, String end, String precision,
                           String from, String to, Integer order, String source) {}

    public record AlbumIn(String key, String profile, String title, String description, String location,
                          String cover, String publishedAt, String source) {}

    public record LinkIn(String url, String title, String description, String imageUrl) {}

    public record PostMediaIn(String media, String caption) {}

    /** kind is worked out when left out: a title and body make a NOTE, photos PHOTO, a link LINK, a shared post SHARE,
     *  a place CHECK_IN, otherwise STATUS. wall defaults to the author. */
    public record PostIn(
        String key, String kind, String author, String authorName, String wall, String album, String sharedPost,
        UUID journalNoteId, String journalNoteSlug,
        String title, String text, String body, String cover,
        String postedAt, String precision, String editedAt, String audience,
        String activity, String activityIcon, String placeName, String place,
        String eventDate, String eventPrecision,
        LinkIn link, List<PostMediaIn> media, List<String> tags, List<String> tagNames,
        Integer likeCount, Integer commentCount, Integer shareCount, Boolean pinned,
        UUID originArchiveId, Integer originSeq, String source, String note) {}

    /** media = a photo of the post (its media key) the comment is under; attachment = a photo sent with it. */
    public record CommentIn(String key, String post, String media, String parent, String author, String authorName,
                            String text, String attachment, String postedAt, String precision, String editedAt,
                            Integer likeCount, UUID originArchiveId, Integer originSeq, String source) {}

    /** On a post, a photo of a post (post + media) or a comment. key is made from the target and the profile when left out. */
    public record ReactionIn(String key, String post, String media, String comment, String profile, String profileName,
                             String type, String at, String source) {}

    /** FRIEND goes both ways; MEMBER / ADMIN / MODERATOR: from = the person, to = the group; PAGE_LIKE / FOLLOW: to = the page. */
    public record ConnectionIn(String key, String kind, String from, String fromName, String to, String toName,
                               String since, String until, String source) {}

    /** archive = the Messenger archive's externalKey (or archiveId); sender = the sender name exactly as stored. */
    public record ChatMemberIn(String key, String archive, UUID archiveId, String sender, String profile, String profileName,
                               String nickname, String from, String to, Boolean admin, String source) {}

    public record DeleteIn(List<String> profiles, List<String> albums, List<String> posts, List<String> comments,
                           List<String> reactions, List<String> connections, List<String> chatMembers) {}

    public record SyncResult(Map<String, Map<String, Integer>> counts, Map<String, String> stubs, List<String> warnings) {}

    public record MediaOut(String key, UUID mediaFileId, String url, String type, Integer width, Integer height,
                           boolean created, String owner) {}

    public record CopyIn(String key, UUID from, String owner, String source) {}

    // ════════════════════════════════════════════════════════════════════════
    // Reading
    // ════════════════════════════════════════════════════════════════════════

    /** A profile as it showed at the moment: state = active | locked (a stub) | gone (deleted by then) | unborn (not made yet). */
    public record Ref(UUID id, String key, String handle, String platform, String kind, String state, String name,
                      String avatarUrl, String gender, boolean verified) {}

    public record Media(UUID id, String key, UUID itemId, String type, String url, String posterUrl, Integer width,
                        Integer height, String caption) {}

    public record Reactions(int total, List<String> types, List<Ref> who, String mine) {}

    public record Link(String url, String domain, String title, String description, String imageUrl) {}

    public record Place(String name, Ref ref) {}

    public record AlbumRef(UUID id, String key, String title) {}

    public record Comment(UUID id, String key, Ref author, String text, Media media, LocalDateTime postedAt,
                          String precision, LocalDateTime editedAt, Reactions reactions, int likeCount,
                          List<Comment> replies, UUID itemId, String source) {}

    public record Post(UUID id, String key, String kind, Ref author, Ref wall, AlbumRef album,
                       String title, String text, String excerpt, boolean hasBody, String body, String coverUrl,
                       LocalDateTime postedAt, String precision, LocalDateTime editedAt, String audience,
                       String activity, String activityIcon, Place place,
                       LocalDateTime eventDate, String eventPrecision, Link link, Post shared,
                       List<Ref> tagged, List<Media> media, Reactions reactions,
                       int commentCount, int shareCount, int hiddenComments, List<Comment> comments,
                       boolean pinned, String source) {}

    public record PostPage(List<Post> items, String next) {}

    /** One line of the intro / about: the client words it ("Studied at…", "Lives in…"). current = still true at the moment. */
    public record Detail(UUID id, String kind, String title, String subtitle, String body, Ref related,
                         LocalDate start, LocalDate end, String precision, boolean current) {}

    public record Counts(int friends, int mutual, int photos, int members, int likes, int notes) {}

    public record Friendship(boolean friends, LocalDateTime since, boolean self) {}

    public record Profile(Ref ref, String coverUrl, Float coverFocusX, Float coverFocusY, String avatarFullUrl,
                          String privacy, String category, LocalDateTime joinedAt, String level,
                          List<Detail> intro, Counts counts, Friendship withMe,
                          List<Media> photos, List<Ref> friends, LocalDateTime at) {}

    public record FriendRow(Ref ref, LocalDateTime since, boolean mutual) {}

    public record AlbumRow(String id, String key, String title, String description, String coverUrl, int count,
                           LocalDateTime updatedAt, String type) {}

    public record Photos(List<AlbumRow> albums, List<Media> uploads, List<Media> tagged) {}

    public record AlbumPage(AlbumRow album, Ref owner, List<Media> media) {}

    public record FriendshipPage(Ref a, Ref b, LocalDateTime since, List<Ref> mutual, List<Post> posts, String next) {}

    public record Home(Ref me, List<Ref> groups, List<Ref> pages, List<Ref> birthdays, LocalDateTime at) {}

    public record Range(LocalDateTime from, LocalDateTime to, LocalDateTime latest, long posts, long threads) {}

    public record Moment(LocalDateTime at, String from) {}

    // ── Messenger ─────────────────────────────────────────────────────────────

    public record LastMessage(String sender, boolean fromMe, String text, String kind, LocalDateTime at) {}

    public record Thread(UUID archiveId, String title, boolean group, List<Ref> faces, Ref counterpart,
                         LastMessage last, int messageCount) {}

    public record Member(Ref ref, String sender, String nickname, boolean admin, boolean me, int messages) {}

    public record ThreadDetail(UUID archiveId, String title, boolean group, Ref counterpart, List<Member> members,
                               LocalDateTime firstAt, LocalDateTime lastAt, long messageCount, LocalDateTime at) {}

    public record MessageReaction(String emoji, String name) {}

    public record Message(UUID id, int seq, String kind, String text, LocalDateTime at, String precision,
                          boolean fromMe, boolean system, String sender, Ref from, String nickname,
                          List<ChatAttachmentDto.Item> attachments, List<MessageReaction> reactions) {}

    public record MessagePage(List<Message> items, boolean hasMore, Integer oldestSeq) {}
}
