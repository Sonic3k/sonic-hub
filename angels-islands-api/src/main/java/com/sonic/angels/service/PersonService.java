package com.sonic.angels.service;

import com.sonic.angels.model.dto.PersonDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.PersonContact;
import com.sonic.angels.repository.CompanionConfigRepository;
import com.sonic.angels.repository.CompanionMessageRepository;
import com.sonic.angels.repository.PersonContactRepository;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.repository.TagRepository;
import com.sonic.angels.repository.TelegramCompanionSessionRepository;
import com.sonic.angels.repository.PersonMysticBriefRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.MonthDay;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class PersonService {

    private final PersonRepository personRepository;
    private final PersonContactRepository contactRepository;
    private final TagRepository tagRepository;
    private final DtoMapper mapper;

    private final CompanionMessageRepository companionMessageRepository;
    private final CompanionConfigRepository companionConfigRepository;
    private final TelegramCompanionSessionRepository telegramSessionRepository;
    private final com.sonic.angels.repository.RankingEntryRepository rankingEntryRepository;
    private final PersonMysticBriefRepository mysticBriefRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.sonic.angels.repository.MediaFileRepository mediaFileRepository;

    public PersonService(PersonRepository personRepository, PersonContactRepository contactRepository,
                         TagRepository tagRepository, DtoMapper mapper,
                         CompanionMessageRepository companionMessageRepository,
                         CompanionConfigRepository companionConfigRepository,
                         TelegramCompanionSessionRepository telegramSessionRepository,
                         com.sonic.angels.repository.RankingEntryRepository rankingEntryRepository,
                         PersonMysticBriefRepository mysticBriefRepository) {
        this.personRepository = personRepository;
        this.contactRepository = contactRepository;
        this.tagRepository = tagRepository;
        this.mapper = mapper;
        this.companionMessageRepository = companionMessageRepository;
        this.companionConfigRepository = companionConfigRepository;
        this.telegramSessionRepository = telegramSessionRepository;
        this.rankingEntryRepository = rankingEntryRepository;
        this.mysticBriefRepository = mysticBriefRepository;
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonDto.Summary> findAll() {
        return personRepository.findAll().stream().map(mapper::toPersonSummary).toList();
    }

    @Transactional(readOnly = true)
    public PersonDto.DetailResponse findById(UUID id) {
        return mapper.toPersonDetail(getEntity(id));
    }

    public Person getEntity(UUID id) {
        return personRepository.findById(id).orElseThrow(() -> new RuntimeException("Person not found: " + id));
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    public PersonDto.DetailResponse create(PersonDto.Request req) {
        Person p = new Person();
        applyRequest(p, req);
        return mapper.toPersonDetail(personRepository.save(p));
    }

    public PersonDto.DetailResponse update(UUID id, PersonDto.Request req) {
        Person p = getEntity(id);
        applyRequest(p, req);
        return mapper.toPersonDetail(personRepository.save(p));
    }

    public void delete(UUID id) {
        // Companion tables + Telegram sessions have no cascade from Person
        companionMessageRepository.deleteByPersonId(id);
        companionConfigRepository.deleteByPersonId(id);
        telegramSessionRepository.deleteByPersonId(id);
        // Person is inverse side of media/collection person joins — clear by hand
        personRepository.clearMediaLinks(id);
        personRepository.clearCollectionLinks(id);
        // their rows in old rankings stay, as the nick written in the sheet
        rankingEntryRepository.detachPerson(id);
        // the briefs Mystic kept here go with them (Mystic itself is told by the controller)
        mysticBriefRepository.deleteByPersonId(id);
        // Entity cascade handles contacts, archives(+messages), facts, episodes, chapters, traits
        personRepository.deleteById(id);
    }

    // ── Contacts ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PersonDto.ContactResponse> getContacts(UUID personId) {
        return contactRepository.findByPersonId(personId).stream().map(mapper::toContactResponse).toList();
    }

    public PersonDto.ContactResponse addContact(UUID personId, PersonDto.ContactRequest req) {
        Person p = getEntity(personId);
        PersonContact c = new PersonContact();
        c.setPerson(p);
        c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        c.setIdentifier(req.getIdentifier());
        c.setDisplayName(req.getDisplayName());
        c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepository.save(c));
    }

    public PersonDto.ContactResponse updateContact(UUID contactId, PersonDto.ContactRequest req) {
        PersonContact c = contactRepository.findById(contactId)
            .orElseThrow(() -> new RuntimeException("Contact not found: " + contactId));
        if (req.getPlatform() != null) c.setPlatform(PersonContact.Platform.valueOf(req.getPlatform()));
        if (req.getIdentifier() != null) c.setIdentifier(req.getIdentifier());
        if (req.getDisplayName() != null) c.setDisplayName(req.getDisplayName());
        if (req.getNotes() != null) c.setNotes(req.getNotes());
        return mapper.toContactResponse(contactRepository.save(c));
    }

    public void deleteContact(UUID contactId) {
        contactRepository.deleteById(contactId);
    }

    /** A full date sets all three parts; parts alone (day+month, or a year) are kept as given, and make the full
     *  date once all three are known. A part that no longer agrees with the full date drops the full date. */
    static void applyBirthday(Person p, PersonDto.Request req) {
        if (req.getDateOfBirth() != null) {
            LocalDate d = req.getDateOfBirth();
            p.setDateOfBirth(d); p.setBirthDay(d.getDayOfMonth()); p.setBirthMonth(d.getMonthValue()); p.setBirthYear(d.getYear());
            return;
        }
        if (req.getBirthDay() == null && req.getBirthMonth() == null && req.getBirthYear() == null) return;
        Integer dd = part(req.getBirthDay(), p.getBirthDay()), mm = part(req.getBirthMonth(), p.getBirthMonth()), yy = part(req.getBirthYear(), p.getBirthYear());
        if (dd != null && (dd < 1 || dd > 31)) throw new IllegalArgumentException("birthDay must be 1-31");
        if (mm != null && (mm < 1 || mm > 12)) throw new IllegalArgumentException("birthMonth must be 1-12");
        if (yy != null && (yy < 1900 || yy > 2100)) throw new IllegalArgumentException("birthYear must be 1900-2100");
        if (dd != null && mm != null) {
            try { MonthDay.of(mm, dd); } catch (DateTimeException e) { throw new IllegalArgumentException("no such day: " + dd + "/" + mm); }
        }
        LocalDate full = null;
        if (dd != null && mm != null && yy != null) {
            try { full = LocalDate.of(yy, mm, dd); } catch (DateTimeException e) { throw new IllegalArgumentException("no such date: " + dd + "/" + mm + "/" + yy); }
        }
        p.setBirthDay(dd); p.setBirthMonth(mm); p.setBirthYear(yy);
        p.setDateOfBirth(full);
    }

    /** where a birth time without a zone was most likely kept */
    static final String DEFAULT_ZONE = "Asia/Ho_Chi_Minh";

    /** Gender, the birth time and the birthplace. "" clears; the time and the place each go as a group: clearing the
     *  time clears its zone, offset and approx flag, clearing the place clears its coordinates. The UTC offset is
     *  worked out from the zone for that date and time unless one is given (a northern birth before 1975 written in
     *  Asia/Ho_Chi_Minh, which follows the South, can be given 420 by hand). */
    static void applyBirthDetails(Person p, PersonDto.Request req, boolean dateChanged) {
        if (req.getGender() != null) {
            String g = req.getGender().trim().toUpperCase();
            if (g.isEmpty()) p.setGender(null);
            else try { p.setGender(Person.Gender.valueOf(g)); } catch (IllegalArgumentException e) { throw new IllegalArgumentException("gender must be MALE or FEMALE"); }
        }
        boolean timeChanged = false;
        if (req.getBirthTime() != null) {
            String t = req.getBirthTime().trim();
            if (t.isEmpty()) {
                p.setBirthTime(null); p.setBirthTimeApprox(false); p.setBirthTimeZone(null); p.setBirthUtcOffsetMinutes(null);
            } else {
                try { p.setBirthTime(LocalTime.parse(t.matches("\\d:\\d\\d.*") ? "0" + t : t).withSecond(0).withNano(0)); }
                catch (DateTimeException e) { throw new IllegalArgumentException("birthTime must be HH:mm"); }
                timeChanged = true;
            }
        }
        if (p.getBirthTime() != null) {
            if (req.getBirthTimeApprox() != null) p.setBirthTimeApprox(req.getBirthTimeApprox());
            if (req.getBirthTimeZone() != null) {
                String z = req.getBirthTimeZone().trim();
                if (!z.isEmpty()) try { ZoneId.of(z); } catch (DateTimeException e) { throw new IllegalArgumentException("unknown time zone: " + z); }
                p.setBirthTimeZone(z.isEmpty() ? null : z);
                timeChanged = true;
            }
            if (p.getBirthTimeZone() == null) p.setBirthTimeZone(DEFAULT_ZONE);
            if (req.getBirthUtcOffsetMinutes() != null) {
                int o = req.getBirthUtcOffsetMinutes();
                if (o < -720 || o > 840) throw new IllegalArgumentException("birthUtcOffsetMinutes must be between -720 and 840");
                p.setBirthUtcOffsetMinutes(o);
            } else if (timeChanged || dateChanged || p.getBirthUtcOffsetMinutes() == null) {
                p.setBirthUtcOffsetMinutes(offsetOf(p));
            }
        }
        if (req.getBirthPlace() != null) {
            String place = req.getBirthPlace().trim();
            if (place.isEmpty()) { p.setBirthPlace(null); p.setBirthLatitude(null); p.setBirthLongitude(null); }
            else p.setBirthPlace(place);
        }
        if (req.getBirthLatitude() != null) {
            if (Math.abs(req.getBirthLatitude()) > 90) throw new IllegalArgumentException("birthLatitude must be between -90 and 90");
            p.setBirthLatitude(req.getBirthLatitude());
        }
        if (req.getBirthLongitude() != null) {
            if (Math.abs(req.getBirthLongitude()) > 180) throw new IllegalArgumentException("birthLongitude must be between -180 and 180");
            p.setBirthLongitude(req.getBirthLongitude());
        }
    }

    /** the zone's offset at the moment of birth, in minutes; null without a full date */
    static Integer offsetOf(Person p) {
        if (p.getBirthTime() == null || p.getBirthTimeZone() == null || p.getDateOfBirth() == null) return null;
        try {
            return ZoneId.of(p.getBirthTimeZone()).getRules().getOffset(LocalDateTime.of(p.getDateOfBirth(), p.getBirthTime())).getTotalSeconds() / 60;
        } catch (DateTimeException e) {
            return null;
        }
    }

    /** null = not sent (keep), 0 = clear */
    private static Integer part(Integer given, Integer current) {
        if (given == null) return current;
        return given == 0 ? null : given;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private void applyRequest(Person p, PersonDto.Request req) {
        if (req.getName() != null) p.setName(req.getName());
        if (req.getDisplayName() != null) p.setDisplayName(req.getDisplayName());
        if (req.getAlternativeName() != null) p.setAlternativeName(req.getAlternativeName());
        if (req.getNickname() != null) p.setNickname(req.getNickname());
        LocalDate before = p.getDateOfBirth();
        applyBirthday(p, req);
        applyBirthDetails(p, req, !Objects.equals(before, p.getDateOfBirth()));
        if (req.getBio() != null) p.setBio(req.getBio());
        if (req.getRelationshipType() != null) p.setRelationshipType(req.getRelationshipType());
        if (req.getPeriod() != null) p.setPeriod(req.getPeriod());
        if (req.getFirstMet() != null) p.setFirstMet(req.getFirstMet());
        if (req.getHowWeMet() != null) p.setHowWeMet(req.getHowWeMet());
        if (req.getSong() != null) p.setSong(req.getSong());
        if (req.getIsSelf() != null) p.setIsSelf(req.getIsSelf());
        if (req.getIsFavorite() != null) p.setIsFavorite(req.getIsFavorite());
        if (req.getIsFeatured() != null) p.setIsFeatured(req.getIsFeatured());
        if (req.getTagIds() != null) {
            p.setTags(new HashSet<>(tagRepository.findAllById(req.getTagIds())));
        }
        if (req.getAvatarMediaFileId() != null)
            p.setAvatarMediaFile(mediaFileRepository.findById(req.getAvatarMediaFileId())
                .orElseThrow(() -> new IllegalArgumentException("Media file not found: " + req.getAvatarMediaFileId())));
    }
}
