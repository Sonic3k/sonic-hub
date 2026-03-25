package com.sonic.hub.telegram.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "telegram")
@ConditionalOnProperty(name = "telegram.bot-token", matchIfMissing = false, havingValue = "", negated = true)
@Getter
@Setter
public class TelegramConfig {
    private String botToken;
    private String botUsername = "SonicHubBot";
    private Long ownerId;
}
