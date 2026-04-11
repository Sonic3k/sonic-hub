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
    public void delete(UUID id) { tagRepository.deleteById(id); }
    public Tag findOrCreate(String name) {
        return tagRepository.findByName(name).orElseGet(() -> { Tag t = new Tag(); t.setName(name); return tagRepository.save(t); });
    }
}
