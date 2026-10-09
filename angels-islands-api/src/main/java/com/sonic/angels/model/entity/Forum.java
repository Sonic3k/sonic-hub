package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** An old forum whose threads were saved (onthi.com from the Web Archive; later others, e.g. FC Westlife). */
@Entity
@Table(name = "forums")
public class Forum extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Short key used in URLs and by the import ("onthi"). */
    @Column(name = "forum_key", nullable = false, unique = true, length = 40)
    private String key;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "url")
    private String url;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public UUID getId() { return id; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
