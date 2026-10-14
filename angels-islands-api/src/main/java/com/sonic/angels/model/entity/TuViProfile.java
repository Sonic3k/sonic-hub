package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** A birth profile saved on the Tử vi panel: the birth as it was entered and the chart settings; the web draws the chart from it. */
@Entity
@Table(name = "tuvi_profiles")
public class TuViProfile extends BaseEntity {

    public enum Gender { NAM, NU }
    public enum Calendar { SOLAR, LUNAR }
    /** BA = grandma's star placements; SACH = the common books' placements, for the few stars where they differ. */
    public enum Variant { BA, SACH }
    /** Born in a leap month: SAME = counted as that month; SPLIT15 = days 1–15 that month, 16–30 the next. */
    public enum LeapRule { SAME, SPLIT15 }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    /** The calendar the birth date below is in. */
    @Enumerated(EnumType.STRING)
    @Column(name = "calendar", nullable = false, length = 10)
    private Calendar calendar;

    @Column(name = "birth_year", nullable = false)
    private int birthYear;

    @Column(name = "birth_month", nullable = false)
    private int birthMonth;

    @Column(name = "birth_day", nullable = false)
    private int birthDay;

    /** Lunar input only: the date is in the leap month. */
    @Column(name = "leap_month", nullable = false)
    private boolean leapMonth = false;

    /** Solar input: the clock hour 0–23; lunar input: the giờ branch 0–11 (Tý … Hợi). */
    @Column(name = "birth_hour", nullable = false)
    private int birthHour;

    @Column(name = "birth_minute")
    private Integer birthMinute;

    @Enumerated(EnumType.STRING)
    @Column(name = "variant", nullable = false, length = 10)
    private Variant variant = Variant.BA;

    @Enumerated(EnumType.STRING)
    @Column(name = "leap_rule", nullable = false, length = 10)
    private LeapRule leapRule = LeapRule.SAME;

    /** Solar input, 23:00–23:59: giờ Tý of the next day (true) or of the same day. */
    @Column(name = "ty_next_day", nullable = false)
    private boolean tyNextDay = true;

    /** The person on Angels Islands this chart is of, when there is one. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id")
    private Person person;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public TuViProfile() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Gender getGender() { return gender; }
    public void setGender(Gender gender) { this.gender = gender; }
    public Calendar getCalendar() { return calendar; }
    public void setCalendar(Calendar calendar) { this.calendar = calendar; }
    public int getBirthYear() { return birthYear; }
    public void setBirthYear(int birthYear) { this.birthYear = birthYear; }
    public int getBirthMonth() { return birthMonth; }
    public void setBirthMonth(int birthMonth) { this.birthMonth = birthMonth; }
    public int getBirthDay() { return birthDay; }
    public void setBirthDay(int birthDay) { this.birthDay = birthDay; }
    public boolean isLeapMonth() { return leapMonth; }
    public void setLeapMonth(boolean leapMonth) { this.leapMonth = leapMonth; }
    public int getBirthHour() { return birthHour; }
    public void setBirthHour(int birthHour) { this.birthHour = birthHour; }
    public Integer getBirthMinute() { return birthMinute; }
    public void setBirthMinute(Integer birthMinute) { this.birthMinute = birthMinute; }
    public Variant getVariant() { return variant; }
    public void setVariant(Variant variant) { this.variant = variant; }
    public LeapRule getLeapRule() { return leapRule; }
    public void setLeapRule(LeapRule leapRule) { this.leapRule = leapRule; }
    public boolean isTyNextDay() { return tyNextDay; }
    public void setTyNextDay(boolean tyNextDay) { this.tyNextDay = tyNextDay; }
    public Person getPerson() { return person; }
    public void setPerson(Person person) { this.person = person; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
