# Report Portal - Test Automation Dashboard

A comprehensive test automation reporting and analytics platform with real-time dashboards, hierarchical organization (Portfolio → Project → Pack → Run), and seamless integration with Java test suites.

> 📘 **Integrating your test framework?** See the [Integration Guide](client-library/INTEGRATION_GUIDE.md) for step-by-step instructions.

![Report Portal Dashboard]
![Java](https://img.shields.io/badge/Java-11+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-brightgreen)

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Java Client Library](#java-client-library)
- [API Documentation](#api-documentation)
- [Data Model](#data-model)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

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

> 📘 **For detailed integration steps**, see the [Integration Guide](client-library/INTEGRATION_GUIDE.md)

### Quick Setup

**1. Add Maven Dependency:**
```xml
<dependency>
    <groupId>com.reportportal</groupId>
    <artifactId>report-portal-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

**2. Install to Local Repository:**
```bash
cd client-library
mvn clean install
```

**3. Configure** `src/test/resources/reportportal.properties`:
```properties
reportportal.url=http://localhost:5000
reportportal.portfolio=YourPortfolio
reportportal.project=YourProject
reportportal.pack=YourPack
```

**4. Integrate with Your Test Framework:**
```java
import com.reportportal.client.TestExecutionTracker;

private final TestExecutionTracker tracker = new TestExecutionTracker();

// In test start hook
tracker.testStarted(testId);

// In test finish hook
tracker.testFinished(testId, testName, status, error);

// After all tests complete
tracker.submitToReportPortal();
```

For framework-specific examples (JUnit 5, TestNG, Cucumber), see the [Integration Guide](client-library/INTEGRATION_GUIDE.md).

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
