const mongoose = require('mongoose');

const GlobalMetricsSchema = new mongoose.Schema({
    totalPortfolios: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    totalAutomationPacks: { type: Number, default: 0 },
    totalAutomationRuns: { type: Number, default: 0 },
    totalTests: { type: Number, default: 0 },
    totalPassedTests: { type: Number, default: 0 },
    totalFailedTests: { type: Number, default: 0 },
    totalSkippedTests: { type: Number, default: 0 },
    globalPassRate: { type: Number, default: 0 },
    activePortfolios: { type: Number, default: 0 },
    activeProjects: { type: Number, default: 0 },
    activeAutomationPacks: { type: Number, default: 0 },
    runsLast24Hours: { type: Number, default: 0 },
    runsLast7Days: { type: Number, default: 0 },
    runsLast30Days: { type: Number, default: 0 },
    passRateTrend: {
        current: { type: Number, default: 0 },
        lastWeek: { type: Number, default: 0 },
        lastMonth: { type: Number, default: 0 },
        change: { type: String, default: '+0%' }
    },
    executionTrend: {
        currentWeek: { type: Number, default: 0 },
        lastWeek: { type: Number, default: 0 },
        change: { type: String, default: '+0%' }
    },
    avgExecutionTime: { type: Number, default: 0 },
    totalExecutionTime: { type: Number, default: 0 },
    environmentStats: {
        staging: {
            runs: { type: Number, default: 0 },
            passRate: { type: Number, default: 0 }
        },
        production: {
            runs: { type: Number, default: 0 },
            passRate: { type: Number, default: 0 }
        }
    },
    statusBreakdown: {
        passed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        running: { type: Number, default: 0 },
        pending: { type: Number, default: 0 }
    },
    topFailingTests: [{
        testCase: String,
        failCount: Number,
        packName: String
    }],
    mostActivePortfolio: {
        name: String,
        runCount: Number
    },
    mostActiveProject: {
        name: String,
        runCount: Number
    },
    mostActiveAutomationPack: {
        name: String,
        runCount: Number
    },
    lastRunTime: { type: Date },
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
}, { collection: 'Global_Metrics' });

module.exports = mongoose.model('GlobalMetrics', GlobalMetricsSchema);