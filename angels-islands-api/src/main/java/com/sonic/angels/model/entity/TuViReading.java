package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** A reading Claude wrote of one chart for one scope and year, grandma's lines kept apart from the added interpretation. */
@Entity
@Table(name = "tuvi_readings")
public class TuViReading extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "profile_id", nullable = false)
    private TuViProfile profile;

    /** What was read: "tong-quan", one palace ("Quan Lộc"), the hạn of a year ("han-2026")… */
    @Column(name = "scope", nullable = false, length = 60)
    private String scope;

    /** The year the chart was viewed for (whose tiểu hạn it shows). */
    @Column(name = "view_year", nullable = false)
    private int viewYear;

    /** The web's hash of what the reading was made from, so it can tell when the reading is out of date. */
    @Column(name = "input_hash", length = 64)
    private String inputHash;

    @Column(name = "model", length = 80)
    private String model;

    /** The JSON object the model returned: sections (each with "ba" and "them") and a caution. */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    public TuViReading() {}

    public UUID getId() { return id; }
    public TuViProfile getProfile() { return profile; }
    public void setProfile(TuViProfile profile) { this.profile = profile; }
    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }
    public int getViewYear() { return viewYear; }
    public void setViewYear(int viewYear) { this.viewYear = viewYear; }
    public String getInputHash() { return inputHash; }
    public void setInputHash(String inputHash) { this.inputHash = inputHash; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
