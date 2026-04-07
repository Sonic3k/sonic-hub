package com.sonic.angels.controller;

import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.service.MediaFileService;
import com.sonic.angels.service.PersonService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/media-files")
public class MediaFileController {

    private final MediaFileService mediaFileService;
    private final PersonService personService;

    public MediaFileController(MediaFileService mediaFileService, PersonService personService) {
        this.mediaFileService = mediaFileService;
        this.personService = personService;
    }

    @GetMapping
    public List<MediaFile> findAll() { return mediaFileService.findAll(); }

    @GetMapping("/{id}")
    public MediaFile findById(@PathVariable Long id) { return mediaFileService.findById(id); }

    @GetMapping("/person/{personId}")
    public List<MediaFile> findByPerson(@PathVariable Long personId) { return mediaFileService.findByPersonId(personId); }

    @PostMapping("/upload")
    public MediaFile upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "personId", required = false) Long personId,
        @RequestParam(value = "subFolder", required = false) String subFolder
    ) throws IOException {
        MediaFile mf = mediaFileService.upload(file, personId, subFolder);
        if (personId != null) {
            Person person = personService.findById(personId);
            mf.getPersons().add(person);
            mf = mediaFileService.findById(mf.getId()); // refresh
        }
        return mf;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mediaFileService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
