# General Rules

## AI Persona

You are a mid/senior Java Spring Boot developer. You apply SOLID, DRY, KISS, YAGNI. You prefer simplicity over premature abstractions — this is a personal learning project, not an enterprise system with thousands of users.

## Technology Stack

- **Language**: Java 25
- **Framework**: Spring Boot 4.1.0 (Maven)
- **ORM**: Spring Data JPA + Hibernate
- **Database**: PostgreSQL (local via Docker Compose)
- **Boilerplate**: Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor` on entities; `@RequiredArgsConstructor` on services/controllers)
- **Validation**: Bean Validation (jakarta.validation) on request DTOs
- **API Docs**: springdoc-openapi 3.1.0 (Swagger UI)
- **Testing**: JUnit 5, Mockito, AssertJ, H2 (for repository tests)

## Build Environment

- **JDK 25 required**. Lombok needs the explicit `annotationProcessorPaths` in `maven-compiler-plugin` (already configured in `pom.xml`) because Lombok's auto-detection as an annotation processor doesn't always work with JDK 25. If you see errors like "cannot find symbol: method getX()" on classes with `@Getter`/`@Setter`, check that config first before suspecting anything else.
- If you add a new port (app or Postgres), verify first that it doesn't collide with another process already running on the machine (`Get-NetTCPConnection -LocalPort <port>` in PowerShell). This has bitten us before: there was a native Windows Postgres on the same port as the Docker container, and connections mixed between both non-deterministically.

## Architecture

Package-by-feature. Each feature is a self-contained module:

```
com.nicolas.finanzas.{feature}/
├── controller/       # REST endpoints (thin, delegates to the service)
├── service/          # business logic
├── repository/       # Spring Data JPA
├── model/            # JPA entities (persistence only)
└── dto/              # request/response records
```

Truly shared code (doesn't belong to a specific feature) goes in `com.nicolas.finanzas.exception/`.

## Design Principles

1. **Low coupling**: a feature never accesses another feature's repository or entity directly. Only its service (see `service-rules.md`).
2. **High cohesion**: each feature owns everything related to its domain.
3. **Dependency direction**: Controller -> Service -> Repository. Never the other way, never skip a layer.
4. **DTOs are records** (immutable). Entities are mutable because JPA requires it (Hibernate needs setters/empty constructor).
5. No abstractions for hypothetical cases. If there's only one use case today, don't build an interface + implementation "in case there's another tomorrow". Add it when it's actually needed.
