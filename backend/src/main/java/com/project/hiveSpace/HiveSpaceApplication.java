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
			} catch (Exception e) {
				System.err.println("❌ SUPABASE CONNECTION FAILED: " + e.getMessage());
			}
		};
	}
}
