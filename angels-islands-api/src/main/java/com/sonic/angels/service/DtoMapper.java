package com.sonic.angels.service;

import com.sonic.angels.model.dto.*;
import com.sonic.angels.model.entity.*;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DtoMapper {

    private final StorageService storageService;

    public DtoMapper(StorageService storageService) { this.storageService = storageService; }

    /** The picture of a file: itself, or its poster when the file is not an image (a Flash card, a recording; none
     *  without one). */
    public String imageUrl(MediaFile m) {
        if (m == null) return null;
        return imageUrl(m.getPosterStorageKey(), m.getFileType(), m.getStorageKey(), m.getStorageProvider());
    }

    /** the same picture from its parts, for lists that read them without loading the files */
    public String imageUrl(String posterStorageKey, MediaFile.FileType fileType, String storageKey, MediaFile.StorageProvider provider) {
        if (posterStorageKey != null) return storageService.buildCdnUrl(posterStorageKey);
        if (noPicture(fileType)) return null;
        return storageService.buildCdnUrl(storageKey, provider);
    }

    private static boolean noPicture(MediaFile m) { return noPicture(m.getFileType()); }

    private static boolean noPicture(MediaFile.FileType t) {
        return t == MediaFile.FileType.FLASH || t == MediaFile.FileType.AUDIO || t == MediaFile.FileType.DOCUMENT;
    }

    // ── Tag ──────────────────────────────────────────────────────────────────
    public TagDto.Response toTagResponse(Tag t) {
        TagDto.Response r = new TagDto.Response();
        r.setId(t.getId()); r.setName(t.getName()); r.setColor(t.getColor());
        return r;
    }

    // ── Person Summary (for lists) ───────────────────────────────────────────
    public PersonDto.Summary toPersonSummary(Person p) {
        return toPersonSummary(p, p.getAvatarMediaFile() != null ? imageUrl(p.getAvatarMediaFile()) : null);
    }

    /** with the avatar's URL worked out by the caller (lists read many avatars at once) */
    public PersonDto.Summary toPersonSummary(Person p, String avatarUrl) {
        PersonDto.Summary s = new PersonDto.Summary();
        s.setId(p.getId()); s.setName(p.getName()); s.setDisplayName(p.getDisplayName());
        s.setNickname(p.getNickname()); s.setRelationshipType(p.getRelationshipType());
        s.setPeriod(p.getPeriod()); s.setIsSelf(p.getIsSelf()); s.setIsFavorite(p.getIsFavorite()); s.setIsFeatured(p.getIsFeatured());
        s.setSong(p.getSong());
        s.setAvatarUrl(avatarUrl);
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
        d.setBirthDay(p.getBirthDay()); d.setBirthMonth(p.getBirthMonth()); d.setBirthYear(p.getBirthYear());
        d.setGender(p.getGender() == null ? null : p.getGender().name());
        d.setBirthTime(p.getBirthTime() == null ? null : p.getBirthTime().toString().substring(0, 5));
        d.setBirthTimeApprox(p.getBirthTime() == null ? null : Boolean.TRUE.equals(p.getBirthTimeApprox()));
        d.setBirthTimeZone(p.getBirthTimeZone()); d.setBirthUtcOffsetMinutes(p.getBirthUtcOffsetMinutes());
        d.setBirthPlace(p.getBirthPlace()); d.setBirthLatitude(p.getBirthLatitude()); d.setBirthLongitude(p.getBirthLongitude());
        d.setFirstMet(p.getFirstMet()); d.setHowWeMet(p.getHowWeMet());
        d.setCreatedAt(p.getCreatedAt()); d.setUpdatedAt(p.getUpdatedAt());
        if (p.getAvatarMediaFile() != null) d.setAvatarUrl(imageUrl(p.getAvatarMediaFile()));
        if (p.getCoverMediaFile() != null) d.setCoverUrl(imageUrl(p.getCoverMediaFile()));
        if (p.getBannerMediaFile() != null) d.setBannerUrl(imageUrl(p.getBannerMediaFile()));
        if (p.getTags() != null) d.setTags(p.getTags().stream().map(this::toTagResponse).collect(java.util.stream.Collectors.toSet()));
        if (p.getContacts() != null) {
            d.setContacts(p.getContacts().stream().map(this::toContactResponse).toList());
        }
        return d;
    }

    // ── MediaFile ────────────────────────────────────────────────────────────
    public MediaFileDto.Response toMediaFileResponse(MediaFile m) {
        return toMediaFileResponse(m, MediaFileDto.Includes.all());
    }

    /** Heavy/lazy blocks (image/video detail, persons, tags) only mapped when the matching
     *  include flag is on — otherwise the lazy association is never touched: no extra query. */
    public MediaFileDto.Response toMediaFileResponse(MediaFile m, MediaFileDto.Includes inc) {
        MediaFileDto.Response r = new MediaFileDto.Response();
        r.setId(m.getId()); r.setFileName(m.getFileName()); r.setFileType(m.getFileType());
        r.setMediaCategory(m.getMediaCategory()); r.setOrientation(m.getOrientation());
        r.setFileSize(m.getFileSize()); r.setWidth(m.getWidth()); r.setHeight(m.getHeight());
        r.setAspectRatio(m.getAspectRatio()); r.setDuration(m.getDuration());
        r.setIsFavorite(m.getIsFavorite()); r.setIsFeatured(m.getIsFeatured());
        r.setMimeType(m.getMimeType()); r.setCaption(m.getCaption()); r.setIsAnimated(m.getIsAnimated());
        r.setDateTaken(m.getDateTaken()); r.setFileDateCreated(m.getFileDateCreated());
        r.setFileDateModified(m.getFileDateModified());
        r.setEffectiveDate(m.getEffectiveDate()); r.setEvent(com.sonic.angels.model.dto.EventDateDto.of(m.getEventDate(), m.getEventPrecision(), m.getEventApprox(), m.getEventCollectionId())); r.setUploadedAt(m.getUploadedAt());
        r.setLatitude(m.getLatitude()); r.setLongitude(m.getLongitude());
        r.setDisplayedAddress(m.getDisplayedAddress());
        r.setTimezone(m.getTimezone());
        r.setCdnUrl(storageService.buildCdnUrl(m.getStorageKey(), m.getStorageProvider()));
        // a poster stands in for a file that is not an image (a Flash card, a recording); without one there is no thumbnail
        if (m.getPosterStorageKey() != null) r.setThumbnailUrl(storageService.buildThumbnailUrl(m.getPosterStorageKey(), 300));
        else if (noPicture(m)) r.setThumbnailUrl(null);
        else r.setThumbnailUrl(m.getStorageKey() != null ? storageService.buildThumbnailUrl(m.getStorageKey(), 300) : null);
        r.setPosterUrl(m.getPosterStorageKey() != null ? storageService.buildCdnUrl(m.getPosterStorageKey()) : null);
        r.setSoundtrackUrl(m.getSoundtrackStorageKey() != null ? storageService.buildCdnUrl(m.getSoundtrackStorageKey()) : null);

        // Image EXIF detail
        if (inc.details() && m.getImageDetail() != null) {
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
        if (inc.details() && m.getVideoDetail() != null) {
            var vid = m.getVideoDetail();
            var d = new MediaFileDto.VideoDetailDto();
            d.setVideoCodec(vid.getVideoCodec()); d.setAudioCodec(vid.getAudioCodec());
            d.setFps(vid.getFps()); d.setBitrate(vid.getBitrate());
            r.setVideoDetail(d);
        }

        if (m.getMediaSource() != null) r.setMediaSource(m.getMediaSource());
        r.setFileExtension(m.getFileExtension());
        r.setContentHash(m.getContentHash());

        if (inc.persons() && m.getTakenBy() != null)
            r.setTakenBy(toPersonSummary(m.getTakenBy()));

        if (inc.persons() && m.getPersons() != null && !m.getPersons().isEmpty())
            r.setPersons(m.getPersons().stream().map(this::toPersonSummary).collect(java.util.stream.Collectors.toSet()));

        if (inc.tags() && m.getTags() != null && !m.getTags().isEmpty())
            r.setTags(m.getTags().stream().map(this::toTagResponse).collect(java.util.stream.Collectors.toSet()));

        return r;
    }

    // ── ChatArchive ──────────────────────────────────────────────────────────
    public ChatArchiveDto.Response toChatArchiveResponse(ChatArchive a) {
        ChatArchiveDto.Response r = new ChatArchiveDto.Response();
        r.setId(a.getId()); r.setPlatform(a.getPlatform()); r.setTitle(a.getTitle());
        r.setMessageCount(a.getMessageCount()); r.setDateFrom(a.getDateFrom()); r.setDateTo(a.getDateTo());
        r.setExtractionStatus(a.getExtractionStatus()); r.setCreatedAt(a.getCreatedAt());
        r.setExternalKey(a.getExternalKey()); r.setSources(a.getSources());
        r.setCounterpart(a.getCounterpart()); r.setCounterpartKey(a.getCounterpartKey());
        if (a.getPerson() != null) r.setPersonId(a.getPerson().getId());   // id only: no lazy load
        return r;
    }

    // ── Memory: Fact ─────────────────────────────────────────────────────────
    public MemoryDto.FactResponse toFactResponse(Fact f) {
        MemoryDto.FactResponse r = new MemoryDto.FactResponse();
        r.setId(f.getId()); r.setCategory(f.getCategory()); r.setKey(f.getKey()); r.setValue(f.getValue());
        r.setPeriod(f.getPeriod()); r.setConfidence(f.getConfidence());
        r.setSourceArchiveId(f.getSourceArchiveId()); r.setCreatedAt(f.getCreatedAt()); r.setSource(f.getSource());
        r.setStatus(statusName(f.getStatus()));
        return r;
    }

    // ── Memory: Episode ──────────────────────────────────────────────────────
    public MemoryDto.EpisodeResponse toEpisodeResponse(Episode e) {
        MemoryDto.EpisodeResponse r = new MemoryDto.EpisodeResponse();
        r.setId(e.getId()); r.setSummary(e.getSummary()); r.setEmotion(e.getEmotion());
        r.setImportance(e.getImportance()); r.setOccurredAt(e.getOccurredAt()); r.setCreatedAt(e.getCreatedAt()); r.setSource(e.getSource());
        r.setStatus(statusName(e.getStatus())); r.setTitle(e.getTitle()); r.setKind(e.getKind());
        r.setPrecision(e.getOccurredPrecision() != null ? e.getOccurredPrecision().name() : null); r.setApprox(e.getOccurredApprox());
        r.setWhen(e.whenText()); r.setEndAt(e.getEndAt());
        r.setPlace(e.getPlace()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude()); r.setExternalKey(e.getExternalKey());
        if (e.getLifeEvent() != null) r.setLifeEventId(e.getLifeEvent().getId());   // the proxy's id: no extra query
        return r;
    }

    /** One memory in full: every link, and the title of the event it belongs to. Inside a transaction. */
    public MemoryDto.EpisodeResponse toEpisodeResponseWithLinks(Episode e) {
        MemoryDto.EpisodeResponse r = toEpisodeResponse(e, MemoryDto.Includes.all());
        if (e.getLifeEvent() != null) r.setLifeEventTitle(e.getLifeEvent().getTitle());
        return r;
    }

    /** The memory with the links asked for and no others: a link that is not asked for is not read from the
     *  database and is left out of the answer (null). Each link asked for reads its table, so inside a transaction. */
    public MemoryDto.EpisodeResponse toEpisodeResponse(Episode e, MemoryDto.Includes inc) {
        MemoryDto.EpisodeResponse r = toEpisodeResponse(e);
        if (inc.media()) {
            List<MemoryDto.MediaRef> media = e.getMediaFiles().stream().filter(java.util.Objects::nonNull).map(m -> {
                MemoryDto.MediaRef x = new MemoryDto.MediaRef();
                x.setId(m.getId()); x.setFileName(m.getFileName()); x.setUrl(imageUrl(m)); x.setCaption(m.getCaption());
                x.setWidth(m.getWidth()); x.setHeight(m.getHeight());
                return x;
            }).toList();
            r.setMedia(media); r.setMediaIds(media.stream().map(MemoryDto.MediaRef::getId).toList());
        }
        if (inc.collections()) {
            List<MemoryDto.CollectionRef> cols = e.getCollections().stream().map(c -> {
                MemoryDto.CollectionRef x = new MemoryDto.CollectionRef(); x.setId(c.getId()); x.setName(c.getName()); return x;
            }).sorted(java.util.Comparator.comparing(MemoryDto.CollectionRef::getName, java.util.Comparator.nullsLast(String::compareTo))).toList();
            r.setCollections(cols); r.setCollectionIds(cols.stream().map(MemoryDto.CollectionRef::getId).toList());
        }
        if (inc.tags()) {
            List<TagDto.Response> tags = e.getTags().stream().map(this::toTagResponse)
                .sorted(java.util.Comparator.comparing(TagDto.Response::getName, java.util.Comparator.nullsLast(String::compareTo))).toList();
            r.setTags(tags); r.setTagIds(tags.stream().map(TagDto.Response::getId).toList());
        }
        if (inc.persons()) {
            // avatar left out: a list of memories does not need it and it would load each person's photo
            List<PersonDto.Summary> persons = e.getPersons().stream().map(p -> toPersonSummary(p, null)).toList();
            r.setPersons(persons); r.setPersonIds(persons.stream().map(PersonDto.Summary::getId).toList());
        }
        if (inc.sources()) r.setSourceViews(e.getSources().stream().map(this::toSourceView).toList());
        return r;
    }

    private MemoryDto.SourceView toSourceView(EpisodeSource s) {
        MemoryDto.SourceView v = new MemoryDto.SourceView();
        v.setKind(s.getKind().name()); v.setPosition(s.getPosition()); v.setExcerpt(s.getExcerpt()); v.setAuthor(s.getAuthor());
        v.setSaidAt(s.getSaidAt()); v.setUrl(s.getUrl());
        if (s.getThread() != null) {
            ForumThread t = s.getThread();
            v.setThreadId(t.getId()); v.setThreadTitle(t.getTitle());
            if (t.getForum() != null) { v.setForumKey(t.getForum().getKey()); v.setForumName(t.getForum().getName()); }
        }
        if (s.getArchive() != null) {
            ChatArchive a = s.getArchive();
            v.setArchiveId(a.getId()); v.setArchivePlatform(a.getPlatform() != null ? a.getPlatform().name() : null); v.setArchiveTitle(a.getTitle());
            if (a.getPerson() != null) {
                v.setArchivePersonId(a.getPerson().getId());
                v.setArchivePersonName(a.getPerson().getDisplayName() != null ? a.getPerson().getDisplayName() : a.getPerson().getName());
            }
        }
        if (s.getNote() != null) { v.setNoteId(s.getNote().getId()); v.setNoteTitle(s.getNote().getTitle()); v.setNoteSlug(s.getNote().getSlug()); }
        return v;
    }

    private static String statusName(MemoryStatus s) { return s != null ? s.name() : null; }

    // ── Memory: LifeChapter ──────────────────────────────────────────────────
    public MemoryDto.ChapterResponse toChapterResponse(LifeChapter c) {
        MemoryDto.ChapterResponse r = new MemoryDto.ChapterResponse();
        r.setId(c.getId()); r.setPeriod(c.getPeriod()); r.setTitle(c.getTitle());
        r.setSummary(c.getSummary()); r.setSentiment(c.getSentiment());
        r.setSortOrder(c.getSortOrder()); r.setCreatedAt(c.getCreatedAt()); r.setSource(c.getSource());
        r.setStatus(statusName(c.getStatus()));
        return r;
    }

    // ── Memory: PersonalityTrait ─────────────────────────────────────────────
    public MemoryDto.TraitResponse toTraitResponse(PersonalityTrait t) {
        MemoryDto.TraitResponse r = new MemoryDto.TraitResponse();
        r.setId(t.getId()); r.setTrait(t.getTrait()); r.setDescription(t.getDescription());
        r.setEvidence(t.getEvidence()); r.setPeriod(t.getPeriod()); r.setCreatedAt(t.getCreatedAt()); r.setSource(t.getSource());
        r.setStatus(statusName(t.getStatus()));
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
