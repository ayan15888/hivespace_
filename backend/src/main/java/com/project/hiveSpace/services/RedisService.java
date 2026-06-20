package com.project.hiveSpace.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;

@Service
public class RedisService {

    private final RestClient restClient;

    public RedisService(
            @Value("${upstash.redis.url}") String baseUrl,
            @Value("${upstash.redis.token}") String token) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + token)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    /**
     * Attempts to acquire a lock using SET NX EX.
     * Returns true if the lock was acquired successfully, false otherwise.
     */
    public boolean acquireLock(String lockKey, String value, int expireSeconds) {
        try {
            List<String> command = List.of("SET", lockKey, value, "NX", "EX", String.valueOf(expireSeconds));
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/")
                    .body(command)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("result")) {
                Object result = response.get("result");
                return "OK".equals(result);
            }
            return false;
        } catch (Exception e) {
            System.err.println("Redis failed to acquire lock: " + e.getMessage());
            return false;
        }
    }

    /**
     * Releases a lock by deleting the lock key.
     */
    public void releaseLock(String lockKey) {
        try {
            List<String> command = List.of("DEL", lockKey);
            restClient.post()
                    .uri("/")
                    .body(command)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            System.err.println("Redis failed to release lock: " + e.getMessage());
        }
    }

    /**
     * Sets a simple key-value pair in Redis.
     */
    public void setValue(String key, String value) {
        try {
            List<String> command = List.of("SET", key, value);
            restClient.post()
                    .uri("/")
                    .body(command)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            System.err.println("Redis failed to set value: " + e.getMessage());
        }
    }

    /**
     * Gets a value from Redis by key.
     */
    public String getValue(String key) {
        try {
            List<String> command = List.of("GET", key);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri("/")
                    .body(command)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("result")) {
                Object result = response.get("result");
                return result != null ? result.toString() : null;
            }
            return null;
        } catch (Exception e) {
            System.err.println("Redis failed to get value: " + e.getMessage());
            return null;
        }
    }
}
