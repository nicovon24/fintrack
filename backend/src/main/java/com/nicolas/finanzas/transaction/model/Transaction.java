package com.nicolas.finanzas.transaction.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.user.model.User;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    private BigDecimal amount;

    private LocalDate date;

    private String description;

    @ManyToOne
    private Category category;

    @Enumerated(EnumType.STRING)
    private Currency currency;

    private BigDecimal exchangeRate;

    @ManyToOne
    private User user;
}
