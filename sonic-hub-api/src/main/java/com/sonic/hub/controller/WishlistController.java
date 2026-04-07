package com.sonic.hub.controller;

import com.sonic.hub.dto.WishlistDto;
import com.sonic.hub.service.WishlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wishlists")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public List<WishlistDto.Response> getAll(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean archived) {
        return wishlistService.getAll(category, archived);
    }

    @GetMapping("/{id}")
    public WishlistDto.Response getById(@PathVariable UUID id) {
        return wishlistService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WishlistDto.Response create(@Valid @RequestBody WishlistDto.Request request) {
        return wishlistService.create(request);
    }

    @PutMapping("/{id}")
    public WishlistDto.Response update(@PathVariable UUID id, @Valid @RequestBody WishlistDto.Request request) {
        return wishlistService.update(id, request);
    }

    @PostMapping("/{id}/tags/{tagId}")
    public WishlistDto.Response addTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return wishlistService.addTag(id, tagId);
    }

    @DeleteMapping("/{id}/tags/{tagId}")
    public WishlistDto.Response removeTag(@PathVariable UUID id, @PathVariable UUID tagId) {
        return wishlistService.removeTag(id, tagId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        wishlistService.delete(id);
    }
}
