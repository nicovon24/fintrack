# Testing Rules

## Structure: the test mirrors the package it tests

A test lives in the same package (under `src/test/java`) as the class it tests. `TransactionService` (in `transaction.service`) is tested from `TransactionServiceTest` in `src/test/java/.../transaction/service/`. This applies to all layers.

## What to test in each layer

| Layer | Test type | Tools |
|---|---|---|
| `service/` | Unit test with mocks | JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`, `@Mock`, `@InjectMocks`) |
| `repository/` | Integration test with real (embedded) DB | `@DataJpaTest` + H2 |
| `dto/` (validation) | Bean Validation unit test | `Validation.buildDefaultValidatorFactory()` directly, no Spring context |
| `controller/` | (add when needed) | `@WebMvcTest` + `MockMvc` |

Don't test Lombok getters/setters or trivial mappings without logic.

## Service tests: mock the dependencies, not the database

```java
@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private CategoryService categoryService;   // mock the other feature's SERVICE, not its repository

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void create_conCategoriaExistente_guardaYDevuelveLaTransaccion() {
        // arrange -> act -> assert, with descriptive Spanish test names
    }
}
```

Name tests as `method_scenario_expectedResult()` **in Spanish** (`create_conCategoriaInexistente_lanzaResourceNotFoundException`) — it reads like a sentence and documents behavior without needing comments. This is a deliberate naming convention for this project, distinct from the general "identifiers in English" rule.

## Repository tests: `@DataJpaTest` with H2

`@DataJpaTest` automatically replaces the configured datasource (Postgres) with an embedded one (H2, already in `pom.xml` as a test dependency) — no extra configuration needed. Use this to test derived queries and custom `@Query`, not to test business logic (that goes in the service test with mocks).

**Spring Boot 4 note**: `@DataJpaTest` lives in `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest` (not in `org.springframework.boot.test.autoconfigure.orm.jpa`, which was the package in Spring Boot 3.x). If you see that import failing when copying code from old examples, that's why.

## DTO validation tests: no Spring context

To test a record's `@NotNull`/`@Positive`/etc. annotations, there's no need to spin up Spring — a plain Bean Validation `Validator` is enough:

```java
try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
    validator = factory.getValidator();
}
```

This runs in milliseconds compared to a test that boots a Spring context.

## Before considering a feature done

`./mvnw clean test` has to pass entirely. If you added a new endpoint, also test it manually against the running app (`curl` or Swagger UI) — automated tests don't replace real end-to-end verification.
