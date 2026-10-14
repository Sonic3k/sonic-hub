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
import com.sonic.angels.repository.TuViProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.HashSet;
import java.util.List;
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
    private final TuViProfileRepository tuViProfileRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.sonic.angels.repository.MediaFileRepository mediaFileRepository;

    public PersonService(PersonRepository personRepository, PersonContactRepository contactRepository,
                         TagRepository tagRepository, DtoMapper mapper,
                         CompanionMessageRepository companionMessageRepository,
                         CompanionConfigRepository companionConfigRepository,
                         TelegramCompanionSessionRepository telegramSessionRepository,
                         com.sonic.angels.repository.RankingEntryRepository rankingEntryRepository,
                         TuViProfileRepository tuViProfileRepository) {
        this.personRepository = personRepository;
        this.contactRepository = contactRepository;
        this.tagRepository = tagRepository;
        this.mapper = mapper;
        this.companionMessageRepository = companionMessageRepository;
        this.companionConfigRepository = companionConfigRepository;
        this.telegramSessionRepository = telegramSessionRepository;
        this.rankingEntryRepository = rankingEntryRepository;
        this.tuViProfileRepository = tuViProfileRepository;
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
        // their tử vi charts stay, belonging to no one
        tuViProfileRepository.detachPerson(id);
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
        applyBirthday(p, req);
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
