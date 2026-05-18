package com.project.hiveSpace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import io.github.cdimascio.dotenv.Dotenv;
import javax.sql.DataSource;
import java.sql.Connection;

@SpringBootApplication
public class HiveSpaceApplication {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv.configure()
				.directory("..") // Point to root since we are in backend/
				.ignoreIfMalformed()
				.ignoreIfMissing()
				.load();
		
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		
		SpringApplication.run(HiveSpaceApplication.class, args);
	}

	@Bean
	public CommandLineRunner commandLineRunner(DataSource dataSource) {
		return args -> {
			try (Connection connection = dataSource.getConnection()) {
				System.out.println("✅ SUPABASE CONNECTED: " + connection.getMetaData().getURL());
				try (java.sql.Statement statement = connection.createStatement()) {
					statement.execute("ALTER TABLE users DROP COLUMN IF EXISTS role");
					System.out.println("🚀 DATABASE RESTRUCTURED: dropped 'role' column from 'users' table successfully.");
				} catch (Exception ex) {
					System.err.println("⚠️ Could not drop legacy role column: " + ex.getMessage());
				}
			} catch (Exception e) {
				System.err.println("❌ SUPABASE CONNECTION FAILED: " + e.getMessage());
			}
		};
	}
}
