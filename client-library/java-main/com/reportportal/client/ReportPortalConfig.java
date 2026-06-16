package com.reportportal.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Configuration loader for Report Portal client.
 * Loads settings from reportportal.properties file or environment variables.
 */
public class ReportPortalConfig {

    private static final Logger logger = LoggerFactory.getLogger(ReportPortalConfig.class);
    private static final String CONFIG_FILE = "reportportal.properties";
    private static final String DEFAULT_URL = "http://localhost:5000";
    private static final int DEFAULT_TIMEOUT = 5000; // 5 seconds
    private static final int DEFAULT_RETRIES = 2;

    private final Properties properties;

    public ReportPortalConfig() {
        this.properties = new Properties();
        loadProperties();
    }

    /**
     * Load properties from reportportal.properties file or environment variables
     */
    private void loadProperties() {
        // Try to load from classpath
        try (InputStream input = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(CONFIG_FILE)) {
            
            if (input != null) {
                properties.load(input);
                logger.info("Report Portal configuration loaded from {}", CONFIG_FILE);
            } else {
                logger.warn("Configuration file {} not found in classpath. Using defaults and environment variables.", CONFIG_FILE);
            }
        } catch (IOException e) {
            logger.warn("Failed to load configuration file: {}. Using defaults and environment variables.", e.getMessage());
        }
    }

    /**
     * Get property value with fallback to environment variable and default
     */
    private String getProperty(String key, String envVar, String defaultValue) {
        // Priority: 1. Properties file, 2. Environment variable, 3. Default
        String value = properties.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            value = System.getenv(envVar);
        }
        if (value == null || value.trim().isEmpty()) {
            value = defaultValue;
        }
        return value;
    }

    public String getUrl() {
        return getProperty("reportportal.url", "REPORTPORTAL_URL", DEFAULT_URL);
    }

    public String getPortfolioName() {
        return getProperty("reportportal.portfolio", "REPORTPORTAL_PORTFOLIO", null);
    }

    public String getProjectName() {
        return getProperty("reportportal.project", "REPORTPORTAL_PROJECT", null);
    }

    public String getPackName() {
        return getProperty("reportportal.pack", "REPORTPORTAL_PACK", null);
    }

    public int getTimeout() {
        String timeout = getProperty("reportportal.timeout", "REPORTPORTAL_TIMEOUT", String.valueOf(DEFAULT_TIMEOUT));
        try {
            return Integer.parseInt(timeout);
        } catch (NumberFormatException e) {
            logger.warn("Invalid timeout value: {}. Using default: {}", timeout, DEFAULT_TIMEOUT);
            return DEFAULT_TIMEOUT;
        }
    }

    public int getRetries() {
        String retries = getProperty("reportportal.retries", "REPORTPORTAL_RETRIES", String.valueOf(DEFAULT_RETRIES));
        try {
            return Integer.parseInt(retries);
        } catch (NumberFormatException e) {
            logger.warn("Invalid retries value: {}. Using default: {}", retries, DEFAULT_RETRIES);
            return DEFAULT_RETRIES;
        }
    }

    public boolean isEnabled() {
        String enabled = getProperty("reportportal.enabled", "REPORTPORTAL_ENABLED", "true");
        return Boolean.parseBoolean(enabled);
    }

    /**
     * Validate required configuration
     */
    public void validate() throws IllegalStateException {
        if (getUrl() == null || getUrl().trim().isEmpty()) {
            throw new IllegalStateException("Report Portal URL is not configured");
        }
    }

    @Override
    public String toString() {
        return String.format("ReportPortalConfig{url='%s', portfolio='%s', project='%s', pack='%s', timeout=%d, retries=%d, enabled=%s}",
            getUrl(), getPortfolioName(), getProjectName(), getPackName(), getTimeout(), getRetries(), isEnabled());
    }
}
