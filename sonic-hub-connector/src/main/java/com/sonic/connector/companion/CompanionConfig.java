package com.sonic.connector.companion;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "companion")
@ConditionalOnProperty(name = "companion.enabled", havingValue = "true")
@Getter
@Setter
public class CompanionConfig {
    private String apiUrl;
    private boolean enabled;
}
