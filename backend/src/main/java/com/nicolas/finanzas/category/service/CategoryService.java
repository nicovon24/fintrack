package com.nicolas.finanzas.category.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.nicolas.finanzas.category.dto.CategoryRequest;
import com.nicolas.finanzas.category.dto.CategoryResponse;
import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.repository.CategoryRepository;
import com.nicolas.finanzas.exception.DuplicateResourceException;
import com.nicolas.finanzas.exception.ResourceNotFoundException;
import com.nicolas.finanzas.transaction.model.TransactionType;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> findAll() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse findById(Long id) {
        return CategoryResponse.from(getCategoryOrThrow(id));
    }

    public CategoryResponse create(CategoryRequest request) {
        requireNoDuplicate(request.name(), request.type(), null);
        Category category = new Category();
        category.setName(request.name());
        category.setType(request.type());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getCategoryOrThrow(id);
        requireNoDuplicate(request.name(), request.type(), id);
        category.setName(request.name());
        category.setType(request.type());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    private void requireNoDuplicate(String name, TransactionType type, Long excludeId) {
        categoryRepository.findByNameIgnoreCaseAndType(name, type)
                .filter(existing -> !existing.getId().equals(excludeId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "Ya existe una categoria '" + existing.getName() + "' de tipo " + type);
                });
    }

    public void delete(Long id) {
        Category category = getCategoryOrThrow(id);
        categoryRepository.delete(category);
    }

    public Category getCategoryOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria no encontrada: " + id));
    }

    public Optional<Category> findByNameAndType(String name, TransactionType type) {
        return categoryRepository.findByNameIgnoreCaseAndType(name, type);
    }
}
