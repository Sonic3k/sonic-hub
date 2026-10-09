package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A nick on a forum: what their member page said (no birthday, address or school) and who on the portal it is. */
@Entity
@Table(name = "forum_members",
    uniqueConstraints = @UniqueConstraint(name = "uk_forum_member_nick", columnNames = {"forum_id", "nick_lower"}))
public class ForumMember extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "forum_id", nullable = false)
    private Forum forum;

    @Column(name = "nick", nullable = false, length = 120)
    private String nick;

    @Column(name = "nick_lower", nullable = false, length = 120)
    private String nickLower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Person person;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "intro", columnDefinition = "TEXT")
    private String intro;

    /** Awards the forum gave ({title, points}). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "awards", columnDefinition = "jsonb")
    private List<Map<String, Object>> awards = new ArrayList<>();

    @Column(name = "topic_count")
    private Integer topicCount;

    @Column(name = "reply_count")
    private Integer replyCount;

    /** Other nicks that are the same member (a typo, an old spelling). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "aliases", columnDefinition = "jsonb")
    private List<String> aliases = new ArrayList<>();

    public UUID getId() { return id; }
    public Forum getForum() { return forum; }
    public void setForum(Forum forum) { this.forum = forum; }
    public String getNick() { return nick; }
    public void setNick(String nick) { this.nick = nick; this.nickLower = nick == null ? null : nick.toLowerCase(); }
    public String getNickLower() { return nickLower; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    public String getIntro() { return intro; }
    public void setIntro(String intro) { this.intro = intro; }
    public List<Map<String, Object>> getAwards() { return awards; }
    public void setAwards(List<Map<String, Object>> awards) { this.awards = awards == null ? new ArrayList<>() : awards; }
    public Integer getTopicCount() { return topicCount; }
    public void setTopicCount(Integer topicCount) { this.topicCount = topicCount; }
    public Integer getReplyCount() { return replyCount; }
    public void setReplyCount(Integer replyCount) { this.replyCount = replyCount; }
    public List<String> getAliases() { return aliases; }
    public void setAliases(List<String> aliases) { this.aliases = aliases == null ? new ArrayList<>() : aliases; }
}
