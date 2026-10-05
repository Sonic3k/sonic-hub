package com.sonic.angels.model.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Payloads of the bulk chat importer (/api/import/**). */
public class ImportDto {

    // ── Persons ──────────────────────────────────────────────────────────────

    public static class ContactSync {
        private String platform; private String identifier; private String displayName; private String notes;
        public String getPlatform() { return platform; } public void setPlatform(String v) { this.platform = v; }
        public String getIdentifier() { return identifier; } public void setIdentifier(String v) { this.identifier = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getNotes() { return notes; } public void setNotes(String v) { this.notes = v; }
    }

    public static class PersonSync {
        private String slug; private String name; private String displayName; private String nickname;
        private String alternativeName;
        /** Extra names an existing (slug-less) person may already carry, used to claim instead of duplicating. */
        private List<String> matchNames = new ArrayList<>();
        /** Album path under the root collection, e.g. ["Carnival Night", "bus 49"]. */
        private List<String> collectionPath = new ArrayList<>();
        private List<ContactSync> contacts = new ArrayList<>();
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getDisplayName() { return displayName; } public void setDisplayName(String v) { this.displayName = v; }
        public String getNickname() { return nickname; } public void setNickname(String v) { this.nickname = v; }
        public String getAlternativeName() { return alternativeName; } public void setAlternativeName(String v) { this.alternativeName = v; }
        public List<String> getMatchNames() { return matchNames; } public void setMatchNames(List<String> v) { this.matchNames = v; }
        public List<String> getCollectionPath() { return collectionPath; } public void setCollectionPath(List<String> v) { this.collectionPath = v; }
        public List<ContactSync> getContacts() { return contacts; } public void setContacts(List<ContactSync> v) { this.contacts = v; }
    }

    public static class PersonSyncResult {
        private String slug; private UUID personId; private String name;
        /** created | claimed | existing | ambiguous */
        private String action;
        private int contactsAdded; private UUID collectionId; private boolean collectionLinked;
        private List<String> warnings = new ArrayList<>();
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public String getAction() { return action; } public void setAction(String v) { this.action = v; }
        public int getContactsAdded() { return contactsAdded; } public void setContactsAdded(int v) { this.contactsAdded = v; }
        public UUID getCollectionId() { return collectionId; } public void setCollectionId(UUID v) { this.collectionId = v; }
        public boolean isCollectionLinked() { return collectionLinked; } public void setCollectionLinked(boolean v) { this.collectionLinked = v; }
        public List<String> getWarnings() { return warnings; } public void setWarnings(List<String> v) { this.warnings = v; }
    }

    // ── Archives & messages ──────────────────────────────────────────────────

    public static class ArchiveUpsert {
        private String personSlug; private String externalKey; private String platform; private String title;
        private List<String> sources = new ArrayList<>();
        public String getPersonSlug() { return personSlug; } public void setPersonSlug(String v) { this.personSlug = v; }
        public String getExternalKey() { return externalKey; } public void setExternalKey(String v) { this.externalKey = v; }
        public String getPlatform() { return platform; } public void setPlatform(String v) { this.platform = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public List<String> getSources() { return sources; } public void setSources(List<String> v) { this.sources = v; }
    }

    public static class ArchiveResult {
        private UUID archiveId; private boolean created; private long storedMessages;
        public UUID getArchiveId() { return archiveId; } public void setArchiveId(UUID v) { this.archiveId = v; }
        public boolean isCreated() { return created; } public void setCreated(boolean v) { this.created = v; }
        public long getStoredMessages() { return storedMessages; } public void setStoredMessages(long v) { this.storedMessages = v; }
    }

    public static class AttachmentIn {
        private String type; private String sourceLabel; private String sourcePath; private String url; private String fileName;
        public String getType() { return type; } public void setType(String v) { this.type = v; }
        public String getSourceLabel() { return sourceLabel; } public void setSourceLabel(String v) { this.sourceLabel = v; }
        public String getSourcePath() { return sourcePath; } public void setSourcePath(String v) { this.sourcePath = v; }
        public String getUrl() { return url; } public void setUrl(String v) { this.url = v; }
        public String getFileName() { return fileName; } public void setFileName(String v) { this.fileName = v; }
    }

    public static class MessageIn {
        private String externalId; private Integer seq;
        /** ISO-8601 UTC, e.g. "2013-11-10T04:13:45Z". */
        private String timestamp;
        /** s | m | g | d (or SECOND / MINUTE / GROUP / DAY) */
        private String precision;
        /** self | them | other | system */
        private String side;
        private String sender; private String content;
        /** text | empty | photo | video | audio | file | gif | sticker | post | comment */
        private String kind;
        private List<String> sources = new ArrayList<>();
        private List<String> reactions = new ArrayList<>();
        private String replyTo;
        private List<AttachmentIn> attachments = new ArrayList<>();
        public String getExternalId() { return externalId; } public void setExternalId(String v) { this.externalId = v; }
        public Integer getSeq() { return seq; } public void setSeq(Integer v) { this.seq = v; }
        public String getTimestamp() { return timestamp; } public void setTimestamp(String v) { this.timestamp = v; }
        public String getPrecision() { return precision; } public void setPrecision(String v) { this.precision = v; }
        public String getSide() { return side; } public void setSide(String v) { this.side = v; }
        public String getSender() { return sender; } public void setSender(String v) { this.sender = v; }
        public String getContent() { return content; } public void setContent(String v) { this.content = v; }
        public String getKind() { return kind; } public void setKind(String v) { this.kind = v; }
        public List<String> getSources() { return sources; } public void setSources(List<String> v) { this.sources = v; }
        public List<String> getReactions() { return reactions; } public void setReactions(List<String> v) { this.reactions = v; }
        public String getReplyTo() { return replyTo; } public void setReplyTo(String v) { this.replyTo = v; }
        public List<AttachmentIn> getAttachments() { return attachments; } public void setAttachments(List<AttachmentIn> v) { this.attachments = v; }
    }

    public static class MessageBatch {
        private List<MessageIn> messages = new ArrayList<>();
        public List<MessageIn> getMessages() { return messages; } public void setMessages(List<MessageIn> v) { this.messages = v; }
    }

    public static class MessageBatchResult {
        private int inserted; private int updated; private int unchanged; private int attachments;
        public int getInserted() { return inserted; } public void setInserted(int v) { this.inserted = v; }
        public int getUpdated() { return updated; } public void setUpdated(int v) { this.updated = v; }
        public int getUnchanged() { return unchanged; } public void setUnchanged(int v) { this.unchanged = v; }
        public int getAttachments() { return attachments; } public void setAttachments(int v) { this.attachments = v; }
    }

    public static class FinalizeRequest {
        /** When given: every message of the archive whose externalId is not listed is deleted. */
        private List<String> keepExternalIds;
        public List<String> getKeepExternalIds() { return keepExternalIds; } public void setKeepExternalIds(List<String> v) { this.keepExternalIds = v; }
    }

    public static class FinalizeResult {
        private UUID archiveId; private int messageCount; private int pruned;
        private java.time.LocalDateTime dateFrom; private java.time.LocalDateTime dateTo;
        public UUID getArchiveId() { return archiveId; } public void setArchiveId(UUID v) { this.archiveId = v; }
        public int getMessageCount() { return messageCount; } public void setMessageCount(int v) { this.messageCount = v; }
        public int getPruned() { return pruned; } public void setPruned(int v) { this.pruned = v; }
        public java.time.LocalDateTime getDateFrom() { return dateFrom; } public void setDateFrom(java.time.LocalDateTime v) { this.dateFrom = v; }
        public java.time.LocalDateTime getDateTo() { return dateTo; } public void setDateTo(java.time.LocalDateTime v) { this.dateTo = v; }
    }

    // ── Raw source files ─────────────────────────────────────────────────────

    public static class RawFileRef {
        private String label; private String path; private String sha256; private Long size;
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public String getPath() { return path; } public void setPath(String v) { this.path = v; }
        public String getSha256() { return sha256; } public void setSha256(String v) { this.sha256 = v; }
        public Long getSize() { return size; } public void setSize(Long v) { this.size = v; }
    }

    public static class RawCheckResult {
        private String label; private String path;
        /** missing | same | changed */
        private String status;
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public String getPath() { return path; } public void setPath(String v) { this.path = v; }
        public String getStatus() { return status; } public void setStatus(String v) { this.status = v; }
    }

    public static class RawUploadResult {
        private UUID id; private String label; private String path; private long size; private int linkedAttachments;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public String getPath() { return path; } public void setPath(String v) { this.path = v; }
        public long getSize() { return size; } public void setSize(long v) { this.size = v; }
        public int getLinkedAttachments() { return linkedAttachments; } public void setLinkedAttachments(int v) { this.linkedAttachments = v; }
    }

    // ── Status ───────────────────────────────────────────────────────────────

    public static class ArchiveStatus {
        private UUID id; private String externalKey; private String platform; private String title;
        private Integer messageCount; private long storedMessages;
        public UUID getId() { return id; } public void setId(UUID v) { this.id = v; }
        public String getExternalKey() { return externalKey; } public void setExternalKey(String v) { this.externalKey = v; }
        public String getPlatform() { return platform; } public void setPlatform(String v) { this.platform = v; }
        public String getTitle() { return title; } public void setTitle(String v) { this.title = v; }
        public Integer getMessageCount() { return messageCount; } public void setMessageCount(Integer v) { this.messageCount = v; }
        public long getStoredMessages() { return storedMessages; } public void setStoredMessages(long v) { this.storedMessages = v; }
    }

    public static class PersonStatus {
        private String slug; private UUID personId; private String name;
        private List<ArchiveStatus> archives = new ArrayList<>();
        public String getSlug() { return slug; } public void setSlug(String v) { this.slug = v; }
        public UUID getPersonId() { return personId; } public void setPersonId(UUID v) { this.personId = v; }
        public String getName() { return name; } public void setName(String v) { this.name = v; }
        public List<ArchiveStatus> getArchives() { return archives; } public void setArchives(List<ArchiveStatus> v) { this.archives = v; }
    }

    public static class RawLabelStatus {
        private String label; private long files; private long bytes;
        public String getLabel() { return label; } public void setLabel(String v) { this.label = v; }
        public long getFiles() { return files; } public void setFiles(long v) { this.files = v; }
        public long getBytes() { return bytes; } public void setBytes(long v) { this.bytes = v; }
    }

    public static class Status {
        private boolean storageConfigured;
        private List<PersonStatus> persons = new ArrayList<>();
        private List<RawLabelStatus> raw = new ArrayList<>();
        private long attachments; private long attachmentsWithFile; private long attachmentsStored;
        public boolean isStorageConfigured() { return storageConfigured; } public void setStorageConfigured(boolean v) { this.storageConfigured = v; }
        public List<PersonStatus> getPersons() { return persons; } public void setPersons(List<PersonStatus> v) { this.persons = v; }
        public List<RawLabelStatus> getRaw() { return raw; } public void setRaw(List<RawLabelStatus> v) { this.raw = v; }
        public long getAttachments() { return attachments; } public void setAttachments(long v) { this.attachments = v; }
        public long getAttachmentsWithFile() { return attachmentsWithFile; } public void setAttachmentsWithFile(long v) { this.attachmentsWithFile = v; }
        public long getAttachmentsStored() { return attachmentsStored; } public void setAttachmentsStored(long v) { this.attachmentsStored = v; }
    }
}
