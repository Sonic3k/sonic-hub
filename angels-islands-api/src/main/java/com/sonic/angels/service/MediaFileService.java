package com.sonic.angels.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import com.drew.metadata.jpeg.JpegDirectory;
import com.drew.metadata.png.PngDirectory;
import com.drew.metadata.webp.WebpDirectory;
import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.MediaImageDetail;
import com.sonic.angels.model.entity.MediaVideoDetail;
import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.repository.MediaFileRepository;
import com.sonic.angels.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class MediaFileService {

    // All photos assumed taken in Vietnam timezone
    private static final ZoneId PHOTO_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final MediaFileRepository mediaFileRepository;
    private final StorageService storageService;
    private final CollectionService collectionService;
    private final com.sonic.angels.repository.PersonRepository personRepository;
    private final TagRepository tagRepository;
    private final DtoMapper mapper;

    public MediaFileService(MediaFileRepository mediaFileRepository, StorageService storageService,
                            CollectionService collectionService,
                            com.sonic.angels.repository.PersonRepository personRepository,
                            TagRepository tagRepository, DtoMapper mapper) {
        this.mediaFileRepository = mediaFileRepository;
        this.storageService = storageService;
        this.collectionService = collectionService;
        this.personRepository = personRepository;
        this.tagRepository = tagRepository;
        this.mapper = mapper;
    }

    // ── Queries (return DTOs) ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MediaFileDto.Response> findAllDto() { return mediaFileRepository.findAll().stream().map(mapper::toMediaFileResponse).toList(); }

    @Transactional(readOnly = true)
    public MediaFileDto.Response findDtoById(UUID id) { return mapper.toMediaFileResponse(findById(id)); }

    @Transactional(readOnly = true)
    public List<MediaFileDto.Response> findDtoByPersonId(UUID personId) { return mediaFileRepository.findByPersonId(personId).stream().map(mapper::toMediaFileResponse).toList(); }

    // ── Entity access (internal) ─────────────────────────────────────────────

    public List<MediaFile> findAll() { return mediaFileRepository.findAll(); }
    public MediaFile findById(UUID id) { return mediaFileRepository.findById(id).orElseThrow(() -> new RuntimeException("MediaFile not found: " + id)); }
    public List<MediaFile> findByPersonId(UUID personId) { return mediaFileRepository.findByPersonId(personId); }

    public MediaFileDto.Response uploadAndReturn(MultipartFile file, UUID personId, UUID collectionId,
                                                 String subFolder, Long lastModified) throws IOException {
        return mapper.toMediaFileResponse(upload(file, personId, collectionId, subFolder, lastModified));
    }

    public MediaFile upload(MultipartFile file, UUID personId, UUID collectionId,
                            String subFolder, Long lastModified) throws IOException {
        // Real folder path: collection tree > legacy subFolder > monthly library bucket
        String dir;
        if (collectionId != null) {
            dir = collectionService.storagePath(collectionId);
        } else if (subFolder != null && !subFolder.isBlank()) {
            dir = "library/" + com.sonic.angels.util.SlugUtil.slugify(subFolder);
        } else {
            dir = "library/" + java.time.YearMonth.now(PHOTO_ZONE); // e.g. library/2026-09
        }
        String safeName = com.sonic.angels.util.SlugUtil.slugifyFileName(file.getOriginalFilename());
        String storageKey = uniqueStorageKey(dir, safeName);

        // Extract metadata BEFORE upload (consumes stream)
        MediaFile mf = new MediaFile();
        mf.setFileName(file.getOriginalFilename());
        mf.setFileType(isVideo(file.getContentType()) ? MediaFile.FileType.VIDEO : MediaFile.FileType.IMAGE);
        mf.setFileSize(file.getSize());
        mf.setMimeType(file.getContentType());
        mf.setUploadedAt(LocalDateTime.now(PHOTO_ZONE));

        // Browser file.lastModified = epoch ms instant → store as VN wall-clock
        if (lastModified != null && lastModified > 0) {
            mf.setFileDateModified(LocalDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(lastModified), PHOTO_ZONE));
        }

        extractMetadata(file, mf);
        if (mf.getTimezone() == null) mf.setTimezone("+07:00");

        // Upload to B2
        String fullKey = storageService.upload(file, storageKey);
        mf.setStorageKey(fullKey);
        mf.setStorageProvider(MediaFile.StorageProvider.B2);

        if (personId != null) {
            personRepository.findById(personId).ifPresent(p -> mf.getPersons().add(p));
        }

        MediaFile saved = mediaFileRepository.save(mf);

        if (collectionId != null) {
            collectionService.addMedia(collectionId, saved.getId());
        }
        return saved;
    }

    /** dir/name.jpg, on clash dir/name-2.jpg, -3... (checked against stored keys incl. prefix). */
    private String uniqueStorageKey(String dir, String fileName) {
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot > 0 ? fileName.substring(dot) : "";
        String folder = dir == null || dir.isBlank() ? "" : dir + "/";
        String candidate = folder + fileName;
        int i = 2;
        while (mediaFileRepository.existsByStorageKey(storageService.withPrefix(candidate)) && i < 1000) {
            candidate = folder + base + "-" + i++ + ext;
        }
        return candidate;
    }

    public void delete(UUID id) {
        MediaFile mf = findById(id);
        // Clear join tables
        mf.getPersons().clear();
        mf.getTags().clear();
        mediaFileRepository.save(mf);
        // Remove from all collections (no back-ref on MediaFile)
        mediaFileRepository.removeFromAllCollections(id);
        // Delete from storage
        if (mf.getStorageProvider() == MediaFile.StorageProvider.B2 && mf.getStorageKey() != null) {
            storageService.delete(mf.getStorageKey());
        }
        mediaFileRepository.delete(mf);
    }

    public int deleteBatch(List<UUID> ids) {
        int count = 0;
        for (UUID id : ids) {
            try { delete(id); count++; } catch (Exception ignored) {}
        }
        return count;
    }

    public String buildCdnUrl(MediaFile mf) {
        return storageService.buildCdnUrl(mf.getStorageKey(), mf.getStorageProvider());
    }

    // ── Metadata extraction (ported from Mushroom Hills — lossless local-time + timezone) ──

    /** Local wall-clock exactly as recorded (EXIF DateTimeOriginal / QuickTime creationdate): stored as-is, no shift. */
    private static LocalDateTime rawWall(Date d) {
        return d == null ? null : LocalDateTime.ofInstant(d.toInstant(), java.time.ZoneOffset.UTC);
    }

    /** Absolute UTC instant (MP4/MOV mvhd creation_time) expressed as local wall-clock in the given zone. */
    private static LocalDateTime instantInZone(Date instant, ZoneId zone) {
        return instant == null ? null : LocalDateTime.ofInstant(instant.toInstant(), zone);
    }

    /** Universal timezone rule for any media: embedded offset if present, else GPS lat/long, else Vietnam fallback. */
    private static ZoneId resolveZone(ZoneId explicitOffset, Double lat, Double lon) {
        if (explicitOffset != null) return explicitOffset;
        if (lat != null && lon != null) return com.sonic.angels.util.TimezoneResolver.resolve(lat, lon);
        return PHOTO_ZONE;
    }

    /** EXIF OffsetTime tag value, e.g. "+08:00" → ZoneOffset (null if absent/invalid). */
    private static ZoneId parseExifOffset(String off) {
        if (off != null && off.matches("[+-]\\d\\d:\\d\\d")) {
            try { return java.time.ZoneOffset.of(off); } catch (Exception ignored) {}
        }
        return null;
    }

    /** QuickTime creationdate, e.g. "2017-10-09T00:17:48+0800" / "...+08:00": carries local time + real offset. */
    private static java.time.OffsetDateTime parseQtCreationDate(String s) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        for (java.time.format.DateTimeFormatter f : new java.time.format.DateTimeFormatter[]{
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssZ"),
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ"),
                java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME}) {
            try { return java.time.OffsetDateTime.parse(s, f); } catch (Exception ignored) {}
        }
        return null;
    }

    /** Reject bogus container dates (QuickTime epoch 1904, zeroed values). */
    private static boolean isSaneVideoDate(Date d) {
        if (d == null) return false;
        int y = d.toInstant().atZone(java.time.ZoneOffset.UTC).getYear();
        return y >= 1990 && y <= 2100;
    }

    /** Parse a "HH:MM:SS" or "MM:SS" duration string (e.g. AviDirectory's) into whole seconds. */
    private static Integer parseHmsToSeconds(String hms) {
        if (hms == null) return null;
        String[] p = hms.trim().split(":");
        try {
            if (p.length == 3) return Integer.parseInt(p[0]) * 3600 + Integer.parseInt(p[1]) * 60 + (int) Math.round(Double.parseDouble(p[2]));
            if (p.length == 2) return Integer.parseInt(p[0]) * 60 + (int) Math.round(Double.parseDouble(p[1]));
        } catch (Exception ignored) {}
        return null;
    }

    private void extractMetadata(MultipartFile file, MediaFile mediaFile) {
        try {
            byte[] moov = null;
            if (mediaFile.getFileType() == MediaFile.FileType.VIDEO) {
                moov = readMoovBytes(file);
                // Video GPS can live in a 3GPP/ISO `loci` box (moov/udta) that metadata-extractor never
                // parses (the MP4 reader only reads udta ©xyz; the QuickTime reader only reads moov/meta).
                // Parse `loci` ourselves BEFORE main extraction so timezone resolution can use the location.
                if (moov != null && mediaFile.getLatitude() == null) parseLoci(moov, mediaFile);
            }
            extractMetadataFromStream(file.getInputStream(), mediaFile);
            // Some 3GPP/MOV variants make metadata-extractor bail on the track boxes ("End of data reached"),
            // leaving width/height/codec empty. Fall back to reading tkhd dimensions + stsd codecs from moov.
            if (moov != null) parseMoovTracks(moov, mediaFile);
        } catch (Exception ignored) {}
    }

    /**
     * Walk the top-level MP4/QuickTime boxes, skip `mdat` cheaply, and return the `moov` box payload
     * (its child boxes) or null. Used to recover GPS (`loci`) and track info (`tkhd`/`stsd`) that
     * metadata-extractor skips or fails on for some 3GPP/MOV variants.
     */
    private byte[] readMoovBytes(MultipartFile file) {
        try (java.io.DataInputStream in = new java.io.DataInputStream(new java.io.BufferedInputStream(file.getInputStream()))) {
            long fileLen = file.getSize();
            long pos = 0;
            while (pos + 8 <= fileLen) {
                long size = in.readInt() & 0xFFFFFFFFL;
                byte[] t = new byte[4];
                in.readFully(t);
                String type = new String(t, java.nio.charset.StandardCharsets.US_ASCII);
                int hdr = 8;
                if (size == 1) { size = in.readLong(); hdr = 16; }
                else if (size == 0) { size = fileLen - pos; }
                if (size < hdr) break;
                if ("moov".equals(type)) {
                    int len = (int) Math.min(size - hdr, 64L * 1024 * 1024);
                    byte[] moov = new byte[len];
                    in.readFully(moov);
                    return moov;
                }
                long toSkip = size - hdr;
                while (toSkip > 0) {
                    long s = in.skip(toSkip);
                    if (s <= 0) { if (in.read() < 0) return null; s = 1; }
                    toSkip -= s;
                }
                pos += size;
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** Scan a moov payload for the `loci` box and set lat/long. loci layout: version+flags(4), language(2), name(null-term), role(1), longitude(4 fixed16.16), latitude(4 fixed16.16). */
    private void parseLoci(byte[] b, MediaFile mediaFile) {
        for (int i = 0; i + 20 <= b.length; i++) {
            if (b[i] == 'l' && b[i + 1] == 'o' && b[i + 2] == 'c' && b[i + 3] == 'i') {
                int p = i + 4;          // payload (after the 4-byte box type)
                p += 4;                 // version + flags
                p += 2;                 // language
                while (p < b.length && b[p] != 0) p++;   // location name (null-terminated UTF-8)
                p += 1;                 // null terminator
                p += 1;                 // role
                if (p + 8 > b.length) return;
                int lonRaw = ((b[p] & 0xFF) << 24) | ((b[p + 1] & 0xFF) << 16) | ((b[p + 2] & 0xFF) << 8) | (b[p + 3] & 0xFF);
                int latRaw = ((b[p + 4] & 0xFF) << 24) | ((b[p + 5] & 0xFF) << 16) | ((b[p + 6] & 0xFF) << 8) | (b[p + 7] & 0xFF);
                double lon = lonRaw / 65536.0;
                double lat = latRaw / 65536.0;
                if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && !(lat == 0 && lon == 0)) {
                    mediaFile.setLatitude(lat);
                    mediaFile.setLongitude(lon);
                }
                return;
            }
        }
    }

    /**
     * Fallback for 3GPP/MOV files where metadata-extractor cannot read the track boxes ("End of data
     * reached"): pull display dimensions from `tkhd` and codecs from `stsd` straight out of the moov
     * payload. Only fills fields that are still empty after the main extraction.
     */
    private void parseMoovTracks(byte[] m, MediaFile mediaFile) {
        try {
            int o = 0, end = m.length;
            while (o + 8 <= end) {
                long size = u32be(m, o);
                String type = box4(m, o + 4);
                int hdr = 8;
                if (size == 1) { size = readU64(m, o + 8); hdr = 16; }
                else if (size == 0) { size = end - o; }
                if (size < hdr || o + size > end) break;
                if ("trak".equals(type)) {
                    int[] dims = {0, 0, 0};      // [width, height, rotated 90/270 flag] from tkhd / stsd
                    String[] hc = {null, null};  // [handlerType, codec fourcc]
                    scanTrak(m, o + hdr, (int) (o + size), dims, hc);
                    String handler = hc[0], codec = hc[1];
                    if (handler != null && handler.startsWith("vid")) {
                        if (mediaFile.getWidth() == null && dims[0] > 0 && dims[1] > 0) {
                            int w = dims[0], h = dims[1];
                            if (dims[2] == 1) { int t = w; w = h; h = t; }  // 90/270 rotation -> displayed dims are swapped
                            mediaFile.setWidth(w);
                            mediaFile.setHeight(h);
                            mediaFile.calculateOrientation();
                        }
                        if (codec != null && !codec.isEmpty()) {
                            MediaVideoDetail vid = mediaFile.getOrCreateVideoDetail();
                            if (vid.getVideoCodec() == null) vid.setVideoCodec(codec);
                        }
                    } else if (handler != null && handler.startsWith("sou")) {
                        if (codec != null && !codec.isEmpty()) {
                            MediaVideoDetail vid = mediaFile.getOrCreateVideoDetail();
                            if (vid.getAudioCodec() == null) vid.setAudioCodec(codec);
                        }
                    }
                }
                o += size;
            }
        } catch (Exception ignored) {}
    }

    /** Recursively walk a `trak` subtree, capturing tkhd display dims, hdlr type, and first stsd codec. */
    private void scanTrak(byte[] b, int start, int end, int[] dims, String[] hc) {
        int o = start;
        while (o + 8 <= end) {
            long size = u32be(b, o);
            String type = box4(b, o + 4);
            int hdr = 8;
            if (size == 1) { size = readU64(b, o + 8); hdr = 16; }
            else if (size == 0) { size = end - o; }
            if (size < hdr || o + size > end) break;
            int p = o + hdr, boxEnd = (int) (o + size);
            switch (type) {
                case "tkhd":
                    if (boxEnd - 8 >= p + 4) {        // width/height are the last 8 bytes (16.16 fixed)
                        dims[0] = (int) (u32be(b, boxEnd - 8) >> 16);
                        dims[1] = (int) (u32be(b, boxEnd - 4) >> 16);
                        // The 36-byte display matrix sits right before width/height. A 90/270 rotation
                        // (matrix |a| < |b|) means the displayed frame is the swap of the stored dims.
                        if (boxEnd - 44 >= p) {
                            int a = (int) u32be(b, boxEnd - 44);    // matrix[0] = a (16.16)
                            int bb = (int) u32be(b, boxEnd - 40);   // matrix[1] = b (16.16)
                            dims[2] = (Math.abs(a) < Math.abs(bb)) ? 1 : 0;
                        }
                    }
                    break;
                case "hdlr":
                    if (p + 12 <= boxEnd) hc[0] = box4(b, p + 8);   // handler type at +8
                    break;
                case "stsd":
                    if (p + 16 <= boxEnd && hc[1] == null)
                        hc[1] = box4(b, p + 12).trim();             // first sample entry format fourcc
                    if (dims[0] <= 0 && p + 8 + 36 <= boxEnd) {     // visual sample entry dims fallback
                        int sw = u16be(b, p + 8 + 32), sh = u16be(b, p + 8 + 34);
                        if (sw > 0 && sh > 0) { dims[0] = sw; dims[1] = sh; }
                    }
                    break;
                case "mdia": case "minf": case "stbl": case "edts": case "dinf": case "gmhd":
                    scanTrak(b, p, boxEnd, dims, hc);
                    break;
                default:
                    break;
            }
            o += size;
        }
    }

    private static long u32be(byte[] b, int o) {
        return ((b[o] & 0xFFL) << 24) | ((b[o + 1] & 0xFF) << 16) | ((b[o + 2] & 0xFF) << 8) | (b[o + 3] & 0xFF);
    }
    private static int u16be(byte[] b, int o) {
        return ((b[o] & 0xFF) << 8) | (b[o + 1] & 0xFF);
    }
    private static long readU64(byte[] b, int o) {
        long v = 0;
        for (int i = 0; i < 8; i++) v = (v << 8) | (b[o + i] & 0xFFL);
        return v;
    }
    private static String box4(byte[] b, int o) {
        return new String(b, o, 4, java.nio.charset.StandardCharsets.US_ASCII);
    }

    public void extractMetadataFromStream(java.io.InputStream inputStream, MediaFile mediaFile) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(inputStream);

            // Prepare detail entities
            MediaImageDetail img = mediaFile.getOrCreateImageDetail();
            MediaVideoDetail vid = mediaFile.getOrCreateVideoDetail();

            // ── Image dimensions (JPEG, PNG, WebP, GIF) ─────────────────────
            JpegDirectory jpegDir = metadata.getFirstDirectoryOfType(JpegDirectory.class);
            if (jpegDir != null) {
                mediaFile.setWidth(jpegDir.getImageWidth());
                mediaFile.setHeight(jpegDir.getImageHeight());
            }
            PngDirectory pngDir = metadata.getFirstDirectoryOfType(PngDirectory.class);
            if (pngDir != null && mediaFile.getWidth() == null) {
                if (pngDir.containsTag(PngDirectory.TAG_IMAGE_WIDTH))
                    mediaFile.setWidth(pngDir.getInt(PngDirectory.TAG_IMAGE_WIDTH));
                if (pngDir.containsTag(PngDirectory.TAG_IMAGE_HEIGHT))
                    mediaFile.setHeight(pngDir.getInt(PngDirectory.TAG_IMAGE_HEIGHT));
            }
            WebpDirectory webpDir = metadata.getFirstDirectoryOfType(WebpDirectory.class);
            if (webpDir != null && mediaFile.getWidth() == null) {
                if (webpDir.containsTag(WebpDirectory.TAG_IMAGE_WIDTH))
                    mediaFile.setWidth(webpDir.getInt(WebpDirectory.TAG_IMAGE_WIDTH));
                if (webpDir.containsTag(WebpDirectory.TAG_IMAGE_HEIGHT))
                    mediaFile.setHeight(webpDir.getInt(WebpDirectory.TAG_IMAGE_HEIGHT));
            }
            try {
                var gifHeader = metadata.getFirstDirectoryOfType(com.drew.metadata.gif.GifHeaderDirectory.class);
                if (gifHeader != null && mediaFile.getWidth() == null) {
                    if (gifHeader.containsTag(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_WIDTH))
                        mediaFile.setWidth(gifHeader.getInt(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_WIDTH));
                    if (gifHeader.containsTag(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_HEIGHT))
                        mediaFile.setHeight(gifHeader.getInt(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_HEIGHT));
                }
                var gifControls = metadata.getDirectoriesOfType(com.drew.metadata.gif.GifControlDirectory.class);
                mediaFile.setIsAnimated(gifControls != null && gifControls.size() > 1);
            } catch (Exception ignored2) {}

            // ── EXIF Orientation 5–8 = pixels stored rotated 90°/270° (portrait shot on a landscape
            // sensor); every viewer displays them rotated. Swap width/height so orientation/aspect
            // match the DISPLAYED image — the image-side twin of the MP4/MOV display-matrix handling
            // below. Tags 1/absent (already upright) and 2–4 (flips, no dim change) are untouched.
            try {
                ExifIFD0Directory ifd0Ori = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
                if (ifd0Ori != null && ifd0Ori.containsTag(ExifIFD0Directory.TAG_ORIENTATION)
                        && mediaFile.getWidth() != null && mediaFile.getHeight() != null) {
                    int exifOri = ifd0Ori.getInt(ExifIFD0Directory.TAG_ORIENTATION);
                    if (exifOri >= 5 && exifOri <= 8) {
                        Integer w = mediaFile.getWidth();
                        mediaFile.setWidth(mediaFile.getHeight());
                        mediaFile.setHeight(w);
                    }
                }
            } catch (Exception ignoredOri) {}
            mediaFile.calculateOrientation();

            // ── GPS (EXIF) + source timezone — must run before any date conversion ──
            // Timezone signals — resolved ONCE at the end (offset > GPS lat/long > Vietnam).
            ZoneId explicitOffset = null;   // real embedded offset (EXIF OffsetTime / QuickTime creationdate)
            Date mvhdInstant = null;        // MP4/MOV mvhd is a UTC instant; converted after the zone is known
            GpsDirectory gpsDir = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDir != null && gpsDir.getGeoLocation() != null) {
                mediaFile.setLatitude(gpsDir.getGeoLocation().getLatitude());
                mediaFile.setLongitude(gpsDir.getGeoLocation().getLongitude());
            }

            // ── EXIF → MediaImageDetail ──────────────────────────────────────
            String cameraMake = null;
            ExifSubIFDDirectory exifSub = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (exifSub != null) {
                // DateTimeOriginal is a local wall-clock — store as-is; capture its real offset if present.
                Date dateTaken = exifSub.getDate(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL,
                        exifSub.getString(ExifSubIFDDirectory.TAG_SUBSECOND_TIME_ORIGINAL),
                        java.util.TimeZone.getTimeZone("UTC"));
                if (dateTaken != null)
                    mediaFile.setDateTaken(rawWall(dateTaken));
                if (explicitOffset == null)
                    explicitOffset = parseExifOffset(exifSub.getString(ExifSubIFDDirectory.TAG_TIME_ZONE_ORIGINAL));
                // CreateDate / DateTimeDigitized → fileDateCreated (local wall-clock as-is)
                Date dateDigitized = exifSub.getDate(ExifSubIFDDirectory.TAG_DATETIME_DIGITIZED,
                        exifSub.getString(ExifSubIFDDirectory.TAG_SUBSECOND_TIME_DIGITIZED),
                        java.util.TimeZone.getTimeZone("UTC"));
                if (dateDigitized != null)
                    mediaFile.setFileDateCreated(rawWall(dateDigitized));
                if (explicitOffset == null)
                    explicitOffset = parseExifOffset(exifSub.getString(ExifSubIFDDirectory.TAG_TIME_ZONE_DIGITIZED));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT))
                    img.setIso(exifSub.getInteger(ExifSubIFDDirectory.TAG_ISO_EQUIVALENT));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_FOCAL_LENGTH))
                    img.setFocalLength(exifSub.getFloat(ExifSubIFDDirectory.TAG_FOCAL_LENGTH));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_FNUMBER))
                    img.setAperture(exifSub.getFloat(ExifSubIFDDirectory.TAG_FNUMBER));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_EXPOSURE_TIME))
                    img.setShutterSpeed(exifSub.getDescription(ExifSubIFDDirectory.TAG_EXPOSURE_TIME));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_COLOR_SPACE))
                    img.setColorSpace(exifSub.getDescription(ExifSubIFDDirectory.TAG_COLOR_SPACE));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_LENS_MODEL))
                    img.setLensModel(exifSub.getString(ExifSubIFDDirectory.TAG_LENS_MODEL));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_FLASH))
                    img.setFlashFired(exifSub.getInt(ExifSubIFDDirectory.TAG_FLASH) % 2 == 1);
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_WHITE_BALANCE_MODE))
                    img.setWhiteBalance(exifSub.getDescription(ExifSubIFDDirectory.TAG_WHITE_BALANCE_MODE));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_EXPOSURE_MODE))
                    img.setExposureMode(exifSub.getDescription(ExifSubIFDDirectory.TAG_EXPOSURE_MODE));
                if (exifSub.containsTag(ExifSubIFDDirectory.TAG_METERING_MODE))
                    img.setMeteringMode(exifSub.getDescription(ExifSubIFDDirectory.TAG_METERING_MODE));
            }
            ExifIFD0Directory exifIFD0 = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (exifIFD0 != null) {
                // ModifyDate (TAG_DATETIME) → fileDateModified
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_DATETIME)) {
                    Date dateModified = exifIFD0.getDate(ExifIFD0Directory.TAG_DATETIME, null, java.util.TimeZone.getTimeZone("UTC"));
                    if (dateModified != null)
                        mediaFile.setFileDateModified(rawWall(dateModified));
                }
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_MAKE)) {
                    cameraMake = exifIFD0.getString(ExifIFD0Directory.TAG_MAKE);
                    img.setCameraMake(cameraMake);
                }
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_MODEL))
                    img.setCameraModel(exifIFD0.getString(ExifIFD0Directory.TAG_MODEL));
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_SOFTWARE))
                    img.setSoftware(exifIFD0.getString(ExifIFD0Directory.TAG_SOFTWARE));
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_COPYRIGHT))
                    img.setCopyright(exifIFD0.getString(ExifIFD0Directory.TAG_COPYRIGHT));
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_IMAGE_DESCRIPTION))
                    img.setImageDescription(exifIFD0.getString(ExifIFD0Directory.TAG_IMAGE_DESCRIPTION));
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_ORIENTATION))
                    img.setExifOrientation(exifIFD0.getInt(ExifIFD0Directory.TAG_ORIENTATION));
            }

            // ── GPS from MP4/MOV (QuickTime metadata) ───────────────────────
            if (mediaFile.getLatitude() == null) {
                try {
                    for (var dir : metadata.getDirectories()) {
                        if (dir.getClass().getSimpleName().contains("QuickTimeMetadata")) {
                            for (var tag : dir.getTags()) {
                                String tagName = tag.getTagName();
                                String tagVal = tag.getDescription();
                                // iPhone MOV stores GPS under tag "ISO 6709" (com.apple.quicktime.location.ISO6709);
                                // the old check required "gps"+"location" in the tag name and never matched it.
                                String tagNameLower = tagName == null ? "" : tagName.toLowerCase();
                                boolean isCoordTag = tagNameLower.contains("iso 6709")
                                        || tagNameLower.contains("iso6709")
                                        || (tagNameLower.contains("gps") && tagNameLower.contains("location"));
                                if (tagVal != null && isCoordTag) {
                                    // Format: "+35.6762+139.6503/" or "+35.6762+139.6503+025.000/"
                                    String cleaned = tagVal.replaceAll("/$", "");
                                    java.util.regex.Matcher matcher = java.util.regex.Pattern
                                            .compile("([+-]\\d+\\.\\d+)([+-]\\d+\\.\\d+)")
                                            .matcher(cleaned);
                                    if (matcher.find()) {
                                        mediaFile.setLatitude(Double.parseDouble(matcher.group(1)));
                                        mediaFile.setLongitude(Double.parseDouble(matcher.group(2)));
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception ignored3) {}
            }

            // MP4 stores GPS in Mp4Directory (©xyz box → Latitude/Longitude doubles), not QuickTimeMetadata
            if (mediaFile.getLatitude() == null) {
                try {
                    var mp4Geo = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.Mp4Directory.class);
                    if (mp4Geo != null
                            && mp4Geo.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_LATITUDE)
                            && mp4Geo.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_LONGITUDE)) {
                        mediaFile.setLatitude(mp4Geo.getDoubleObject(com.drew.metadata.mp4.Mp4Directory.TAG_LATITUDE));
                        mediaFile.setLongitude(mp4Geo.getDoubleObject(com.drew.metadata.mp4.Mp4Directory.TAG_LONGITUDE));
                    }
                } catch (Exception ignoredMp4Gps) {}
            }

            // ── MP4/MOV → MediaVideoDetail ───────────────────────────────────
            // ── QuickTime creationdate (iPhone): local time + real offset — highest-priority video date ──
            try {
                for (var dir : metadata.getDirectories()) {
                    if (dir.getClass().getSimpleName().contains("QuickTimeMetadata")
                            && dir.containsTag(com.drew.metadata.mov.metadata.QuickTimeMetadataDirectory.TAG_CREATION_DATE)) {
                        java.time.OffsetDateTime odt = parseQtCreationDate(
                                dir.getString(com.drew.metadata.mov.metadata.QuickTimeMetadataDirectory.TAG_CREATION_DATE));
                        if (odt != null) {
                            if (mediaFile.getDateTaken() == null)
                                mediaFile.setDateTaken(odt.toLocalDateTime());
                            if (explicitOffset == null)
                                explicitOffset = odt.getOffset();
                        }
                    }
                }
            } catch (Exception ignoredQt) {}

            Float frameRate = null;
            try {
                var mp4Dir = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.Mp4Directory.class);
                if (mp4Dir != null) {
                    if (mp4Dir.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_DURATION_SECONDS))
                        mediaFile.setDuration((int) Math.round(mp4Dir.getDouble(com.drew.metadata.mp4.Mp4Directory.TAG_DURATION_SECONDS)));
                    if (mp4Dir.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_CREATION_TIME)) {
                        Date created = mp4Dir.getDate(com.drew.metadata.mp4.Mp4Directory.TAG_CREATION_TIME);
                        if (created != null && mediaFile.getDateTaken() == null && isSaneVideoDate(created))
                            mvhdInstant = created;
                    }
                }
                var mp4Video = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.media.Mp4VideoDirectory.class);
                if (mp4Video != null) {
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_WIDTH))
                        mediaFile.setWidth(mp4Video.getInt(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_WIDTH));
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_HEIGHT))
                        mediaFile.setHeight(mp4Video.getInt(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_HEIGHT));
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_FRAME_RATE)) {
                        frameRate = mp4Video.getFloat(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_FRAME_RATE);
                        vid.setFps(frameRate);
                    }
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_COMPRESSOR_NAME))
                        vid.setVideoCodec(mp4Video.getString(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_COMPRESSOR_NAME));
                    mediaFile.calculateOrientation();
                }
                var mp4Sound = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.media.Mp4SoundDirectory.class);
                if (mp4Sound != null && mp4Sound.containsTag(com.drew.metadata.mp4.media.Mp4SoundDirectory.TAG_AUDIO_FORMAT))
                    vid.setAudioCodec(mp4Sound.getString(com.drew.metadata.mp4.media.Mp4SoundDirectory.TAG_AUDIO_FORMAT));
            } catch (Exception ignored2) {}

            // MOV (QuickTime) stores video/sound props in QuickTime*Directory (not Mp4*) — fill width/height/codec/fps for .mov
            try {
                var qtVideo = metadata.getFirstDirectoryOfType(com.drew.metadata.mov.media.QuickTimeVideoDirectory.class);
                if (qtVideo != null) {
                    if (mediaFile.getWidth() == null && qtVideo.containsTag(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_WIDTH))
                        mediaFile.setWidth(qtVideo.getInt(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_WIDTH));
                    if (mediaFile.getHeight() == null && qtVideo.containsTag(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_HEIGHT))
                        mediaFile.setHeight(qtVideo.getInt(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_HEIGHT));
                    if (qtVideo.containsTag(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_FRAME_RATE)) {
                        frameRate = qtVideo.getFloat(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_FRAME_RATE);
                        vid.setFps(frameRate);
                    }
                    if (qtVideo.containsTag(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_COMPRESSOR_NAME))
                        vid.setVideoCodec(qtVideo.getString(com.drew.metadata.mov.media.QuickTimeVideoDirectory.TAG_COMPRESSOR_NAME));
                    mediaFile.calculateOrientation();
                }
                var qtSound = metadata.getFirstDirectoryOfType(com.drew.metadata.mov.media.QuickTimeSoundDirectory.class);
                if (qtSound != null && qtSound.containsTag(com.drew.metadata.mov.media.QuickTimeSoundDirectory.TAG_AUDIO_FORMAT))
                    vid.setAudioCodec(qtSound.getString(com.drew.metadata.mov.media.QuickTimeSoundDirectory.TAG_AUDIO_FORMAT));
            } catch (Exception ignoredQtMedia) {}

            try {
                var qtDir = metadata.getFirstDirectoryOfType(com.drew.metadata.mov.QuickTimeDirectory.class);
                if (qtDir != null) {
                    if (mediaFile.getDuration() == null && qtDir.containsTag(com.drew.metadata.mov.QuickTimeDirectory.TAG_DURATION_SECONDS))
                        mediaFile.setDuration((int) Math.round(qtDir.getDouble(com.drew.metadata.mov.QuickTimeDirectory.TAG_DURATION_SECONDS)));
                    if (mediaFile.getDateTaken() == null && mvhdInstant == null
                            && qtDir.containsTag(com.drew.metadata.mov.QuickTimeDirectory.TAG_CREATION_TIME)) {
                        Date created = qtDir.getDate(com.drew.metadata.mov.QuickTimeDirectory.TAG_CREATION_TIME);
                        if (created != null && isSaneVideoDate(created))
                            mvhdInstant = created;
                    }
                }
            } catch (Exception ignored2) {}

            // Apply track display rotation: metadata-extractor reports ENCODED dimensions plus a separate
            // rotation tag, so a 90/270-rotated portrait clip would otherwise be stored as landscape.
            try {
                Integer rotation = null;
                var mp4RotDir = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.Mp4Directory.class);
                if (mp4RotDir != null && mp4RotDir.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_ROTATION))
                    rotation = mp4RotDir.getInteger(com.drew.metadata.mp4.Mp4Directory.TAG_ROTATION);
                if (rotation == null) {
                    var qtRotDir = metadata.getFirstDirectoryOfType(com.drew.metadata.mov.QuickTimeDirectory.class);
                    if (qtRotDir != null && qtRotDir.containsTag(com.drew.metadata.mov.QuickTimeDirectory.TAG_ROTATION))
                        rotation = qtRotDir.getInteger(com.drew.metadata.mov.QuickTimeDirectory.TAG_ROTATION);
                }
                if (rotation != null && mediaFile.getWidth() != null && mediaFile.getHeight() != null) {
                    int r = ((rotation % 360) + 360) % 360;
                    if (r == 90 || r == 270) {
                        Integer w = mediaFile.getWidth(), h = mediaFile.getHeight();
                        mediaFile.setWidth(h);
                        mediaFile.setHeight(w);
                        mediaFile.calculateOrientation();
                    }
                }
            } catch (Exception ignoredRot) {}

            // AVI (RIFF): metadata-extractor exposes dims/fps/duration/codec via AviDirectory (no GPS / embedded date here)
            try {
                var avi = metadata.getFirstDirectoryOfType(com.drew.metadata.avi.AviDirectory.class);
                if (avi != null) {
                    if (mediaFile.getWidth() == null && avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_WIDTH))
                        mediaFile.setWidth(avi.getInt(com.drew.metadata.avi.AviDirectory.TAG_WIDTH));
                    if (mediaFile.getHeight() == null && avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_HEIGHT))
                        mediaFile.setHeight(avi.getInt(com.drew.metadata.avi.AviDirectory.TAG_HEIGHT));
                    mediaFile.calculateOrientation();
                    if (avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_FRAMES_PER_SECOND)) {
                        frameRate = avi.getFloat(com.drew.metadata.avi.AviDirectory.TAG_FRAMES_PER_SECOND);
                        vid.setFps(frameRate);
                    }
                    if (avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_VIDEO_CODEC))
                        vid.setVideoCodec(avi.getString(com.drew.metadata.avi.AviDirectory.TAG_VIDEO_CODEC));
                    if (avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_AUDIO_CODEC))
                        vid.setAudioCodec(avi.getString(com.drew.metadata.avi.AviDirectory.TAG_AUDIO_CODEC));
                    if (mediaFile.getDuration() == null && avi.containsTag(com.drew.metadata.avi.AviDirectory.TAG_DURATION)) {
                        Integer aviSecs = parseHmsToSeconds(avi.getDescription(com.drew.metadata.avi.AviDirectory.TAG_DURATION));
                        if (aviSecs != null) mediaFile.setDuration(aviSecs);
                    }
                }
            } catch (Exception ignoredAvi) {}

            // ── Resolve source timezone ONCE for any media: embedded offset > GPS lat/long > Vietnam ──
            ZoneId resolvedZone = resolveZone(explicitOffset, mediaFile.getLatitude(), mediaFile.getLongitude());
            // mvhd creation_time is a UTC instant → express as local wall-clock in the resolved zone (before computing the offset label)
            if (mediaFile.getDateTaken() == null && mvhdInstant != null)
                mediaFile.setDateTaken(instantInZone(mvhdInstant, resolvedZone));
            // Store timezone as a uniform UTC offset "+HH:MM" at the capture instant (field is display-only, never parsed/calculated).
            LocalDateTime tzAt = mediaFile.getDateTaken() != null ? mediaFile.getDateTaken() : LocalDateTime.now(resolvedZone);
            java.time.ZoneOffset tzOffset = resolvedZone.getRules().getOffset(tzAt);
            mediaFile.setTimezone("Z".equals(tzOffset.getId()) ? "+00:00" : tzOffset.getId());

            if (mediaFile.getDuration() != null && mediaFile.getDuration() > 0 && mediaFile.getFileSize() != null)
                vid.setBitrate((int) ((mediaFile.getFileSize() * 8) / mediaFile.getDuration()));

            // ── Classification → MediaImageDetail ────────────────────────────
            String lens = img.getLensModel();
            if (lens != null && lens.toLowerCase().contains("front"))
                img.setIsSelfie(true);

            if (exifSub != null && exifSub.containsTag(ExifSubIFDDirectory.TAG_USER_COMMENT)) {
                String comment = exifSub.getDescription(ExifSubIFDDirectory.TAG_USER_COMMENT);
                if (comment != null && comment.toLowerCase().contains("screenshot"))
                    img.setIsScreenshot(true);
            }
            // VLC video-frame snapshots (filename like "vlcsnap-2020-08-30-...") are screenshots
            if (mediaFile.getFileName() != null
                    && mediaFile.getFileName().toLowerCase().startsWith("vlcsnap"))
                img.setIsScreenshot(true);
            if (!Boolean.TRUE.equals(img.getIsScreenshot()) && cameraMake == null
                    && mediaFile.getWidth() != null && mediaFile.getHeight() != null) {
                int w = mediaFile.getWidth(), h = mediaFile.getHeight();
                if ((w == 1170 && h == 2532) || (w == 2532 && h == 1170)
                 || (w == 1179 && h == 2556) || (w == 2556 && h == 1179)
                 || (w == 1290 && h == 2796) || (w == 2796 && h == 1290)
                 || (w == 2048 && h == 2732) || (w == 2732 && h == 2048)
                 || (w == 1668 && h == 2388) || (w == 2388 && h == 1668))
                    img.setIsScreenshot(true);
            }

            if (mediaFile.getAspectRatio() != null && mediaFile.getAspectRatio() > 2.5f
                    && cameraMake != null && cameraMake.toLowerCase().contains("apple"))
                img.setIsPanorama(true);

            if (exifSub != null && exifSub.containsTag(ExifSubIFDDirectory.TAG_CUSTOM_RENDERED)) {
                try {
                    int cr = exifSub.getInt(ExifSubIFDDirectory.TAG_CUSTOM_RENDERED);
                    if (cr == 8) img.setIsPortrait(true);
                    if (cr == 3) img.setIsHdr(true);
                } catch (Exception ignored2) {}
            }
            try {
                var appleMaker = metadata.getFirstDirectoryOfType(com.drew.metadata.exif.makernotes.AppleMakernoteDirectory.class);
                if (appleMaker != null) {
                    if (appleMaker.containsTag(0x0021)) img.setIsHdr(true);
                    if (appleMaker.containsTag(0x000e)) img.setIsBurst(true);
                    if (appleMaker.containsTag(0x0011)) img.setIsLivePhoto(true);
                }
            } catch (Exception ignored2) {}

            String ext = getExtension(mediaFile.getFileName());
            if (ext != null) {
                String lower = ext.toLowerCase();
                if (".dng".equals(lower) || ".raw".equals(lower) || ".cr2".equals(lower)
                        || ".cr3".equals(lower) || ".nef".equals(lower) || ".arw".equals(lower))
                    img.setIsRaw(true);
            }

            // ── Classification → MediaVideoDetail ────────────────────────────
            if (frameRate != null && frameRate >= 120) vid.setIsSlowMo(true);

            // ── Attach detail entities ────────────────────────────────────────
            boolean hasImageData = img.getCameraMake() != null || img.getCameraModel() != null
                    || img.getIsSelfie() != null || img.getIsScreenshot() != null
                    || img.getIso() != null || img.getLensModel() != null
                    || img.getAperture() != null || img.getFocalLength() != null
                    || img.getShutterSpeed() != null || img.getExifOrientation() != null
                    || img.getColorSpace() != null || img.getSoftware() != null
                    || img.getFlashFired() != null || img.getImageDescription() != null;
            boolean hasVideoData = vid.getVideoCodec() != null || vid.getFps() != null
                    || vid.getBitrate() != null || vid.getIsSlowMo() != null;

            if (hasImageData) mediaFile.setImageDetail(img);
            if (hasVideoData) mediaFile.setVideoDetail(vid);

        } catch (Exception ignored) {}
    }


    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }


    // ── Rescan metadata from B2 storage (fixes files uploaded before this pipeline) ──

    public java.util.Map<String, Object> rescanMetadataBatch(int batchSize, boolean force) {
        var pageable = org.springframework.data.domain.PageRequest.of(0, batchSize);
        var page = force
                ? mediaFileRepository.findByStorageKeyIsNotNull(pageable)
                : mediaFileRepository.findUnscanned(pageable);
        var files = page.getContent();

        Tag classifiedTag = tagRepository.findByName("CLASSIFIED")
                .orElseGet(() -> {
                    Tag t = new Tag();
                    t.setName("CLASSIFIED");
                    t.setColor("#607D8B");
                    return tagRepository.save(t);
                });

        int scanned = 0, updated = 0, errors = 0;
        java.util.List<String> log = new java.util.ArrayList<>();

        for (MediaFile m : files) {
            scanned++;
            try (java.io.InputStream is = storageService.downloadStream(m.getStorageKey())) {
                extractMetadataFromStream(is, m);
                if (m.getTimezone() == null) m.setTimezone("+07:00");
                if (m.getUploadedAt() == null) m.setUploadedAt(LocalDateTime.now(PHOTO_ZONE));
                m.getTags().add(classifiedTag);
                mediaFileRepository.save(m);
                updated++;
                log.add("OK " + m.getId() + " " + m.getFileName());
            } catch (Exception e) {
                errors++;
                log.add("ERR " + m.getId() + " " + (e.getMessage() != null ? e.getMessage() : "unknown error"));
            }
        }

        long remaining = page.getTotalElements() - updated;
        return java.util.Map.of(
            "batchSize", batchSize, "force", force, "totalInBatch", files.size(),
            "scanned", scanned, "updated", updated, "errors", errors,
            "remaining", remaining, "hasMore", remaining > 0,
            "log", log.size() > 50 ? log.subList(0, 50) : log
        );
    }

    private boolean isVideo(String contentType) {
        return contentType != null && contentType.startsWith("video/");
    }

}
