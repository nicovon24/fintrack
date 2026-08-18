package com.nicolas.finanzas.category.model;

import com.nicolas.finanzas.transaction.model.TransactionType;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "categories",
        // El par nombre+tipo identifica a la categoria en todo el sistema (el importador la
        // busca asi). La restriccion evita duplicados si dos instancias arrancan a la vez.
        uniqueConstraints = @UniqueConstraint(name = "uk_categories_name_type", columnNames = {"name", "type"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    private TransactionType type;
}
