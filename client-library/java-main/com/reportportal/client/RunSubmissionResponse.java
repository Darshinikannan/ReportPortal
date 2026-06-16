package com.reportportal.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Response model for Report Portal submission.
 * Contains the result of the submission operation.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class RunSubmissionResponse {

    private boolean success;
    private String runId;
    private String location;
    private String message;

    public RunSubmissionResponse() {
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getRunId() {
        return runId;
    }

    public void setRunId(String runId) {
        this.runId = runId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return String.format("RunSubmissionResponse{success=%s, runId='%s', location='%s', message='%s'}",
            success, runId, location, message);
    }
}
