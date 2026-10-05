package com.sonic.angels.controller;

import com.sonic.angels.config.AdminAuth;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Lets a client check its token: {configured, valid}. Public on purpose. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AdminAuth auth;

    public AuthController(AdminAuth auth) { this.auth = auth; }

    @GetMapping("/check")
    public Map<String, Boolean> check() {
        return Map.of("configured", auth.isConfigured(), "valid", auth.isConfigured() && auth.isAdminRequest());
    }
}
