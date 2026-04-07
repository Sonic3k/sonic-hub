package com.sonic.hub.model;

public enum EntryType {
    NOTE,           // general note
    OCCURRENCE,     // event happened (drank Rockstar, procrastinated)
    PROGRESS,       // progress update ("called repair shop")
    MOOD,           // emotional state
    REMINDER,       // companion sent reminder
    REMINDER_RESPONSE  // user responded to reminder
}
