# Etapa 1: compilar el jar con Maven (usando el wrapper del proyecto).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Primero solo el pom para cachear la descarga de dependencias.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# Etapa 2: imagen final, solo el runtime + el jar.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring
COPY --from=build /build/target/*.jar app.jar
USER spring

EXPOSE 51841
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
