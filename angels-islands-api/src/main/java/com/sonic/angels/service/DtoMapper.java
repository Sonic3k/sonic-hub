package com.sonic.angels.service;

import com.sonic.angels.model.dto.*;
import com.sonic.angels.model.entity.*;
import org.springframework.stereotype.Service;

@Service
public class DtoMapper {

    private final StorageService storageService;

    public DtoMapper(StorageService storageService) { this.storageService = storageService; }

    // ── Tag ──────────────────────────────────────────────────────────────────
    public TagDto.Response toTagResponse(Tag t) {
        TagDto.Response r = new TagDto.Response();
        r.setId(t.getId()); r.setName(t.getName()); r.setColor(t.getColor()); r.setDescription(t.getDescription());
        return r;
    }

    // ── Person Summary (for lists) ───────────────────────────────────────────
    public PersonDto.Summary toPersonSummary(Person p) {
        PersonDto.Summary s = new PersonDto.Summary();
        s.setId(p.getId()); s.setName(p.getName()); s.setDisplayName(p.getDisplayName());
        s.setNickname(p.getNickname()); s.setRelationshipType(p.getRelationshipType());
        s.setPeriod(p.getPeriod()); s.setIsFavorite(p.getIsFavorite()); s.setIsFeatured(p.getIsFeatured());
        s.setSong(p.getSong());
        if (p.getAvatarMediaFile() != null) s.setAvatarUrl(storageService.buildCdnUrl(p.getAvatarMediaFile().getStorageKey(), p.getAvatarMediaFile().getStorageProvider()));
        return s;
    }

    // ── Person Detail (for single view) ──────────────────────────────────────
    public PersonDto.DetailResponse toPersonDetail(Person p) {
        PersonDto.DetailResponse d = new PersonDto.DetailResponse();
        d.setId(p.getId()); d.setName(p.getName()); d.setDisplayName(p.getDisplayName());
        d.setNickname(p.getNickname()); d.setRelationshipType(p.getRelationshipType());
        d.setPeriod(p.getPeriod()); d.setIsFavorite(p.getIsFavorite()); d.setIsFeatured(p.getIsFeatured());
        d.setSong(p.getSong()); d.setAlternativeName(p.getAlternativeName());
        d.setDateOfBirth(p.getDateOfBirth()); d.setBio(p.getBio());
        d.setFirstMet(p.getFirstMet()); d.setHowWeMet(p.getHowWeMet());
        d.setCreatedAt(p.getCreatedAt()); d.setUpdatedAt(p.getUpdatedAt());
        if (p.getAvatarMediaFile() != null) d.setAvatarUrl(storageService.buildCdnUrl(p.getAvatarMediaFile().getStorageKey(), p.getAvatarMediaFile().getStorageProvider()));
        if (p.getCoverMediaFile() != null) d.setCoverUrl(storageService.buildCdnUrl(p.getCoverMediaFile().getStorageKey(), p.getCoverMediaFile().getStorageProvider()));
        if (p.getBannerMediaFile() != null) d.setBannerUrl(storageService.buildCdnUrl(p.getBannerMediaFile().getStorageKey(), p.getBannerMediaFile().getStorageProvider()));
        return d;
    }

    // ── Collection ───────────────────────────────────────────────────────────
    public CollectionDto.Response toCollectionResponse(Collection c) {
        CollectionDto.Response r = new CollectionDto.Response();
        r.setId(c.getId()); r.setName(c.getName()); r.setDescription(c.getDescription());
        r.setParentId(c.getParent() != null ? c.getParent().getId() : null);
        r.setMediaCount(c.getMediaFiles() != null ? c.getMediaFiles().size() : 0);
        r.setPersonCount(c.getPersons() != null ? c.getPersons().size() : 0);
        if (c.getThumbnailMediaFile() != null) r.setThumbnailUrl(storageService.buildCdnUrl(c.getThumbnailMediaFile().getStorageKey()));
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    // ── MediaFile ────────────────────────────────────────────────────────────
    public MediaFileDto.Response toMediaFileResponse(MediaFile m) {
        MediaFileDto.Response r = new MediaFileDto.Response();
        r.setId(m.getId()); r.setFileName(m.getFileName()); r.setFileType(m.getFileType());
        r.setMediaCategory(m.getMediaCategory()); r.setOrientation(m.getOrientation());
        r.setFileSize(m.getFileSize()); r.setWidth(m.getWidth()); r.setHeight(m.getHeight());
        r.setAspectRatio(m.getAspectRatio()); r.setDuration(m.getDuration());
        r.setIsFavorite(m.getIsFavorite()); r.setIsFeatured(m.getIsFeatured());
        r.setMimeType(m.getMimeType()); r.setCaption(m.getCaption());
        r.setEffectiveDate(m.getEffectiveDate()); r.setUploadedAt(m.getUploadedAt());
        r.setCdnUrl(storageService.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()));
        r.setThumbnailUrl(m.getStorageKey() != null ? storageService.buildThumbnailUrl(m.getStorageKey(), 300) : null);
        return r;
    }

    // ── ChatArchive ──────────────────────────────────────────────────────────
    public ChatArchiveDto.Response toChatArchiveResponse(ChatArchive a) {
        ChatArchiveDto.Response r = new ChatArchiveDto.Response();
        r.setId(a.getId()); r.setPlatform(a.getPlatform()); r.setTitle(a.getTitle());
        r.setMessageCount(a.getMessageCount()); r.setDateFrom(a.getDateFrom()); r.setDateTo(a.getDateTo());
        r.setExtractionStatus(a.getExtractionStatus()); r.setCreatedAt(a.getCreatedAt());
        return r;
    }

    // ── Memory: Fact ─────────────────────────────────────────────────────────
    public MemoryDto.FactResponse toFactResponse(Fact f) {
        MemoryDto.FactResponse r = new MemoryDto.FactResponse();
        r.setId(f.getId()); r.setCategory(f.getCategory()); r.setKey(f.getKey()); r.setValue(f.getValue());
        r.setPeriod(f.getPeriod()); r.setConfidence(f.getConfidence());
        r.setSourceArchiveId(f.getSourceArchiveId()); r.setCreatedAt(f.getCreatedAt());
        return r;
    }

    // ── Memory: Episode ──────────────────────────────────────────────────────
    public MemoryDto.EpisodeResponse toEpisodeResponse(Episode e) {
        MemoryDto.EpisodeResponse r = new MemoryDto.EpisodeResponse();
        r.setId(e.getId()); r.setSummary(e.getSummary()); r.setEmotion(e.getEmotion());
        r.setImportance(e.getImportance()); r.setOccurredAt(e.getOccurredAt()); r.setCreatedAt(e.getCreatedAt());
        return r;
    }

    // ── Memory: LifeChapter ──────────────────────────────────────────────────
    public MemoryDto.ChapterResponse toChapterResponse(LifeChapter c) {
        MemoryDto.ChapterResponse r = new MemoryDto.ChapterResponse();
        r.setId(c.getId()); r.setPeriod(c.getPeriod()); r.setTitle(c.getTitle());
        r.setSummary(c.getSummary()); r.setSentiment(c.getSentiment());
        r.setSortOrder(c.getSortOrder()); r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    // ── Memory: PersonalityTrait ─────────────────────────────────────────────
    public MemoryDto.TraitResponse toTraitResponse(PersonalityTrait t) {
        MemoryDto.TraitResponse r = new MemoryDto.TraitResponse();
        r.setId(t.getId()); r.setTrait(t.getTrait()); r.setDescription(t.getDescription());
        r.setEvidence(t.getEvidence()); r.setPeriod(t.getPeriod()); r.setCreatedAt(t.getCreatedAt());
        return r;
    }
}
