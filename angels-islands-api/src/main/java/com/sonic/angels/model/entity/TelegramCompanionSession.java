package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** Which person a Telegram chat is currently talking to. */
@Entity
@Table(name = "telegram_companion_sessions")
public class TelegramCompanionSession {

    @Id
    @Column(name = "chat_id")
    private Long chatId;

    @Column(name = "person_id", nullable = false)
    private UUID personId;

    public Long getChatId() { return chatId; }
    public void setChatId(Long chatId) { this.chatId = chatId; }
    public UUID getPersonId() { return personId; }
    public void setPersonId(UUID personId) { this.personId = personId; }
}
