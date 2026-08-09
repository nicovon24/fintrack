package com.nicolas.finanzas.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;
import com.nicolas.finanzas.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void findOrCreateFromGoogle_conEmailDeAdmin_creaUsuarioAdmin() {
        when(userRepository.findByGoogleId("google-1")).thenReturn(java.util.Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.findOrCreateFromGoogle("google-1", "nicovon24@gmail.com", "Nico", "pic-url");

        assertThat(user.getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    void findOrCreateFromGoogle_conOtroEmail_creaUsuarioNormal() {
        when(userRepository.findByGoogleId("google-2")).thenReturn(java.util.Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.findOrCreateFromGoogle("google-2", "otro@example.com", "Otro", "pic-url");

        assertThat(user.getRole()).isEqualTo(Role.USER);
    }

    @Test
    void findOrCreateFromGoogle_conUsuarioExistente_noLoVuelveACrearNiCambiaSuRol() {
        User existing = new User(5L, "google-3", "nicovon24@gmail.com", "Nico", null, Role.USER, null);
        when(userRepository.findByGoogleId("google-3")).thenReturn(java.util.Optional.of(existing));

        User user = userService.findOrCreateFromGoogle("google-3", "nicovon24@gmail.com", "Nico", "pic-url");

        assertThat(user.getRole()).isEqualTo(Role.USER);
        verify(userRepository, never()).save(any(User.class));
    }
}
