package com.sonic.angels.model.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class RankingDto {

    public static class Summary {
        private UUID id; private String board; private String period; private String variant; private String title;
        private LocalDate takenOn; private String source; private List<String> columns; private long entryCount;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getBoard() { return board; } public void setBoard(String v) { this.board = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public String getVariant() { return variant; } public void setVariant(String v) { this.variant = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public LocalDate getTakenOn() { return takenOn; } public void setTakenOn(LocalDate v) { this.takenOn = v; }
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        public List<String> getColumns() { return columns; } public void setColumns(List<String> v) { this.columns = v; }
        public long getEntryCount() { return entryCount; } public void setEntryCount(long v) { this.entryCount = v; }
    }

    public static class Entry {
        private UUID id; private UUID personId; private String personName; private String label; private Integer rank;
        private Double points; private String period; private Map<String, Object> metrics; private String note;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getPersonName() { return personName; } public void setPersonName(String v) { this.personName = v; }
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public Integer getRank() { return rank; } public void setRank(Integer v) { this.rank = v; }
        public Double getPoints() { return points; } public void setPoints(Double v) { this.points = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public Map<String, Object> getMetrics() { return metrics; } public void setMetrics(Map<String, Object> v) { this.metrics = v; }
        public String getNote() { return note; } public void setNote(String v) { this.note = v; }
    }

    public static class Detail extends Summary {
        private List<Entry> entries;
        public List<Entry> getEntries() { return entries; } public void setEntries(List<Entry> v) { this.entries = v; }
    }

    /** A person's row in one ranking, with that ranking's header (for "rank 3 of 112 in 6/2023"). */
    public static class PersonEntry extends Entry {
        private Summary ranking;
        public Summary getRanking() { return ranking; } public void setRanking(Summary v) { this.ranking = v; }
    }

    /** PUT /api/rankings: create or replace the list (board, period, variant) with these rows. */
    public static class Import {
        private String board; private String period; private String variant; private String title; private LocalDate takenOn;
        private String source; private List<String> columns; private List<ImportEntry> entries;
        public String getBoard() { return board; } public void setBoard(String v) { this.board = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public String getVariant() { return variant; } public void setVariant(String v) { this.variant = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public LocalDate getTakenOn() { return takenOn; } public void setTakenOn(LocalDate v) { this.takenOn = v; }
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        public List<String> getColumns() { return columns; } public void setColumns(List<String> v) { this.columns = v; }
        public List<ImportEntry> getEntries() { return entries; } public void setEntries(List<ImportEntry> v) { this.entries = v; }
    }

    public static class ImportEntry {
        private UUID personId; private String personSlug; private String label; private Integer rank; private Double points;
        private String period; private Map<String, Object> metrics; private String note; private Integer sortOrder;
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getPersonSlug() { return personSlug; } public void setPersonSlug(String v) { this.personSlug = v; }
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public Integer getRank() { return rank; } public void setRank(Integer v) { this.rank = v; }
        public Double getPoints() { return points; } public void setPoints(Double v) { this.points = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public Map<String, Object> getMetrics() { return metrics; } public void setMetrics(Map<String, Object> v) { this.metrics = v; }
        public String getNote() { return note; } public void setNote(String v) { this.note = v; }
        public Integer getSortOrder() { return sortOrder; } public void setSortOrder(Integer v) { this.sortOrder = v; }
    }
}
