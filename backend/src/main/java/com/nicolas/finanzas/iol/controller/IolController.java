package com.nicolas.finanzas.iol.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nicolas.finanzas.iol.dto.IolLoginRequest;
import com.nicolas.finanzas.iol.dto.IolPortfolioResponse;
import com.nicolas.finanzas.iol.dto.IolRefreshRequest;
import com.nicolas.finanzas.iol.dto.IolTokenResponse;
import com.nicolas.finanzas.iol.service.IolService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// Proxy stateless hacia IOL Inversiones: nunca persiste credenciales, tokens ni cartera.
// Requiere JWT propio (via SecurityConfig, .anyRequest().authenticated() por default) pero no usa
// CurrentUserProvider - nada de esto se guarda ni se asocia a un usuario en la base.
@RestController
@RequestMapping("/api/iol")
@RequiredArgsConstructor
@Tag(name = "IOL Inversiones", description = "Proxy en vivo a IOL, sin persistencia de credenciales ni datos")
public class IolController {

    private final IolService iolService;

    @PostMapping("/login")
    @Operation(summary = "Reenvia usuario/clave a IOL y devuelve el token de sesion (no se guarda en el backend)")
    public IolTokenResponse login(@Valid @RequestBody IolLoginRequest request) {
        return iolService.login(request.username(), request.password());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renueva el token de IOL a partir del refresh token")
    public IolTokenResponse refresh(@Valid @RequestBody IolRefreshRequest request) {
        return iolService.refresh(request.refreshToken());
    }

    @GetMapping("/portfolio")
    @Operation(summary = "Cartera real de IOL (acciones y bonos), obtenida en vivo con el token del header")
    public IolPortfolioResponse portfolio(@RequestHeader("X-Iol-Token") String iolToken) {
        return iolService.getPortfolio(iolToken);
    }
}
