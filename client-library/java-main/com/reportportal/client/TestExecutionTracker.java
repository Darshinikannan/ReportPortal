package com.reportportal.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Generic test execution tracker that collects test case details automatically.
 * Designed to be framework-agnostic - works with JUnit, TestNG, Cucumber, or any test framework.
 * 
 * <p>Minimizes code needed in test listeners/hooks by handling all tracking logic internally.</p>
 * 
 * <p>Usage Example (JUnit 5):</p>
 * <pre>
 * public class MyListener implements TestExecutionListener {
 *     private final TestExecutionTracker tracker = new TestExecutionTracker();
 *     
 *     public void executionStarted(TestIdentifier test) {
 *         if (test.isTest()) tracker.testStarted(test.getUniqueId());
 *     }
 *     
 *     public void executionFinished(TestIdentifier test, TestExecutionResult result) {
 *         if (test.isTest()) {
 *             tracker.testFinished(
 *                 test.getUniqueId(),
 *                 test.getDisplayName(),
 *                 result.getStatus().name(),
 *                 result.getThrowable().orElse(null)
 *             );
 *         }
 *     }
 *     
 *     public void testPlanExecutionFinished(TestPlan plan) {
 *         tracker.submitToReportPortal();
 *     }
 * }
 * </pre>
 */
public class TestExecutionTracker {
    
    private static final Logger logger = LoggerFactory.getLogger(TestExecutionTracker.class);
    
    private final Map<String, Long> testStartTimes = new ConcurrentHashMap<>();
    private final List<TestCase> testCaseDetails = new CopyOnWriteArrayList<>();
    
    private final AtomicInteger passed = new AtomicInteger(0);
    private final AtomicInteger failed = new AtomicInteger(0);
    private final AtomicInteger skipped = new AtomicInteger(0);
    
    /**
     * Record that a test has started execution.
     * 
     * @param testId Unique identifier for the test (any string that uniquely identifies the test)
     */
    public void testStarted(String testId) {
        testStartTimes.put(testId, System.currentTimeMillis());
    }
    
    /**
     * Record that a test has finished execution.
     * Automatically calculates duration and formats the test case details.
     * 
     * @param testId Unique identifier for the test (same as passed to testStarted)
     * @param testName Display name for the test (shown in Report Portal UI)
     * @param status Test status - any string like "SUCCESSFUL", "FAILED", "ABORTED", "passed", "failed", etc.
     * @param error Optional throwable/exception if test failed (can be null)
     */
    public void testFinished(String testId, String testName, String status, Throwable error) {
        // Normalize status to standard format
        String normalizedStatus = normalizeStatus(status);
        
        // Update counts
        switch (normalizedStatus) {
            case "passed":
                passed.incrementAndGet();
                break;
            case "failed":
                failed.incrementAndGet();
                break;
            case "skipped":
                skipped.incrementAndGet();
                break;
        }
        
        // Calculate duration
        Long startTime = testStartTimes.remove(testId);
        long duration = (startTime != null) ? (System.currentTimeMillis() - startTime) : 0L;
        
        // Create test case with details
        TestCase testCase = new TestCase(testName, normalizedStatus, duration);
        
        // Add error details if present
        if (error != null) {
            testCase.setError(error.getMessage() != null ? error.getMessage() : error.getClass().getSimpleName());
        }
        
        testCaseDetails.add(testCase);
    }
    
    /**
     * Normalize various status strings to standard format.
     * Handles JUnit statuses, TestNG statuses, and common variations.
     * 
     * @param status Raw status string from test framework
     * @return Normalized status: "passed", "failed", or "skipped"
     */
    private String normalizeStatus(String status) {
        if (status == null) return "unknown";
        
        String lower = status.toLowerCase();
        
        // Handle common success statuses
        if (lower.contains("success") || lower.equals("passed") || lower.equals("pass")) {
            return "passed";
        }
        
        // Handle common failure statuses
        if (lower.contains("fail") || lower.equals("failed") || lower.equals("error")) {
            return "failed";
        }
        
        // Handle common skip/abort statuses
        if (lower.contains("skip") || lower.contains("abort") || lower.contains("ignore") || lower.equals("disabled")) {
            return "skipped";
        }
        
        // Default to original if unknown
        return lower;
    }
    
    /**
     * Get current counts.
     * 
     * @return Array of [passed, failed, skipped]
     */
    public int[] getCounts() {
        return new int[]{passed.get(), failed.get(), skipped.get()};
    }
    
    /**
     * Get the list of all captured test case details.
     * 
     * @return List of TestCase objects
     */
    public List<TestCase> getTestCaseDetails() {
        return testCaseDetails;
    }
    
    /**
     * Submit all tracked results to Report Portal using configuration from reportportal.properties.
     * This is the simplest way to submit - just call this method when all tests are done.
     * 
     * @return Submission response, or null if submission failed
     */
    public RunSubmissionResponse submitToReportPortal() {
        int p = passed.get();
        int f = failed.get();
        int s = skipped.get();
        
        if ((p + f + s) == 0) {
            logger.warn("No test executions recorded. Skipping ReportPortal submission.");
            return null;
        }
        
        // Calculate total duration from all test cases
        long totalDuration = testCaseDetails.stream()
            .mapToLong(tc -> tc.getDuration() != null ? tc.getDuration() : 0L)
            .sum();
        
        try {
            logger.info("Submitting {} test results to ReportPortal (Passed: {}, Failed: {}, Skipped: {}, Duration: {} ms)", 
                       testCaseDetails.size(), p, f, s, totalDuration);
            
            return ReportPortalClient.submitRunFromConfig(p, f, s, totalDuration, testCaseDetails);
            
        } catch (Exception e) {
            logger.error("Failed to submit results to ReportPortal: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Submit results with custom configuration.
     * 
     * @param config Custom Report Portal configuration
     * @return Submission response, or null if submission failed
     */
    public RunSubmissionResponse submitToReportPortal(ReportPortalConfig config) {
        int p = passed.get();
        int f = failed.get();
        int s = skipped.get();
        
        if ((p + f + s) == 0) {
            logger.warn("No test executions recorded. Skipping ReportPortal submission.");
            return null;
        }
        
        // Calculate total duration from all test cases
        long totalDuration = testCaseDetails.stream()
            .mapToLong(tc -> tc.getDuration() != null ? tc.getDuration() : 0L)
            .sum();
        
        try {
            logger.info("Submitting {} test results to ReportPortal (Duration: {} ms)", 
                       testCaseDetails.size(), totalDuration);
            
            RunSubmission submission = new RunSubmission(
                config.getPortfolioName(),
                config.getProjectName(),
                config.getPackName(),
                p, f
            );
            submission.setSkipped(s);
            submission.setDuration(totalDuration);
            submission.setTestResults(testCaseDetails);
            
            return ReportPortalClient.submitRun(submission, config);
            
        } catch (Exception e) {
            logger.error("Failed to submit results to ReportPortal: {}", e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Reset all tracked data. Useful if you want to reuse the same tracker instance.
     */
    public void reset() {
        testStartTimes.clear();
        testCaseDetails.clear();
        passed.set(0);
        failed.set(0);
        skipped.set(0);
    }
}
