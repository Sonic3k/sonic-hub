package com.sonic.angels.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.By;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Status;
import com.sonic.angels.repository.FinanceCategoryRepository;
import com.sonic.angels.repository.FinanceTransactionRepository;
import com.sonic.angels.util.FinanceText;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Guesses the category of a transaction no rule knew, with DeepSeek (the same key the companion uses).
 * A sure guess (confidence ≥ 0.8) is taken as it is; a less sure one stays in review, pre-filled, so one tap confirms it.
 * Runs after the transaction is committed, off the request thread; without a key it does nothing.
 */
@Service
public class FinanceAiService {

    private static final Logger log = LoggerFactory.getLogger(FinanceAiService.class);
    private static final double SURE = 0.8;

    private static final String SYSTEM = """
        Bạn phân loại giao dịch tài chính cá nhân của một người ở Hà Nội, Việt Nam.
        Chọn đúng MỘT mã hạng mục trong danh sách được cho. Tiền ra thường là CHI; tiền vào thường là THU,
        trừ khi rõ là hoàn tiền cho một khoản chi (khi đó chọn hạng mục chi đó).
        Chuyển khoản cho một cá nhân mà nội dung không nói gì: chọn "khac" với độ tin cậy thấp.
        Chỉ trả về JSON một dòng: {"code":"<mã>","confidence":<0..1>}""";

    private final FinanceTransactionRepository txnRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final OpenAiCompatClient llm;
    private final String deepseekKey;
    private final TransactionTemplate tx;
    private final ObjectMapper om = new ObjectMapper();

    public FinanceAiService(FinanceTransactionRepository txnRepo, FinanceCategoryRepository categoryRepo, OpenAiCompatClient llm,
                            @Value("${deepseek.api-key:}") String deepseekKey, PlatformTransactionManager txManager) {
        this.txnRepo = txnRepo; this.categoryRepo = categoryRepo; this.llm = llm;
        this.deepseekKey = deepseekKey == null ? "" : deepseekKey.trim();
        this.tx = new TransactionTemplate(txManager);
    }

    public boolean enabled() { return !deepseekKey.isEmpty(); }

    @Async
    public void categorizeLater(UUID transactionId) {
        if (!enabled()) return;
        try { categorize(transactionId); }
        catch (Exception e) { log.warn("Finance AI could not categorize {}: {}", transactionId, e.getMessage()); }
    }

    private void categorize(UUID id) throws Exception {
        Map<String, String> ask = tx.execute(s -> prompt(id));
        if (ask == null) return;
        String answer = llm.chat("https://api.deepseek.com", deepseekKey, "deepseek-chat", SYSTEM,
            List.of(Map.of("role", "user", "content", ask.get("prompt"))), 60, 0f);
        int a = answer.indexOf('{'), b = answer.lastIndexOf('}');
        if (a < 0 || b <= a) return;
        JsonNode j = om.readTree(answer.substring(a, b + 1));
        String code = j.path("code").asText("").trim();
        double confidence = Math.max(0, Math.min(1, j.path("confidence").asDouble(0)));
        tx.executeWithoutResult(s -> {
            FinanceTransaction t = txnRepo.findById(id).orElse(null);
            if (t == null || t.getStatus() != Status.REVIEW || t.getCategorizedBy() == By.USER || t.getKind() == Kind.TRANSFER) return;
            categoryRepo.findByCode(code).filter(c -> !c.isArchived() && c.isMain()).ifPresent(c -> {
                FinanceTags.replace(t, FinanceTags.MAIN, List.of(c), By.AI);
                FinanceTags.settle(t);
                t.setAiConfidence(confidence);
                if (confidence >= SURE) t.setStatus(Status.OK);
            });
        });
    }

    /** What the model is told about one transaction; null when it no longer needs a guess. */
    private Map<String, String> prompt(UUID id) {
        FinanceTransaction t = txnRepo.findById(id).orElse(null);
        if (t == null || t.getStatus() != Status.REVIEW || t.getCategorizedBy() == By.USER || t.getKind() == Kind.TRANSFER) return null;
        String cats = categoryRepo.findAllByOrderByKindAscSortOrderAscNameAsc().stream()
            .filter(c -> !c.isArchived() && !c.isSystem() && c.isMain())
            .map(c -> "- " + c.getCode() + ": " + c.getName() + (c.getKind() == FinanceCategory.Kind.INCOME ? " (THU)" : " (CHI)"))
            .collect(Collectors.joining("\n"));
        var vn = FinanceText.utcToVn(t.getOccurredAt());
        NumberFormat nf = NumberFormat.getIntegerInstance(new Locale("vi", "VN"));
        BigDecimal amt = t.getAmount();
        String text = "Hạng mục:\n" + cats + "\n\nGiao dịch:\n" +
            "- Số tiền: " + (amt.signum() < 0 ? "tiền RA " : "tiền VÀO ") + nf.format(amt.abs()) + " " + t.getAccount().getCurrency() + "\n" +
            "- Tài khoản: " + t.getAccount().getName() + "\n" +
            "- Lúc: " + vn.getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("vi")) + " " + vn.toLocalTime().withSecond(0).withNano(0) + "\n" +
            "- Nội dung: " + Objects.toString(t.getDescription(), "") + "\n" +
            (t.getBankDescription() != null ? "- Mô tả ngân hàng: " + t.getBankDescription() + "\n" : "") +
            (t.getNote() != null ? "- Ghi chú: " + t.getNote() + "\n" : "");
        return Map.of("prompt", text);
    }
}
