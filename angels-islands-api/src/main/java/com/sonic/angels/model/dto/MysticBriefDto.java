package com.sonic.angels.model.dto;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

/** A brief as Mystic sends it (PUT) and as the person page reads it (GET). */
public class MysticBriefDto {
    public record Fact(String label, String value) {}
    public record Line(String layer, String text, String source) {}

    private String discipline; private String title; private String subjectId; private String profileId; private String profileLabel;
    private String url; private List<Fact> facts; private List<Line> lines;
    /** when Mystic made it */
    private OffsetDateTime updatedAt;
    /** when it arrived here (responses only) */
    private LocalDateTime receivedAt;

    public String getDiscipline() { return discipline; } public void setDiscipline(String v) { this.discipline = v; }
    public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
    public String getSubjectId() { return subjectId; } public void setSubjectId(String v) { this.subjectId = v; }
    public String getProfileId() { return profileId; } public void setProfileId(String v) { this.profileId = v; }
    public String getProfileLabel() { return profileLabel; } public void setProfileLabel(String v) { this.profileLabel = v; }
    public String getUrl() { return url; } public void setUrl(String v) { this.url = v; }
    public List<Fact> getFacts() { return facts; } public void setFacts(List<Fact> v) { this.facts = v; }
    public List<Line> getLines() { return lines; } public void setLines(List<Line> v) { this.lines = v; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(OffsetDateTime v) { this.updatedAt = v; }
    public LocalDateTime getReceivedAt() { return receivedAt; } public void setReceivedAt(LocalDateTime v) { this.receivedAt = v; }
}
