package com.nicolas.finanzas.category.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataIntegrityViolationException;

import com.nicolas.finanzas.category.model.Category;
import com.nicolas.finanzas.category.repository.CategoryRepository;
import com.nicolas.finanzas.transaction.model.TransactionType;

import lombok.extern.slf4j.Slf4j;

/**
 * Crea el juego de categorias base al arrancar, para que la app sea usable sin que un ADMIN
 * tenga que cargarlas a mano (y para que el importador de Excel/CSV no rechace las filas
 * con "la categoria no existe").
 *
 * Solo inserta lo que falta: las categorias que el usuario renombro o borro no se recrean
 * en cada arranque. Se puede desactivar con `app.categories.seed-defaults=false`.
 */
@Configuration
@Slf4j
public class DefaultCategorySeeder {

    /** Nombre -> tipo. El nombre es el que se compara (sin distinguir mayusculas) al importar. */
    private static final Map<String, TransactionType> DEFAULT_CATEGORIES = Map.ofEntries(
            Map.entry("Sueldo", TransactionType.INCOME),
            Map.entry("Freelance", TransactionType.INCOME),
            Map.entry("Inversiones", TransactionType.INCOME),
            Map.entry("Regalo", TransactionType.INCOME),
            Map.entry("Deuda", TransactionType.INCOME),
            Map.entry("Otros ingresos", TransactionType.INCOME),
            Map.entry("Comida", TransactionType.EXPENSE),
            Map.entry("Servicios", TransactionType.EXPENSE),
            Map.entry("Salud", TransactionType.EXPENSE),
            Map.entry("Transporte", TransactionType.EXPENSE),
            Map.entry("Entretenimiento", TransactionType.EXPENSE),
            Map.entry("Ocio", TransactionType.EXPENSE),
            Map.entry("Viaje", TransactionType.EXPENSE),
            Map.entry("Subscripciones", TransactionType.EXPENSE),
            Map.entry("Bienes", TransactionType.EXPENSE),
            Map.entry("Educacion", TransactionType.EXPENSE),
            Map.entry("Alquiler", TransactionType.EXPENSE),
            Map.entry("Otros gastos", TransactionType.EXPENSE));

    @Bean
    @ConditionalOnProperty(name = "app.categories.seed-defaults", havingValue = "true", matchIfMissing = true)
    ApplicationRunner seedDefaultCategories(CategoryRepository categoryRepository) {
        return args -> insertMissing(categoryRepository);
    }

    /**
     * Inserta las categorias que falten, una por una. Se evita una transaccion unica a
     * proposito: si dos instancias arrancan a la vez, la restriccion uk_categories_name_type
     * hace fallar solo la fila duplicada, y las demas se insertan igual. Con un unico
     * saveAll transaccional, ese choque abortaria el lote entero.
     */
    void insertMissing(CategoryRepository categoryRepository) {
        List<String> created = new ArrayList<>();

        for (Map.Entry<String, TransactionType> entry : DEFAULT_CATEGORIES.entrySet()) {
            if (categoryRepository.findByNameIgnoreCaseAndType(entry.getKey(), entry.getValue()).isPresent()) {
                continue;
            }
            try {
                categoryRepository.save(new Category(null, entry.getKey(), entry.getValue()));
                created.add(entry.getKey());
            } catch (DataIntegrityViolationException e) {
                // Otra instancia la creo entre el chequeo y el insert: es el resultado buscado.
                log.debug("La categoria '{}' ya existia al insertarla", entry.getKey());
            }
        }

        if (!created.isEmpty()) {
            created.sort(null);
            log.info("Categorias por defecto creadas: {}", created);
        }
    }
}
