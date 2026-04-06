package com.sonic.connector.telegram;

import com.sonic.connector.telegram.config.TelegramConfig;
import com.sonic.connector.telegram.handler.CommandHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.client.okhttp.OkHttpTelegramClient;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.longpolling.util.LongPollingSingleThreadUpdateConsumer;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.util.List;

@Component
@ConditionalOnBean(TelegramConfig.class)
@Slf4j
public class SonicHubBot implements SpringLongPollingBot, LongPollingSingleThreadUpdateConsumer {

    private final TelegramConfig config;
    private final TelegramClient telegramClient;
    private final List<CommandHandler> handlers;

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
        if (!text.startsWith("/")) return;

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
