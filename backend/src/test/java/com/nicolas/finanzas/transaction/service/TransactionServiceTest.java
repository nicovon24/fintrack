package com.nicolas.finanzas.transaction.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.service.CategoryService;
import com.nicolas.finanzas.exception.ResourceNotFoundException;
import com.nicolas.finanzas.transaction.dto.TransactionRequest;
import com.nicolas.finanzas.transaction.dto.TransactionResponse;
import com.nicolas.finanzas.transaction.model.Transaction;
import com.nicolas.finanzas.transaction.model.TransactionType;
import com.nicolas.finanzas.transaction.repository.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private CategoryService categoryService;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void create_conCategoriaExistente_guardaYDevuelveLaTransaccion() {
        Category category = new Category(1L, "Comida", TransactionType.EXPENSE);
        TransactionRequest request = new TransactionRequest(
                TransactionType.EXPENSE, new BigDecimal("1500.00"), LocalDate.of(2026, 8, 5), "Supermercado", 1L);

        when(categoryService.getCategoryOrThrow(1L)).thenReturn(category);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        TransactionResponse response = transactionService.create(request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.amount()).isEqualByComparingTo("1500.00");
        assertThat(response.category().name()).isEqualTo("Comida");
        verify(transactionRepository).save(any(Transaction.class));
    }

    @Test
    void create_conCategoriaInexistente_lanzaResourceNotFoundException() {
        TransactionRequest request = new TransactionRequest(
                TransactionType.EXPENSE, new BigDecimal("100.00"), LocalDate.of(2026, 8, 5), "Test", 99L);

        when(categoryService.getCategoryOrThrow(99L))
                .thenThrow(new ResourceNotFoundException("Categoria no encontrada: 99"));

        assertThatThrownBy(() -> transactionService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }
}
