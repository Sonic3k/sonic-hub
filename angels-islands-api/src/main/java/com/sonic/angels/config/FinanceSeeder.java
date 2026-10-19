package com.sonic.angels.config;

import com.sonic.angels.model.entity.AppSetting;
import com.sonic.angels.model.entity.FinanceAccount;
import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceCategory.BudgetGroup;
import com.sonic.angels.model.entity.FinanceCategory.Kind;
import com.sonic.angels.model.entity.FinanceFacet;
import com.sonic.angels.model.entity.FinanceRule;
import com.sonic.angels.model.entity.FinanceRule.Direction;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.repository.AppSettingRepository;
import com.sonic.angels.repository.FinanceAccountRepository;
import com.sonic.angels.repository.FinanceCategoryRepository;
import com.sonic.angels.repository.FinanceFacetRepository;
import com.sonic.angels.repository.FinanceRuleRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.service.FinanceClassifier;
import com.sonic.angels.service.FinanceTags;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.sonic.angels.util.FinanceText;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * First start of the finance module: the five places Ngọc Anh's money sits, a Vietnamese set of categories, and
 * rules for the merchants and words that come up most. Each part is written only while its table is empty, so
 * nothing he changed is ever overwritten; the three system categories are re-created if they went missing.
 * It runs once every bean is ready but before the web server opens (an ApplicationRunner would run after, and the
 * first requests could find the data half upgraded) — and after EnumCheckConstraintFixer has widened the enum checks.
 */
@Component
public class FinanceSeeder implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(FinanceSeeder.class);

    private final FinanceAccountRepository accounts;
    private final FinanceCategoryRepository categories;
    private final FinanceRuleRepository rules;
    private final FinanceFacetRepository facets;
    private final FinanceTransactionRepository txns;
    private final AppSettingRepository settings;
    private final FinanceClassifier classifier;
    private final TransactionTemplate tx;

    static final String SEED_VERSION = "finance.seed.version";

    public FinanceSeeder(FinanceAccountRepository accounts, FinanceCategoryRepository categories, FinanceRuleRepository rules,
                         FinanceFacetRepository facets, FinanceTransactionRepository txns, AppSettingRepository settings,
                         FinanceClassifier classifier, PlatformTransactionManager txManager) {
        this.accounts = accounts; this.categories = categories; this.rules = rules; this.facets = facets; this.txns = txns;
        this.settings = settings; this.classifier = classifier;
        this.tx = new TransactionTemplate(txManager);
    }

    @Override
    public void afterSingletonsInstantiated() {
        try { tx.executeWithoutResult(s -> { seed(); upgrade(); }); }
        catch (Exception e) { log.warn("Finance defaults not seeded: {}", e.getMessage()); }
    }

    /**
     * Changes after the first start, each made once (the version is remembered), so what is changed by hand later
     * stays changed. 2: merchants seen in TPBank statements (card merchants, QR shops, bills).
     * 3: facets — the categories become the tags of "Hạng mục", beside "Với ai", "Dạng" and "Dịp"; every rule and every
     * decided line carries its category as a tag; subscriptions and games are also "Digital". Nothing is deleted.
     */
    private void upgrade() {
        int version = settings.findById(SEED_VERSION).map(AppSetting::getValue).map(v -> {
            try { return Integer.parseInt(v.trim()); } catch (NumberFormatException e) { return 1; }
        }).orElse(1);
        if (version < 2) {
            addWords("mua-sam", "wincommerce|winmart");
            addWords("hoa-don", "evnhn|dien evnhn|vtlbilling|payoo|truc tuyen cong dong viet");
            addWords("dang-ky", "google|youtube premium|bunnycdn|proton|amazon web|aws");
            addWords("giai-tri", "steamgames");
            addWords("di-lai", "green sm");
            addWords("an-uong", "cj bakery|tous les jours|ramen|may ban hang tu dong");
            addWords("suc-khoe", "pharmacy|y duoc");
            version(2);
        }
        if (version < 3) {
            FinanceFacet main = facet(FinanceFacet.MAIN, "Hạng mục", "🗂️", 0, true, false);
            FinanceFacet who = facet("voi-ai", "Với ai", "👥", 10, false, true);
            FinanceFacet form = facet("dang", "Dạng", "🧩", 20, false, false);
            FinanceFacet occasion = facet("dip", "Dịp", "🎉", 30, false, true);
            for (FinanceCategory c : categories.findAll()) if (c.getFacet() == null) c.setFacet(main);
            tag(who, "ban-than", "Bản thân", "🙋", 10);
            tag(who, "vo", "Vợ", "💑", 20);
            tag(who, "con", "Con", "👶", 30);
            tag(who, "bo-me", "Bố mẹ", "👵", 40);
            tag(who, "ho-hang", "Họ hàng", "🏡", 50);
            tag(who, "ban-be", "Bạn bè", "🍻", 60);
            tag(who, "dong-nghiep", "Đồng nghiệp", "💼", 70);
            FinanceCategory digital = tag(form, "digital", "Digital", "💾", 10);
            tag(form, "do-vat", "Đồ vật", "📦", 20);
            tag(occasion, "tet", "Tết", "🧧", 10);
            tag(occasion, "sinh-nhat", "Sinh nhật", "🎂", 20);
            for (FinanceRule r : rules.findAll()) if (r.getCategory() != null && r.getTags().isEmpty()) r.getTags().add(r.getCategory());
            List<FinanceRule> digitalRules = new ArrayList<>();
            if (digital.getFacet() != null && digital.getFacet().getId().equals(form.getId())) {
                FinanceRule subs = addTag("dang-ky", digital);
                if (subs != null) digitalRules.add(subs);
                if (categories.findByCode("giai-tri").isPresent()) {
                    FinanceRule games = rule("steam|steamgames|steampowered|playstation|nintendo|xbox|epic games|garena|riot games",
                        Direction.OUT, "giai-tri", null, 95);
                    if (games != null) { games.getTags().add(digital); digitalRules.add(games); }
                }
            }
            int n = 0, d = 0;
            for (FinanceTransaction t : txns.categorizedWithoutTags(FinanceTransaction.Kind.TRANSFER)) { FinanceTags.settle(t); n++; }
            // lines those rules placed before they gave Digital get it too — only where the rule's category is the line's
            for (FinanceTransaction t : txns.allExcept(FinanceTransaction.Source.SYSTEM)) {
                if (t.getKind() == FinanceTransaction.Kind.TRANSFER || t.getCategory() == null) continue;
                for (FinanceRule r : digitalRules) {
                    if (r.getCategory() == null || !r.getCategory().getId().equals(t.getCategory().getId()) || !classifier.fits(t, r)) continue;
                    if (FinanceTags.add(t, List.of(digital), FinanceTransaction.By.RULE)) { FinanceTags.settle(t); d++; }
                    break;
                }
            }
            version(3);
            log.info("Finance: facets set up, {} decided line(s) now carry their category as a tag, {} also Digital", n, d);
        }
    }

    private void version(int v) {
        AppSetting s = settings.findById(SEED_VERSION).orElseGet(() -> new AppSetting(SEED_VERSION, ""));
        s.setValue(String.valueOf(v));
        settings.save(s);
        log.info("Finance: built-in data upgraded to {}", v);
    }

    private FinanceFacet facet(String code, String name, String icon, int sort, boolean main, boolean perTransaction) {
        FinanceFacet f = facets.findByCode(code).orElse(null);
        if (f != null) return f;
        f = new FinanceFacet();
        f.setCode(code); f.setName(name); f.setIcon(icon); f.setSortOrder(sort); f.setMain(main); f.setPerTransaction(perTransaction);
        f.setSystem(main);
        return facets.save(f);
    }

    /** A tag of a facet; one with that code already (made by hand) is left as it is. */
    private FinanceCategory tag(FinanceFacet facet, String code, String name, String icon, int sort) {
        FinanceCategory c = categories.findByCode(code).orElse(null);
        if (c != null) return c;
        c = new FinanceCategory();
        c.setCode(code); c.setName(name); c.setIcon(icon); c.setKind(Kind.ANY); c.setSortOrder(sort); c.setFacet(facet);
        return categories.save(c);
    }

    /** The built-in rule of that category also gives this tag; that rule, if there is one. */
    private FinanceRule addTag(String categoryCode, FinanceCategory tag) {
        FinanceRule r = rules.findAllByOrderByPriorityAscCreatedAtAsc().stream()
            .filter(x -> x.getOrigin() == FinanceRule.Origin.SEED && x.getCategory() != null && categoryCode.equals(x.getCategory().getCode()))
            .findFirst().orElse(null);
        if (r != null) r.getTags().add(tag);
        return r;
    }

    /** The built-in rule of that category gets these words too (those it lacks). */
    private void addWords(String categoryCode, String words) {
        FinanceRule r = rules.findAllByOrderByPriorityAscCreatedAtAsc().stream()
            .filter(x -> x.getOrigin() == FinanceRule.Origin.SEED && x.getCategory() != null && categoryCode.equals(x.getCategory().getCode()))
            .findFirst().orElse(null);
        if (r == null) return;
        Set<String> have = new LinkedHashSet<>(FinanceText.keywords(r.getKeywords()));
        StringBuilder kw = new StringBuilder(r.getKeywords());
        for (String w : words.split("\\|")) {
            if (have.add(FinanceText.normalize(w))) kw.append('|').append(w);
        }
        if (kw.length() <= 1000) r.setKeywords(kw.toString());
    }

    private void seed() {
        boolean freshCategories = categories.count() == 0;
        if (freshCategories) {
            cat("an-uong", "Ăn uống", "🍜", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 10);
            cat("ca-phe", "Cà phê", "☕", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 20);
            cat("di-lai", "Đi lại", "🛵", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 30);
            cat("mua-sam", "Mua sắm", "🛍️", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 40);
            cat("giai-tri", "Giải trí", "🎮", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 50);
            cat("suc-khoe", "Sức khỏe", "💊", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 60);
            cat("qua-hieu-hi", "Quà & hiếu hỉ", "🎁", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 70);
            cat("gia-dinh", "Gia đình", "👪", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 80);
            cat("hoc-tap", "Học tập", "📚", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 90);
            cat("du-lich", "Du lịch", "✈️", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 100);
            cat("hoa-don", "Hóa đơn & dịch vụ", "💡", Kind.EXPENSE, BudgetGroup.FIXED, 110);
            cat("nha-o", "Nhà ở", "🏠", Kind.EXPENSE, BudgetGroup.FIXED, 120);
            cat("dang-ky", "Đăng ký dịch vụ", "🔁", Kind.EXPENSE, BudgetGroup.FIXED, 130);
            cat("phi-ngan-hang", "Phí ngân hàng", "🏦", Kind.EXPENSE, BudgetGroup.FIXED, 140);
            cat("tiet-kiem", "Tiết kiệm & đầu tư", "🌱", Kind.EXPENSE, BudgetGroup.SAVING, 150);
            cat("khac", "Khác", "📦", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 160);
            cat("luong", "Lương", "💼", Kind.INCOME, null, 10);
            cat("thuong", "Thưởng", "🎉", Kind.INCOME, null, 20);
            cat("lai-hoan-tien", "Lãi & hoàn tiền", "💰", Kind.INCOME, null, 30);
            cat("thu-khac", "Thu khác", "➕", Kind.INCOME, null, 40);
        }
        // the ones the code relies on — always there
        if (!categories.existsByCode(FinanceCategory.CASH)) cat(FinanceCategory.CASH, "Tiền mặt lặt vặt", "💵", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 170).setSystem(true);
        if (!categories.existsByCode(FinanceCategory.UNKNOWN_EXPENSE)) cat(FinanceCategory.UNKNOWN_EXPENSE, "Chi chưa rõ", "❔", Kind.EXPENSE, BudgetGroup.FLEXIBLE, 180).setSystem(true);
        if (!categories.existsByCode(FinanceCategory.UNKNOWN_INCOME)) cat(FinanceCategory.UNKNOWN_INCOME, "Thu chưa rõ", "❔", Kind.INCOME, null, 50).setSystem(true);

        Map<String, FinanceAccount> acc = new HashMap<>();
        if (accounts.count() == 0) {
            acc.put("tpbank", account("TPBank", "TPBank", FinanceAccount.Mode.FEED, "VND", "#5E2B97", 1));
            acc.put("tcb", account("Techcombank", "Techcombank", FinanceAccount.Mode.RECONCILE, "VND", "#E2231A", 2));
            acc.put("momo", account("MoMo", "MoMo", FinanceAccount.Mode.RECONCILE, "VND", "#A50064", 3));
            acc.put("boa", account("Bank of America", "BoA", FinanceAccount.Mode.RECONCILE, "USD", "#012169", 4));
            acc.put("cash", account("Tiền mặt", "Cash", FinanceAccount.Mode.POOL, "VND", "#6B7B3A", 5));
            log.info("Finance: seeded 5 accounts");
        }

        if (rules.count() == 0 && !acc.isEmpty()) {
            rule("atm|rut tien|rút tiền|rut tm|rtm|rut tien mat|cash withdrawal", Direction.OUT, null, acc.get("cash"), 50);
            rule("momo|vi momo|ví momo|nap momo|nạp momo|m service|mservice", Direction.ANY, null, acc.get("momo"), 50);
            rule("grabfood|grab food|shopeefood|shopee food|baemin|befood|be food", Direction.OUT, "an-uong", null, 90);
            rule("cafe|cà phê|ca phe|caphe|coffee|highlands|starbucks|phúc long|phuc long|katinat|cộng cà phê|cong caphe|trà sữa|tra sua|the coffee house|trung nguyen|trung nguyên",
                Direction.OUT, "ca-phe", null, 100);
            rule("ăn sáng|an sang|ăn trưa|an trua|ăn tối|an toi|ăn vặt|an vat|ăn uống|an uong|ăn cơm|an com|cơm tấm|com tam|cơm rang|com rang|cơm gà|com ga|cơm văn phòng|com van phong|phở bò|pho bo|phở gà|pho ga|ăn phở|an pho|bún|bun cha|bún chả|bánh mì|banh mi|ăn lẩu|an lau|đi nhậu|di nhau|bia hơi|bia hoi|nhà hàng|nha hang|restaurant|kfc|lotteria|jollibee|mcdonald|pizza|gogi|haidilao|quán ăn|quan an",
                Direction.OUT, "an-uong", null, 100);
            rule("grab|xanh sm|gsm|be group|gojek|taxi|xăng|xang|xang dau|petrolimex|pvoil|gửi xe|gui xe|vé xe|ve xe|vetc|epass|đỗ xe|do xe|parking|rửa xe|rua xe|sửa xe|sua xe",
                Direction.OUT, "di-lai", null, 100);
            rule("vietjet|vietnam airlines|bamboo airways|vietravel|agoda|booking com|traveloka|airbnb|khách sạn|khach san|hotel|homestay",
                Direction.OUT, "du-lich", null, 100);
            rule("shopee|lazada|tiki|tiktok shop|sendo|uniqlo|zara|winmart|vinmart|bach hoa xanh|bách hóa xanh|coopmart|circle k|gs25|7 eleven|ministop|aeon|go mall|dien may xanh|điện máy xanh|thegioididong|cellphones|fpt shop|ikea",
                Direction.OUT, "mua-sam", null, 100);
            rule("evn|tiền điện|tien dien|tiền nước|tien nuoc|nuoc sach|internet|wifi|fpt telecom|viettel|vnpt|mobifone|vinaphone|cước phí|cuoc phi|cước điện thoại|cuoc dien thoai|nap dien thoai|nạp điện thoại|nạp đt|nap dt|truyền hình|truyen hinh|phí quản lý|phi quan ly|phí chung cư|phi chung cu",
                Direction.OUT, "hoa-don", null, 100);
            rule("netflix|spotify|youtube premium|google one|google play|icloud|apple com|apple|claude|anthropic|openai|chatgpt|railway|github|microsoft|adobe|canva|backblaze|bunny net|bunnycdn|grok|x premium",
                Direction.OUT, "dang-ky", null, 100);
            rule("cgv|lotte cinema|bhd|galaxy cinema|beta cinemas|steam|playstation|nintendo|karaoke|bida",
                Direction.OUT, "giai-tri", null, 100);
            rule("nhà thuốc|nha thuoc|pharmacity|long châu|long chau|an khang|bệnh viện|benh vien|phòng khám|phong kham|nha khoa|vinmec|khám bệnh|kham benh|mua thuốc|mua thuoc|tiền thuốc|tien thuoc",
                Direction.OUT, "suc-khoe", null, 100);
            rule("quà tặng|qua tang|mua quà|mua qua|mừng cưới|mung cuoi|đám cưới|dam cuoi|đám hiếu|dam hieu|đám ma|phúng viếng|phung vieng|sinh nhật|sinh nhat|lì xì|li xi|mừng tuổi|mung tuoi|mừng thọ|mung tho",
                Direction.OUT, "qua-hieu-hi", null, 100);
            rule("mua sách|mua sach|nhà sách|nha sach|fahasa|udemy|coursera|học phí|hoc phi|khoá học|khoa hoc",
                Direction.OUT, "hoc-tap", null, 100);
            rule("phí dịch vụ|phi dich vu|phí thường niên|phi thuong nien|phí duy trì|phi duy tri|phí sms|phi sms|annual fee|service fee|phi chuyen tien",
                Direction.OUT, "phi-ngan-hang", null, 100);
            rule("gửi tiết kiệm|gui tiet kiem|tiết kiệm|tiet kiem|mo so tiet kiem|chứng chỉ quỹ|chung chi quy|đầu tư|dau tu",
                Direction.OUT, "tiet-kiem", null, 100);
            rule("trả lương|tra luong|tiền lương|tien luong|lương tháng|luong thang|salary|payroll",
                Direction.IN, "luong", null, 100);
            rule("tiền thưởng|tien thuong|thưởng tết|thuong tet|bonus",
                Direction.IN, "thuong", null, 100);
            rule("lãi tiền gửi|lai tien gui|trả lãi|tra lai|tất toán|tat toan|interest|hoàn tiền|hoan tien|cashback|refund",
                Direction.IN, "lai-hoan-tien", null, 100);
            log.info("Finance: seeded rules");
        }
    }

    private FinanceCategory cat(String code, String name, String icon, Kind kind, BudgetGroup group, int sort) {
        FinanceCategory c = new FinanceCategory();
        c.setCode(code); c.setName(name); c.setIcon(icon); c.setKind(kind); c.setBudgetGroup(group); c.setSortOrder(sort);
        facets.findFirstByMainTrue().ifPresent(c::setFacet);
        return categories.save(c);
    }

    private FinanceAccount account(String name, String institution, FinanceAccount.Mode mode, String currency, String color, int sort) {
        FinanceAccount a = new FinanceAccount();
        a.setName(name); a.setInstitution(institution); a.setMode(mode); a.setCurrency(currency); a.setColor(color); a.setSortOrder(sort);
        return accounts.save(a);
    }

    private FinanceRule rule(String keywords, Direction dir, String categoryCode, FinanceAccount transferTo, int priority) {
        FinanceRule r = new FinanceRule();
        r.setKeywords(keywords);
        r.setDirection(dir);
        r.setPriority(priority);
        r.setOrigin(FinanceRule.Origin.SEED);
        if (transferTo != null) r.setTransferAccount(transferTo);
        else {
            FinanceCategory c = categories.findByCode(categoryCode).orElse(null);
            if (c == null) return null;
            r.setCategory(c);
            r.getTags().add(c);
        }
        return rules.save(r);
    }
}
