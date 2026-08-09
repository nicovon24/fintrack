package com.nicolas.finanzas.transaction.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.repository.CategoryRepository;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;

@DataJpaTest
class TransactionRepositoryTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Test
    void findByDateBetween_devuelveSoloLasTransaccionesDelRango() {
        Category comida = categoryRepository.save(new Category(null, "Comida", TransactionType.EXPENSE));

        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("100.00"),
                LocalDate.of(2026, 8, 5), "Dentro del rango", comida));
        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("50.00"),
                LocalDate.of(2026, 7, 1), "Fuera del rango", comida));

        var result = transactionRepository.findByDateBetween(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDescription()).isEqualTo("Dentro del rango");
    }

    @Test
    void sumByCategoryBetween_agrupaLosMontosPorCategoria() {
        Category comida = categoryRepository.save(new Category(null, "Comida", TransactionType.EXPENSE));

        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("100.00"),
                LocalDate.of(2026, 8, 5), "Super", comida));
        transactionRepository.save(new Transaction(null, TransactionType.EXPENSE, new BigDecimal("50.00"),
                LocalDate.of(2026, 8, 10), "Restaurante", comida));

        var result = transactionRepository.sumByCategoryBetween(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCategoryName()).isEqualTo("Comida");
        assertThat(result.get(0).getTotal()).isEqualByComparingTo("150.00");
    }
}
