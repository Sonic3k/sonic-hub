package com.sonic.angels.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "collections")
public class Collection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Collection parent;

    @JsonIgnore
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    private Set<Collection> children = new HashSet<>();

    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "collection_media",
        joinColumns = @JoinColumn(name = "collection_id"),
        inverseJoinColumns = @JoinColumn(name = "media_file_id"))
    private Set<MediaFile> mediaFiles = new HashSet<>();

    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "collection_persons",
        joinColumns = @JoinColumn(name = "collection_id"),
        inverseJoinColumns = @JoinColumn(name = "person_id"))
    private Set<Person> persons = new HashSet<>();

    @JsonIgnore
    @ManyToMany
    @JoinTable(name = "collection_tags",
        joinColumns = @JoinColumn(name = "collection_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thumbnail_media_file_id")
    private MediaFile thumbnailMediaFile;

    public Collection() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Collection getParent() { return parent; }
    public void setParent(Collection parent) { this.parent = parent; }
    public Set<Collection> getChildren() { return children; }
    public void setChildren(Set<Collection> children) { this.children = children; }
    public Set<MediaFile> getMediaFiles() { return mediaFiles; }
    public void setMediaFiles(Set<MediaFile> mediaFiles) { this.mediaFiles = mediaFiles; }
    public Set<Person> getPersons() { return persons; }
    public void setPersons(Set<Person> persons) { this.persons = persons; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
    public MediaFile getThumbnailMediaFile() { return thumbnailMediaFile; }
    public void setThumbnailMediaFile(MediaFile thumbnailMediaFile) { this.thumbnailMediaFile = thumbnailMediaFile; }
}
