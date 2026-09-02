package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** One turn of companion conversation. History is shared across channels. */
@Entity
@Table(name = "companion_messages", indexes = @Index(name = "idx_companion_msg_person", columnList = "person_id, created_at"))
public class CompanionMessage extends BaseEntity {

    public enum Role { USER, ASSISTANT }
    public enum Channel { APP, TELEGRAM }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "person_id", nullable = false)
    private Person person;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Channel channel = Channel.APP;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    public UUID getId() { return id; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Channel getChannel() { return channel; }
    public void setChannel(Channel channel) { this.channel = channel; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
