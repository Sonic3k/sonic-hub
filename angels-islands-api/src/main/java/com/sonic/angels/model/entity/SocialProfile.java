package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One account on a social network as the Social Media portal shows it: a person's Facebook profile, a page, a group,
 * or a Messenger group conversation (CHAT). Everything that changes with time — the name, the profile picture and
 * cover, the intro — lives in its own rows with a time window (SocialProfileName, SocialProfileImage,
 * SocialProfileDetail); this row holds what stays and the defaults.
 *
 * A STUB holds no more than a name (and maybe a picture): someone who only commented or reacted. Their profile shows
 * as locked. It can be turned into a FULL profile at any time.
 *
 * externalKey is the address the data API writes by ("fb:huyen-dieu"); it never changes.
 */
@Entity
@Table(name = "social_profiles",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_social_profile_key", columnNames = "external_key"),
        @UniqueConstraint(name = "uk_social_profile_handle", columnNames = {"platform", "handle"})
    },
    indexes = {
        @Index(name = "idx_social_profile_person", columnList = "person_id"),
        @Index(name = "idx_social_profile_kind", columnList = "platform, kind")
    })
public class SocialProfile extends BaseEntity {

    public enum Platform { FACEBOOK, YAHOO, INSTAGRAM, THREADS }
    /** CHAT = a Messenger group conversation, so its name and picture can change over time like a profile's. */
    public enum Kind { USER, PAGE, GROUP, CHAT }
    public enum Level { FULL, STUB }
    /** Groups only. */
    public enum Privacy { PUBLIC, CLOSED, SECRET }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 200)
    private String externalKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false, length = 16)
    private Platform platform = Platform.FACEBOOK;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private Kind kind = Kind.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false, length = 8)
    private Level level = Level.FULL;

    /** The person in Angels Islands this account belongs to; the account stays when the person is deleted. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Person person;

    /** The name shown when no name window covers the moment. */
    @Column(name = "name", nullable = false)
    private String name;

    /** Username in the profile's address (facebook.com/<handle>); unique per platform. */
    @Column(name = "handle", length = 100)
    private String handle;

    /** The network's own id for the account, when known (numeric Facebook id…). */
    @Column(name = "platform_id", length = 100)
    private String platformId;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Person.Gender gender;

    /** When the account was made ("Joined Facebook in…"); before it the profile does not exist yet. */
    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    /** From this moment the account is gone (deleted or deactivated): "Facebook user", no profile. */
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy", length = 10)
    private Privacy privacy;

    /** Pages: "Musician/Band", "Community"… */
    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "verified")
    private Boolean verified = false;

    /** A count to show instead of the rows there are (friends of a person, members of a group, likes of a page),
     *  when only some of them are kept. */
    @Column(name = "declared_count")
    private Integer declaredCount;

    /** The album its uploads are filed under (Social Media → Facebook → name). A plain id, not a foreign key:
     *  deleting that album in admin is never blocked; the next upload makes a new one. */
    @Column(name = "collection_id")
    private UUID collectionId;

    /** CHAT only: the Messenger conversation this is the face of. */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_archive_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private ChatArchive chatArchive;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    /** Where it came from, for whoever fills the data in. Not shown in the portal. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public SocialProfile() {}

    public boolean isStub() { return level == Level.STUB; }

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public Platform getPlatform() { return platform; }
    public void setPlatform(Platform v) { this.platform = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public Level getLevel() { return level; }
    public void setLevel(Level v) { this.level = v; }
    public Person getPerson() { return person; }
    public void setPerson(Person v) { this.person = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getHandle() { return handle; }
    public void setHandle(String v) { this.handle = v; }
    public String getPlatformId() { return platformId; }
    public void setPlatformId(String v) { this.platformId = v; }
    public Person.Gender getGender() { return gender; }
    public void setGender(Person.Gender v) { this.gender = v; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime v) { this.joinedAt = v; }
    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime v) { this.closedAt = v; }
    public Privacy getPrivacy() { return privacy; }
    public void setPrivacy(Privacy v) { this.privacy = v; }
    public String getCategory() { return category; }
    public void setCategory(String v) { this.category = v; }
    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean v) { this.verified = v; }
    public Integer getDeclaredCount() { return declaredCount; }
    public void setDeclaredCount(Integer v) { this.declaredCount = v; }
    public UUID getCollectionId() { return collectionId; }
    public void setCollectionId(UUID v) { this.collectionId = v; }
    public ChatArchive getChatArchive() { return chatArchive; }
    public void setChatArchive(ChatArchive v) { this.chatArchive = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
}
