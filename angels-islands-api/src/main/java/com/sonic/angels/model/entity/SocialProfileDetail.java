package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One line of a profile's About / Intro: where they studied or worked, the city they live in, the relationship,
 * family, the short bio, a favourite quote…
 *
 * Two times are kept apart: start/end is the time of the fact itself (studied there 2005–2008), validFrom/validTo
 * is when the line stood on the profile. Without a validFrom the line shows from the fact's start.
 *
 * title is the main value (school, employer, city, status), subtitle the second (degree, position, the relation
 * "Sister"), body a longer text; related points at the profile it is about (the school's page, the partner).
 */
@Entity
@Table(name = "social_profile_details",
    uniqueConstraints = @UniqueConstraint(name = "uk_social_detail_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_social_detail_profile", columnList = "profile_id"))
public class SocialProfileDetail extends BaseEntity {

    public enum Kind {
        BIO, WORK, EDUCATION, CURRENT_CITY, HOMETOWN, RELATIONSHIP, FAMILY, BIRTHDAY, WEBSITE, CONTACT,
        LANGUAGES, QUOTES, ABOUT, NICKNAME, INTERESTED_IN,
        /** A messenger status line ("boom!!", "Em yêu tự do!") for as long as it stood. */
        STATUS
    }

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

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private Kind kind;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "subtitle", length = 500)
    private String subtitle;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_profile_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private SocialProfile related;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** How much of start/end is known: YEAR, MONTH or DAY. */
    @Enumerated(EnumType.STRING)
    @Column(name = "date_precision", length = 16)
    private DatePrecision datePrecision;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    private SocialSource source = SocialSource.REAL;

    public SocialProfileDetail() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public SocialProfile getProfile() { return profile; }
    public void setProfile(SocialProfile v) { this.profile = v; }
    public Kind getKind() { return kind; }
    public void setKind(Kind v) { this.kind = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String v) { this.subtitle = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public SocialProfile getRelated() { return related; }
    public void setRelated(SocialProfile v) { this.related = v; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate v) { this.startDate = v; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate v) { this.endDate = v; }
    public DatePrecision getDatePrecision() { return datePrecision; }
    public void setDatePrecision(DatePrecision v) { this.datePrecision = v; }
    public LocalDateTime getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDateTime v) { this.validFrom = v; }
    public LocalDateTime getValidTo() { return validTo; }
    public void setValidTo(LocalDateTime v) { this.validTo = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
    public SocialSource getSource() { return source; }
    public void setSource(SocialSource v) { this.source = v; }
}
