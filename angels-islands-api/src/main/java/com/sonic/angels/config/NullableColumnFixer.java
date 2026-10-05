package com.sonic.angels.config;

import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ddl-auto=update never drops a NOT NULL, so a column that became optional in the entities keeps
 * rejecting nulls in Postgres. Before the app serves requests, relax the ones listed here.
 */
@Component
public class NullableColumnFixer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(NullableColumnFixer.class);

    private record Column(String table, String column) {}

    private static final List<Column> COLUMNS = List.of(
        new Column("chat_archives", "person_id")      // other chats belong to nobody in Persons
    );

    private final JdbcTemplate jdbc;

    /** EntityManagerFactory is injected only so this runs after Hibernate has updated the schema. */
    public NullableColumnFixer(JdbcTemplate jdbc, EntityManagerFactory emf) {
        this.jdbc = jdbc;
    }

    @Override
    public void afterPropertiesSet() {
        for (Column c : COLUMNS) {
            try {
                List<String> rows = jdbc.queryForList(
                    "SELECT is_nullable FROM information_schema.columns " +
                    "WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?",
                    String.class, c.table(), c.column());
                if (rows.isEmpty() || !"NO".equalsIgnoreCase(rows.get(0))) continue;
                jdbc.execute("ALTER TABLE " + c.table() + " ALTER COLUMN " + c.column() + " DROP NOT NULL");
                log.info("Dropped NOT NULL on {}.{}", c.table(), c.column());
            } catch (Exception e) {
                log.warn("NOT NULL on {}.{} not verified: {}", c.table(), c.column(), e.getMessage());
            }
        }
    }
}
