package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * What plays a game for real: its files (a DOS game bundled for DOSBox, a Flash .swf, a cartridge's ROM) kept in the
 * private games bucket, and his own save from back then so it goes on where he stopped. WIN packages are Windows games
 * run by Boxedwine (Wine in the browser): the file is a zip of the game's folder, and config names the .exe; several
 * games of one folder share the file of one of them (config "zip"). WEB packages are games rebuilt on the site itself
 * (Minesweeper): config names which. HTML packages are web games that are one .html file written by someone else: the
 * site plays the file inside a frame that has no part of the site's own origin (see /file in GameController), and
 * config "hosts" lists the only other sites the page may load from (its fonts).
 * portal = it plays on the portal page too; otherwise only inside the machines of its time (a desk item with
 * app "game" and this key as its target puts it there).
 */
@Entity
@Table(name = "game_packages",
    uniqueConstraints = @UniqueConstraint(name = "uk_game_package_key", columnNames = "external_key"),
    indexes = @Index(name = "idx_game_package_game", columnList = "game_id"))
public class GamePackage extends BaseEntity {

    public enum Engine { DOS, FLASH, NES, SNES, GB, GBC, GBA, NDS, WIN, WEB, HTML }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "external_key", nullable = false, length = 120)
    private String externalKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(name = "engine", nullable = false, length = 8)
    private Engine engine;

    /** The name its window carries: "DYNA Blaster", "Pokemon Emerald (U)". */
    @Column(name = "title", length = 200)
    private String title;

    /** Where its file is in the games bucket (none for WEB). */
    @Column(name = "storage_key", length = 500)
    private String storageKey;

    @Column(name = "file_name", length = 300)
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    /** His save from back then (battery save, memory card), started with on a first play. */
    @Column(name = "save_storage_key", length = 500)
    private String saveStorageKey;

    @Column(name = "save_file_name", length = 300)
    private String saveFileName;

    @Column(name = "save_size")
    private Long saveSize;

    /** When that save was last written (the file's date). */
    @Column(name = "save_at")
    private LocalDateTime saveAt;

    /** How to start it: for DOS the command line, for WEB which rebuilt game, for a cartridge emulator options. */
    @Column(name = "config", columnDefinition = "TEXT")
    private String config;

    @Column(name = "portal")
    private Boolean portal;

    @Column(name = "note", length = 2000)
    private String note;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public GamePackage() {}

    public UUID getId() { return id; }
    public String getExternalKey() { return externalKey; }
    public void setExternalKey(String v) { this.externalKey = v; }
    public Game getGame() { return game; }
    public void setGame(Game v) { this.game = v; }
    public Engine getEngine() { return engine; }
    public void setEngine(Engine v) { this.engine = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String v) { this.storageKey = v; }
    public String getFileName() { return fileName; }
    public void setFileName(String v) { this.fileName = v; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long v) { this.fileSize = v; }
    public String getContentHash() { return contentHash; }
    public void setContentHash(String v) { this.contentHash = v; }
    public String getSaveStorageKey() { return saveStorageKey; }
    public void setSaveStorageKey(String v) { this.saveStorageKey = v; }
    public String getSaveFileName() { return saveFileName; }
    public void setSaveFileName(String v) { this.saveFileName = v; }
    public Long getSaveSize() { return saveSize; }
    public void setSaveSize(Long v) { this.saveSize = v; }
    public LocalDateTime getSaveAt() { return saveAt; }
    public void setSaveAt(LocalDateTime v) { this.saveAt = v; }
    public String getConfig() { return config; }
    public void setConfig(String v) { this.config = v; }
    public Boolean getPortal() { return portal; }
    public void setPortal(Boolean v) { this.portal = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
}
