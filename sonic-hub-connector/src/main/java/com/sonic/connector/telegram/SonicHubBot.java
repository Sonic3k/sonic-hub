package com.sonic.connector.telegram;

import com.sonic.connector.companion.CompanionApiClient;
import com.sonic.connector.telegram.config.TelegramConfig;
import com.sonic.connector.telegram.handler.CommandHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.methods.send.SendChatAction;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@ConditionalOnBean(TelegramConfig.class)
@Slf4j
public class SonicHubBot implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private final TelegramConfig config;
    private final TelegramClient telegramClient;
    private final List<CommandHandler> handlers;

    @Autowired(required = false)
    private CompanionApiClient companionClient;

    public SonicHubBot(TelegramConfig config, List<CommandHandler> handlers) {
        this.config = config;
        this.telegramClient = new OkHttpTelegramClient(config.getBotToken());
        this.handlers = handlers;
        log.info("Telegram bot initialized: @{}", config.getBotUsername());
    }

    @Override
    public String getBotToken() {
        return config.getBotToken();
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(Update update) {
        if (!update.hasMessage() || !update.getMessage().hasText()) return;

        var message = update.getMessage();

        if (config.getOwnerId() != null && !message.getFrom().getId().equals(config.getOwnerId())) {
            reply(message.getChatId(), "🔒 Unauthorized.");
            return;
        }

        String text = message.getText().trim();

        // Command handling (starts with /)
        if (text.startsWith("/")) {
            handleCommand(message, text);
            return;
        }

        // Non-command → forward to companion AI
        handleCompanionChat(message, text);
    }

    private void handleCommand(org.telegram.telegrambots.meta.api.objects.message.Message message, String text) {
        String[] split = text.split("\\s+", 2);
        String command = split[0].toLowerCase().split("@")[0];
        String args = split.length > 1 ? split[1] : null;

        for (CommandHandler handler : handlers) {
            if (handler.supports(command)) {
                try {
                    String response = handler.handle(message, command, args);
                    if (response != null) {
                        reply(message.getChatId(), response);
                    }
                } catch (Exception e) {
                    log.error("Error handling command: {} {}", command, args, e);
                    reply(message.getChatId(), "❌ Error: " + e.getMessage());
                }
                return;
            }
        }

        reply(message.getChatId(), "❓ Unknown command. Type /help for available commands.");
    }

    private void handleCompanionChat(org.telegram.telegrambots.meta.api.objects.message.Message message, String text) {
        if (companionClient == null) {
            // Companion not enabled, ignore non-command messages
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                String chatId = message.getChatId().toString();

                // Call companion API
                var response = companionClient.chat("telegram", chatId, text);

                if (response == null || response.getSplit() == null || response.getSplit().isEmpty()) {
                    return;
                }

                // Send reply immediately (no delay for now)
                List<String> chunks = response.getSplit();
                for (String chunk : chunks) {
                    reply(message.getChatId(), chunk);
                }
            } catch (Exception e) {
                log.error("Companion chat error: {}", e.getMessage(), e);
            }
        });
    }

    private void sendTypingAction(Long chatId) {
        try {
            telegramClient.execute(SendChatAction.builder()
                    .chatId(chatId.toString())
                    .action("typing")
                    .build());
        } catch (TelegramApiException e) {
            log.warn("Failed to send typing action", e);
        }
    }

    private void reply(Long chatId, String text) {
        var msg = SendMessage.builder()
                .chatId(chatId.toString())
                .text(text)
                .parseMode("Markdown")
                .disableWebPagePreview(true)
                .build();
        try {
            telegramClient.execute(msg);
        } catch (TelegramApiException e) {
            log.error("Failed to send message", e);
        }
    }
}
