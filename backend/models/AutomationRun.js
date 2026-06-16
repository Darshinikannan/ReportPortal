const mongoose = require('mongoose');

const AutomationRunSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    displayName: String,
    packId: { type: mongoose.Schema.Types.ObjectId, ref: 'AutomationPack' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' },
    packName: String,
    projectName: String,
    portfolioName: String,
    status: { type: String, enum: ['passed', 'failed', 'running', 'pending'], default: 'pending' },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    startTime: Date,
    endTime: Date,
    environment: {
        name: String,
        url: String,
        browser: String,
        os: String,
        resolution: String
    },
    cicd: {
        system: String,
        jobName: String,
        buildNumber: String,
        buildUrl: String,
        executor: String
    },
    trigger: {
        type: { type: String, enum: ['scheduled', 'manual', 'deployment', 'api'] },
        triggeredBy: String,
        triggeredAt: Date,
        reason: String
    },
    testResults: [{
        testCase: String,
        status: String,
        duration: Number,
        startTime: Date,
        endTime: Date,
        retries: Number,
        error: String,
        stackTrace: String,
        screenshot: String,
        video: String
    }],
    failures: [{
        testCase: String,
        error: String,
        stackTrace: String,
        screenshot: String,
        video: String,
        logs: String
    }],
    reports: {
        html: String,
        json: String,
        junit: String,
        allure: String,
        video: String
    },
    version: { type: Number, default: 1 },
    applicationVersion: {
        name: String,
        version: String,
        buildNumber: String
    },
    tags: [String],
    notificationsSent: [{
        type: String,
        recipients: [String],
        channel: String,
        sentAt: Date,
        status: String
    }],
    performance: {
        avgResponseTime: Number,
        maxResponseTime: Number,
        minResponseTime: Number,
        totalRequests: Number,
        failedRequests: Number
    },
    resources: {
        cpuUsage: Number,
        memoryUsage: Number,
        diskUsage: Number
    },
    createdAt: { type: Date, default: Date.now },
    completedAt: Date
}, { collection: 'Automation_Run' });

module.exports = mongoose.model('AutomationRun', AutomationRunSchema);