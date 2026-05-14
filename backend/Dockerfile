# --- Build Stage ---
FROM gradle:8.5-jdk17 AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew
RUN ./gradlew build -x test

# --- Run Stage ---
# Use Temurin (standard replacement for OpenJDK)
FROM eclipse-temurin:17-jre-focal
WORKDIR /app
# Get the built .jar from the build stage
COPY --from=build /app/build/libs/hiveSpace-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
# Use memory limits for Render Free Tier (512MB)
ENTRYPOINT ["java", "-Xmx384m", "-Xms256m", "-jar", "app.jar"]
