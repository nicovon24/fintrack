package com.nicolas.finanzas.auth.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nicolas.finanzas.auth.dto.TokenResponse;
import com.nicolas.finanzas.auth.dto.UserProfileResponse;
import com.nicolas.finanzas.security.CurrentUserProvider;
import com.nicolas.finanzas.security.JwtService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticacion", description = "Perfil del usuario autenticado")
public class AuthController {

    private final CurrentUserProvider currentUserProvider;
    private final JwtService jwtService;

    @GetMapping("/me")
    @Operation(summary = "Devuelve el perfil del usuario autenticado a partir del JWT")
    public UserProfileResponse me() {
        return UserProfileResponse.from(currentUserProvider.getCurrentUser());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Emite un nuevo JWT para el usuario autenticado, renovando la expiracion (sesion deslizante)")
    public TokenResponse refresh() {
        return new TokenResponse(jwtService.generateToken(currentUserProvider.getCurrentUser()));
    }
}
