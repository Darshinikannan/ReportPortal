const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    displayName: String,
    description: String,
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' },
    portfolioName: String,
    packCount: { type: Number, default: 0 },
    runCount: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    failedTests: { type: Number, default: 0 },
    skippedTests: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    health: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
    owner: String,
    ownerEmail: String,
    team: String,
    teamMembers: [{
        name: String,
        role: String,
        email: String
    }],
    repository: {
        url: String,
        branch: String,
        lastCommit: String
    },
    framework: String,
    language: String,
    cicd: String,
    applicationUnderTest: {
        name: String,
        version: String,
        urls: {
            staging: String,
            production: String
        }
    },
    avgExecutionTime: { type: Number, default: 0 },
    totalExecutionTime: { type: Number, default: 0 },
    successfulRuns: { type: Number, default: 0 },
    failedRuns: { type: Number, default: 0 },
    flakyTests: { type: Number, default: 0 },
    environments: {
        staging: {
            enabled: { type: Boolean, default: true },
            url: String,
            runCount: { type: Number, default: 0 }
        },
        production: {
            enabled: { type: Boolean, default: false },
            url: String,
            runCount: { type: Number, default: 0 }
        }
    },
    testCategories: {
        smoke: { type: Number, default: 0 },
        critical: { type: Number, default: 0 },
        regression: { type: Number, default: 0 },
        e2e: { type: Number, default: 0 }
    },
    tags: [String],
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    dependencies: [{
        name: String,
        type: String,
        status: String
    }],
    notifications: {
        email: [String],
        slack: String,
        onFailure: { type: Boolean, default: true },
        onSuccess: { type: Boolean, default: false },
        failureThreshold: { type: Number, default: 2 }
    },
    documentation: {
        testPlan: String,
        requirements: String,
        wiki: String
    },
    lastRun: Date,
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
}, { collection: 'Project' });

module.exports = mongoose.model('Project', ProjectSchema);