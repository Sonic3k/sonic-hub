package com.sonic.connector.telegram.handler;

import org.telegram.telegrambots.meta.api.objects.message.Message;

public interface CommandHandler {
    boolean supports(String command);
    String handle(Message message, String command, String args);
}
