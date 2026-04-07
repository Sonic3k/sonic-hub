package com.sonic.angels.service;

import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.repository.MediaFileRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
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
    public MediaFile findById(Long id) { return mediaFileRepository.findById(id).orElseThrow(() -> new RuntimeException("MediaFile not found: " + id)); }
    public List<MediaFile> findByPersonId(Long personId) { return mediaFileRepository.findByPersonId(personId); }

    public MediaFile upload(MultipartFile file, Long personId, String subFolder) throws IOException {
        String ext = getExtension(file.getOriginalFilename());
        String storageKey = (personId != null ? "person-" + personId : "general") + "/" + (subFolder != null ? subFolder + "/" : "") + UUID.randomUUID() + ext;

        String fullKey = storageService.upload(file, storageKey);

        MediaFile mf = new MediaFile();
        mf.setFileName(file.getOriginalFilename());
        mf.setStorageKey(fullKey);
        mf.setStorageProvider(MediaFile.StorageProvider.B2);
        mf.setFileType(isVideo(file.getContentType()) ? MediaFile.FileType.VIDEO : MediaFile.FileType.IMAGE);
        mf.setFileSize(file.getSize());
        mf.setMimeType(file.getContentType());
        mf.setUploadedAt(LocalDateTime.now());
        return mediaFileRepository.save(mf);
    }

    public void delete(Long id) {
        MediaFile mf = findById(id);
        if (mf.getStorageProvider() == MediaFile.StorageProvider.B2 && mf.getStorageKey() != null) {
            storageService.delete(mf.getStorageKey());
        }
        mediaFileRepository.delete(mf);
    }

    public String buildCdnUrl(MediaFile mf) {
        return storageService.buildCdnUrl(mf.getStorageKey(), mf.getStorageProvider());
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private boolean isVideo(String contentType) {
        return contentType != null && contentType.startsWith("video/");
    }
}
