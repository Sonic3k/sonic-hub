package com.sonic.angels.controller;

import com.sonic.angels.model.dto.SpotifyDto;
import com.sonic.angels.service.SpotifyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * His Spotify listening, one stream at a time.
 *
 *   GET  /api/music/spotify/overview        the whole, then each year with its most played song, artist and list
 *   GET  /api/music/spotify/report          the streams under a filter counted by one side:
 *          group = year | month | day | hour | weekday | punch (weekday-hour) | song | artist | album | playlist | context |
 *                  device | place | country | start | end | shuffle | platform | session
 *          by    = year | month | day | hour | weekday — also cut by time (a series per line, and each bucket's total)
 *          from, to (yyyy, yyyy-MM, yyyy-MM-dd on his wall clock; to not included), song (id), artist, album,
 *          playlist (a list key, or "none"), context, device, place, start, end, weekday (several: comma apart),
 *          shuffle, hourFrom + hourTo, q (words in a title, an artist, an album), sort, limit
 *   GET  /api/music/spotify/songs/{id}      one song: numbers, lists, the recording in his music, its Spotify tracks
 *   GET  /api/music/spotify/day?date=       the streams of one day, in order
 *   POST /api/music/spotify/sync            songs, tracks and plays written by the importer
 */
@RestController
@RequestMapping("/api/music/spotify")
public class SpotifyController {

    private final SpotifyService spotify;

    public SpotifyController(SpotifyService spotify) { this.spotify = spotify; }

    @GetMapping("/overview")
    public SpotifyDto.Overview overview() { return spotify.overview(); }

    @GetMapping("/report")
    public SpotifyDto.Report report(@RequestParam(required = false) String group, @RequestParam(required = false) String by,
                                    @RequestParam(required = false) String from, @RequestParam(required = false) String to,
                                    @RequestParam(required = false) UUID song, @RequestParam(required = false) String artist,
                                    @RequestParam(required = false) String album, @RequestParam(required = false) String playlist,
                                    @RequestParam(required = false) String context, @RequestParam(required = false) String device,
                                    @RequestParam(required = false) String place, @RequestParam(required = false) Boolean shuffle,
                                    @RequestParam(required = false) String start, @RequestParam(required = false) String end,
                                    @RequestParam(required = false) Integer hourFrom, @RequestParam(required = false) Integer hourTo,
                                    @RequestParam(required = false) String weekday, @RequestParam(required = false) String q,
                                    @RequestParam(required = false) String sort, @RequestParam(required = false) Integer limit) {
        return spotify.report(group, by, new SpotifyService.Filter(from, to, song, artist, album, playlist, context, device, place, shuffle, start, end,
            hourFrom, hourTo, weekday, q), sort, limit);
    }

    @GetMapping("/songs/{id}")
    public SpotifyDto.Song song(@PathVariable UUID id) { return spotify.song(id); }

    @GetMapping("/day")
    public List<SpotifyDto.DayPlay> day(@RequestParam String date) { return spotify.day(date); }

    @PostMapping("/sync")
    public SpotifyDto.SyncResult sync(@RequestBody SpotifyDto.Sync body) { return spotify.sync(body); }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", String.valueOf(e.getMessage())));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> bad(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", String.valueOf(e.getMessage())));
    }
}
