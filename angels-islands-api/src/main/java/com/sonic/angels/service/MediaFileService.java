package com.sonic.angels.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import com.drew.metadata.jpeg.JpegDirectory;
import com.drew.metadata.png.PngDirectory;
import com.drew.metadata.webp.WebpDirectory;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.MediaImageDetail;
import com.sonic.angels.model.entity.MediaVideoDetail;
import com.sonic.angels.repository.MediaFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class MediaFileService {

    private final MediaFileRepository mediaFileRepository;
    private final StorageService storageService;

    public MediaFileService(MediaFileRepository mediaFileRepository, StorageService storageService) {
        this.mediaFileRepository = mediaFileRepository;
        this.storageService = storageService;
    }

    public List<MediaFile> findAll() { return mediaFileRepository.findAll(); }
    public MediaFile findById(UUID id) { return mediaFileRepository.findById(id).orElseThrow(() -> new RuntimeException("MediaFile not found: " + id)); }
    public List<MediaFile> findByPersonId(UUID personId) { return mediaFileRepository.findByPersonId(personId); }

    public MediaFile upload(MultipartFile file, UUID personId, String subFolder, Long lastModified) throws IOException {
        String ext = getExtension(file.getOriginalFilename());
        String storageKey = (personId != null ? "person-" + personId : "general")
            + "/" + (subFolder != null ? subFolder + "/" : "")
            + UUID.randomUUID() + ext;

        // Extract metadata BEFORE upload (consumes stream)
        MediaFile mf = new MediaFile();
        mf.setFileName(file.getOriginalFilename());
        mf.setFileType(isVideo(file.getContentType()) ? MediaFile.FileType.VIDEO : MediaFile.FileType.IMAGE);
        mf.setFileSize(file.getSize());
        mf.setMimeType(file.getContentType());
        mf.setUploadedAt(LocalDateTime.now());

        // Use browser's file.lastModified as fallback date
        if (lastModified != null && lastModified > 0) {
            mf.setFileDateModified(LocalDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(lastModified), ZoneId.systemDefault()));
        }

        extractMetadata(file, mf);

        // Upload to B2
        String fullKey = storageService.upload(file, storageKey);
        mf.setStorageKey(fullKey);
        mf.setStorageProvider(MediaFile.StorageProvider.B2);

        return mediaFileRepository.save(mf);
    }

    public void delete(UUID id) {
        MediaFile mf = findById(id);
        if (mf.getStorageProvider() == MediaFile.StorageProvider.B2 && mf.getStorageKey() != null) {
            storageService.delete(mf.getStorageKey());
        }
        mediaFileRepository.delete(mf);
    }

    public String buildCdnUrl(MediaFile mf) {
        return storageService.buildCdnUrl(mf.getStorageKey(), mf.getStorageProvider());
    }

    // ── Metadata extraction ──────────────────────────────────────────────────

    private void extractMetadata(MultipartFile file, MediaFile mf) {
        try {
            extractMetadataFromStream(file.getInputStream(), mf);
        } catch (Exception ignored) {}
    }

    public void extractMetadataFromStream(InputStream inputStream, MediaFile mf) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(inputStream);

            MediaImageDetail img = mf.getOrCreateImageDetail();
            MediaVideoDetail vid = mf.getOrCreateVideoDetail();

            // ── Image dimensions (JPEG, PNG, WebP, GIF) ─────────────────────
            JpegDirectory jpegDir = metadata.getFirstDirectoryOfType(JpegDirectory.class);
            if (jpegDir != null) {
                mf.setWidth(jpegDir.getImageWidth());
                mf.setHeight(jpegDir.getImageHeight());
            }
            PngDirectory pngDir = metadata.getFirstDirectoryOfType(PngDirectory.class);
            if (pngDir != null && mf.getWidth() == null) {
                if (pngDir.containsTag(PngDirectory.TAG_IMAGE_WIDTH))
                    mf.setWidth(pngDir.getInt(PngDirectory.TAG_IMAGE_WIDTH));
                if (pngDir.containsTag(PngDirectory.TAG_IMAGE_HEIGHT))
                    mf.setHeight(pngDir.getInt(PngDirectory.TAG_IMAGE_HEIGHT));
            }
            WebpDirectory webpDir = metadata.getFirstDirectoryOfType(WebpDirectory.class);
            if (webpDir != null && mf.getWidth() == null) {
                if (webpDir.containsTag(WebpDirectory.TAG_IMAGE_WIDTH))
                    mf.setWidth(webpDir.getInt(WebpDirectory.TAG_IMAGE_WIDTH));
                if (webpDir.containsTag(WebpDirectory.TAG_IMAGE_HEIGHT))
                    mf.setHeight(webpDir.getInt(WebpDirectory.TAG_IMAGE_HEIGHT));
            }
            try {
                var gifHeader = metadata.getFirstDirectoryOfType(com.drew.metadata.gif.GifHeaderDirectory.class);
                if (gifHeader != null && mf.getWidth() == null) {
                    if (gifHeader.containsTag(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_WIDTH))
                        mf.setWidth(gifHeader.getInt(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_WIDTH));
                    if (gifHeader.containsTag(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_HEIGHT))
                        mf.setHeight(gifHeader.getInt(com.drew.metadata.gif.GifHeaderDirectory.TAG_IMAGE_HEIGHT));
                }
                var gifControls = metadata.getDirectoriesOfType(com.drew.metadata.gif.GifControlDirectory.class);
                mf.setIsAnimated(gifControls != null && gifControls.size() > 1);
            } catch (Exception ignored) {}
            mf.calculateOrientation();

            // ── EXIF → dates + MediaImageDetail ─────────────────────────────
            String cameraMake = null;
            ExifSubIFDDirectory exifSub = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (exifSub != null) {
                Date dateTaken = exifSub.getDateOriginal();
                if (dateTaken != null)
                    mf.setDateTaken(LocalDateTime.ofInstant(dateTaken.toInstant(), ZoneId.systemDefault()));
                Date dateDigitized = exifSub.getDateDigitized();
                if (dateDigitized != null)
                    mf.setFileDateCreated(LocalDateTime.ofInstant(dateDigitized.toInstant(), ZoneId.systemDefault()));
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
                if (exifIFD0.containsTag(ExifIFD0Directory.TAG_DATETIME)) {
                    Date dateModified = exifIFD0.getDate(ExifIFD0Directory.TAG_DATETIME);
                    if (dateModified != null)
                        mf.setFileDateModified(LocalDateTime.ofInstant(dateModified.toInstant(), ZoneId.systemDefault()));
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

            // ── GPS ──────────────────────────────────────────────────────────
            GpsDirectory gpsDir = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gpsDir != null && gpsDir.getGeoLocation() != null) {
                mf.setLatitude(gpsDir.getGeoLocation().getLatitude());
                mf.setLongitude(gpsDir.getGeoLocation().getLongitude());
            }

            // ── MP4/MOV → video metadata ─────────────────────────────────────
            try {
                var mp4Dir = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.Mp4Directory.class);
                if (mp4Dir != null) {
                    if (mp4Dir.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_DURATION))
                        mf.setDuration((int) (mp4Dir.getLong(com.drew.metadata.mp4.Mp4Directory.TAG_DURATION) / 1000));
                    if (mp4Dir.containsTag(com.drew.metadata.mp4.Mp4Directory.TAG_CREATION_TIME)) {
                        Date created = mp4Dir.getDate(com.drew.metadata.mp4.Mp4Directory.TAG_CREATION_TIME);
                        if (created != null && mf.getDateTaken() == null)
                            mf.setDateTaken(LocalDateTime.ofInstant(created.toInstant(), ZoneId.systemDefault()));
                    }
                }
                var mp4Video = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.media.Mp4VideoDirectory.class);
                if (mp4Video != null) {
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_WIDTH))
                        mf.setWidth(mp4Video.getInt(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_WIDTH));
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_HEIGHT))
                        mf.setHeight(mp4Video.getInt(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_HEIGHT));
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_FRAME_RATE))
                        vid.setFps(mp4Video.getFloat(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_FRAME_RATE));
                    if (mp4Video.containsTag(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_COMPRESSOR_NAME))
                        vid.setVideoCodec(mp4Video.getString(com.drew.metadata.mp4.media.Mp4VideoDirectory.TAG_COMPRESSOR_NAME));
                    mf.calculateOrientation();
                }
                var mp4Sound = metadata.getFirstDirectoryOfType(com.drew.metadata.mp4.media.Mp4SoundDirectory.class);
                if (mp4Sound != null && mp4Sound.containsTag(com.drew.metadata.mp4.media.Mp4SoundDirectory.TAG_AUDIO_FORMAT))
                    vid.setAudioCodec(mp4Sound.getString(com.drew.metadata.mp4.media.Mp4SoundDirectory.TAG_AUDIO_FORMAT));
            } catch (Exception ignored) {}

            // ── QuickTime (MOV) ──────────────────────────────────────────────
            try {
                var qtDir = metadata.getFirstDirectoryOfType(com.drew.metadata.mov.QuickTimeDirectory.class);
                if (qtDir != null) {
                    if (mf.getDuration() == null && qtDir.containsTag(com.drew.metadata.mov.QuickTimeDirectory.TAG_DURATION))
                        mf.setDuration((int) (qtDir.getLong(com.drew.metadata.mov.QuickTimeDirectory.TAG_DURATION) / 1000));
                    if (mf.getDateTaken() == null && qtDir.containsTag(com.drew.metadata.mov.QuickTimeDirectory.TAG_CREATION_TIME)) {
                        Date created = qtDir.getDate(com.drew.metadata.mov.QuickTimeDirectory.TAG_CREATION_TIME);
                        if (created != null)
                            mf.setDateTaken(LocalDateTime.ofInstant(created.toInstant(), ZoneId.systemDefault()));
                    }
                }
            } catch (Exception ignored) {}

            // Video bitrate
            if (mf.getDuration() != null && mf.getDuration() > 0 && mf.getFileSize() != null)
                vid.setBitrate((int) (mf.getFileSize() * 8 / mf.getDuration()));

            // ── Classification ───────────────────────────────────────────────
            String lens = img.getLensModel();
            if (lens != null && lens.toLowerCase().contains("front"))
                img.setIsSelfie(true);

            if (mf.getAspectRatio() != null && mf.getAspectRatio() > 2.5f
                    && cameraMake != null && cameraMake.toLowerCase().contains("apple"))
                img.setIsPanorama(true);

            // Only persist detail if it has data
            boolean hasImageData = img.getCameraMake() != null || img.getIso() != null
                || img.getFocalLength() != null || img.getAperture() != null;
            if (hasImageData) mf.setImageDetail(img);

            boolean hasVideoData = vid.getVideoCodec() != null || vid.getFps() != null
                || vid.getAudioCodec() != null || vid.getBitrate() != null;
            if (hasVideoData) mf.setVideoDetail(vid);

        } catch (Exception ignored) {}
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private boolean isVideo(String contentType) {
        return contentType != null && contentType.startsWith("video/");
    }
}
