package com.sonic.angels.config;

import com.sonic.angels.model.entity.DatePrecision;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Files from before event dates existed get their sort rank (camera / file date = last among equals). Idempotent. */
@Component
public class EventDateBackfill implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    public EventDateBackfill(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.update("UPDATE media_files SET date_rank = ? WHERE date_rank IS NULL AND event_date IS NULL", DatePrecision.DIGITAL_RANK);
    }
}
