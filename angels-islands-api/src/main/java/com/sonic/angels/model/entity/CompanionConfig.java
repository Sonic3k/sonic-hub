package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * Per-person companion settings. The engine is fully generic — persona is
 * assembled at runtime from the person's memory vault (facts, traits,
 * episodes, chapters, chat style). No per-person code, ever.
 */
@Entity
@Table(name = "companion_configs")
public class CompanionConfig extends BaseEntity {

    public enum Provider { CLAUDE, OPENAI, DEEPSEEK, TOGETHER }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", unique = true, nullable = false)
    private Person person;

    @Column(nullable = false)
    private Boolean enabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider = Provider.DEEPSEEK;

    @Column(nullable = false)
    private String model = "deepseek-chat";

    @Column(nullable = false)
    private Float temperature = 0.8f;

    @Column(name = "max_history", nullable = false)
    private Integer maxHistory = 30;

    @Column(name = "use_memory", nullable = false)
    private Boolean useMemory = true;

    @Column(name = "use_chat_style", nullable = false)
    private Boolean useChatStyle = true;

    @Column(name = "extra_prompt", columnDefinition = "TEXT")
    private String extraPrompt;

    /** LLM-analyzed voice & interaction profile (xưng hô, teencode, câu cửa miệng, cách đối đáp). Editable by hand. */
    @Column(name = "style_profile", columnDefinition = "TEXT")
    private String styleProfile;

    public UUID getId() { return id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public Provider getProvider() { return provider; }
    public void setProvider(Provider provider) { this.provider = provider; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Float getTemperature() { return temperature; }
    public void setTemperature(Float temperature) { this.temperature = temperature; }
    public Integer getMaxHistory() { return maxHistory; }
    public void setMaxHistory(Integer maxHistory) { this.maxHistory = maxHistory; }
    public Boolean getUseMemory() { return useMemory; }
    public void setUseMemory(Boolean useMemory) { this.useMemory = useMemory; }
    public Boolean getUseChatStyle() { return useChatStyle; }
    public void setUseChatStyle(Boolean useChatStyle) { this.useChatStyle = useChatStyle; }
    public String getExtraPrompt() { return extraPrompt; }
    public void setExtraPrompt(String extraPrompt) { this.extraPrompt = extraPrompt; }
    public String getStyleProfile() { return styleProfile; }
    public void setStyleProfile(String styleProfile) { this.styleProfile = styleProfile; }
}
