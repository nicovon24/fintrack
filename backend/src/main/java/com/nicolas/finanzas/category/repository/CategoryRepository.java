package com.nicolas.finanzas.category.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.transaction.model.TransactionType;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByNameIgnoreCaseAndType(String name, TransactionType type);
}
