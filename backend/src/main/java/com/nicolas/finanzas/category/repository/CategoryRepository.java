package com.nicolas.finanzas.category.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nicolas.finanzas.category.model.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
}
