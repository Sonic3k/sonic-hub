package com.sonic.angels.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.sonic.angels.model.dto.DeskDto;
import com.sonic.angels.service.DeskAssetService;
import com.sonic.angels.service.DeskService;
import com.sonic.angels.service.DeskSyncService;
import com.sonic.angels.service.ImportException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * The computer and the phone of any moment (the "Máy tính" / "Điện thoại" of the portal).
 *
 *   GET  /api/desk/at?at=                      the machines of T, how they looked, what was on them, and that day
 *   GET  /api/desk/scene?episode=              a memory: its moment and the windows that bring it back
 *   GET  /api/desk/folders?parent=&at=         the photo library as it stood at T (folders, counts)
 *   GET  /api/desk/memories?at=&q=&page=&size= memories up to T, newest first
 *   POST /api/desk/sync                        devices, systems, wallpapers, items, apps (+ delete), all or nothing
 *   POST /api/desk/assets?folder=wallpapers    multipart file [+ lastModified, name]: a file the machines use (mediaCategory
 *                                              ASSET, album Assets → Desk → Wallpapers | Machines | Yahoo | <folder>); the same
 *                                              file twice is one asset; with a name the asset is that name in its folder
 *   GET  /api/desk/assets?folder=yahoo         the assets of a folder, by name
 *   GET  /api/desk/raw                         everything stored, in the shapes it is written in
 *   DELETE /api/desk/{devices|systems|wallpapers|items|apps}?key=
 */
@RestController
@RequestMapping("/api/desk")
public class DeskController {

    private final DeskService desk;
    private final DeskSyncService sync;
    private final DeskAssetService assets;

    public DeskController(DeskService desk, DeskSyncService sync, DeskAssetService assets) {
        this.desk = desk;
        this.sync = sync;
        this.assets = assets;
    }

    @GetMapping("/at")
    public DeskDto.Moment at(@RequestParam(required = false) String at) {
        return desk.moment(desk.at(at));
    }

    @GetMapping("/scene")
    public DeskDto.Scene scene(@RequestParam UUID episode) {
        return desk.scene(episode);
    }

    @GetMapping("/folders")
    public DeskDto.FolderPage folders(@RequestParam(required = false) UUID parent, @RequestParam(required = false) String at) {
        return desk.folders(parent, desk.at(at));
    }

    @GetMapping("/memories")
    public DeskDto.MemoryPage memories(@RequestParam(required = false) String at, @RequestParam(required = false) String q,
                                       @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
        return desk.memories(desk.at(at), q, page, size);
    }

    @PostMapping("/sync")
    public DeskDto.SyncResult sync(@RequestBody JsonNode body) {
        return sync.sync(body);
    }

    @PostMapping(value = "/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DeskDto.AssetOut> asset(@RequestParam MultipartFile file, @RequestParam String folder,
                                                  @RequestParam(required = false) Long lastModified,
                                                  @RequestParam(required = false) String name) throws IOException {
        DeskDto.AssetOut out = assets.upload(file, folder, lastModified, name);
        return ResponseEntity.status(out.created() ? 201 : 200).body(out);
    }

    @GetMapping("/assets")
    public java.util.List<DeskDto.AssetOut> assets(@RequestParam String folder) {
        return assets.list(folder);
    }

    @GetMapping("/raw")
    public DeskDto.Raw raw() {
        return sync.raw();
    }

    @DeleteMapping("/{type}")
    public ResponseEntity<Void> delete(@PathVariable String type, @RequestParam String key) {
        sync.delete(type, key);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ImportException.class)
    public ResponseEntity<Map<String, String>> error(ImportException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
