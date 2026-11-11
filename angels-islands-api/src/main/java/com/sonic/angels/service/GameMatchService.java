package com.sonic.angels.service;

import com.sonic.angels.model.dto.GameDto;
import com.sonic.angels.model.entity.Game;
import com.sonic.angels.model.entity.GameMatch;
import com.sonic.angels.model.entity.GameMatchPlayer;
import com.sonic.angels.repository.GameMatchPlayerRepository;
import com.sonic.angels.repository.GameMatchRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * The results kept for a game he played with others (see {@link GameMatch}): read as one list, oldest first, and
 * written whole by an importer from the record they come from (matched by the record's own ids).
 */
@Service
@Transactional
public class GameMatchService {

    private final GameService games;
    private final GameMatchRepository matches;
    private final GameMatchPlayerRepository players;
    private final EntityManager em;

    public GameMatchService(GameService games, GameMatchRepository matches, GameMatchPlayerRepository players, EntityManager em) {
        this.games = games; this.matches = matches; this.players = players; this.em = em;
    }

    @Transactional(readOnly = true)
    public List<GameDto.Match> list(String gameKey) {
        Game g = games.get(gameKey);
        List<GameMatch> all = matches.findByGameIdOrderByPlayedAtAscExternalKeyAsc(g.getId());
        Map<UUID, List<GameMatchPlayer>> by = players.findByGame(g.getId()).stream()
            .collect(Collectors.groupingBy(p -> p.getMatch().getId(), HashMap::new, Collectors.toList()));
        return all.stream().map(m -> {
            List<GameMatchPlayer> ps = by.getOrDefault(m.getId(), List.of());
            return new GameDto.Match(m.getId(), m.getExternalKey(), m.getPlayedAt(), m.getMap(), m.getScore1(), m.getScore2(), m.getNote(),
                side(ps, 1), side(ps, 2));
        }).toList();
    }

    private static List<GameDto.MatchPlayer> side(List<GameMatchPlayer> ps, int side) {
        return ps.stream().filter(p -> p.getSide() != null && p.getSide() == side)
            .map(p -> new GameDto.MatchPlayer(p.getName(), Boolean.TRUE.equals(p.getSelf()), p.getRating())).toList();
    }

    /** Replaces what is kept for the game with the list given: a match is matched by its key, the ones not named go. */
    public Map<String, Integer> put(String gameKey, GameDto.MatchesIn in) {
        Game g = games.get(gameKey);
        List<GameDto.MatchIn> list = in == null || in.matches == null ? List.of() : in.matches;
        Set<String> keys = new HashSet<>();
        for (GameDto.MatchIn m : list) {
            if (m.key == null || m.key.isBlank()) throw new IllegalArgumentException("matches: every match needs its key");
            if (!keys.add(m.key.trim())) throw new IllegalArgumentException("matches: key given twice (" + m.key.trim() + ")");
        }
        Map<String, GameMatch> kept = matches.findByGameIdOrderByPlayedAtAscExternalKeyAsc(g.getId()).stream()
            .collect(Collectors.toMap(GameMatch::getExternalKey, m -> m));
        players.deleteByGame(g.getId());
        int created = 0, updated = 0;
        for (GameDto.MatchIn m : list) {
            String k = m.key.trim();
            GameMatch x = kept.remove(k);
            if (x == null) { x = new GameMatch(); x.setGame(g); x.setExternalKey(k); created++; } else updated++;
            x.setPlayedAt(when(m.playedAt, k));
            x.setMap(text(m.map, 120)); x.setNote(text(m.note, 500));
            x.setScore1(m.score1); x.setScore2(m.score2);
            matches.save(x);
            side(x, m.side1, 1, k);
            side(x, m.side2, 2, k);
        }
        int deleted = kept.size();
        matches.deleteAll(kept.values());
        em.flush();
        Map<String, Integer> out = new LinkedHashMap<>();
        out.put("created", created); out.put("updated", updated); out.put("deleted", deleted);
        return out;
    }

    private void side(GameMatch x, List<GameDto.MatchPlayerIn> ps, int side, String key) {
        int i = 0;
        for (GameDto.MatchPlayerIn p : ps == null ? List.<GameDto.MatchPlayerIn>of() : ps) {
            if (p == null || p.name == null || p.name.isBlank()) throw new IllegalArgumentException("matches[" + key + "]: a player without a name");
            GameMatchPlayer y = new GameMatchPlayer();
            y.setMatch(x); y.setSide(side); y.setPosition(i++); y.setName(text(p.name, 120));
            y.setSelf(Boolean.TRUE.equals(p.self) ? Boolean.TRUE : null); y.setRating(p.rating);
            players.save(y);
        }
    }

    private static LocalDateTime when(String v, String key) {
        try {
            String t = v == null ? "" : v.trim();
            return LocalDateTime.parse(t.length() == 16 ? t + ":00" : t);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("matches[" + key + "].playedAt: yyyy-MM-ddTHH:mm[:ss] (\"" + v + "\")");
        }
    }

    private static String text(String v, int max) {
        if (v == null || v.isBlank()) return null;
        String t = v.trim();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
