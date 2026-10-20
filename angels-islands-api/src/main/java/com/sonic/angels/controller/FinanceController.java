package com.sonic.angels.controller;

import com.sonic.angels.model.dto.FinanceDto;
import com.sonic.angels.service.FinanceIngestService;
import com.sonic.angels.service.FinanceReportService;
import com.sonic.angels.service.FinanceService;
import com.sonic.angels.service.FinanceStatementService;
import com.sonic.angels.util.FinanceText;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    private final FinanceStatementService statements;

    public FinanceController(FinanceService finance, FinanceReportService reports, FinanceIngestService ingest,
                             FinanceStatementService statements) {
        this.finance = finance; this.reports = reports; this.ingest = ingest; this.statements = statements;
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

    // ── facets, tags (the main facet's are the categories) and rules ──

    @GetMapping("/facets")
    public List<FinanceDto.Facet> facets() { return finance.facets(); }

    @PostMapping("/facets")
    public FinanceDto.Facet createFacet(@RequestBody FinanceDto.FacetRequest req) { return finance.createFacet(req); }

    @PutMapping("/facets/{id}")
    public FinanceDto.Facet updateFacet(@PathVariable UUID id, @RequestBody FinanceDto.FacetRequest req) { return finance.updateFacet(id, req); }

    @DeleteMapping("/facets/{id}")
    public ResponseEntity<Void> deleteFacet(@PathVariable UUID id) { finance.deleteFacet(id); return ResponseEntity.noContent().build(); }

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

    /** One rule over every line it fits, decided ones too (what he chose himself stays). */
    @PostMapping("/rules/{id}/apply")
    public FinanceDto.Applied applyRule(@PathVariable UUID id) { return finance.applyRule(id); }

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

    /** Tags on and off many lines at once. */
    @PostMapping("/transactions/tags")
    public FinanceDto.Applied tags(@RequestBody FinanceDto.TagsRequest req) { return finance.tags(req); }

    // ── counterparties: one decision for everyone with the same name ──

    @GetMapping("/counterparties")
    public List<FinanceDto.CounterpartyGroup> counterparties(@RequestParam(defaultValue = "true") boolean waiting) {
        return finance.counterparties(waiting);
    }

    /** Every line with this counterparty, newest first: what one decision for them would touch. */
    @GetMapping("/counterparties/lines")
    public List<FinanceDto.Txn> counterpartyLines(@RequestParam String name) { return finance.counterpartyLines(name); }

    @PostMapping("/counterparties/assign")
    public FinanceDto.Applied assignCounterparty(@RequestBody FinanceDto.AssignRequest req) { return finance.assignCounterparty(req); }

    // ── bank statements (.xlsx from the bank's app) ──

    /** What importing this file would do; nothing is written. */
    @PostMapping(value = "/import/preview", consumes = "multipart/form-data")
    public FinanceDto.ImportSummary previewImport(@RequestParam("file") MultipartFile file, @RequestParam(required = false) UUID accountId) {
        return statements.preview(file, accountId);
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public FinanceDto.ImportSummary importStatement(@RequestParam("file") MultipartFile file, @RequestParam(required = false) UUID accountId) {
        return statements.commit(file, accountId);
    }

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
