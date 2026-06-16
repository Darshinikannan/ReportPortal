const mongoose = require('mongoose');

const PortfolioSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    projectCount: { type: Number, default: 0 },
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
    lastRun: Date,
    createdAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
}, { collection: 'Portfolio' });

module.exports = mongoose.model('Portfolio', PortfolioSchema);