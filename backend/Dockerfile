# Multi-stage build for Spring Boot backend
# Stage 1: Build JAR with Gradle
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon

# Stage 2: Run with minimal JRE
FROM eclipse-temurin:17-jre-jammy

ARG APP_VERSION=local
LABEL org.opencontainers.image.revision=$APP_VERSION

WORKDIR /app

# Create non-root user for security
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system appgroup \
    && useradd --system --gid appgroup appuser

# Copy built JAR from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Create uploads directory and set ownership
RUN mkdir -p /app/storage/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
