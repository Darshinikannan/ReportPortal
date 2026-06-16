package com.reportportal.client;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Utility class to automatically capture test case execution details.
 * Eliminates boilerplate code for tracking individual test cases.
 * 
 * <p>Usage Example:</p>
 * <pre>
 * TestCaseRunner runner = new TestCaseRunner();
 * 
 * // Each operation becomes one line
 * runner.run("TC-001: Create Realm", () -> {
 *     KeycloakAPIs.createRealm(token, realmName);
 * });
 * 
 * runner.run("TC-002: Create Role", () -> {
 *     KeycloakAPIs.createRole(token, realmName, roleName, roleDesc);
 * });
 * 
 * // Get results
 * List&lt;TestCase&gt; testCases = runner.getTestResults();
 * int passed = runner.getPassedCount();
 * int failed = runner.getFailedCount();
 * </pre>
 */
public class TestCaseRunner {
    
    private final List<TestCase> testResults;
    private int passedCount;
    private int failedCount;
    private int skippedCount;

    public TestCaseRunner() {
        this.testResults = new ArrayList<>();
        this.passedCount = 0;
        this.failedCount = 0;
        this.skippedCount = 0;
    }

    /**
     * Execute a test operation and automatically capture results.
     * 
     * @param testCaseName Name/description of the test case
     * @param testOperation The operation to execute
     * @return The created TestCase with captured details
     */
    public TestCase run(String testCaseName, TestOperation testOperation) {
        TestCase testCase = new TestCase(testCaseName);
        long startTime = System.currentTimeMillis();
        Date startDate = new Date(startTime);
        
        try {
            // Execute the test operation
            testOperation.execute();
            
            // Success
            testCase.setStatus("passed");
            passedCount++;
            
        } catch (Exception e) {
            // Failure
            testCase.setStatus("failed");
            testCase.setError(e.getMessage());
            testCase.setStackTrace(getStackTraceAsString(e));
            failedCount++;
            
            // Print error for user visibility
            System.err.println("Failed: " + e.getMessage());
        }
        
        // Set timing information
        long endTime = System.currentTimeMillis();
        testCase.setDuration(endTime - startTime);
        testCase.setStartTime(startDate);
        testCase.setEndTime(new Date(endTime));
        
        // Add to results list
        testResults.add(testCase);
        
        return testCase;
    }

    /**
     * Execute a test operation and automatically capture results (with console output).
     * Prints the test name before execution.
     * 
     * @param testCaseName Name/description of the test case
     * @param consoleMessage Message to print before execution
     * @param testOperation The operation to execute
     * @return The created TestCase with captured details
     */
    public TestCase run(String testCaseName, String consoleMessage, TestOperation testOperation) {
        System.out.println(consoleMessage);
        return run(testCaseName, testOperation);
    }

    /**
     * Mark a test case as skipped.
     * 
     * @param testCaseName Name/description of the test case
     * @param reason Reason for skipping
     * @return The created TestCase marked as skipped
     */
    public TestCase skip(String testCaseName, String reason) {
        TestCase testCase = new TestCase(testCaseName);
        testCase.setStatus("skipped");
        testCase.setError(reason);
        skippedCount++;
        testResults.add(testCase);
        return testCase;
    }

    /**
     * Get all captured test results.
     * 
     * @return List of TestCase objects
     */
    public List<TestCase> getTestResults() {
        return new ArrayList<>(testResults);
    }

    /**
     * Get the number of passed tests.
     * 
     * @return Count of passed tests
     */
    public int getPassedCount() {
        return passedCount;
    }

    /**
     * Get the number of failed tests.
     * 
     * @return Count of failed tests
     */
    public int getFailedCount() {
        return failedCount;
    }

    /**
     * Get the number of skipped tests.
     * 
     * @return Count of skipped tests
     */
    public int getSkippedCount() {
        return skippedCount;
    }

    /**
     * Get total number of tests executed.
     * 
     * @return Total test count
     */
    public int getTotalCount() {
        return passedCount + failedCount + skippedCount;
    }

    /**
     * Clear all test results and reset counters.
     */
    public void clear() {
        testResults.clear();
        passedCount = 0;
        failedCount = 0;
        skippedCount = 0;
    }

    /**
     * Convert exception stack trace to string.
     */
    private static String getStackTraceAsString(Exception e) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }

    /**
     * Functional interface for test operations.
     */
    @FunctionalInterface
    public interface TestOperation {
        void execute() throws Exception;
    }
}
