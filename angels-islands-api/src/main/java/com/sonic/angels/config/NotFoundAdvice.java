package com.sonic.angels.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.regex.Pattern;

/** A lookup of something that is not there answers 404, not 500 (services throw "X not found: id" or
 *  NoSuchElementException). Everything else keeps Spring's own handling: the exception is thrown again. */
@RestControllerAdvice
public class NotFoundAdvice {

    private static final Pattern NOT_FOUND = Pattern.compile("(?i)^[\\p{L} ]{1,40} not found(: .*)?$");

    @ExceptionHandler({NoSuchElementException.class, jakarta.persistence.EntityNotFoundException.class})
    public ResponseEntity<Map<String, String>> missing(RuntimeException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Not found"));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> runtime(RuntimeException e) {
        if (e.getClass() == RuntimeException.class && e.getMessage() != null && NOT_FOUND.matcher(e.getMessage()).matches())
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        throw e;
    }
}
