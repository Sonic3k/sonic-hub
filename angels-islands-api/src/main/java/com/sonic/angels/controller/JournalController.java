package com.sonic.angels.controller;

import com.sonic.angels.model.dto.JournalDto;
import com.sonic.angels.model.entity.JournalNote;
import com.sonic.angels.model.entity.Problem;
import com.sonic.angels.repository.JournalNoteRepository;
import com.sonic.angels.repository.ProblemRepository;
import com.sonic.angels.repository.TagRepository;
import com.sonic.angels.service.DtoMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

/** Journal: blog-style notes (rich HTML, inline images) + free-status Problems they link to. */
@RestController
@RequestMapping("/api/journal")
@Transactional
public class JournalController {

    private static final UUID NIL_UUID = new UUID(0, 0);

    private final JournalNoteRepository noteRepo;
    private final ProblemRepository problemRepo;
    private final TagRepository tagRepo;
    private final DtoMapper mapper;

    public JournalController(JournalNoteRepository noteRepo, ProblemRepository problemRepo,
                             TagRepository tagRepo, DtoMapper mapper) {
        this.noteRepo = noteRepo; this.problemRepo = problemRepo;
        this.tagRepo = tagRepo; this.mapper = mapper;
    }

    // ── Notes ────────────────────────────────────────────────────────────────

    @GetMapping("/notes")
    public Page<JournalDto.NoteResponse> notes(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size,
                                               @RequestParam(required = false) String q,
                                               @RequestParam(required = false) UUID problemId,
                                               @RequestParam(required = false) UUID tagId) {
        String query = q != null && !q.isBlank() ? q.trim() : null;
        return noteRepo.search(query,
                problemId != null, problemId != null ? problemId : NIL_UUID,
                tagId != null, tagId != null ? tagId : NIL_UUID,
                PageRequest.of(page, Math.min(size, 100)))
            .map(this::toNoteResponse);
    }

    @GetMapping("/notes/{id}")
    public JournalDto.NoteResponse note(@PathVariable UUID id) {
        return toNoteResponse(noteRepo.findById(id).orElseThrow());
    }

    @PostMapping("/notes")
    public JournalDto.NoteResponse createNote(@RequestBody JournalDto.NoteRequest req) {
        JournalNote n = new JournalNote();
        apply(n, req);
        return toNoteResponse(noteRepo.save(n));
    }

    @PutMapping("/notes/{id}")
    public JournalDto.NoteResponse updateNote(@PathVariable UUID id, @RequestBody JournalDto.NoteRequest req) {
        JournalNote n = noteRepo.findById(id).orElseThrow();
        apply(n, req);
        return toNoteResponse(noteRepo.save(n));
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable UUID id) {
        noteRepo.deleteById(id); // owning side: join rows removed with the entity
        return ResponseEntity.noContent().build();
    }

    private void apply(JournalNote n, JournalDto.NoteRequest req) {
        if (req.getTitle() != null) n.setTitle(req.getTitle().isBlank() ? null : req.getTitle().trim());
        if (req.getContent() != null) n.setContent(req.getContent());
        if (req.getMood() != null) n.setMood(req.getMood().isBlank() ? null : req.getMood().trim());
        if (req.getProblemIds() != null) n.setProblems(new HashSet<>(problemRepo.findAllById(req.getProblemIds())));
        if (req.getTagIds() != null) n.setTags(new HashSet<>(tagRepo.findAllById(req.getTagIds())));
    }

    private JournalDto.NoteResponse toNoteResponse(JournalNote n) {
        JournalDto.NoteResponse r = new JournalDto.NoteResponse();
        r.setId(n.getId()); r.setTitle(n.getTitle()); r.setContent(n.getContent()); r.setMood(n.getMood());
        r.setCreatedAt(n.getCreatedAt()); r.setUpdatedAt(n.getUpdatedAt());
        r.setTags(n.getTags().stream().map(mapper::toTagResponse).collect(java.util.stream.Collectors.toSet()));
        r.setProblems(n.getProblems().stream().map(p -> toProblemResponse(p, null)).toList());
        return r;
    }

    // ── Problems ─────────────────────────────────────────────────────────────

    @GetMapping("/problems")
    public List<JournalDto.ProblemResponse> problems() {
        return problemRepo.findAllByOrderByCreatedAtDesc().stream()
            .map(p -> toProblemResponse(p, noteRepo.countByProblemsId(p.getId())))
            .toList();
    }

    @PostMapping("/problems")
    public JournalDto.ProblemResponse createProblem(@RequestBody JournalDto.ProblemRequest req) {
        Problem p = new Problem();
        applyProblem(p, req);
        return toProblemResponse(problemRepo.save(p), 0L);
    }

    @PutMapping("/problems/{id}")
    public JournalDto.ProblemResponse updateProblem(@PathVariable UUID id, @RequestBody JournalDto.ProblemRequest req) {
        Problem p = problemRepo.findById(id).orElseThrow();
        applyProblem(p, req);
        return toProblemResponse(problemRepo.save(p), noteRepo.countByProblemsId(id));
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<Void> deleteProblem(@PathVariable UUID id) {
        problemRepo.clearNoteLinks(id); // inverse side — Hibernate won't clean the join
        problemRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void applyProblem(Problem p, JournalDto.ProblemRequest req) {
        if (req.getTitle() != null && !req.getTitle().isBlank()) p.setTitle(req.getTitle().trim());
        if (req.getDescription() != null) p.setDescription(req.getDescription().isBlank() ? null : req.getDescription());
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            String st = req.getStatus().trim().toUpperCase().replace(' ', '_');
            p.setStatus(st);
            p.setResolvedAt(st.equalsIgnoreCase("RESOLVED") ? LocalDateTime.now() : null);
        }
    }

    private JournalDto.ProblemResponse toProblemResponse(Problem p, Long noteCount) {
        JournalDto.ProblemResponse r = new JournalDto.ProblemResponse();
        r.setId(p.getId()); r.setTitle(p.getTitle()); r.setDescription(p.getDescription());
        r.setStatus(p.getStatus()); r.setResolvedAt(p.getResolvedAt()); r.setCreatedAt(p.getCreatedAt());
        r.setNoteCount(noteCount);
        return r;
    }
}
