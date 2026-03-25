package com.sonic.connector.railway;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "railway")
@ConditionalOnProperty(name = "railway.api-token")
@Getter
@Setter
public class RailwayConfig {
    private String apiToken;

    /**
     * Project aliases: short name → project ID
     * e.g. railway.projects.sonic-hub=b58d6387-...
     */
    private Map<String, String> projects = new HashMap<>();

    public String resolveProjectId(String alias) {
        // Try alias first, then treat as raw ID
        return projects.getOrDefault(alias, alias);
    }

    public String resolveAlias(String projectId) {
        return projects.entrySet().stream()
                .filter(e -> e.getValue().equals(projectId))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(projectId.substring(0, 8));
    }
}
