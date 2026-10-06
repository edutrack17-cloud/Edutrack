# =========================
# Build stage
# =========================
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Copy Maven wrapper and pom first
# This allows Docker to cache dependencies
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Make Maven wrapper executable
RUN chmod +x mvnw

# Download dependencies
RUN ./mvnw dependency:go-offline -DskipTests

# Copy application source
COPY src ./src

# Build the Spring Boot JAR
RUN ./mvnw clean package -DskipTests


# =========================
# Runtime stage
# =========================
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the generated Spring Boot JAR
COPY --from=build /app/target/edutrack-0.0.1-SNAPSHOT.jar app.jar

# Render provides the actual PORT at runtime.
# Spring Boot will use 8080 locally if PORT isn't set.
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]