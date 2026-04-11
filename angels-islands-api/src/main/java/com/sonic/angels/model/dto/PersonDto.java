package com.sonic.angels.model.dto;
import java.util.UUID;

import com.sonic.angels.model.entity.Person;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public class PersonDto {

    public static class Request {
        private String name; private String displayName; private String alternativeName; private String nickname;
        private LocalDate dateOfBirth; private String bio; private Person.RelationshipType relationshipType;
        private String period; private LocalDate firstMet; private String howWeMet; private String song;
        private Boolean isSelf; private Boolean isFavorite; private Boolean isFeatured; private Set<UUID> tagIds;

        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getAlternativeName() { return alternativeName; } public void setAlternativeName(String v) { this.alternativeName = v; }
        public String getNickname() { return nickname; } public void setNickname(String v) { this.nickname = v; }
        public LocalDate getDateOfBirth() { return dateOfBirth; } public void setDateOfBirth(LocalDate v) { this.dateOfBirth = v; }
        public String getBio() { return bio; } public void setBio(String v) { this.bio = v; }
        public Person.RelationshipType getRelationshipType() { return relationshipType; } public void setRelationshipType(Person.RelationshipType v) { this.relationshipType = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public LocalDate getFirstMet() { return firstMet; } public void setFirstMet(LocalDate v) { this.firstMet = v; }
        public String getHowWeMet() { return howWeMet; } public void setHowWeMet(String v) { this.howWeMet = v; }
        public String getSong() { return song; } public void setSong(String v) { this.song = v; }
        public Boolean getIsSelf() { return isSelf; } public void setIsSelf(Boolean v) { this.isSelf = v; }
        public Boolean getIsFavorite() { return isFavorite; } public void setIsFavorite(Boolean v) { this.isFavorite = v; }
        public Boolean getIsFeatured() { return isFeatured; } public void setIsFeatured(Boolean v) { this.isFeatured = v; }
        public Set<UUID> getTagIds() { return tagIds; } public void setTagIds(Set<UUID> v) { this.tagIds = v; }
    }

    public static class Summary {
        private UUID id; private String name; private String displayName; private String nickname;
        private Person.RelationshipType relationshipType; private String period;
        private Boolean isSelf; private Boolean isFavorite; private Boolean isFeatured; private String avatarUrl; private String song;

        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getNickname() { return nickname; } public void setNickname(String v) { this.nickname = v; }
        public Person.RelationshipType getRelationshipType() { return relationshipType; } public void setRelationshipType(Person.RelationshipType v) { this.relationshipType = v; }
        public String getPeriod() { return period; } public void setPeriod(String v) { this.period = v; }
        public Boolean getIsSelf() { return isSelf; } public void setIsSelf(Boolean v) { this.isSelf = v; }
        public Boolean getIsFavorite() { return isFavorite; } public void setIsFavorite(Boolean v) { this.isFavorite = v; }
        public Boolean getIsFeatured() { return isFeatured; } public void setIsFeatured(Boolean v) { this.isFeatured = v; }
        public String getAvatarUrl() { return avatarUrl; } public void setAvatarUrl(String v) { this.avatarUrl = v; }
        public String getSong() { return song; } public void setSong(String v) { this.song = v; }
    }

    public static class DetailResponse extends Summary {
        private String alternativeName; private LocalDate dateOfBirth; private String bio;
        private LocalDate firstMet; private String howWeMet; private String coverUrl; private String bannerUrl;
        private Set<TagDto.Response> tags; private List<ContactResponse> contacts;
        private Integer totalCollections; private Integer totalMediaFiles;
        private Integer totalChatArchives; private Integer totalFacts; private Integer totalEpisodes;
        private LocalDateTime createdAt; private LocalDateTime updatedAt;

        public String getAlternativeName() { return alternativeName; } public void setAlternativeName(String v) { this.alternativeName = v; }
        public LocalDate getDateOfBirth() { return dateOfBirth; } public void setDateOfBirth(LocalDate v) { this.dateOfBirth = v; }
        public String getBio() { return bio; } public void setBio(String v) { this.bio = v; }
        public LocalDate getFirstMet() { return firstMet; } public void setFirstMet(LocalDate v) { this.firstMet = v; }
        public String getHowWeMet() { return howWeMet; } public void setHowWeMet(String v) { this.howWeMet = v; }
        public String getCoverUrl() { return coverUrl; } public void setCoverUrl(String v) { this.coverUrl = v; }
        public String getBannerUrl() { return bannerUrl; } public void setBannerUrl(String v) { this.bannerUrl = v; }
        public Set<TagDto.Response> getTags() { return tags; } public void setTags(Set<TagDto.Response> v) { this.tags = v; }
        public List<ContactResponse> getContacts() { return contacts; } public void setContacts(List<ContactResponse> v) { this.contacts = v; }
        public Integer getTotalCollections() { return totalCollections; } public void setTotalCollections(Integer v) { this.totalCollections = v; }
        public Integer getTotalMediaFiles() { return totalMediaFiles; } public void setTotalMediaFiles(Integer v) { this.totalMediaFiles = v; }
        public Integer getTotalChatArchives() { return totalChatArchives; } public void setTotalChatArchives(Integer v) { this.totalChatArchives = v; }
        public Integer getTotalFacts() { return totalFacts; } public void setTotalFacts(Integer v) { this.totalFacts = v; }
        public Integer getTotalEpisodes() { return totalEpisodes; } public void setTotalEpisodes(Integer v) { this.totalEpisodes = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
        public LocalDateTime getUpdatedAt() { return updatedAt; } public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
    }

    public static class ContactResponse {
        private UUID id; private String platform; private String identifier; private String displayName; private String notes; private LocalDateTime createdAt;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getPlatform() { return platform; } public void setPlatform(String v) { this.platform = v; }
        public String getIdentifier() { return identifier; } public void setIdentifier(String v) { this.identifier = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { this.notes = v; }
        public LocalDateTime getCreatedAt() { return createdAt; } public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    }

    public static class ContactRequest {
        private String platform; private String identifier; private String displayName; private String notes;
        public String getPlatform() { return platform; } public void setPlatform(String v) { this.platform = v; }
        public String getIdentifier() { return identifier; } public void setIdentifier(String v) { this.identifier = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { this.notes = v; }
    }
}
