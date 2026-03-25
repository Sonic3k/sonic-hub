package com.sonic.hub.telegram;

import com.sonic.hub.telegram.config.TelegramConfig;
import com.sonic.hub.telegram.handler.CommandHandler;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

import java.util.List;

@Component
@ConditionalOnBean(TelegramConfig.class)
@Slf4j
public class SonicHubBot extends TelegramLongPollingBot {

    private final TelegramConfig config;
    private final List<CommandHandler> handlers;

    public SonicHubBot(TelegramConfig config, List<CommandHandler> handlers) {
        super(config.getBotToken());
        this.config = config;
        this.handlers = handlers;
    }

    @PostConstruct
    public void register() {
        try {
            var api = new TelegramBotsApi(DefaultBotSession.class);
            api.registerBot(this);
            log.info("✅ Telegram bot registered: @{}", config.getBotUsername());
        } catch (TelegramApiException e) {
            log.error("❌ Failed to register Telegram bot", e);
        }
    }

    @Override
    public String getBotUsername() {
        return config.getBotUsername();
    }

    @Override
    public void onUpdateReceived(Update update) {
        if (!update.hasMessage() || !update.getMessage().hasText()) return;

        var message = update.getMessage();

        // Security: only respond to owner
        if (config.getOwnerId() != null && !message.getFrom().getId().equals(config.getOwnerId())) {
            reply(message.getChatId(), "🔒 Unauthorized.");
            return;
        }

        String text = message.getText().trim();
        if (!text.startsWith("/")) return;

        // Parse command and args
        String[] split = text.split("\\s+", 2);
        String command = split[0].toLowerCase().split("@")[0]; // remove @botname suffix
        String args = split.length > 1 ? split[1] : null;

        // Dispatch to handler
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

        reply(message.getChatId(), "❓ Unknown command. Type `/help` for available commands.");
    }

    private void reply(Long chatId, String text) {
        var msg = new SendMessage();
        msg.setChatId(chatId.toString());
        msg.setText(text);
        msg.setParseMode("Markdown");
        msg.setDisableWebPagePreview(true);
        try {
            execute(msg);
        } catch (TelegramApiException e) {
            log.error("Failed to send message", e);
        }
    }
}
