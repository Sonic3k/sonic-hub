package com.sonic.angels.service;

/** Importer error with the HTTP status it should surface as. */
public class ImportException extends RuntimeException {

    private final int status;

    public ImportException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() { return status; }
}
