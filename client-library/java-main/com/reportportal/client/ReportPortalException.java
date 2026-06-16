package com.reportportal.client;

/**
 * Custom exception for Report Portal client errors.
 * This exception is thrown when submission to Report Portal fails.
 */
public class ReportPortalException extends Exception {

    private final int statusCode;
    private final String responseBody;

    public ReportPortalException(String message) {
        super(message);
        this.statusCode = -1;
        this.responseBody = null;
    }

    public ReportPortalException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = -1;
        this.responseBody = null;
    }

    public ReportPortalException(String message, int statusCode, String responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }

    @Override
    public String toString() {
        if (statusCode > 0) {
            return String.format("ReportPortalException: %s (Status: %d, Response: %s)", 
                getMessage(), statusCode, responseBody);
        }
        return super.toString();
    }
}
