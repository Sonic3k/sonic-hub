package com.sonic.angels.config;

import com.sonic.angels.model.entity.ChatArchive;
import com.sonic.angels.model.entity.ChatAttachment;
import com.sonic.angels.model.entity.ChatMessage;
import com.sonic.angels.model.entity.MediaFile;
import com.sonic.angels.model.entity.Person;
import com.sonic.angels.model.entity.PersonContact;
import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Hibernate writes "CHECK (col IN (...))" for enum columns when it creates them, and ddl-auto=update
 * never widens it, so a new enum value would be rejected by Postgres. Before the app serves requests,
 * widen any such constraint that is missing values.
 */
@Component
public class EnumCheckConstraintFixer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(EnumCheckConstraintFixer.class);

    private record EnumColumn(String table, String column, Class<? extends Enum<?>> type) {}

    private static final List<EnumColumn> COLUMNS = List.of(
        new EnumColumn("chat_messages", "sender_type", ChatMessage.SenderType.class),
        new EnumColumn("chat_messages", "kind", ChatMessage.Kind.class),
        new EnumColumn("chat_messages", "time_precision", ChatMessage.TimePrecision.class),
        new EnumColumn("chat_archives", "platform", ChatArchive.Platform.class),
        new EnumColumn("chat_attachments", "type", ChatAttachment.Type.class),
        new EnumColumn("person_contacts", "platform", PersonContact.Platform.class),
        new EnumColumn("media_files", "file_type", MediaFile.FileType.class),
        new EnumColumn("persons", "relationship_type", Person.RelationshipType.class)
    );

    private final JdbcTemplate jdbc;

    /** EntityManagerFactory is injected only so this runs after Hibernate has updated the schema. */
    public EnumCheckConstraintFixer(JdbcTemplate jdbc, EntityManagerFactory emf) {
        this.jdbc = jdbc;
    }

    @Override
    public void afterPropertiesSet() {
        for (EnumColumn c : COLUMNS) {
            try {
                fix(c);
            } catch (Exception e) {
                log.warn("Enum check constraint on {}.{} not verified: {}", c.table(), c.column(), e.getMessage());
            }
        }
    }

    private void fix(EnumColumn c) {
        List<String> values = Arrays.stream(c.type().getEnumConstants()).map(Enum::name).toList();
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT con.conname AS name, pg_get_constraintdef(con.oid) AS def FROM pg_constraint con " +
            "JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace " +
            "WHERE con.contype = 'c' AND rel.relname = ? AND ns.nspname = current_schema()", c.table());
        for (Map<String, Object> row : rows) {
            String name = (String) row.get("name");
            String def = (String) row.get("def");
            if (def == null || !def.matches("(?s).*\\b" + c.column() + "\\b.*")) continue;
            boolean complete = values.stream().allMatch(v -> def.contains("'" + v + "'"));
            if (complete) continue;
            String list = values.stream().map(v -> "'" + v + "'").collect(Collectors.joining(", "));
            jdbc.execute("ALTER TABLE " + c.table() + " DROP CONSTRAINT \"" + name + "\"");
            jdbc.execute("ALTER TABLE " + c.table() + " ADD CONSTRAINT \"" + name + "\" CHECK (" + c.column() + " IN (" + list + "))");
            log.info("Widened {} on {}.{} to {}", name, c.table(), c.column(), values);
        }
    }
}
