package com.sonic.hub.telegram.handler;

import org.telegram.telegrambots.meta.api.objects.message.Message;

public interface CommandHandler {
    /**
     * @return true if this handler can process the given command
     */
    boolean supports(String command);

    /**
     * Process the message and return response text
     */
    String handle(Message message, String command, String args);
}
