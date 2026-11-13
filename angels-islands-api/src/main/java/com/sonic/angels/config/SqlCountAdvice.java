package com.sonic.angels.config;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Puts the request's statement count on the answer (X-Sql-Count), just before the body is written: by then the
 * service has done all its reading (DTOs are mapped inside the service's transaction, nothing is fetched while the
 * JSON is written). It is what to look at, in the browser's network tab or with curl -i, before and after touching
 * a list read.
 */
@ControllerAdvice
public class SqlCountAdvice implements ResponseBodyAdvice<Object> {

    public static final String HEADER = "X-Sql-Count";

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) { return true; }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                  Class<? extends HttpMessageConverter<?>> converterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        response.getHeaders().set(HEADER, String.valueOf(SqlCounter.current()));
        return body;
    }
}
