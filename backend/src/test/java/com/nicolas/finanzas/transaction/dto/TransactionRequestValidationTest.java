package com.nicolas.finanzas.transaction.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.nicolas.finanzas.transaction.model.TransactionType;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class TransactionRequestValidationTest {

    private final Validator validator;

    TransactionRequestValidationTest() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            this.validator = factory.getValidator();
        }
    }

    @Test
    void montoNegativo_esRechazadoPorValidacion() {
        TransactionRequest request = new TransactionRequest(
                TransactionType.EXPENSE, new BigDecimal("-50.00"), LocalDate.now(), "test", 1L);

        Set<ConstraintViolation<TransactionRequest>> violations = validator.validate(request);

        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("amount"));
    }

    @Test
    void requestValido_noTieneViolaciones() {
        TransactionRequest request = new TransactionRequest(
                TransactionType.EXPENSE, new BigDecimal("50.00"), LocalDate.now(), "test", 1L);

        Set<ConstraintViolation<TransactionRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }
}
