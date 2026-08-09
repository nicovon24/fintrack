# Gastos e Ingresos - AI Agent Guidelines

## Project Overview

REST API for personal finance management: income, expenses, categories, and (planned) investments and excel import. This is v1 of a bigger project: later an Angular frontend and investment modules with real-time quotes get added.

## Rule-Selection Guide (Token Optimization)

Read ONLY the rule files relevant to your current task. Always read `general.md` first (it's short).

| Task | Read these files |
|---|---|
| Create/modify a JPA entity | `entity-rules.md` |
| Create/modify a repository | `repository-rules.md` |
| Create/modify a service | `service-rules.md` |
| Create/modify a controller | `controller-rules.md` |
| Create/modify DTOs | `dto-rules.md` |
| Write tests | `testing-rules.md` |
| Full feature (all layers) | `entity-rules.md`, `repository-rules.md`, `service-rules.md`, `controller-rules.md`, `dto-rules.md`, `testing-rules.md` |

## Stack

- **Java 25** + **Spring Boot 4.1.0** (Maven)
- **PostgreSQL** (via local Docker Compose, port 55432)
- **Lombok** for boilerplate (getters/setters/constructors)
- **Bean Validation** (jakarta.validation) on request DTOs
- **springdoc-openapi 3.1.0** for Swagger (`/swagger-ui/index.html`)
- **JUnit 5 + Mockito + AssertJ + H2** for tests

## Architecture: package-by-feature

Each feature is a self-contained package under `com.nicolas.finanzas.{feature}/`:

```
com.nicolas.finanzas.{feature}/
├── controller/    # REST endpoints, delegates to the service
├── service/       # business logic
├── repository/    # Spring Data JPA
├── model/         # JPA entities (persistence only, no logic)
└── dto/           # request/response records
```

Golden rule: if a feature has only one file for a layer, it goes as a loose file at the root of the feature's package (e.g. `Category.java` directly in `category/` if there were no other models). If there are two or more, they go in their subfolder (`model/`, `dto/`, etc.). Today every feature has full subfolders.

Code shared between features (doesn't belong to any one in particular) goes in `com.nicolas.finanzas.exception/`.

## Communication between features

A service can inject another feature's service (never its repository or entity directly from outside the owning feature). Example: `TransactionService` injects `CategoryService` and calls `categoryService.getCategoryOrThrow(id)` — that method is `public` in `CategoryService` precisely so it can be called from another package.

## Commands

```bash
# Start local Postgres
docker compose up -d

# Run the app (make sure JDK 25 is active)
./mvnw spring-boot:run

# Run tests
./mvnw clean test
```

**Important about Lombok and JDK 25**: `pom.xml` explicitly configures `annotationProcessorPaths` for Lombok in `maven-compiler-plugin`. Without that, Lombok's automatic detection as an annotation processor may not run under JDK 25, and generated getters/setters won't exist, causing compile errors like "cannot find symbol: method getX()". If you add another annotation processor (e.g. MapStruct) in the future, add it there too.

## Language Policy

- Code comments, Javadoc, README/HELP/docs, commit messages, `.agentic-rules/` prose: **English**.
- Anything visible to API consumers or end users at runtime — validation `message` attributes, exception messages, error bodies, Swagger `@Tag`/`@Operation`/`@Parameter` text: **Spanish**.
- Class/method/variable/endpoint names: English, as usual — except test method names, which stay Spanish sentences per `testing-rules.md` (existing convention, e.g. `create_conCategoriaInexistente_lanzaResourceNotFoundException`).

## General Rules

1. DTOs (records) for all client communication — never expose JPA entities directly.
2. Keep the architecture simple. Don't over-design for hypothetical future cases.
3. Follow each layer's rules in `.agentic-rules/`.
4. Before considering a task done: verify it compiles (`./mvnw clean compile`) and tests pass (`./mvnw test`).
5. Every non-trivial new feature should have its spec in `docs/specs/` before being implemented.
