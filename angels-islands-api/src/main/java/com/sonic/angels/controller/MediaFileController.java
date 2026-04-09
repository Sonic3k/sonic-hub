package com.sonic.angels.controller;

import com.sonic.angels.model.dto.MediaFileDto;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.service.DtoMapper;
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
    private final DtoMapper mapper;

    public MediaFileController(MediaFileService mediaFileService, PersonService personService, DtoMapper mapper) {
        this.mediaFileService = mediaFileService; this.personService = personService; this.mapper = mapper;
    }

    @GetMapping
    public List<MediaFileDto.Response> findAll() { return mediaFileService.findAll().stream().map(mapper::toMediaFileResponse).toList(); }

    @GetMapping("/{id}")
    public MediaFileDto.Response findById(@PathVariable Long id) { return mapper.toMediaFileResponse(mediaFileService.findById(id)); }

    @GetMapping("/person/{personId}")
    public List<MediaFileDto.Response> findByPerson(@PathVariable Long personId) {
        return mediaFileService.findByPersonId(personId).stream().map(mapper::toMediaFileResponse).toList();
    }

    @PostMapping("/upload")
    public MediaFileDto.Response upload(@RequestParam("file") MultipartFile file,
        @RequestParam(value = "personId", required = false) Long personId,
        @RequestParam(value = "subFolder", required = false) String subFolder) throws IOException {
        MediaFile mf = mediaFileService.upload(file, personId, subFolder);
        return mapper.toMediaFileResponse(mf);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { mediaFileService.delete(id); return ResponseEntity.noContent().build(); }
}
