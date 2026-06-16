const mongoose = require('mongoose');

const AutomationPackSchema = new mongoose.Schema({
    name: { type: String, required: true },
    displayName: String,
    description: String,
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' },
    projectName: String,
    portfolioName: String,
    testCount: { type: Number, default: 0 },
    testCategories: {
        smoke: { type: Number, default: 0 },
        critical: { type: Number, default: 0 },
        regression: { type: Number, default: 0 },
        e2e: { type: Number, default: 0 }
    },
    runCount: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    avgDuration: { type: Number, default: 0 },
    minDuration: { type: Number, default: 0 },
    maxDuration: { type: Number, default: 0 },
    failureRate: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    lastFailure: {
        testCase: String,
        timestamp: Date,
        error: String
    },
    flakyTests: [{
        testCase: String,
        flakyRate: Number,
        lastFlake: Date
    }],
    configuration: {
        environment: String,
        browser: String,
        browserVersion: String,
        headless: Boolean,
        parallel: Boolean,
        retries: Number,
        timeout: Number,
        viewport: {
            width: Number,
            height: Number
        }
    },
    schedule: {
        type: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'] },
        time: String,
        timezone: String,
        enabled: { type: Boolean, default: false },
        daysOfWeek: [Number],
        lastScheduledRun: Date,
        nextScheduledRun: Date
    },
    triggers: [{
        type: { type: String, enum: ['schedule', 'deployment', 'manual', 'api'] },
        enabled: { type: Boolean, default: true }
    }],
    testSuite: {
        path: String,
        files: [String]
    },
    dependencies: {
        services: [String],
        testData: String,
        environments: [String]
    },
    tags: [String],
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    notifications: {
        email: [String],
        slack: {
            channel: String,
            mentions: [String]
        },
        onFailure: { type: Boolean, default: true },
        onSuccess: { type: Boolean, default: false },
        onFlaky: { type: Boolean, default: false }
    },
    benchmarks: {
        targetDuration: Number,
        targetPassRate: Number,
        maxDuration: Number
    },
    trends: {
        passRateLast7Days: Number,
        passRateLast30Days: Number,
        avgDurationLast7Days: Number,
        avgDurationLast30Days: Number
    },
    lastRun: Date,
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
}, { collection: 'Automation_Pack' });

module.exports = mongoose.model('AutomationPack', AutomationPackSchema);