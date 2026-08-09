package com.nicolas.finanzas.transaction.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.repository.CategoryRepository;
import com.nicolas.finanzas.transaction.model.Currency;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.user.model.Role;
import com.nicolas.finanzas.user.model.User;
import com.nicolas.finanzas.user.repository.UserRepository;

@DataJpaTest
class TransactionRepositoryTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByUserAndDateBetween_devuelveSoloLasTransaccionesDelRangoDeEseUsuario() {
        Category comida = categoryRepository.save(new Category(null, "Comida", TransactionType.EXPENSE));
        User user = userRepository.save(new User(null, "google-1", "user@example.com", "Test User", null, Role.USER, Instant.now()));
        User otherUser = userRepository.save(new User(null, "google-2", "other@example.com", "Other User", null, Role.USER, Instant.now()));

        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("100.00"),
                LocalDate.of(2026, 8, 5), "Dentro del rango", comida, Currency.ARS, null, user));
        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("50.00"),
                LocalDate.of(2026, 7, 1), "Fuera del rango", comida, Currency.ARS, null, user));
        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("200.00"),
                LocalDate.of(2026, 8, 6), "De otro usuario", comida, Currency.ARS, null, otherUser));

        var result = transactionRepository.findByUserAndDateBetween(user, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDescription()).isEqualTo("Dentro del rango");
    }
}
