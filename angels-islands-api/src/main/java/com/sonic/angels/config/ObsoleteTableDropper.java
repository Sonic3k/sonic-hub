package com.sonic.angels.config;

import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ddl-auto=update never drops a table whose entity is gone. Tables listed here belonged to features that moved
 * elsewhere; each is dropped at startup when it is empty, and kept (with a warning) when it still holds rows.
 */
@Component
public class ObsoleteTableDropper implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(ObsoleteTableDropper.class);

    /** children first. Tử vi moved to its own service and database (sonic-mystic). */
    private static final List<String> TABLES = List.of("tuvi_readings", "tuvi_profiles");

    private final JdbcTemplate jdbc;

    /** EntityManagerFactory is injected only so this runs after Hibernate has updated the schema. */
    public ObsoleteTableDropper(JdbcTemplate jdbc, EntityManagerFactory emf) {
        this.jdbc = jdbc;
    }

    @Override
    public void afterPropertiesSet() {
        for (String t : TABLES) {
            try {
                Boolean exists = jdbc.queryForObject("SELECT to_regclass(current_schema() || '.' || ?) IS NOT NULL", Boolean.class, t);
                if (!Boolean.TRUE.equals(exists)) continue;
                Long rows = jdbc.queryForObject("SELECT count(*) FROM " + t, Long.class);
                if (rows != null && rows > 0) { log.warn("Kept obsolete table {}: it still has {} rows", t, rows); continue; }
                jdbc.execute("DROP TABLE " + t);
                log.info("Dropped obsolete table {}", t);
            } catch (Exception e) {
                log.warn("Obsolete table {} not dropped: {}", t, e.getMessage());
            }
        }
    }
}
