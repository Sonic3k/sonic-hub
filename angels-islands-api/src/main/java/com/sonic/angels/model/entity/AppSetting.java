package com.sonic.angels.model.entity;

import jakarta.persistence.*;

/** Small server-owned key/value settings that must survive restarts (e.g. the private storage folder name). */
@Entity
@Table(name = "app_settings")
public class AppSetting extends BaseEntity {

    @Id
    @Column(name = "setting_key", length = 100)
    private String key;

    @Column(name = "setting_value", length = 2000)
    private String value;

    public AppSetting() {}

    public AppSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
