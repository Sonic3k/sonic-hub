package com.sonic.angels.model.entity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "persons")
public class Person extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "alternative_name")
    private String alternativeName;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type")
    private RelationshipType relationshipType;

    @Column(name = "period")
    private String period; // "2010-2013"

    @Column(name = "first_met")
    private LocalDate firstMet;

    @Column(name = "how_we_met", columnDefinition = "TEXT")
    private String howWeMet;

    @Column(name = "song")
    private String song; // bài hát gắn liền

    @Column(name = "is_self")
    private Boolean isSelf = false;

    @Column(name = "is_favorite")
    private Boolean isFavorite = false;

    @Column(name = "is_featured")
    private Boolean isFeatured = false;

    // ── Avatar / Cover / Banner ──────────────────────────────────────────────

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "avatar_media_file_id")
    private MediaFile avatarMediaFile;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_media_file_id")
    private MediaFile coverMediaFile;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "banner_media_file_id")
    private MediaFile bannerMediaFile;

    // ── Relations ────────────────────────────────────────────────────────────

    @JsonIgnore
    @ManyToMany(mappedBy = "persons")
    private Set<MediaFile> mediaFiles = new HashSet<>();

    @JsonIgnore
    @ManyToMany(mappedBy = "persons")
    private Set<Collection> collections = new HashSet<>();

    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "person_tags",
        joinColumns = @JoinColumn(name = "person_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("platform ASC")
    private Set<PersonContact> contacts = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<ChatArchive> chatArchives = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Fact> facts = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Episode> episodes = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<LifeChapter> lifeChapters = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "person", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<PersonalityTrait> personalityTraits = new HashSet<>();

    // ── Enums ────────────────────────────────────────────────────────────────

    public enum RelationshipType {
        CRUSH, GIRLFRIEND, FRIEND, EX, ACQUAINTANCE, PEN_PAL, ONLINE_FRIEND
    }

    // ── Constructors ─────────────────────────────────────────────────────────

    public Person() {}

    // ── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getAlternativeName() { return alternativeName; }
    public void setAlternativeName(String alternativeName) { this.alternativeName = alternativeName; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public RelationshipType getRelationshipType() { return relationshipType; }
    public void setRelationshipType(RelationshipType relationshipType) { this.relationshipType = relationshipType; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public LocalDate getFirstMet() { return firstMet; }
    public void setFirstMet(LocalDate firstMet) { this.firstMet = firstMet; }
    public String getHowWeMet() { return howWeMet; }
    public void setHowWeMet(String howWeMet) { this.howWeMet = howWeMet; }
    public String getSong() { return song; }
    public void setSong(String song) { this.song = song; }
    public Boolean getIsSelf() { return isSelf; }
    public void setIsSelf(Boolean isSelf) { this.isSelf = isSelf; }
    public Boolean getIsFavorite() { return isFavorite; }
    public void setIsFavorite(Boolean isFavorite) { this.isFavorite = isFavorite; }
    public Boolean getIsFeatured() { return isFeatured; }
    public void setIsFeatured(Boolean isFeatured) { this.isFeatured = isFeatured; }
    public MediaFile getAvatarMediaFile() { return avatarMediaFile; }
    public void setAvatarMediaFile(MediaFile avatarMediaFile) { this.avatarMediaFile = avatarMediaFile; }
    public MediaFile getCoverMediaFile() { return coverMediaFile; }
    public void setCoverMediaFile(MediaFile coverMediaFile) { this.coverMediaFile = coverMediaFile; }
    public MediaFile getBannerMediaFile() { return bannerMediaFile; }
    public void setBannerMediaFile(MediaFile bannerMediaFile) { this.bannerMediaFile = bannerMediaFile; }
    public Set<MediaFile> getMediaFiles() { return mediaFiles; }
    public void setMediaFiles(Set<MediaFile> mediaFiles) { this.mediaFiles = mediaFiles; }
    public Set<Collection> getCollections() { return collections; }
    public void setCollections(Set<Collection> collections) { this.collections = collections; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
    public Set<ChatArchive> getChatArchives() { return chatArchives; }
    public void setChatArchives(Set<ChatArchive> chatArchives) { this.chatArchives = chatArchives; }
    public Set<PersonContact> getContacts() { return contacts; }
    public void setContacts(Set<PersonContact> contacts) { this.contacts = contacts; }
    public Set<Fact> getFacts() { return facts; }
    public void setFacts(Set<Fact> facts) { this.facts = facts; }
    public Set<Episode> getEpisodes() { return episodes; }
    public void setEpisodes(Set<Episode> episodes) { this.episodes = episodes; }
    public Set<LifeChapter> getLifeChapters() { return lifeChapters; }
    public void setLifeChapters(Set<LifeChapter> lifeChapters) { this.lifeChapters = lifeChapters; }
    public Set<PersonalityTrait> getPersonalityTraits() { return personalityTraits; }
    public void setPersonalityTraits(Set<PersonalityTrait> personalityTraits) { this.personalityTraits = personalityTraits; }
}
