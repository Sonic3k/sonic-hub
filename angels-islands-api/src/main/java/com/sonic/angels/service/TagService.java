package com.sonic.angels.service;

import com.sonic.angels.model.entity.Tag;
import com.sonic.angels.repository.TagRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    public List<Tag> findAll() { return tagRepository.findAll(); }
    public Tag findById(Long id) { return tagRepository.findById(id).orElseThrow(() -> new RuntimeException("Tag not found: " + id)); }
    public Tag save(Tag tag) { return tagRepository.save(tag); }
    public void delete(Long id) { tagRepository.deleteById(id); }
    public Tag findOrCreate(String name) {
        return tagRepository.findByName(name).orElseGet(() -> { Tag t = new Tag(); t.setName(name); return tagRepository.save(t); });
    }
}
