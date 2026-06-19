package com.reportportal.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * Configuration loader for Report Portal client.
 * Loads settings from application.properties, falls back to reportportal.properties,
 * or throws an error if neither is found.
 */
public class ReportPortalConfig {

    private static final Logger logger = LoggerFactory.getLogger(ReportPortalConfig.class);
    
    // Define the configuration file hierarchy
    private static final String PRIMARY_CONFIG_FILE = "application.properties";
    private static final String FALLBACK_CONFIG_FILE = "reportportal.properties";
    
    private static final String DEFAULT_URL = "http://localhost:5000";
    private static final int DEFAULT_TIMEOUT = 5000; // 5 seconds
    private static final int DEFAULT_RETRIES = 2;

    private final Properties properties;

    public ReportPortalConfig() {
        this.properties = new Properties();
        loadProperties();
    }

    /**
     * Load properties looking for application.properties first, then reportportal.properties.
     * Throws an IllegalStateException if neither file is found.
     */
    private void loadProperties() {
        // 1. Try to load application.properties
        if (attemptLoadFromFile(PRIMARY_CONFIG_FILE)) {
            return;
        }
        
        // 2. If primary fails, try to load reportportal.properties
        logger.info("'{}' not found. Falling back to '{}'...", PRIMARY_CONFIG_FILE, FALLBACK_CONFIG_FILE);
        if (attemptLoadFromFile(FALLBACK_CONFIG_FILE)) {
            return;
        }
        
        // 3. If both fail, throw a hard error
        String errorMessage = String.format("Critical Configuration Error: Neither '%s' nor '%s' could be found in the classpath.", 
                                            PRIMARY_CONFIG_FILE, FALLBACK_CONFIG_FILE);
        logger.error(errorMessage);
        throw new IllegalStateException(errorMessage);
    }

    /**
     * Helper method to read the properties file from the classpath.
     * @param fileName The name of the file to load
     * @return true if successfully loaded, false if the file was not found
     */
    private boolean attemptLoadFromFile(String fileName) {
        try (InputStream input = Thread.currentThread()
                .getContextClassLoader()
                .getResourceAsStream(fileName)) {
            
            if (input != null) {
                properties.load(input);
                logger.info("✅ Report Portal configuration successfully loaded from {}", fileName);
                return true;
            }
        } catch (IOException e) {
            logger.warn("Failed to read configuration file '{}': {}", fileName, e.getMessage());
        }
        
        return false;
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