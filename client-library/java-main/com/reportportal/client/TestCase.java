package com.reportportal.client;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Date;

/**
 * Represents an individual test case result within an automation run.
 * Contains detailed information about test execution including status, duration, and errors.
 * 
 * <p>Usage Example:</p>
 * <pre>
 * TestCase testCase = new TestCase("TC-001: Create Realm");
 * testCase.setStatus("passed");
 * testCase.setDuration(2500L);
 * testCase.setStartTime(new Date(startTime));
 * testCase.setEndTime(new Date(endTime));
 * </pre>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TestCase {
    
    @JsonProperty("testCase")
    private String testCase;
    
    @JsonProperty("status")
    private String status;
    
    @JsonProperty("duration")
    private Long duration;
    
    @JsonProperty("startTime")
    private Date startTime;
    
    @JsonProperty("endTime")
    private Date endTime;
    
    @JsonProperty("retries")
    private Integer retries;
    
    @JsonProperty("error")
    private String error;
    
    @JsonProperty("stackTrace")
    private String stackTrace;
    
    @JsonProperty("screenshot")
    private String screenshot;
    
    @JsonProperty("video")
    private String video;

    /**
     * Default constructor for JSON deserialization.
     */
    public TestCase() {
    }

    /**
     * Constructor with test case name.
     * 
     * @param testCase The name or identifier of the test case
     */
    public TestCase(String testCase) {
        this.testCase = testCase;
        this.retries = 0; // Default to no retries
    }

    /**
     * Constructor with test case name and status.
     * 
     * @param testCase The name or identifier of the test case
     * @param status The test status: "passed", "failed", or "skipped"
     */
    public TestCase(String testCase, String status) {
        this.testCase = testCase;
        this.status = status;
        this.retries = 0;
    }

    /**
     * Constructor with test case name, status, and duration.
     * 
     * @param testCase The name or identifier of the test case
     * @param status The test status: "passed", "failed", or "skipped"
     * @param duration Duration in milliseconds
     */
    public TestCase(String testCase, String status, long duration) {
        this.testCase = testCase;
        this.status = status;
        this.duration = duration;
        this.retries = 0;
    }

    // Getters and Setters

    public String getTestCase() {
        return testCase;
    }

    public void setTestCase(String testCase) {
        this.testCase = testCase;
    }

    public String getStatus() {
        return status;
    }

    /**
     * Set the test status.
     * 
     * @param status Should be one of: "passed", "failed", "skipped"
     */
    public void setStatus(String status) {
        this.status = status;
    }

    public Long getDuration() {
        return duration;
    }

    /**
     * Set the test duration.
     * 
     * @param duration Duration in milliseconds
     */
    public void setDuration(Long duration) {
        this.duration = duration;
    }

    public Date getStartTime() {
        return startTime;
    }

    public void setStartTime(Date startTime) {
        this.startTime = startTime;
    }

    public Date getEndTime() {
        return endTime;
    }

    public void setEndTime(Date endTime) {
        this.endTime = endTime;
    }

    public Integer getRetries() {
        return retries;
    }

    public void setRetries(Integer retries) {
        this.retries = retries;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getStackTrace() {
        return stackTrace;
    }

    public void setStackTrace(String stackTrace) {
        this.stackTrace = stackTrace;
    }

    public String getScreenshot() {
        return screenshot;
    }

    public void setScreenshot(String screenshot) {
        this.screenshot = screenshot;
    }

    public String getVideo() {
        return video;
    }

    public void setVideo(String video) {
        this.video = video;
    }

    @Override
    public String toString() {
        return "TestCase{" +
                "testCase='" + testCase + '\'' +
                ", status='" + status + '\'' +
                ", duration=" + duration +
                ", retries=" + retries +
                '}';
    }
}
