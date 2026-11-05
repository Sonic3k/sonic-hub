package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Who is behind a sender name in one Messenger conversation, and their part in it: the profile, the nickname set
 * for them there, when they joined or left a group chat. The messages themselves stay in chat_messages; the sender
 * name is matched exactly as it is stored there. A row per period, so a nickname that changed is a second row.
 */
@Entity
@Table(name = "social_chat_members",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_chat_member_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_chat_member_archive", columnList = "chat_archive_id"))
public class SocialChatMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 500)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chat_archive_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ChatArchive archive;

    /** The sender exactly as chat_messages has it. */
    @Column(name = "sender_name", nullable = false, length = 300)
    private String senderName;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Column(name = "nickname", length = 200)
    private String nickname;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "admin")
    private Boolean admin = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialChatMember() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public ChatArchive getArchive() { return archive; }
    public void setArchive(ChatArchive v) { this.archive = v; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String v) { this.senderName = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public String getNickname() { return nickname; }
    public void setNickname(String v) { this.nickname = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public Boolean getAdmin() { return admin; }
    public void setAdmin(Boolean v) { this.admin = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
