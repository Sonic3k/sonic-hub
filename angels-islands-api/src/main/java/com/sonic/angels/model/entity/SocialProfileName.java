package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A name an account went by for a while ("Do Khanh Huyen Dieu" until 2014, "Huyền Diệu Đỗ" after). Outside every
 * window the profile's own name shows. The same rows let the portal know who sent a message or wrote a comment when
 * only the name is kept.
 */
@Entity
@Table(name = "social_profile_names",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_name_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_name_profile", columnList = "profile_id"))
public class SocialProfileName extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 300)
    private String externalKey;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SocialProfile profile;

    @Column(name = "name", nullable = false)
    private String name;

    /** Start of the window (UTC); null = from the beginning. */
    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    /** End of the window, exclusive; null = open. */
    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialProfileName() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
