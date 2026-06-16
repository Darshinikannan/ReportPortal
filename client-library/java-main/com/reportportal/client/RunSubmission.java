package com.reportportal.client;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.ArrayList;
import java.util.List;

/**
 * Request model for submitting automation run results to Report Portal.
 * Represents the payload sent to the flexible submission endpoint.
 * Supports individual test case results for detailed tracking.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RunSubmission {

    private String portfolioName;
    private String projectName;
    private String packName;
    private Integer passed;
    private Integer failed;
    private Integer skipped;
    private Long duration; // in milliseconds
    private String environment;
    private String tags;
    private String notes;
    private List<TestCase> testResults;

    // Default constructor
    public RunSubmission() {
    }

    // Constructor with required fields
    public RunSubmission(String portfolioName, String projectName, String packName, 
                        int passed, int failed) {
        this.portfolioName = portfolioName;
        this.projectName = projectName;
        this.packName = packName;
        this.passed = passed;
        this.failed = failed;
    }

    // Getters and Setters
    public String getPortfolioName() {
        return portfolioName;
    }

    public void setPortfolioName(String portfolioName) {
        this.portfolioName = portfolioName;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getPackName() {
        return packName;
    }

    public void setPackName(String packName) {
        this.packName = packName;
    }

    public Integer getPassed() {
        return passed;
    }

    public void setPassed(Integer passed) {
        this.passed = passed;
    }

    public Integer getFailed() {
        return failed;
    }

    public void setFailed(Integer failed) {
        this.failed = failed;
    }

    public Integer getSkipped() {
        return skipped;
    }

    public void setSkipped(Integer skipped) {
        this.skipped = skipped;
    }

    public Long getDuration() {
        return duration;
    }

    public void setDuration(Long duration) {
        this.duration = duration;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<TestCase> getTestResults() {
        return testResults;
    }

    public void setTestResults(List<TestCase> testResults) {
        this.testResults = testResults;
    }

    /**
     * Add a single test case result to this run.
     * 
     * @param testCase The test case to add
     */
    public void addTestResult(TestCase testCase) {
        if (this.testResults == null) {
            this.testResults = new ArrayList<>();
        }
        this.testResults.add(testCase);
    }

    /**
     * Add multiple test case results to this run.
     * 
     * @param testCases The test cases to add
     */
    public void addTestResults(List<TestCase> testCases) {
        if (this.testResults == null) {
            this.testResults = new ArrayList<>();
        }
        this.testResults.addAll(testCases);
    }

    @Override
    public String toString() {
        return String.format("RunSubmission{portfolio='%s', project='%s', pack='%s', passed=%d, failed=%d, skipped=%d, testResults=%d}",
            portfolioName, projectName, packName, passed, failed, skipped, 
            testResults != null ? testResults.size() : 0);
    }
}
