package com.sonic.angels.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.sonic.angels.model.dto.TuViDto;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.TuViProfile;
import com.sonic.angels.model.entity.TuViReading;
import com.sonic.angels.repository.PersonRepository;
import com.sonic.angels.repository.TuViProfileRepository;
import com.sonic.angels.repository.TuViReadingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.concurrent.Callable;

/**
 * Tử vi: birth profiles kept for the family, and readings Claude writes from a chart and the lines of grandma's notes
 * the web matched to it (the web draws the chart and does the matching). Grandma's words and the added ones stay apart.
 */
@Service
public class TuViService {

    private static final int MAX_LINES = 400;
    private static final int MAX_TEXT = 1200;
    private static final int MAX_TOKENS = 6000;

    private static final String SYSTEM = """
        Bạn giúp một gia đình đọc lá số tử vi theo ghi chép tử vi của bà (bà ngoại của chủ nhà) để lại.

        Bạn sẽ nhận được:
        - Phạm vi cần luận và năm xem. Ví dụ: "tong-quan" là tổng quan cả lá số; tên một cung như "Quan Lộc" là riêng cung đó; "han-2026" là vận hạn năm 2026.
        - Lá số: dữ liệu lá số đã an sao (các cung, các sao, đại hạn, tiểu hạn…).
        - Các câu đã khớp với lá số, mỗi dòng một câu: [mã] (cung · nguồn) nội dung — why.
          Nguồn "ba" là câu trong ghi chép của bà; nguồn "bo-sung" là câu lấy từ sách khác, không phải của bà.
          Phần why là lý do câu khớp với lá số: sao nào, ở cung nào, miếu hay hãm, có gặp Tuần, Triệt không…

        Bài luận gồm hai lớp, phải tách bạch tuyệt đối.

        Lớp "ba" (lời của bà):
        - Chỉ được tóm lược, sắp xếp, nối ý những câu có nguồn "ba" được đưa vào.
        - Mỗi ý phải kèm "refs": mã của các câu gốc, chép đúng như trong ngoặc vuông.
        - Không thêm bất cứ ý nào không có trong các câu đó, kể cả những điều sách tử vi nào cũng nói.
        - Câu nguồn "bo-sung" không bao giờ được đưa vào lớp "ba".
        - Giữ thuật ngữ của bà.
        - Khi các câu trái nhau thì nói rõ là trái nhau, và nêu yếu tố làm nặng hay nhẹ có trong phần why (miếu hãm, Tuần Triệt…).
        - Nhóm ý nào không có câu nguồn "ba" thì để "ba" là mảng rỗng.

        Lớp "them" (luận giải thêm):
        - Luận giải thêm theo kiến thức tử vi phổ thông, sách khác và hiểu biết của bạn; có thể dựa vào các câu nguồn "bo-sung".
        - Viết như ý kiến bổ sung, không bao giờ gán cho bà (không viết "bà dặn", "theo bà", "theo ghi chép"…).
        - Không lặp lại những gì đã có ở lớp "ba".

        Mỗi section ứng với một nhóm ý: theo cung; hoặc theo tính cách, công danh, tài lộc, gia đạo… khi phạm vi là tổng quan; hoặc theo đại hạn, tiểu hạn khi phạm vi là vận hạn. "title" là tên ngắn của nhóm ý; mỗi ý trong "ba" và "them" là một đoạn ngắn.

        Văn phong: tiếng Việt tự nhiên, ấm áp, mạch lạc. Nói xu hướng chứ không phán định mệnh. Những ý về bệnh tật, tai nạn, chết chóc, con cái, hôn nhân đổ vỡ phải nói nhẹ nhàng, như điều nên lưu tâm. Không đưa lời khuyên y tế, pháp lý, tài chính cụ thể.

        Không bịa sao, vị trí sao, tuổi hay số liệu không có trong dữ liệu lá số.

        "caution": một câu nhắc rằng tử vi chỉ để tham khảo, chiêm nghiệm.

        Chỉ trả về một đối tượng JSON đúng cấu trúc sau, không kèm chữ nào khác (không markdown, không lời dẫn):
        {"sections":[{"title":"…","ba":[{"text":"…","refs":["<mã>"]}],"them":[{"text":"…"}]}],"caution":"…"}""";

    private static final String RETRY = "Trả lời lại, chỉ một đối tượng JSON hợp lệ đúng cấu trúc đã yêu cầu.";

    private final TuViProfileRepository profileRepo;
    private final TuViReadingRepository readingRepo;
    private final PersonRepository personRepo;
    private final AnthropicClient anthropic;
    private final TransactionTemplate tx;
    /** Lets raw line breaks inside strings through (long answers sometimes have them); what is stored is written back strictly. */
    private final ObjectMapper om = JsonMapper.builder().enable(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS).build();

    public TuViService(TuViProfileRepository profileRepo, TuViReadingRepository readingRepo, PersonRepository personRepo,
                       AnthropicClient anthropic, PlatformTransactionManager txManager) {
        this.profileRepo = profileRepo; this.readingRepo = readingRepo; this.personRepo = personRepo;
        this.anthropic = anthropic; this.tx = new TransactionTemplate(txManager);
    }

    // ── profiles ──

    @Transactional(readOnly = true)
    public List<TuViDto.Profile> list() {
        return profileRepo.findAllByOrderByUpdatedAtDesc().stream().map(TuViService::profile).toList();
    }

    @Transactional(readOnly = true)
    public TuViDto.Profile get(UUID id) { return profile(find(id)); }

    @Transactional
    public TuViDto.Profile create(TuViDto.ProfileInput in) {
        TuViProfile p = new TuViProfile();
        apply(p, in);
        return profile(profileRepo.save(p));
    }

    @Transactional
    public TuViDto.Profile update(UUID id, TuViDto.ProfileInput in) {
        TuViProfile p = find(id);
        apply(p, in);
        return profile(profileRepo.saveAndFlush(p));      // flushed, so updatedAt is the new one
    }

    /** The profile and every reading of it. */
    @Transactional
    public void delete(UUID id) {
        readingRepo.deleteByProfileId(id);
        profileRepo.deleteById(id);
    }

    // ── readings ──

    @Transactional(readOnly = true)
    public List<TuViDto.Reading> readings(UUID profileId) {
        if (!profileRepo.existsById(profileId)) throw new NoSuchElementException("Không tìm thấy lá số");
        return readingRepo.findByProfileIdOrderByCreatedAtDesc(profileId).stream()
            .map(r -> reading(r, profileId, json(r.getContent()))).toList();
    }

    @Transactional
    public void deleteReading(UUID id) { readingRepo.deleteById(id); }

    /**
     * Asks Claude for a reading. With a profileId it is stored, in place of the older one of the same scope and year;
     * without, it is only returned. Not @Transactional: the model takes a minute or more, so the checks run in one
     * short transaction and the save in another.
     */
    public TuViDto.Reading generate(TuViDto.ReadingRequest req) {
        if (!anthropic.isConfigured()) throw new IllegalStateException("Chưa cấu hình ANTHROPIC_API_KEY");
        String scope = trimToNull(req.getScope());
        if (scope == null) throw new IllegalArgumentException("Thiếu phạm vi cần luận");
        if (scope.length() > 60) throw new IllegalArgumentException("Phạm vi dài quá 60 ký tự");
        Integer year = req.getViewYear();
        if (year == null || year < 1800 || year > 2200) throw new IllegalArgumentException("Năm xem phải từ 1800 đến 2200");
        int viewYear = year;
        String inputHash = trimToNull(req.getInputHash());
        if (inputHash != null && inputHash.length() > 64) throw new IllegalArgumentException("inputHash dài quá 64 ký tự");
        String chart = trimToNull(req.getChart());
        if (chart == null) throw new IllegalArgumentException("Thiếu dữ liệu lá số");
        List<String> lines = lines(req.getLines());
        UUID profileId = req.getProfileId();
        if (profileId != null && !profileRepo.existsById(profileId)) throw new NoSuchElementException("Không tìm thấy lá số");

        String user = "Phạm vi: " + scope + " (năm xem " + viewYear + ")\n\nLá số:\n" + chart
            + "\n\nCác câu đã khớp:\n" + String.join("\n", lines);
        JsonNode content = ask(user);

        TuViReading r = new TuViReading();
        r.setScope(scope); r.setViewYear(viewYear); r.setInputHash(inputHash); r.setModel(anthropic.getModel());
        r.setContent(content.toString());
        if (profileId == null) return reading(r, null, content);
        return tx.execute(s -> {
            r.setProfile(find(profileId));          // it may have been deleted while the model was writing
            readingRepo.deleteByProfileIdAndScopeAndViewYear(profileId, scope, viewYear);
            return reading(readingRepo.save(r), profileId, content);
        });
    }

    public TuViDto.Status status() {
        TuViDto.Status s = new TuViDto.Status();
        s.setAi(anthropic.isConfigured()); s.setModel(anthropic.getModel());
        return s;
    }

    // ── the model ──

    /** Claude's answer as one JSON object; asked once more when the first answer is not one. */
    private JsonNode ask(String user) {
        String answer = call(() -> anthropic.complete(SYSTEM, user, MAX_TOKENS));
        JsonNode j = jsonObject(answer);
        if (j != null) return j;
        String again = answer == null || answer.isBlank()
            ? call(() -> anthropic.complete(SYSTEM, user, MAX_TOKENS))      // an empty assistant turn is refused by the API
            : call(() -> anthropic.chat(anthropic.getModel(), SYSTEM, List.of(
                Map.of("role", "user", "content", user),
                Map.of("role", "assistant", "content", answer),
                Map.of("role", "user", "content", RETRY)), MAX_TOKENS, null));
        j = jsonObject(again);
        if (j == null) throw new IllegalStateException("AI trả lời không đúng định dạng");
        return j;
    }

    private static String call(Callable<String> request) {
        try {
            return request.call();
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("Không gọi được AI: " + e.getMessage(), e);
        }
    }

    /** The text from the first '{' to the last '}', when it reads as an object with a "sections" list; otherwise null. */
    private JsonNode jsonObject(String answer) {
        if (answer == null) return null;
        int a = answer.indexOf('{'), b = answer.lastIndexOf('}');
        if (a < 0 || b < a) return null;
        try {
            JsonNode j = om.readTree(answer.substring(a, b + 1));
            return j != null && j.isObject() && j.path("sections").isArray() ? j : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /** A stored reading back as JSON; text that no longer parses comes back as a string rather than failing the list. */
    private JsonNode json(String content) {
        try {
            return om.readTree(content);
        } catch (JsonProcessingException e) {
            return om.getNodeFactory().textNode(content);
        }
    }

    /** "[ref] (palace · source) text — why", one per matched line: at most 400, each text cut at 1200 characters. */
    private static List<String> lines(List<TuViDto.Line> in) {
        List<String> out = new ArrayList<>();
        for (TuViDto.Line l : in == null ? List.<TuViDto.Line>of() : in) {
            if (out.size() == MAX_LINES) break;
            String text = l == null ? "" : oneLine(l.getText());
            if (text.isEmpty()) continue;
            if (text.length() > MAX_TEXT) text = text.substring(0, MAX_TEXT - 1) + "…";
            String palace = oneLine(l.getPalace()), source = source(l.getSource()), why = oneLine(l.getWhy());
            out.add("[" + oneLine(l.getRef()) + "] (" + (palace.isEmpty() ? "" : palace + " · ") + source + ") " + text
                + (why.isEmpty() ? "" : " — " + why));
        }
        if (out.isEmpty()) throw new IllegalArgumentException("Không có câu nào đã khớp để luận");
        return out;
    }

    /** "ba" (grandma's notes) or "bo-sung" (other books), nothing else: no line may pass for hers by mistake. */
    private static String source(String s) {
        String v = s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
        if (v.equals("ba") || v.equals("bo-sung")) return v;
        throw new IllegalArgumentException("Nguồn của câu phải là \"ba\" hoặc \"bo-sung\", không phải: " + s);
    }

    private static String oneLine(String s) { return s == null ? "" : s.replaceAll("\\s+", " ").trim(); }

    // ── checking a profile ──

    /** Checks the input, then copies it onto the profile: nothing is changed when something is wrong. */
    private void apply(TuViProfile p, TuViDto.ProfileInput in) {
        String name = trimToNull(in.getName());
        if (name == null) throw new IllegalArgumentException("Chưa nhập tên");
        if (name.length() > 200) throw new IllegalArgumentException("Tên dài quá 200 ký tự");
        TuViProfile.Gender gender = choice(TuViProfile.Gender.class, in.getGender(), null, "giới tính");
        TuViProfile.Calendar calendar = choice(TuViProfile.Calendar.class, in.getCalendar(), null, "loại lịch");
        boolean lunar = calendar == TuViProfile.Calendar.LUNAR;
        int year = range(in.getYear(), 1800, 2200, "Năm sinh phải từ 1800 đến 2200");
        int month = range(in.getMonth(), 1, 12, "Tháng sinh phải từ 1 đến 12");
        int day = lunar ? range(in.getDay(), 1, 30, "Ngày âm lịch phải từ 1 đến 30")
                        : range(in.getDay(), 1, 31, "Ngày dương lịch phải từ 1 đến 31");
        if (!lunar) {
            try {
                LocalDate.of(year, month, day);
            } catch (DateTimeException e) {
                throw new IllegalArgumentException("Không có ngày " + day + "/" + month + "/" + year + " dương lịch");
            }
        }
        int hour = lunar ? range(in.getHour(), 0, 11, "Giờ âm lịch phải từ 0 (Tý) đến 11 (Hợi)")
                         : range(in.getHour(), 0, 23, "Giờ sinh phải từ 0 đến 23");
        Integer minute = in.getMinute() == null ? null : range(in.getMinute(), 0, 59, "Phút sinh phải từ 0 đến 59");
        TuViProfile.Variant variant = choice(TuViProfile.Variant.class, in.getVariant(), TuViProfile.Variant.BA, "cách an sao");
        TuViProfile.LeapRule leapRule = choice(TuViProfile.LeapRule.class, in.getLeapRule(), TuViProfile.LeapRule.SAME, "cách tính tháng nhuận");
        Person person = person(in.getPersonId());

        p.setName(name); p.setGender(gender); p.setCalendar(calendar);
        p.setBirthYear(year); p.setBirthMonth(month); p.setBirthDay(day); p.setLeapMonth(lunar && Boolean.TRUE.equals(in.getLeap()));
        p.setBirthHour(hour); p.setBirthMinute(minute);
        p.setVariant(variant); p.setLeapRule(leapRule); p.setTyNextDay(!Boolean.FALSE.equals(in.getTyNextDay()));
        p.setPerson(person); p.setNote(trimToNull(in.getNote()));
    }

    private static int range(Integer v, int min, int max, String message) {
        if (v == null || v < min || v > max) throw new IllegalArgumentException(message);
        return v;
    }

    /** "nam" → NAM, "split15" → SPLIT15…; blank gives the default, or is refused when there is none. */
    private static <E extends Enum<E>> E choice(Class<E> type, String value, E fallback, String what) {
        if (value == null || value.isBlank()) {
            if (fallback != null) return fallback;
            throw new IllegalArgumentException("Chưa chọn " + what);
        }
        for (E e : type.getEnumConstants()) if (e.name().equalsIgnoreCase(value.trim())) return e;
        throw new IllegalArgumentException("Giá trị " + what + " không hợp lệ: " + value);
    }

    private Person person(String personId) {
        String v = trimToNull(personId);
        if (v == null) return null;
        UUID id;
        try {
            id = UUID.fromString(v);
        } catch (IllegalArgumentException e) {
            throw new NoSuchElementException("Không tìm thấy người");
        }
        return personRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy người"));
    }

    private TuViProfile find(UUID id) {
        return profileRepo.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy lá số"));
    }

    // ── mapping ──

    private static TuViDto.Profile profile(TuViProfile p) {
        TuViDto.Profile d = new TuViDto.Profile();
        d.setId(p.getId()); d.setName(p.getName()); d.setGender(code(p.getGender())); d.setCalendar(code(p.getCalendar()));
        d.setYear(p.getBirthYear()); d.setMonth(p.getBirthMonth()); d.setDay(p.getBirthDay()); d.setLeap(p.isLeapMonth());
        d.setHour(p.getBirthHour()); d.setMinute(p.getBirthMinute());
        d.setVariant(code(p.getVariant())); d.setLeapRule(code(p.getLeapRule())); d.setTyNextDay(p.isTyNextDay());
        Person person = p.getPerson();
        if (person != null) {
            d.setPersonId(person.getId().toString());
            String display = person.getDisplayName();
            d.setPersonName(display != null && !display.isBlank() ? display : person.getName());
        }
        d.setNote(p.getNote()); d.setCreatedAt(p.getCreatedAt()); d.setUpdatedAt(p.getUpdatedAt());
        return d;
    }

    /** id and createdAt stay null for a reading that was never stored. */
    private static TuViDto.Reading reading(TuViReading r, UUID profileId, JsonNode content) {
        TuViDto.Reading d = new TuViDto.Reading();
        d.setId(r.getId()); d.setProfileId(profileId); d.setScope(r.getScope()); d.setViewYear(r.getViewYear());
        d.setInputHash(r.getInputHash()); d.setModel(r.getModel()); d.setContent(content); d.setCreatedAt(r.getCreatedAt());
        return d;
    }

    private static String code(Enum<?> e) { return e == null ? null : e.name().toLowerCase(Locale.ROOT); }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
