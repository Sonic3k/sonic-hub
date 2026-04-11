package com.sonic.angels.service;

import com.sonic.angels.model.dto.*;
import com.sonic.angels.model.entity.*;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DtoMapper {

    private final StorageService storageService;

    public DtoMapper(StorageService storageService) { this.storageService = storageService; }

    // ── Tag ──────────────────────────────────────────────────────────────────
    public TagDto.Response toTagResponse(Tag t) {
        TagDto.Response r = new TagDto.Response();
        r.setId(t.getId()); r.setName(t.getName()); r.setColor(t.getColor());
        return r;
    }

    // ── Person Summary (for lists) ───────────────────────────────────────────
    public PersonDto.Summary toPersonSummary(Person p) {
        PersonDto.Summary s = new PersonDto.Summary();
        s.setId(p.getId()); s.setName(p.getName()); s.setDisplayName(p.getDisplayName());
        s.setNickname(p.getNickname()); s.setRelationshipType(p.getRelationshipType());
        s.setPeriod(p.getPeriod()); s.setIsSelf(p.getIsSelf()); s.setIsFavorite(p.getIsFavorite()); s.setIsFeatured(p.getIsFeatured());
        s.setSong(p.getSong());
        if (p.getAvatarMediaFile() != null) s.setAvatarUrl(storageService.buildCdnUrl(p.getAvatarMediaFile().getStorageKey(), p.getAvatarMediaFile().getStorageProvider()));
        return s;
    }

    // ── Person Detail (for single view) ──────────────────────────────────────
    public PersonDto.DetailResponse toPersonDetail(Person p) {
        PersonDto.DetailResponse d = new PersonDto.DetailResponse();
        d.setId(p.getId()); d.setName(p.getName()); d.setDisplayName(p.getDisplayName());
        d.setNickname(p.getNickname()); d.setRelationshipType(p.getRelationshipType());
        d.setPeriod(p.getPeriod()); d.setIsSelf(p.getIsSelf()); d.setIsFavorite(p.getIsFavorite()); d.setIsFeatured(p.getIsFeatured());
        d.setSong(p.getSong()); d.setAlternativeName(p.getAlternativeName());
        d.setDateOfBirth(p.getDateOfBirth()); d.setBio(p.getBio());
        d.setFirstMet(p.getFirstMet()); d.setHowWeMet(p.getHowWeMet());
        d.setCreatedAt(p.getCreatedAt()); d.setUpdatedAt(p.getUpdatedAt());
        if (p.getAvatarMediaFile() != null) d.setAvatarUrl(storageService.buildCdnUrl(p.getAvatarMediaFile().getStorageKey(), p.getAvatarMediaFile().getStorageProvider()));
        if (p.getCoverMediaFile() != null) d.setCoverUrl(storageService.buildCdnUrl(p.getCoverMediaFile().getStorageKey(), p.getCoverMediaFile().getStorageProvider()));
        if (p.getBannerMediaFile() != null) d.setBannerUrl(storageService.buildCdnUrl(p.getBannerMediaFile().getStorageKey(), p.getBannerMediaFile().getStorageProvider()));
        if (p.getContacts() != null) {
            d.setContacts(p.getContacts().stream().map(this::toContactResponse).toList());
        }
        return d;
    }

    // ── MediaFile ────────────────────────────────────────────────────────────
    public MediaFileDto.Response toMediaFileResponse(MediaFile m) {
        MediaFileDto.Response r = new MediaFileDto.Response();
        r.setId(m.getId()); r.setFileName(m.getFileName()); r.setFileType(m.getFileType());
        r.setMediaCategory(m.getMediaCategory()); r.setOrientation(m.getOrientation());
        r.setFileSize(m.getFileSize()); r.setWidth(m.getWidth()); r.setHeight(m.getHeight());
        r.setAspectRatio(m.getAspectRatio()); r.setDuration(m.getDuration());
        r.setIsFavorite(m.getIsFavorite()); r.setIsFeatured(m.getIsFeatured());
        r.setMimeType(m.getMimeType()); r.setCaption(m.getCaption()); r.setIsAnimated(m.getIsAnimated());
        r.setDateTaken(m.getDateTaken()); r.setFileDateCreated(m.getFileDateCreated());
        r.setFileDateModified(m.getFileDateModified());
        r.setEffectiveDate(m.getEffectiveDate()); r.setUploadedAt(m.getUploadedAt());
        r.setLatitude(m.getLatitude()); r.setLongitude(m.getLongitude());
        r.setDisplayedAddress(m.getDisplayedAddress());
        r.setCdnUrl(storageService.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()));
        r.setThumbnailUrl(m.getStorageKey() != null ? storageService.buildThumbnailUrl(m.getStorageKey(), 300) : null);

        // Image EXIF detail
        if (m.getImageDetail() != null) {
            var img = m.getImageDetail();
            var d = new MediaFileDto.ImageDetailDto();
            d.setCameraMake(img.getCameraMake()); d.setCameraModel(img.getCameraModel());
            d.setLensModel(img.getLensModel()); d.setIso(img.getIso());
            d.setFocalLength(img.getFocalLength()); d.setAperture(img.getAperture());
            d.setShutterSpeed(img.getShutterSpeed()); d.setColorSpace(img.getColorSpace());
            d.setFlashFired(img.getFlashFired()); d.setWhiteBalance(img.getWhiteBalance());
            d.setExposureMode(img.getExposureMode()); d.setMeteringMode(img.getMeteringMode());
            d.setSoftware(img.getSoftware()); d.setIsSelfie(img.getIsSelfie());
            d.setIsScreenshot(img.getIsScreenshot()); d.setIsPanorama(img.getIsPanorama());
            d.setIsPortrait(img.getIsPortrait());
            r.setImageDetail(d);
        }

        // Video detail
        if (m.getVideoDetail() != null) {
            var vid = m.getVideoDetail();
            var d = new MediaFileDto.VideoDetailDto();
            d.setVideoCodec(vid.getVideoCodec()); d.setAudioCodec(vid.getAudioCodec());
            d.setFps(vid.getFps()); d.setBitrate(vid.getBitrate());
            r.setVideoDetail(d);
        }
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

    // ── PersonContact ────────────────────────────────────────────────────────
    public PersonDto.ContactResponse toContactResponse(PersonContact c) {
        PersonDto.ContactResponse r = new PersonDto.ContactResponse();
        r.setId(c.getId()); r.setPlatform(c.getPlatform().name());
        r.setIdentifier(c.getIdentifier()); r.setDisplayName(c.getDisplayName());
        r.setNotes(c.getNotes()); r.setCreatedAt(c.getCreatedAt());
        return r;
    }
}
