# ==============================================================================
# PHASE 1: Build Stage (Multi-stage build)
# ==============================================================================
FROM gradle:8.5-jdk17 AS builder

# Set workspace directory inside the builder container
WORKDIR /app

# Copy dependency configuration files first to leverage Docker layer caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew ./

# Ensure gradlew has correct execute permissions
RUN chmod +x gradlew

# Pre-fetch and cache all dependencies (without compiling sources)
RUN ./gradlew dependencies --no-daemon || true

# Copy the actual application source code
COPY src ./src

# Compile and package the bootable JAR file
# Disable tests during build as database/services might not be available during building on Render
RUN ./gradlew bootJar -x test --no-daemon

# ==============================================================================
# PHASE 2: Lightweight Runtime Stage
# ==============================================================================
FROM eclipse-temurin:17-jre-jammy

# Set up a secure, non-privileged system user and group
RUN groupadd -r spring && useradd -r -g spring spring

# Define working directory and ensure permissions are correct
WORKDIR /app
RUN chown spring:spring /app

# Switch to the non-root user for executing the app
USER spring:spring

# Copy only the compiled executable JAR from the builder stage
COPY --chown=spring:spring --from=builder /app/build/libs/*.jar app.jar

# Inform Docker that the container listens on port 8080 (Render dynamically overrides this using $PORT)
EXPOSE 8080

# Configure JVM flags specifically tuned for container/cloud environments (like Render's Free tier):
# - -XX:+UseG1GC: Standard modern garbage collector.
# - -XX:MaxRAMPercentage=75.0: Tells the JVM to only use up to 75% of container RAM, leaving headroom for the OS/metaspace.
# - -XX:+ExitOnOutOfMemoryError: Ensures the container exits and restarts if JVM runs out of memory.
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:MinRAMPercentage=50.0 -XX:+ExitOnOutOfMemoryError"

# Start the Spring Boot application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
