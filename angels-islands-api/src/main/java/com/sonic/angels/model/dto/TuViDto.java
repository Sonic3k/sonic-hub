package com.sonic.angels.model.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Request and response shapes of /api/tuvi. Choices travel in lower case: gender nam|nu, calendar solar|lunar,
 *  variant ba|sach, leapRule same|split15. */
public class TuViDto {

    /** A saved birth profile. hour is the clock hour 0–23 (solar) or the giờ branch 0 Tý … 11 Hợi (lunar). */
    public static class Profile {
        private UUID id; private String name; private String gender; private String calendar; private int year; private int month;
        private int day; private boolean leap; private int hour; private Integer minute; private String variant; private String leapRule;
        private boolean tyNextDay; private String personId; private String personName; private String note;
        private LocalDateTime createdAt; private LocalDateTime updatedAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getGender() { return gender; } public void setGender(String v) { this.gender = v; }
        public String getCalendar() { return calendar; } public void setCalendar(String v) { this.calendar = v; }
        public int getYear() { return year; } public void setYear(int v) { this.year = v; }
        public int getMonth() { return month; } public void setMonth(int v) { this.month = v; }
        public int getDay() { return day; } public void setDay(int v) { this.day = v; }
        public boolean isLeap() { return leap; } public void setLeap(boolean v) { this.leap = v; }
        public int getHour() { return hour; } public void setHour(int v) { this.hour = v; }
        public Integer getMinute() { return minute; } public void setMinute(Integer v) { this.minute = v; }
        public String getVariant() { return variant; } public void setVariant(String v) { this.variant = v; }
        public String getLeapRule() { return leapRule; } public void setLeapRule(String v) { this.leapRule = v; }
        public boolean isTyNextDay() { return tyNextDay; } public void setTyNextDay(boolean v) { this.tyNextDay = v; }
        public String getPersonId() { return personId; } public void setPersonId(String v) { this.personId = v; }
        public String getPersonName() { return personName; } public void setPersonName(String v) { this.personName = v; }
        public String getNote() { return note; } public void setNote(String v) { this.note = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
        public LocalDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
    }

    /** POST/PUT body. variant (default ba), leapRule (default same) and tyNextDay (default true) may be left out;
     *  leap counts only for lunar input; personId is a person on Angels Islands, or null. */
    public static class ProfileInput {
        private String name; private String gender; private String calendar; private Integer year; private Integer month;
        private Integer day; private Boolean leap; private Integer hour; private Integer minute; private String variant;
        private String leapRule; private Boolean tyNextDay; private String personId; private String note;
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getGender() { return gender; } public void setGender(String v) { this.gender = v; }
        public String getCalendar() { return calendar; } public void setCalendar(String v) { this.calendar = v; }
        public Integer getYear() { return year; } public void setYear(Integer v) { this.year = v; }
        public Integer getMonth() { return month; } public void setMonth(Integer v) { this.month = v; }
        public Integer getDay() { return day; } public void setDay(Integer v) { this.day = v; }
        public Boolean getLeap() { return leap; } public void setLeap(Boolean v) { this.leap = v; }
        public Integer getHour() { return hour; } public void setHour(Integer v) { this.hour = v; }
        public Integer getMinute() { return minute; } public void setMinute(Integer v) { this.minute = v; }
        public String getVariant() { return variant; } public void setVariant(String v) { this.variant = v; }
        public String getLeapRule() { return leapRule; } public void setLeapRule(String v) { this.leapRule = v; }
        public Boolean getTyNextDay() { return tyNextDay; } public void setTyNextDay(Boolean v) { this.tyNextDay = v; }
        public String getPersonId() { return personId; } public void setPersonId(String v) { this.personId = v; }
        public String getNote() { return note; } public void setNote(String v) { this.note = v; }
    }

    /** POST /api/tuvi/readings: the chart as text and the lines the web matched to it. With profileId the reading is
     *  stored, in place of the older one of the same scope and year; without, it is only returned. */
    public static class ReadingRequest {
        private UUID profileId; private String scope; private Integer viewYear; private String inputHash; private String chart;
        private List<Line> lines;
        public UUID getProfileId() { return profileId; } public void setProfileId(UUID v) { this.profileId = v; }
        public String getScope() { return scope; } public void setScope(String v) { this.scope = v; }
        public Integer getViewYear() { return viewYear; } public void setViewYear(Integer v) { this.viewYear = v; }
        public String getInputHash() { return inputHash; } public void setInputHash(String v) { this.inputHash = v; }
        public String getChart() { return chart; } public void setChart(String v) { this.chart = v; }
        public List<Line> getLines() { return lines; } public void setLines(List<Line> v) { this.lines = v; }
    }

    /** One matched line: ref is its id in the book, palace the cung it was read in, source "ba" (grandma's notes) or
     *  "bo-sung" (other books), why what in the chart made it match (the stars, miếu/hãm, Tuần/Triệt…). */
    public static class Line {
        private String ref; private String palace; private String source; private String text; private String why;
        public String getRef() { return ref; } public void setRef(String v) { this.ref = v; }
        public String getPalace() { return palace; } public void setPalace(String v) { this.palace = v; }
        public String getSource() { return source; } public void setSource(String v) { this.source = v; }
        public String getText() { return text; } public void setText(String v) { this.text = v; }
        public String getWhy() { return why; } public void setWhy(String v) { this.why = v; }
    }

    /** content is the model's JSON object: {"sections":[{"title","ba":[{"text","refs"}],"them":[{"text"}]}],"caution"}.
     *  id and createdAt are null when the reading was not stored. */
    public static class Reading {
        private UUID id; private UUID profileId; private String scope; private int viewYear; private String inputHash;
        private String model; private JsonNode content; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public UUID getProfileId() { return profileId; } public void setProfileId(UUID v) { this.profileId = v; }
        public String getScope() { return scope; } public void setScope(String v) { this.scope = v; }
        public int getViewYear() { return viewYear; } public void setViewYear(int v) { this.viewYear = v; }
        public String getInputHash() { return inputHash; } public void setInputHash(String v) { this.inputHash = v; }
        public String getModel() { return model; } public void setModel(String v) { this.model = v; }
        public JsonNode getContent() { return content; } public void setContent(JsonNode v) { this.content = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    /** ai: whether readings can be asked for (ANTHROPIC_API_KEY is set); model: the one that writes them. */
    public static class Status {
        private boolean ai; private String model;
        public boolean isAi() { return ai; } public void setAi(boolean v) { this.ai = v; }
        public String getModel() { return model; } public void setModel(String v) { this.model = v; }
    }
}
