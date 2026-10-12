package com.sonic.angels.config;

import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Persons got the birthday in parts (birth_day, birth_month, birth_year) next to date_of_birth. Before the app
 * serves requests, fill the parts of every person that has a full date and no parts yet, so the three agree.
 * Runs on every start; once filled it changes nothing.
 */
@Component
public class BirthdayPartsBackfill implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(BirthdayPartsBackfill.class);
    private final JdbcTemplate jdbc;

    /** EntityManagerFactory is injected only so this runs after Hibernate has added the columns. */
    public BirthdayPartsBackfill(JdbcTemplate jdbc, EntityManagerFactory emf) {
        this.jdbc = jdbc;
    }

    @Override
    public void afterPropertiesSet() {
        try {
            int n = jdbc.update("UPDATE persons SET birth_day = EXTRACT(DAY FROM date_of_birth)::int, " +
                "birth_month = EXTRACT(MONTH FROM date_of_birth)::int, birth_year = EXTRACT(YEAR FROM date_of_birth)::int " +
                "WHERE date_of_birth IS NOT NULL AND (birth_day IS DISTINCT FROM EXTRACT(DAY FROM date_of_birth)::int " +
                "OR birth_month IS DISTINCT FROM EXTRACT(MONTH FROM date_of_birth)::int OR birth_year IS DISTINCT FROM EXTRACT(YEAR FROM date_of_birth)::int)");
            if (n > 0) log.info("birthday parts filled from the full date for {} person(s)", n);
        } catch (Exception e) {
            log.warn("birthday parts backfill skipped: {}", e.getMessage());
        }
    }
}
