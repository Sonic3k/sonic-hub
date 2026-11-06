package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Who is linked to whom, and from when to when: two friends (either way round), someone following an account, a
 * member, admin or moderator of a group, a like of a page. Friend counts, member lists and the news feed at a moment
 * are read from these.
 */
@Entity
@Table(name = "social_connections",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_connection_key", columnNames = "external_key"),
    indexes = {
        @Index(name = "idx_social_conn_from", columnList = "from_profile_id, kind"),
        @Index(name = "idx_social_conn_to", columnList = "to_profile_id, kind")
    })
public class SocialConnection extends BaseEntity {

    public enum Kind { FRIEND, FOLLOW, MEMBER, ADMIN, MODERATOR, PAGE_LIKE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 500)
    private String externalKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 12)
    private Kind kind;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "from_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile from;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "to_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile to;

    /** The group a contact sat in on a buddy list ("onthi.com", "SE0421 FPT"…); none for Facebook friends. */
    @Column(name = "label", length = 120)
    private String label;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialConnection() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public SocialProfile getFrom() { return from; }
    public void setFrom(SocialProfile v) { this.from = v; }
    public SocialProfile getTo() { return to; }
    public void setTo(SocialProfile v) { this.to = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
}
