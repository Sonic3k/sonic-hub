package com.sonic.angels.service;

import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.MediaLocationDetail;
import com.sonic.angels.repository.MediaFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GeocodingService {

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);
    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse?lat=%s&lon=%s&format=json&addressdetails=1&accept-language=en";

    private final MediaFileRepository mediaFileRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public GeocodingService(MediaFileRepository mediaFileRepository) {
        this.mediaFileRepository = mediaFileRepository;
    }

    /**
     * Batch geocode media files that have lat/lng.
     * @param batchSize number of files per batch
     * @param force if true, re-geocode all files with lat/lng (overwrites existing)
     */
    public Map<String, Object> geocodeBatch(int batchSize, boolean force, int page) {
        var pageable = PageRequest.of(Math.max(0, page), batchSize);
        Page<MediaFile> page = force
                ? mediaFileRepository.findWithLatLng(pageable)
                : mediaFileRepository.findWithLatLngNoLocation(pageable);

        var files = page.getContent();
        int processed = 0, updated = 0, errors = 0;
        List<String> logEntries = new ArrayList<>();

        for (MediaFile m : files) {
            processed++;
            try {
                geocodeAndSave(m);
                updated++;
                logEntries.add("OK " + m.getId() + " -> " + m.getDisplayedAddress());
            } catch (Exception e) {
                errors++;
                logEntries.add("ERR " + m.getId() + " " + (e.getMessage() != null ? e.getMessage() : "unknown error"));
                log.warn("Geocode failed for media {}: {}", m.getId(), e.getMessage());
            }

            // Nominatim rate limit: max 1 req/sec
            try { Thread.sleep(1100); } catch (InterruptedException ignored) {}
        }

        long remaining = force
                ? page.getTotalElements() - updated
                : mediaFileRepository.countWithLatLngNoLocation();

        return Map.of(
            "batchSize", batchSize,
            "force", force,
            "totalInBatch", files.size(),
            "processed", processed,
            "updated", updated,
            "errors", errors,
            "remaining", remaining,
            "hasMore", remaining > 0,
            "log", logEntries.size() > 50 ? logEntries.subList(0, 50) : logEntries
        );
    }

    /** Geocode a single media file using Nominatim and save location detail. */
    @SuppressWarnings("unchecked")
    public void geocodeAndSave(MediaFile m) {
        String url = String.format(NOMINATIM_URL, m.getLatitude(), m.getLongitude());

        // Nominatim requires a User-Agent header
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "AngelsIslands/1.0");
        HttpEntity<String> entity = new HttpEntity<>(headers);

        var resp = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map<String, Object> response = resp.getBody();

        if (response == null || response.containsKey("error")) {
            String error = response != null ? String.valueOf(response.get("error")) : "null response";
            throw new RuntimeException("Nominatim error: " + error);
        }

        MediaLocationDetail loc = m.getOrCreateLocationDetail();
        Map<String, Object> address = (Map<String, Object>) response.get("address");

        if (address != null) {
            loc.setCountry((String) address.get("country"));
            loc.setCountryCode(address.get("country_code") != null
                    ? ((String) address.get("country_code")).toUpperCase() : null);
            loc.setState((String) address.get("state"));

            // City: try city -> town -> village -> municipality
            String city = (String) address.get("city");
            if (city == null) city = (String) address.get("town");
            if (city == null) city = (String) address.get("village");
            if (city == null) city = (String) address.get("municipality");
            loc.setCity(city);

            // District: suburb or city_district
            String district = (String) address.get("suburb");
            if (district == null) district = (String) address.get("city_district");
            loc.setDistrict(district);

            loc.setNeighborhood((String) address.get("neighbourhood"));
            loc.setStreet((String) address.get("road"));
            loc.setStreetNumber((String) address.get("house_number"));
            loc.setPostalCode((String) address.get("postcode"));
        }

        loc.setFormattedAddress((String) response.get("display_name"));

        // Nominatim returns place_id as a number
        Object placeId = response.get("place_id");
        if (placeId != null) loc.setPlaceId(String.valueOf(placeId));

        loc.setGeocodedAt(LocalDateTime.now());

        // Build displayedAddress: compact summary
        m.setDisplayedAddress(buildDisplayedAddress(loc));

        mediaFileRepository.save(m);
    }

    private String buildDisplayedAddress(MediaLocationDetail loc) {
        List<String> parts = new ArrayList<>();
        if (loc.getDistrict() != null) parts.add(loc.getDistrict());
        if (loc.getCity() != null) parts.add(loc.getCity());
        if (loc.getState() != null && !loc.getState().equals(loc.getCity())) parts.add(loc.getState());
        if (loc.getCountry() != null) parts.add(loc.getCountry());
        return parts.isEmpty() ? loc.getFormattedAddress() : String.join(", ", parts);
    }
}
