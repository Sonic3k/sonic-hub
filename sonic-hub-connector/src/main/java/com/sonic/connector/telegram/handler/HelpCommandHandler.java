package com.sonic.connector.telegram.handler;

import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.Set;

@Component
public class HelpCommandHandler implements CommandHandler {

    private static final String HELP_TEXT = """
            🚀 *Sonic Hub Bot*
            
            *Quick Add:*
            `/t Buy groceries` — create a task
            `/td Call dentist` — create a todo
            `/p Server timeout on login` — log a problem
            
            *List (active only):*
            `/tasks` — list open tasks
            `/todos` — list undone todos
            `/problems` — list active problems
            
            *Edit title:*
            `/edit t a1b2c3d4 New title here` — edit task
            `/edit td a1b2c3d4 New title here` — edit todo
            `/edit p a1b2c3d4 New title here` — edit problem
            
            💡 _IDs are shown as short 8-char codes when you list items._
            _Use any unique prefix to match — e.g._ `a1b2` _is enough._
            
            *Railway:*
            `/rw help` — railway deploy commands
            """;

    @Override
    public boolean supports(String command) {
        return Set.of("/help", "/start").contains(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        return HELP_TEXT;
    }
}
