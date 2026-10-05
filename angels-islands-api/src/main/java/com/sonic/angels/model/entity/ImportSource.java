package com.sonic.angels.model.entity;

import jakarta.persistence.*;

import java.util.UUID;

/**
 * One raw source file kept in storage exactly as exported (Yahoo .txt, Facebook HTML/media, ...).
 * label groups files by origin ("facebook-dyi-2023-04-16"); path is the file's path inside that origin.
 */
@Entity
@Table(name = "import_sources", uniqueConstraints = {
    @UniqueConstraint(name = "uk_import_source_label_path", columnNames = {"label", "path"})
})
public class ImportSource extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "label", nullable = false, length = 64)
    private String label;

    @Column(name = "path", nullable = false, length = 600)
    private String path;

    /** Full object key in the bucket. */
    @Column(name = "storage_key", nullable = false, length = 900)
    private String storageKey;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "content_type", length = 150)
    private String contentType;

    public ImportSource() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getSha256() { return sha256; }
    public void setSha256(String sha256) { this.sha256 = sha256; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
}
