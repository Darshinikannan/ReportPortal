# Report Portal Integration Guide

Step-by-step guide to integrate **any test framework** (JUnit, TestNG, Cucumber, Playwright, etc.) with Report Portal.

> 📖 **Back to main documentation:** [Report Portal README](../README.md)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Add Report Portal Dependency](#step-1-add-report-portal-dependency)
3. [Configure Report Portal](#step-2-configure-report-portal)
4. [Integrate with Your Test Framework](#step-3-integrate-with-your-test-framework)
5. [Run Tests](#step-4-run-tests)
6. [Verify Results](#step-5-verify-results)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Features](#advanced-features)

---

## Prerequisites

Before integrating Report Portal with your test framework, ensure you have:

✅ **Java 11+** installed  
✅ **Maven** or **Gradle** build tool  
✅ **Report Portal backend** running (MongoDB + Node.js server)  
✅ Access to your test framework's **listener/hook mechanism**  

---

## Step 1: Add Report Portal Dependency

Choose your build tool and add the Report Portal client library:

### Option A: Maven (Recommended)

Add this dependency to your `pom.xml`:

```xml
<dependencies>
    <!-- Report Portal Client -->
    <dependency>
        <groupId>com.reportportal</groupId>
        <artifactId>report-portal-client</artifactId>
        <version>1.0.0</version>
    </dependency>
</dependencies>
```

### Option B: Gradle

Add this to your `build.gradle`:

```gradle
dependencies {
    implementation 'com.reportportal:report-portal-client:1.0.0'
}
```

### Option C: Manual JAR Installation

If your project doesn't use Maven/Gradle:

1. **Download the JAR** from:
   ```
   target/report-portal-client-1.0.0-with-dependencies.jar
   ```

2. **Add to your project:**
   - Copy JAR to your project's `lib/` folder
   - Add to classpath in your IDE
   - Or add to `pom.xml`:
     ```xml
     <dependency>
         <groupId>com.reportportal</groupId>
         <artifactId>report-portal-client</artifactId>
         <version>1.0.0</version>
         <scope>system</scope>
         <systemPath>${project.basedir}/lib/report-portal-client-1.0.0-with-dependencies.jar</systemPath>
     </dependency>
     ```

---

## Step 2: Configure Report Portal

Create a configuration file to tell the client where to send results.

### Create Configuration File

Create `src/test/resources/reportportal.properties`:

```properties
# Report Portal Backend URL
reportportal.url=http://localhost:5000

# Your Test Organization Structure
reportportal.portfolio=YourPortfolioName
reportportal.project=YourProjectName
reportportal.pack=YourTestPackName

# Optional: Advanced Settings
reportportal.timeout=5000
reportportal.retries=2
reportportal.enabled=true
```

### Configuration Options

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `reportportal.url` | ✅ Yes | Backend server URL | `http://localhost:5000` |
| `reportportal.portfolio` | ✅ Yes | Portfolio name | `Enterprise` |
| `reportportal.project` | ✅ Yes | Project name | `Automation` |
| `reportportal.pack` | ✅ Yes | Test pack/suite name | `Smoke Tests` |
| `reportportal.timeout` | ❌ No | HTTP timeout (ms) | `5000` (default) |
| `reportportal.retries` | ❌ No | Retry attempts | `2` (default) |
| `reportportal.enabled` | ❌ No | Enable/disable | `true` (default) |

## Step 3: Integrate with Your Test Framework

The integration requires **minimal code** - just 3 method calls in your test listener/hook!

### 🎯 Generic Integration Pattern

Report Portal provides a **framework-agnostic tracker** that works with any test framework:

```java
import com.reportportal.client.TestExecutionTracker;

// 1. Create tracker instance
private final TestExecutionTracker tracker = new TestExecutionTracker();

// 2. Call tracker.testStarted() when test starts
tracker.testStarted(testId);

// 3. Call tracker.testFinished() when test ends
tracker.testFinished(testId, testName, status, error);

// 4. Call tracker.submitToReportPortal() when all tests finish
tracker.submitToReportPortal();
```

That's it! The tracker handles:
- ✅ Counting passed/failed/skipped tests
- ✅ Calculating test durations
- ✅ Capturing error messages
- ✅ Normalizing status values
- ✅ Formatting and submitting data

---

### 📚 Framework-Specific Examples

#### JUnit 5 Integration

Create a test listener in `src/test/java/your/package/ReportPortalListener.java`:

```java
package your.package;

import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;
import com.reportportal.client.TestExecutionTracker;

public class ReportPortalListener implements TestExecutionListener {
    
    private final TestExecutionTracker tracker = new TestExecutionTracker();
    
    @Override
    public void executionStarted(TestIdentifier testIdentifier) {
        if (testIdentifier.isTest()) {
            tracker.testStarted(testIdentifier.getUniqueId());
        }
    }
    
    @Override
    public void executionFinished(TestIdentifier testIdentifier, 
                                   TestExecutionResult testExecutionResult) {
        if (testIdentifier.isTest()) {
            tracker.testFinished(
                testIdentifier.getUniqueId(),
                testIdentifier.getDisplayName(),
                testExecutionResult.getStatus().name(),
                testExecutionResult.getThrowable().orElse(null)
            );
        }
    }
    
    @Override
    public void testPlanExecutionFinished(TestPlan testPlan) {
        tracker.submitToReportPortal();
    }
}
```

**Register the listener:**

Create `src/test/resources/META-INF/services/org.junit.platform.launcher.TestExecutionListener`:
```
your.package.ReportPortalListener
```

---

#### TestNG Integration

Create a listener in `src/test/java/your/package/ReportPortalTestNGListener.java`:

```java
package your.package;

import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;
import com.reportportal.client.TestExecutionTracker;

public class ReportPortalTestNGListener implements ITestListener {
    
    private final TestExecutionTracker tracker = new TestExecutionTracker();
    
    @Override
    public void onTestStart(ITestResult result) {
        tracker.testStarted(result.getName());
    }
    
    @Override
    public void onTestSuccess(ITestResult result) {
        tracker.testFinished(
            result.getName(),
            result.getName(),
            "PASSED",
            null
        );
    }
    
    @Override
    public void onTestFailure(ITestResult result) {
        tracker.testFinished(
            result.getName(),
            result.getName(),
            "FAILED",
            result.getThrowable()
        );
    }
    
    @Override
    public void onTestSkipped(ITestResult result) {
        tracker.testFinished(
            result.getName(),
            result.getName(),
            "SKIPPED",
            null
        );
    }
    
    @Override
    public void onFinish(ITestContext context) {
        tracker.submitToReportPortal();
    }
}
```

**Register the listener in `testng.xml`:**
```xml
<suite name="Test Suite">
    <listeners>
        <listener class-name="your.package.ReportPortalTestNGListener"/>
    </listeners>
    <!-- Your tests here -->
</suite>
```

---

#### Cucumber Integration

Create a plugin in `src/test/java/your/package/ReportPortalCucumberPlugin.java`:

```java
package your.package;

import io.cucumber.plugin.EventListener;
import io.cucumber.plugin.event.*;
import com.reportportal.client.TestExecutionTracker;

public class ReportPortalCucumberPlugin implements EventListener {
    
    private final TestExecutionTracker tracker = new TestExecutionTracker();
    
    @Override
    public void setEventPublisher(EventPublisher publisher) {
        publisher.registerHandlerFor(TestCaseStarted.class, this::handleTestCaseStarted);
        publisher.registerHandlerFor(TestCaseFinished.class, this::handleTestCaseFinished);
        publisher.registerHandlerFor(TestRunFinished.class, event -> tracker.submitToReportPortal());
    }
    
    private void handleTestCaseStarted(TestCaseStarted event) {
        tracker.testStarted(event.getTestCase().getUri().toString());
    }
    
    private void handleTestCaseFinished(TestCaseFinished event) {
        tracker.testFinished(
            event.getTestCase().getUri().toString(),
            event.getTestCase().getName(),
            event.getResult().getStatus().name(),
            event.getResult().getError()
        );
    }
}
```

**Register the plugin:**
```java
@CucumberOptions(
    plugin = {"your.package.ReportPortalCucumberPlugin"}
)
```

---

#### Playwright (or any custom framework)

```java
import com.reportportal.client.TestExecutionTracker;

public class YourTestClass {
    
    private final TestExecutionTracker tracker = new TestExecutionTracker();
    
    @BeforeAll
    public void setupReportPortal() {
        // Tracker is ready
    }
    
    @Test
    public void yourTest() {
        String testId = "test-1";
        tracker.testStarted(testId);
        
        try {
            // Your test code here
            // ...
            tracker.testFinished(testId, "My Test", "PASSED", null);
        } catch (Exception e) {
            tracker.testFinished(testId, "My Test", "FAILED", e);
        }
    }
    
    @AfterAll
    public void submitResults() {
        tracker.submitToReportPortal();
    }
}
```

---

## Step 4: Run Tests

Run your tests normally using Maven, Gradle, or your IDE:

### Maven
```bash
mvn clean test
```

### Maven (specific test)
```bash
mvn -Dtest=YourTestClass test
```

### Gradle
```bash
gradle test
```

### IDE
Right-click test class → Run

---

## Step 5: Verify Results

### 1. Check Backend Logs

Your backend console should show:
```
📥 Flexible submission received: { ... }
   📋 Test Results Array (N tests): [{ name: "...", status: "..." }, ...]
✅ Run created: RUN-...
```

✅ If you see `📋 Test Results Array` → Success!  
❌ If you see `⚠️ No testResults array` → Integration issue

---

### 2. Check Report Portal UI

1. Open browser: `http://localhost:8080` (or your frontend URL)
2. Navigate to **Automation Runs**
3. Click on the latest run
4. Click **"Test Cases"** tab

You should see:
- ✅ Test Case Name
- ✅ Status (passed/failed/skipped)
- ✅ Duration (in milliseconds)
- ✅ Error Message (if failed)

---

### Disable Reporting Temporarily

Set in `reportportal.properties`:
```properties
reportportal.enabled=false
```

### Manual Submission (Without Tracker)

For custom test runners:
```java
ReportPortalClient.submitRun("Portfolio", "Project", "Pack", passed, failed, skipped);
```

---


**That's it!** Your test framework is now integrated with Report Portal.