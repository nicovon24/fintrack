package com.nicolas.finanzas;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FinanzasApplication {

	public static void main(String[] args) {
		loadDotenv();
		SpringApplication.run(FinanzasApplication.class, args);
	}

	private static void loadDotenv() {
		Path envFile = Path.of(".env");
		if (!Files.isRegularFile(envFile)) {
			return;
		}

		List<String> lines;
		try {
			lines = Files.readAllLines(envFile);
		} catch (IOException e) {
			return;
		}

		for (String line : lines) {
			String trimmed = line.trim();
			if (trimmed.isEmpty() || trimmed.startsWith("#")) {
				continue;
			}

			int separator = trimmed.indexOf('=');
			if (separator < 0) {
				continue;
			}

			String key = trimmed.substring(0, separator).trim();
			String value = trimmed.substring(separator + 1).trim().replaceAll("^\"|\"$", "");

			if (System.getenv(key) == null && System.getProperty(key) == null) {
				System.setProperty(key, value);
			}
		}
	}
}
