package com.nicolas.finanzas.common.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
                "status", "ok",
                "service", "gastos-ingresos",
                "docs", "/swagger-ui.html"
        );
    }
}
