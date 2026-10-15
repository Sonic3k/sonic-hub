package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * What the Mystic service (Huyền học: tử vi now, chiêm tinh and the rest later) has read for a person, kept beside
 * them so their page tells the whole story: one brief per discipline — a few facts of the newest reading profile and
 * a few lines, each marked as grandma's (primary) or added. Mystic owns it and pushes it here; nothing edits it here.
 */
@Entity
@Table(name = "person_mystic_briefs", uniqueConstraints = @UniqueConstraint(name = "uq_person_mystic_brief", columnNames = {"person_id", "discipline"}))
public class PersonMysticBrief extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    /** tuvi, astrology, numerology, iching, tarot */
    @Column(name = "discipline", nullable = false, length = 40)
    private String discipline;

    @Column(name = "title", nullable = false)
    private String title;

    /** the person and the profile in Mystic, and the page there */
    @Column(name = "subject_id", length = 64)
    private String subjectId;

    @Column(name = "profile_id", length = 64)
    private String profileId;

    @Column(name = "profile_label")
    private String profileLabel;

    @Column(name = "url", length = 500)
    private String url;

    /** when Mystic made this brief */
    @Column(name = "source_updated_at")
    private OffsetDateTime sourceUpdatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "person_mystic_brief_facts", joinColumns = @JoinColumn(name = "brief_id"))
    @OrderColumn(name = "ordinal")
    private List<BriefFact> facts = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "person_mystic_brief_lines", joinColumns = @JoinColumn(name = "brief_id"))
    @OrderColumn(name = "ordinal")
    private List<BriefLine> lines = new ArrayList<>();

    @Embeddable
    public static class BriefFact {
        @Column(name = "label", nullable = false, length = 120) private String label;
        @Column(name = "value", nullable = false, length = 500) private String value;
        public BriefFact() {}
        public BriefFact(String label, String value) { this.label = label; this.value = value; }
        public String getLabel() { return label; }
        public String getValue() { return value; }
    }

    @Embeddable
    public static class BriefLine {
        /** primary = from a family source (grandma's own words); added = anything else (other books, AI) */
        @Column(name = "layer", nullable = false, length = 20) private String layer;
        @Column(name = "text", nullable = false, columnDefinition = "TEXT") private String text;
        /** where it comes from, as Mystic names it (a source code, or "ai") */
        @Column(name = "source", length = 120) private String source;
        public BriefLine() {}
        public BriefLine(String layer, String text, String source) { this.layer = layer; this.text = text; this.source = source; }
        public String getLayer() { return layer; }
        public String getText() { return text; }
        public String getSource() { return source; }
    }

    public UUID getId() { return id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getDiscipline() { return discipline; }
    public void setDiscipline(String discipline) { this.discipline = discipline; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSubjectId() { return subjectId; }
    public void setSubjectId(String subjectId) { this.subjectId = subjectId; }
    public String getProfileId() { return profileId; }
    public void setProfileId(String profileId) { this.profileId = profileId; }
    public String getProfileLabel() { return profileLabel; }
    public void setProfileLabel(String profileLabel) { this.profileLabel = profileLabel; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public OffsetDateTime getSourceUpdatedAt() { return sourceUpdatedAt; }
    public void setSourceUpdatedAt(OffsetDateTime sourceUpdatedAt) { this.sourceUpdatedAt = sourceUpdatedAt; }
    public List<BriefFact> getFacts() { return facts; }
    public List<BriefLine> getLines() { return lines; }
}
