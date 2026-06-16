package com.reportportal.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Main client for submitting test results to Report Portal.
 * Provides both simple static methods and builder pattern for flexibility.
 * 
 * <p>Usage Examples:</p>
 * 
 * <pre>
 * // Simple usage
 * ReportPortalClient.submitRun("Enterprise", "Keycloak", "Realm Tests", 8, 0);
 * 
 * // Builder pattern with more options
 * ReportPortalClient.builder()
 *     .portfolio("Enterprise")
 *     .project("Keycloak Automation")
 *     .pack("Realm & User Setup")
 *     .passed(8)
 *     .failed(0)
 *     .skipped(0)
 *     .duration(5432)
 *     .environment("DEV")
 *     .submit();
 * </pre>
 */
public class ReportPortalClient {

    private static final Logger logger = LoggerFactory.getLogger(ReportPortalClient.class);
    private static final String SUBMIT_ENDPOINT = "/api/automation-runs/submit";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)  // Force HTTP/1.1 for compatibility
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Simple method to submit test run with required fields only.
     * Uses configuration from reportportal.properties for URL.
     * 
     * @param portfolioName Portfolio name
     * @param projectName Project name
     * @param packName Automation pack name
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRun(String portfolioName, String projectName, 
                                                   String packName, int passed, int failed) 
            throws ReportPortalException {
        
        RunSubmission submission = new RunSubmission(portfolioName, projectName, packName, passed, failed);
        return submitRun(submission, new ReportPortalConfig());
    }

    /**
     * Submit test run with all optional fields.
     * 
     * @param portfolioName Portfolio name
     * @param projectName Project name
     * @param packName Automation pack name
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @param skipped Number of skipped tests
     * @param duration Test duration in milliseconds
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRun(String portfolioName, String projectName, 
                                                   String packName, int passed, int failed,
                                                   int skipped, long duration) 
            throws ReportPortalException {
        
        RunSubmission submission = new RunSubmission(portfolioName, projectName, packName, passed, failed);
        submission.setSkipped(skipped);
        submission.setDuration(duration);
        return submitRun(submission, new ReportPortalConfig());
    }

    /**
     * Submit test run with RunSubmission object.
     * 
     * @param submission Run submission data
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRun(RunSubmission submission) throws ReportPortalException {
        return submitRun(submission, new ReportPortalConfig());
    }

    /**
     * Submit test run with custom configuration.
     * 
     * @param submission Run submission data
     * @param config Report Portal configuration
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRun(RunSubmission submission, ReportPortalConfig config) 
            throws ReportPortalException {
        
        // Check if Report Portal is enabled
        if (!config.isEnabled()) {
            logger.info("Report Portal is disabled. Skipping submission.");
            RunSubmissionResponse response = new RunSubmissionResponse();
            response.setSuccess(false);
            response.setMessage("Report Portal is disabled");
            return response;
        }

        // Validate configuration
        try {
            config.validate();
        } catch (IllegalStateException e) {
            throw new ReportPortalException("Invalid configuration: " + e.getMessage(), e);
        }

        // Validate submission
        validateSubmission(submission);

        logger.info("Submitting test run to Report Portal: {}", submission);

        int retries = config.getRetries();
        ReportPortalException lastException = null;

        for (int attempt = 0; attempt <= retries; attempt++) {
            try {
                return doSubmit(submission, config);
            } catch (ReportPortalException e) {
                lastException = e;
                if (attempt < retries) {
                    logger.warn("Submission attempt {} failed: {}. Retrying...", attempt + 1, e.getMessage());
                    try {
                        Thread.sleep(1000 * (attempt + 1)); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new ReportPortalException("Submission interrupted", ie);
                    }
                }
            }
        }

        logger.error("Failed to submit to Report Portal after {} attempts", retries + 1);
        throw lastException;
    }

    /**
     * Perform the actual HTTP submission.
     */
    private static RunSubmissionResponse doSubmit(RunSubmission submission, ReportPortalConfig config) 
            throws ReportPortalException {
        
        try {
            // Convert submission to JSON
            String jsonPayload = objectMapper.writeValueAsString(submission);
            
            // Build request
            String url = config.getUrl() + SUBMIT_ENDPOINT;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofMillis(config.getTimeout()))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            // Send request
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Check response status
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                RunSubmissionResponse result = objectMapper.readValue(response.body(), RunSubmissionResponse.class);
                logger.info("✅ Report Portal submission successful: {} (Run ID: {})", 
                    result.getLocation(), result.getRunId());
                return result;
            } else {
                String errorMessage = String.format("Submission failed with status %d", response.statusCode());
                logger.error("❌ {}: {}", errorMessage, response.body());
                throw new ReportPortalException(errorMessage, response.statusCode(), response.body());
            }

        } catch (ReportPortalException e) {
            throw e;
        } catch (Exception e) {
            throw new ReportPortalException("Failed to submit to Report Portal: " + e.getMessage(), e);
        }
    }

    /**
     * Validate submission data.
     */
    private static void validateSubmission(RunSubmission submission) throws ReportPortalException {
        if (submission.getPortfolioName() == null || submission.getPortfolioName().trim().isEmpty()) {
            throw new ReportPortalException("Portfolio name is required");
        }
        if (submission.getProjectName() == null || submission.getProjectName().trim().isEmpty()) {
            throw new ReportPortalException("Project name is required");
        }
        if (submission.getPackName() == null || submission.getPackName().trim().isEmpty()) {
            throw new ReportPortalException("Pack name is required");
        }
        if (submission.getPassed() == null || submission.getPassed() < 0) {
            throw new ReportPortalException("Passed count must be >= 0");
        }
        if (submission.getFailed() == null || submission.getFailed() < 0) {
            throw new ReportPortalException("Failed count must be >= 0");
        }
    }

    /**
     * Create a builder for fluent API.
     * 
     * @return Builder instance
     */
    public static Builder builder() {
        return new Builder();
    }

    /**
     * Builder class for fluent API.
     */
    public static class Builder {
        private final RunSubmission submission = new RunSubmission();
        private ReportPortalConfig config = new ReportPortalConfig();

        private Builder() {
        }

        public Builder portfolio(String portfolioName) {
            submission.setPortfolioName(portfolioName);
            return this;
        }

        public Builder project(String projectName) {
            submission.setProjectName(projectName);
            return this;
        }

        public Builder pack(String packName) {
            submission.setPackName(packName);
            return this;
        }

        public Builder passed(int passed) {
            submission.setPassed(passed);
            return this;
        }

        public Builder failed(int failed) {
            submission.setFailed(failed);
            return this;
        }

        public Builder skipped(int skipped) {
            submission.setSkipped(skipped);
            return this;
        }

        public Builder duration(long durationMs) {
            submission.setDuration(durationMs);
            return this;
        }

        public Builder environment(String environment) {
            submission.setEnvironment(environment);
            return this;
        }

        public Builder tags(String tags) {
            submission.setTags(tags);
            return this;
        }

        public Builder notes(String notes) {
            submission.setNotes(notes);
            return this;
        }

        /**
         * Add a single test case result.
         * 
         * @param testCase Test case to add
         * @return This builder
         */
        public Builder testResult(TestCase testCase) {
            submission.addTestResult(testCase);
            return this;
        }

        /**
         * Add multiple test case results.
         * 
         * @param testCases Test cases to add
         * @return This builder
         */
        public Builder testResults(java.util.List<TestCase> testCases) {
            submission.addTestResults(testCases);
            return this;
        }

        public Builder config(ReportPortalConfig config) {
            this.config = config;
            return this;
        }

        /**
         * Submit the run to Report Portal.
         * 
         * @return Submission response
         * @throws ReportPortalException if submission fails
         */
        public RunSubmissionResponse submit() throws ReportPortalException {
            return ReportPortalClient.submitRun(submission, config);
        }

        /**
         * Submit the run to Report Portal with fail-safe behavior.
         * Logs errors but doesn't throw exceptions.
         * 
         * @return Submission response or null if failed
         */
        public RunSubmissionResponse submitSafe() {
            try {
                return submit();
            } catch (ReportPortalException e) {
                logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
                return null;
            }
        }
    }

    /**
     * Submit with fail-safe behavior - logs errors but doesn't throw exceptions.
     * Useful when you don't want Report Portal failures to break your tests.
     * 
     * @param portfolioName Portfolio name
     * @param projectName Project name
     * @param packName Automation pack name
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @return Submission response or null if failed
     */
    public static RunSubmissionResponse submitRunSafe(String portfolioName, String projectName, 
                                                      String packName, int passed, int failed) {
        try {
            return submitRun(portfolioName, projectName, packName, passed, failed);
        } catch (ReportPortalException e) {
            logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
            return null;
        }
    }

    /**
     * Submit with RunSubmission object using fail-safe behavior.
     * Logs errors but doesn't throw exceptions.
     * 
     * @param submission The run submission with all data including test cases
     * @return Submission response or null if failed
     */
    public static RunSubmissionResponse submitRunSafe(RunSubmission submission) {
        try {
            return submitRun(submission, new ReportPortalConfig());
        } catch (ReportPortalException e) {
            logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
            return null;
        }
    }

    /**
     * Submit test run with TestCaseRunner (automatic test case tracking).
     * Extracts all test results from the runner and submits to Report Portal.
     * Uses configuration from reportportal.properties.
     * 
     * <p>Usage Example:</p>
     * <pre>
     * TestCaseRunner runner = new TestCaseRunner();
     * runner.run("TC-001: Create Realm", () -> KeycloakAPIs.createRealm(token, realm));
     * runner.run("TC-002: Create Role", () -> KeycloakAPIs.createRole(token, realm, role));
     * 
     * // Submit everything - one line!
     * ReportPortalClient.submitWithRunner(runner, duration);
     * </pre>
     * 
     * @param runner TestCaseRunner with captured test results
     * @param duration Total test duration in milliseconds
     * @return Submission response or null if failed
     */
    public static RunSubmissionResponse submitWithRunner(TestCaseRunner runner, long duration) {
        try {
            ReportPortalConfig config = new ReportPortalConfig();
            String portfolio = config.getPortfolioName();
            String project = config.getProjectName();
            String pack = config.getPackName();
            
            if (portfolio == null || portfolio.trim().isEmpty()) {
                throw new ReportPortalException("Portfolio name not configured in reportportal.properties");
            }
            if (project == null || project.trim().isEmpty()) {
                throw new ReportPortalException("Project name not configured in reportportal.properties");
            }
            if (pack == null || pack.trim().isEmpty()) {
                throw new ReportPortalException("Pack name not configured in reportportal.properties");
            }
            
            RunSubmission submission = new RunSubmission(
                portfolio, 
                project, 
                pack, 
                runner.getPassedCount(), 
                runner.getFailedCount()
            );
            
            submission.setSkipped(runner.getSkippedCount());
            submission.setDuration(duration);
            submission.setTestResults(runner.getTestResults());
            
            logger.info("Submitting {} test cases from TestCaseRunner", runner.getTotalCount());
            return submitRun(submission, config);
            
        } catch (ReportPortalException e) {
            logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
            return null;
        }
    }

    /**
     * Submit test run with TestCaseRunner using explicit portfolio/project/pack names.
     * 
     * @param runner TestCaseRunner with captured test results
     * @param portfolioName Portfolio name
     * @param projectName Project name
     * @param packName Pack name
     * @param durationMs Total test duration in MILLISECONDS (NOT seconds!)
     * @return Submission response or null if failed
     */
    public static RunSubmissionResponse submitWithRunner(TestCaseRunner runner, 
                                                         String portfolioName, 
                                                         String projectName, 
                                                         String packName, 
                                                         long durationMs) {
        try {
            RunSubmission submission = new RunSubmission(
                portfolioName, 
                projectName, 
                packName, 
                runner.getPassedCount(), 
                runner.getFailedCount()
            );
            
            submission.setSkipped(runner.getSkippedCount());
            submission.setDuration(durationMs);  // Duration in milliseconds
            submission.setTestResults(runner.getTestResults());
            
            logger.info("Submitting {} test cases from TestCaseRunner", runner.getTotalCount());
            return submitRun(submission, new ReportPortalConfig());
            
        } catch (ReportPortalException e) {
            logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
            return null;
        }
    }

    /**
     * Submit test run with fully automatic configuration from properties.
     * Reads portfolio, project, and pack from reportportal.properties.
     * All three values must be configured in the properties file.
     * 
     * Usage example:
     * <pre>
     * // In reportportal.properties:
     * // reportportal.portfolio=Enterprise
     * // reportportal.project=Keycloak Automation
     * // reportportal.pack=Keycloak
     * 
     * ReportPortalClient.submitRunFromConfig(8, 0);
     * </pre>
     * 
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRunFromConfig(int passed, int failed)
            throws ReportPortalException {
        
        ReportPortalConfig config = new ReportPortalConfig();
        String portfolio = config.getPortfolioName();
        String project = config.getProjectName();
        String pack = config.getPackName();
        
        if (portfolio == null || portfolio.trim().isEmpty()) {
            throw new ReportPortalException("Portfolio name not configured in reportportal.properties");
        }
        if (project == null || project.trim().isEmpty()) {
            throw new ReportPortalException("Project name not configured in reportportal.properties");
        }
        if (pack == null || pack.trim().isEmpty()) {
            throw new ReportPortalException("Pack name not configured in reportportal.properties");
        }
        
        logger.info("Submitting from config - Portfolio: {}, Project: {}, Pack: {}", portfolio, project, pack);
        return submitRun(portfolio, project, pack, passed, failed);
    }

    /**
     * Submit test run with fully automatic configuration from properties (with duration).
     * 
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @param skipped Number of skipped tests
     * @param duration Test duration in milliseconds
     * @return Submission response
     * @throws ReportPortalException if submission fails
     */
    public static RunSubmissionResponse submitRunFromConfig(int passed, int failed, int skipped, long duration)
            throws ReportPortalException {
        
        ReportPortalConfig config = new ReportPortalConfig();
        String portfolio = config.getPortfolioName();
        String project = config.getProjectName();
        String pack = config.getPackName();
        
        if (portfolio == null || portfolio.trim().isEmpty()) {
            throw new ReportPortalException("Portfolio name not configured in reportportal.properties");
        }
        if (project == null || project.trim().isEmpty()) {
            throw new ReportPortalException("Project name not configured in reportportal.properties");
        }
        if (pack == null || pack.trim().isEmpty()) {
            throw new ReportPortalException("Pack name not configured in reportportal.properties");
        }
        
        logger.info("Submitting from config - Portfolio: {}, Project: {}, Pack: {}", portfolio, project, pack);
        return submitRun(portfolio, project, pack, passed, failed, skipped, duration);
    }

    /**
     * Submit test run with fully automatic configuration from properties (fail-safe).
     * 
     * @param passed Number of passed tests
     * @param failed Number of failed tests
     * @return Submission response or null if failed
     */
    public static RunSubmissionResponse submitRunFromConfigSafe(int passed, int failed) {
        try {
            return submitRunFromConfig(passed, failed);
        } catch (ReportPortalException e) {
            logger.warn("⚠️ Report Portal submission failed (non-critical): {}", e.getMessage());
            return null;
        }
    }
}

