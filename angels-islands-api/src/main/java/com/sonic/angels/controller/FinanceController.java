package com.sonic.angels.controller;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.service.FinanceIngestService;
import com.sonic.angels.service.FinanceReportService;
import com.sonic.angels.service.FinanceService;
import com.sonic.angels.util.FinanceText;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/** Personal finance: accounts, transactions, quick notes, reports — for sonic-hub-web's "Tiền" and the admin. */
@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService finance;
    private final FinanceReportService reports;
    private final FinanceIngestService ingest;

    public FinanceController(FinanceService finance, FinanceReportService reports, FinanceIngestService ingest) {
        this.finance = finance; this.reports = reports; this.ingest = ingest;
    }

    // ── overview and reports ──

    @GetMapping("/summary")
    public FinanceDto.Summary summary() { return reports.summary(); }

    @GetMapping("/report")
    public FinanceDto.MonthReport report(@RequestParam(required = false) String month) { return reports.month(FinanceText.parseMonth(month)); }

    @GetMapping("/trend")
    public List<FinanceDto.TrendPoint> trend(@RequestParam(defaultValue = "12") int months) { return reports.trend(months); }

    // ── accounts ──

    @GetMapping("/accounts")
    public List<FinanceDto.Account> accounts() { return finance.accounts(); }

    @PostMapping("/accounts")
    public FinanceDto.Account createAccount(@RequestBody FinanceDto.AccountRequest req) { return finance.createAccount(req); }

    @PutMapping("/accounts/{id}")
    public FinanceDto.Account updateAccount(@PathVariable UUID id, @RequestBody FinanceDto.AccountRequest req) { return finance.updateAccount(id, req); }

    @DeleteMapping("/accounts/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable UUID id) { finance.deleteAccount(id); return ResponseEntity.noContent().build(); }

    /** "Chốt số dư" — the balance seen in the app now. */
    @PostMapping("/accounts/{id}/balance")
    public FinanceDto.Account setBalance(@PathVariable UUID id, @RequestBody FinanceDto.BalanceRequest req) { return finance.setBalance(id, req); }

    // ── categories and rules ──

    @GetMapping("/categories")
    public List<FinanceDto.Category> categories() { return finance.categories(); }

    @PostMapping("/categories")
    public FinanceDto.Category createCategory(@RequestBody FinanceDto.CategoryRequest req) { return finance.createCategory(req); }

    @PutMapping("/categories/{id}")
    public FinanceDto.Category updateCategory(@PathVariable UUID id, @RequestBody FinanceDto.CategoryRequest req) { return finance.updateCategory(id, req); }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) { finance.deleteCategory(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/rules")
    public List<FinanceDto.Rule> rules() { return finance.rules(); }

    @PostMapping("/rules")
    public FinanceDto.Rule createRule(@RequestBody FinanceDto.RuleRequest req) { return finance.createRule(req); }

    @PutMapping("/rules/{id}")
    public FinanceDto.Rule updateRule(@PathVariable UUID id, @RequestBody FinanceDto.RuleRequest req) { return finance.updateRule(id, req); }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID id) { finance.deleteRule(id); return ResponseEntity.noContent().build(); }

    /** Run every rule again over the transactions still waiting for review. */
    @PostMapping("/rules/apply")
    public FinanceDto.Applied applyRules() { return finance.applyRules(); }

    // ── transactions ──

    @GetMapping("/transactions")
    public Page<FinanceDto.Txn> transactions(@RequestParam(required = false) String month,
                                             @RequestParam(required = false) String from,
                                             @RequestParam(required = false) String to,
                                             @RequestParam(required = false) UUID accountId,
                                             @RequestParam(required = false) String categoryId,
                                             @RequestParam(required = false) String status,
                                             @RequestParam(required = false) String kind,
                                             @RequestParam(required = false) String q,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return finance.transactions(month, from, to, accountId, categoryId, status, kind, q, page, size);
    }

    /** Everything still waiting for a decision, newest first. */
    @GetMapping("/review")
    public List<FinanceDto.Txn> review() { return finance.review(); }

    @GetMapping("/transactions/{id}")
    public FinanceDto.Txn transaction(@PathVariable UUID id) { return finance.transaction(id); }

    @PostMapping("/transactions")
    public FinanceDto.Txn createTransaction(@RequestBody FinanceDto.TxnRequest req) { return finance.createTransaction(req); }

    @PutMapping("/transactions/{id}")
    public FinanceDto.Txn updateTransaction(@PathVariable UUID id, @RequestBody FinanceDto.TxnRequest req) { return finance.updateTransaction(id, req); }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID id) { finance.deleteTransaction(id); return ResponseEntity.noContent().build(); }

    @PostMapping("/transactions/{id}/confirm")
    public FinanceDto.Txn confirm(@PathVariable UUID id) { return finance.confirm(id); }

    @PostMapping("/transactions/confirm-all")
    public FinanceDto.Applied confirmAll() { return finance.confirmAll(); }

    // ── quick notes ──

    @PostMapping("/notes")
    public FinanceDto.Txn note(@RequestBody FinanceDto.NoteRequest req) { return finance.note(req); }

    @GetMapping("/notes/chips")
    public List<FinanceDto.QuickChip> chips(@RequestParam(defaultValue = "8") int limit) { return finance.chips(limit); }

    // ── settings and the webhook log ──

    @GetMapping("/settings")
    public FinanceDto.Settings settings() { return finance.settings(); }

    @PutMapping("/settings")
    public FinanceDto.Settings updateSettings(@RequestBody FinanceDto.SettingsRequest req) { return finance.updateSettings(req); }

    @GetMapping("/inbound")
    public Page<FinanceDto.Inbound> inbound(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return finance.inbound(page, size);
    }

    /** Process a stored payload again (after a parser fix). */
    @PostMapping("/inbound/{id}/replay")
    public FinanceDto.Inbound replay(@PathVariable UUID id) {
        finance.inboundOne(id);                 // 404 when it does not exist
        ingest.process(id);
        return finance.inboundOne(id);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) { return ResponseEntity.status(404).body(Map.of("error", e.getMessage())); }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) { return ResponseEntity.status(400).body(Map.of("error", e.getMessage())); }
}
