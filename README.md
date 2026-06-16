# Report Portal - Test Automation Dashboard

A comprehensive test automation reporting and analytics platform with real-time dashboards, hierarchical organization (Portfolio → Project → Pack → Run), and seamless integration with Java test suites.

![Report Portal Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![Java](https://img.shields.io/badge/Java-11+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-brightgreen)

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Java Client Library](#java-client-library)
  - [Maven Dependency](#maven-dependency)
  - [Manual JAR Installation](#manual-jar-installation)
  - [Configuration](#configuration)
  - [Usage Examples](#usage-examples)
- [API Documentation](#api-documentation)
- [Data Model](#data-model)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Capabilities
- **Hierarchical Organization**: Portfolio → Project → Automation Pack → Automation Run
- **Real-time Dashboard**: Live updates via WebSocket
- **Comprehensive Metrics**: Pass rates, test counts, execution trends
- **Smart Entity Resolution**: Auto-creates missing portfolios/projects/packs
- **CSV Export**: Export data from any view for offline analysis
- **Pagination**: Handle large datasets efficiently (10 items per page)
- **Health Monitoring**: Automatic health status based on pass rates
  - ✅ Good: ≥ 85% pass rate
  - ⚠️ Fair: 70-84% pass rate
  - ❌ Poor: < 70% pass rate

### Dashboard Views
1. **KPI Cards**: Total portfolios, projects, packs, runs, tests (passed/failed)
2. **Portfolio Preview**: Top 3 portfolios with quick stats
3. **Recent Launches**: Last 5 automation runs with status indicators
4. **Detailed Views**: 
   - Portfolios list
   - Projects list (with optional portfolio filtering)
   - Automation packs list
   - Automation runs history

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Java Client   │────▶│  Node.js Backend │────▶│    MongoDB      │
│    Library      │     │   (REST + WS)    │     │   (Cloud/Local) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Frontend (HTML) │
                        │   + JavaScript   │
                        └──────────────────┘
```

### Components

1. **Backend** (`backend/`)
   - Node.js + Express REST API
   - Socket.IO for real-time updates
   - MongoDB for data persistence
   - Automatic sync cascade (Run → Pack → Project → Portfolio)

2. **Frontend** (`frontend/`)
   - Pure HTML/CSS/JavaScript (no frameworks)
   - Real-time updates via Socket.IO client
   - Responsive design with compact UI

3. **Client Library** (`client-library/`)
   - Java library for test suite integration
   - Automatic retry with exponential backoff
   - Configurable via properties file
   - Thread-safe singleton HTTP client

4. **Database Schemas** (`database-schemas/`)
   - JSON schema definitions for MongoDB collections

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **Java JDK**: 11 or higher
- **Maven**: 3.6 or higher
- **MongoDB**: 6.0 or higher (local or cloud)

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure MongoDB** (edit `backend/.env` or `backend/config/database.js`):
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/Report_Portal
   PORT=5000
   ```

3. **Start the server**:
   ```bash
   node server.js
   ```

   Expected output:
   ```
   ✅ Connected to MongoDB
   🚀 Server running on port 5000
   📡 Real-time updates enabled
   ```

### Frontend Setup

1. **Open the dashboard**:
   ```
   http://localhost:5000
   ```
   Or directly open `frontend/html/index.html` in a browser

2. **Available pages**:
   - Dashboard: `index.html`
   - Portfolios: `portfolios.html`
   - Projects: `projects.html`
   - Automation Packs: `automation-packs.html`
   - Automation Runs: `automation-runs.html`

---

## 📦 Java Client Library

The Report Portal Java client library provides seamless integration with your test automation suites.

### Maven Dependency

**Option 1: From Local Repository** (after building)

```xml
<dependency>
    <groupId>com.reportportal</groupId>
    <artifactId>report-portal-client</artifactId>
    <version>1.0.0</version>
</dependency>

<!-- SLF4J for logging -->
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-simple</artifactId>
    <version>2.0.9</version>
</dependency>
```

**Option 2: Install to Local Maven Repository**

```bash
cd client-library
mvn clean install
```

This installs the JAR to: `~/.m2/repository/com/reportportal/report-portal-client/1.0.0/`

### Manual JAR Installation

If not using Maven, you can manually include the JAR:

1. **Build the JAR**:
   ```bash
   cd client-library
   mvn clean package
   ```

2. **Copy the JAR** from `client-library/target/report-portal-client-1.0.0-with-dependencies.jar`

3. **Add to your project classpath**:
   - **IntelliJ IDEA**: File → Project Structure → Libraries → Add JAR
   - **Eclipse**: Right-click project → Build Path → Add External Archives
   - **Command line**: `java -cp "path/to/report-portal-client-1.0.0-with-dependencies.jar:." YourTestClass`

### Configuration

Create `reportportal.properties` in `src/test/resources/`:

```properties
# Report Portal Server URL
reportportal.url=http://localhost:5000

# Required: Hierarchical organization
reportportal.portfolio=Enterprise
reportportal.project=Automation
reportportal.pack=Keycloak

# Optional: Enable/disable reporting
reportportal.enabled=true

# Optional: Connection settings
reportportal.timeout=30000
reportportal.retries=3
```

### Usage Examples

#### Basic Usage

```java
import com.reportportal.client.ReportPortalClient;
import com.reportportal.client.TestCaseRunner;

public class KeycloakRunner {
    public static void main(String[] args) {
        // Initialize TestCaseRunner - automatic test case tracking!
        TestCaseRunner runner = new TestCaseRunner();
        long startTime = System.currentTimeMillis();
        
        // Each test becomes just 3 lines
        runner.run("TC-001: Create Realm", "Creating Realm...", () -> {
            KeycloakAPIs.createRealm(token, realmName);
        });
        
        runner.run("TC-002: Create Role", "Creating Role...", () -> {
            KeycloakAPIs.createRole(token, realmName, roleName, roleDesc);
        });
        
        // Submit everything - test cases included automatically!
        long duration = System.currentTimeMillis() - startTime;
        ReportPortalClient.submitWithRunner(runner, "Enterprise", "Keycloak", "Setup Tests", duration);
        
        System.out.println("✅ Results submitted with " + runner.getTotalCount() + " test cases");
    }
}
```

**What TestCaseRunner does automatically:**
- ✅ Captures timing (start/end/duration)
- ✅ Records status (passed/failed)
- ✅ Captures error messages
- ✅ Captures stack traces
- ✅ Counts passed/failed tests
- ✅ Stores all test case details

**No boilerplate code needed!**

#### With Skipped Tests and Duration

```java
import com.reportportal.client.ReportPortalClient;
import com.reportportal.client.TestCaseRunner;

public class RegressionTests {
    public static void main(String[] args) {
        TestCaseRunner runner = new TestCaseRunner();
        long startTime = System.currentTimeMillis();
        
        // Tests run automatically
        runner.run("TC-001: Login Test", () -> testLogin());
        runner.run("TC-002: Search Test", () -> testSearch());
        
        // Mark some as skipped
        runner.skip("TC-003: Payment Test", "Payment gateway unavailable");
        
        // Submit with all details captured automatically
        long duration = System.currentTimeMillis() - startTime;
        ReportPortalClient.submitWithRunner(runner, "Enterprise", "Regression", "Full Suite", duration);
        
        System.out.println("Passed: " + runner.getPassedCount());
        System.out.println("Failed: " + runner.getFailedCount());
        System.out.println("Skipped: " + runner.getSkippedCount());
    }
}
```

#### Safe Submission (No Exception)

```java
// Use submitWithRunner for fail-safe reporting
// Returns null on failure instead of throwing exception
TestCaseRunner runner = new TestCaseRunner();
runner.run("TC-001: Test Case", () -> yourTestLogic());

ReportPortalClient.submitWithRunner(runner, "Portfolio", "Project", "Pack", duration);
// If submission fails, it logs a warning but doesn't crash your tests
```

#### Programmatic Submission (Without Properties File)

```java
import com.reportportal.client.ReportPortalClient;
import com.reportportal.client.TestCaseRunner;

// With TestCaseRunner (recommended - automatic test case tracking)
TestCaseRunner runner = new TestCaseRunner();
runner.run("TC-001: Login", () -> testLogin());
runner.run("TC-002: Search", () -> testSearch());

long duration = System.currentTimeMillis() - startTime;
ReportPortalClient.submitWithRunner(
    runner,
    "Enterprise",           // portfolio name
    "Keycloak Automation",  // project name
    "Smoke Tests",          // pack name
    duration                // total duration
);

// Or simple submission without test cases (old way)
ReportPortalClient.submitRun(
    "Enterprise",           // portfolio name
    "Keycloak Automation",  // project name
    "Smoke Tests",          // pack name
    45,                     // passed
    2                       // failed
);
```

#### Using Builder Pattern (Advanced - Manual Test Case Management)

```java
import com.reportportal.client.ReportPortalClient;
import com.reportportal.client.RunSubmission;
import com.reportportal.client.TestCase;

// For advanced users who need fine-grained control
RunSubmission submission = ReportPortalClient.builder()
    .portfolio("Enterprise")
    .project("Keycloak")
    .pack("Regression Suite")
    .passed(89)
    .failed(3)
    .skipped(5)
    .duration(7200000L)
    .environment("Production")
    .tags("critical,regression,nightly")
    .notes("Nightly regression run")
    .build()
    .submit();

System.out.println("Run ID: " + submission.getRunId());

// Or use TestCaseRunner for automatic tracking (recommended)
TestCaseRunner runner = new TestCaseRunner();
runner.run("TC-001: Test", () -> yourTestLogic());
ReportPortalClient.submitWithRunner(runner, "Enterprise", "Keycloak", "Regression", duration);
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### 1. Submit Automation Run
```http
POST /automation-runs/submit
Content-Type: application/json

{
  "portfolioName": "Enterprise",
  "projectName": "Automation",
  "packName": "Keycloak",
  "passed": 45,
  "failed": 2,
  "skipped": 3,
  "duration": 3600000,
  "environment": "Staging",
  "tags": "smoke,critical"
}
```

**Response**:
```json
{
  "success": true,
  "runId": "RUN-1686480000000",
  "message": "Run created successfully",
  "location": "/api/automation-runs/RUN-1686480000000"
}
```

#### 2. Get Global Metrics
```http
GET /metrics
```

**Response**:
```json
{
  "totalPortfolios": 5,
  "totalProjects": 12,
  "totalAutomationPacks": 28,
  "totalAutomationRuns": 450,
  "totalTests": 15000,
  "totalPassedTests": 14250,
  "totalFailedTests": 750,
  "globalPassRate": 95.0
}
```

#### 3. Get Portfolios
```http
GET /portfolios
```

#### 4. Get Projects
```http
GET /projects
GET /projects?portfolio=Enterprise
```

#### 5. Get Automation Packs
```http
GET /automation-packs
GET /automation-packs?project=60f1b2c3d4e5f6g7h8i9j0k1
```

#### 6. Get Automation Runs
```http
GET /automation-runs
GET /automation-runs?pack=60f1b2c3d4e5f6g7h8i9j0k1
```

---

## 📊 Data Model

### Hierarchy
```
Portfolio
  └── Project (multiple)
        └── Automation Pack (multiple)
              └── Automation Run (multiple)
```

### Collections

#### Portfolio
- `name`: String
- `projectCount`: Number
- `totalTests`: Number (aggregated)
- `passedTests`: Number (aggregated)
- `failedTests`: Number (aggregated)
- `passRate`: Number (calculated)
- `health`: String (`good`, `fair`, `poor`)

#### Project
- `name`: String
- `portfolioId`: ObjectId (ref: Portfolio)
- `packCount`: Number
- `totalTests`: Number (aggregated from packs)
- `passRate`: Number
- `health`: String

#### Automation Pack
- `name`: String
- `projectId`: ObjectId (ref: Project)
- `portfolioId`: ObjectId (ref: Portfolio)
- `testCount`: Number (sum of passed + failed + skipped)
- `runCount`: Number
- `passed`, `failed`, `skipped`: Number
- `passRate`: Number

#### Automation Run
- `id`: String (unique)
- `packId`: ObjectId (ref: Automation Pack)
- `projectId`: ObjectId (ref: Project)
- `portfolioId`: ObjectId (ref: Portfolio)
- `passed`, `failed`, `skipped`, `total`: Number
- `status`: String (`passed`, `failed`, `running`, `pending`)
- `duration`: Number (milliseconds)
- `startTime`, `endTime`: Date

---

## 🛠️ Development

### Building the Client Library

```bash
cd client-library
mvn clean install
```

Output JARs:
- `target/report-portal-client-1.0.0.jar` (library only)
- `target/report-portal-client-1.0.0-with-dependencies.jar` (with all dependencies)

### Running Tests

**Backend**:
```bash
cd backend
npm test
```

**Client Library**:
```bash
cd client-library
mvn test
```

### Project Structure

```
ReportPortal/
├── backend/                    # Node.js backend
│   ├── config/                 # Database configuration
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # API endpoints
│   ├── services/               # Business logic
│   │   ├── syncService.js      # Auto-sync cascade
│   │   └── entityResolver.js   # Smart entity resolution
│   └── server.js               # Main server file
│
├── frontend/                   # Web dashboard
│   ├── html/                   # HTML pages
│   ├── js/                     # JavaScript modules
│   └── css/                    # Stylesheets
│
├── client-library/             # Java client
│   ├── java-main/              # Source code
│   │   └── com/reportportal/client/
│   ├── resources/              # Default properties
│   └── pom.xml                 # Maven configuration
│
└── database-schemas/           # MongoDB collection schemas
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `EADDRINUSE: address already in use :::5000`
```bash
# Find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows (then use taskkill)
```

**Problem**: Cannot connect to MongoDB
- Check your MongoDB connection string in `backend/.env`
- Ensure MongoDB server is running
- Verify network access (firewall, VPN)
- For MongoDB Atlas, whitelist your IP address

### Java Client Issues

**Problem**: `Pack name is required`
- Ensure `reportportal.pack` is set in `reportportal.properties`
- Verify the properties file is in `src/test/resources/`

**Problem**: `Connection refused`
- Ensure the backend server is running on the configured URL
- Check `reportportal.url` in properties file
- Verify no firewall is blocking the connection

**Problem**: `ClassNotFoundException: ReportPortalClient`
- Ensure the JAR is in your classpath
- For Maven: run `mvn clean install` in client-library directory
- For manual JAR: verify the JAR path in your build configuration

### Dashboard Issues

**Problem**: Dashboard shows 0 for all counts
- Run the data resync (see below)
- Ensure at least one test run has been submitted
- Check browser console for JavaScript errors

**Fix totalTests counts**:
Create and run this script (`backend/fix-totals.js`):
```javascript
const mongoose = require('mongoose');
mongoose.connect('YOUR_MONGODB_URI');

// Re-aggregate all totals from runs -> packs -> projects -> portfolios
// (See full resync script in documentation)
```

---

## 📝 License

This project is proprietary software. All rights reserved.

---

## 👥 Support

For questions or issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review API logs in terminal/console
3. Check MongoDB data directly using MongoDB Compass
4. Verify network connectivity between components

---

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Full CRUD operations for portfolios, projects, packs, runs
- Real-time dashboard updates
- Java client library with Maven support
- CSV export functionality
- Pagination support
- Auto-sync cascade (Run → Pack → Project → Portfolio)
- Smart entity resolution with auto-creation
- Health status monitoring
