package com.sonic.angels.service;

import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.repository.TagRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) { this.tagRepository = tagRepository; }

    public List<Tag> findAll() { return tagRepository.findAll(); }
    public Tag findById(UUID id) { return tagRepository.findById(id).orElseThrow(() -> new RuntimeException("Tag not found: " + id)); }
    public Tag save(Tag tag) { return tagRepository.save(tag); }
    /** A tag in use is linked from four join tables; unlink everywhere first or the delete hits a FK. */
    @org.springframework.transaction.annotation.Transactional
    public void delete(UUID id) {
        tagRepository.unlinkMedia(id); tagRepository.unlinkCollections(id); tagRepository.unlinkNotes(id); tagRepository.unlinkPersons(id);
        tagRepository.deleteById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public Tag update(UUID id, String name, String color) {
        Tag t = tagRepository.findById(id).orElseThrow();
        if (name != null && !name.isBlank()) t.setName(name.trim());
        if (color != null) t.setColor(color.isBlank() ? null : color);
        return tagRepository.save(t);
    }

    public java.util.List<java.util.Map<String, Object>> stats() {
        return tagRepository.stats().stream().map(r -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id", r[0]); m.put("name", r[1]); m.put("color", r[2]);
            m.put("mediaCount", ((Number) r[3]).longValue()); m.put("albumCount", ((Number) r[4]).longValue()); m.put("noteCount", ((Number) r[5]).longValue());
            return m;
        }).toList();
    }
    public Tag findOrCreate(String name) {
        return tagRepository.findByName(name).orElseGet(() -> { Tag t = new Tag(); t.setName(name); return tagRepository.save(t); });
    }
}
