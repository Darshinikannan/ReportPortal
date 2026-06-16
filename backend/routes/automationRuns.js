const express = require('express');
const router = express.Router();
const AutomationRun = require('../models/AutomationRun');

// Get all automation runs with optional filtering
router.get('/', async (req, res) => {
    try {
        const { pack, project, portfolio, limit = 50 } = req.query;
        let query = {};
        
        if (pack) query.packName = pack;
        if (project) query.projectName = project;
        if (portfolio) query.portfolioName = portfolio;
        
        const runs = await AutomationRun.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        res.json(runs);
    } catch (error) {
        console.error('❌ Error fetching runs:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Get run by ID
router.get('/:id', async (req, res) => {
    try {
        const run = await AutomationRun.findOne({ id: req.params.id });
        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }
        res.json(run);
    } catch (error) {
        console.error('❌ Error fetching run:', error.message);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Create new automation run and trigger sync cascade
 * 
 * POST /api/automation-runs
 * {
 *   "id": "RUN-1247",
 *   "packId": "674a3d4e5f6a7b8c9d0e1f01",
 *   "projectId": "674a2c3d4e5f6a7b8c9d0e01",
 *   "portfolioId": "674a1b2c3d4e5f6a7b8c9d01",
 *   "packName": "RABO Smoke Pack",
 *   "projectName": "RABO",
 *   "portfolioName": "Road",
 *   "passed": 24, "failed": 1, "skipped": 0, "total": 25,
 *   "status": "passed",
 *   "duration": 780,
 *   "startTime": "2026-05-28T09:02:00Z",
 *   "endTime": "2026-05-28T09:15:00Z"
 * }
 * 
 * Cascade sequence:
 * 1. AutomationRun inserted → syncPackFromRun() → Automation_Pack updated
 * 2. Automation_Pack updated → syncProject() → Project updated
 * 3. Project updated → syncPortfolio() → Portfolio updated
 * 4. Portfolio updated → syncGlobalMetrics() → Global_Metrics updated
 */
router.post('/', async (req, res) => {
    try {
        // Validate required fields
        const requiredFields = ['packId', 'projectId', 'portfolioId'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        // Create new run record
        const run = new AutomationRun({
            ...req.body,
            createdAt: new Date()
        });

        const savedRun = await run.save();
        console.log(`✅ New automation run created: ${savedRun.id}`);

        // Trigger sync cascade
        const syncService = req.app.get('syncService');
        if (syncService) {
            try {
                await syncService.syncAll(savedRun.packId);
            } catch (syncError) {
                console.error('⚠️  Sync cascade error (but run was saved):', syncError.message);
                // Don't fail the request - run was saved successfully
            }
        }

        // Emit real-time update to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('runCreated', {
                id: savedRun.id,
                packName: savedRun.packName,
                projectName: savedRun.projectName,
                portfolioName: savedRun.portfolioName,
                passed: savedRun.passed,
                failed: savedRun.failed,
                skipped: savedRun.skipped,
                total: savedRun.total,
                status: savedRun.status,
                duration: savedRun.duration,
                startTime: savedRun.startTime,
                endTime: savedRun.endTime,
                createdAt: savedRun.createdAt
            });
        }

        res.status(201).json({
            message: 'Automation run created successfully',
            data: savedRun
        });
    } catch (error) {
        console.error('❌ Error creating run:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Update existing automation run and trigger sync cascade
 * PUT /api/automation-runs/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const run = await AutomationRun.findByIdAndUpdate(
            req.params.id,
            { ...req.body, lastUpdated: new Date() },
            { new: true }
        );

        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        console.log(`✅ Automation run updated: ${run.id}`);

        // Trigger sync cascade
        const syncService = req.app.get('syncService');
        if (syncService) {
            try {
                await syncService.syncAll(run.packId);
            } catch (syncError) {
                console.error('⚠️  Sync cascade error (but run was updated):', syncError.message);
            }
        }

        res.json({
            message: 'Automation run updated successfully',
            data: run
        });
    } catch (error) {
        console.error('❌ Error updating run:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Delete automation run and trigger sync cascade
 * DELETE /api/automation-runs/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const run = await AutomationRun.findByIdAndDelete(req.params.id);

        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        console.log(`✅ Automation run deleted: ${run.id}`);

        // Trigger sync cascade to recalculate aggregates
        const syncService = req.app.get('syncService');
        if (syncService && run.packId) {
            try {
                await syncService.syncAll(run.packId);
            } catch (syncError) {
                console.error('⚠️  Sync cascade error (but run was deleted):', syncError.message);
            }
        }

        res.json({
            message: 'Automation run deleted successfully',
            data: run
        });
    } catch (error) {
        console.error('❌ Error deleting run:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Add test cases to an existing automation run
 * POST /api/automation-runs/:id/test-cases
 * Body: { testCases: [{ testCase, status, duration, error, ... }] }
 */
router.post('/:id/test-cases', async (req, res) => {
    try {
        const { testCases } = req.body;
        
        if (!testCases || !Array.isArray(testCases)) {
            return res.status(400).json({ message: 'testCases array is required' });
        }

        const run = await AutomationRun.findOne({ id: req.params.id });
        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        // Initialize testResults if not exists
        if (!run.testResults) {
            run.testResults = [];
        }

        // Add new test cases
        testCases.forEach(tc => {
            run.testResults.push({
                testCase: tc.testCase,
                status: tc.status,
                duration: tc.duration,
                startTime: tc.startTime,
                endTime: tc.endTime,
                retries: tc.retries || 0,
                error: tc.error,
                stackTrace: tc.stackTrace,
                screenshot: tc.screenshot,
                video: tc.video
            });
        });

        await run.save();
        console.log(`✅ Added ${testCases.length} test cases to run: ${run.id}`);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('runUpdated', { id: run.id, testCasesCount: run.testResults.length });
        }

        res.json({
            message: 'Test cases added successfully',
            testCasesCount: run.testResults.length,
            data: run
        });
    } catch (error) {
        console.error('❌ Error adding test cases:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Add a single test case to an existing automation run
 * POST /api/automation-runs/:id/test-cases/add
 * Body: { testCase, status, duration, error, ... }
 */
router.post('/:id/test-cases/add', async (req, res) => {
    try {
        const run = await AutomationRun.findOne({ id: req.params.id });
        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        // Initialize testResults if not exists
        if (!run.testResults) {
            run.testResults = [];
        }

        // Add single test case
        const newTestCase = {
            testCase: req.body.testCase,
            status: req.body.status,
            duration: req.body.duration,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            retries: req.body.retries || 0,
            error: req.body.error,
            stackTrace: req.body.stackTrace,
            screenshot: req.body.screenshot,
            video: req.body.video
        };

        run.testResults.push(newTestCase);
        await run.save();

        console.log(`✅ Added test case to run: ${run.id}`);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('runUpdated', { id: run.id, testCasesCount: run.testResults.length });
        }

        res.json({
            message: 'Test case added successfully',
            testCasesCount: run.testResults.length,
            testCase: newTestCase
        });
    } catch (error) {
        console.error('❌ Error adding test case:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Update a specific test case
 * PUT /api/automation-runs/:id/test-cases/:index
 */
router.put('/:id/test-cases/:index', async (req, res) => {
    try {
        const run = await AutomationRun.findOne({ id: req.params.id });
        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        const index = parseInt(req.params.index);
        if (!run.testResults || index < 0 || index >= run.testResults.length) {
            return res.status(404).json({ message: 'Test case not found at index ' + index });
        }

        // Update test case
        run.testResults[index] = {
            testCase: req.body.testCase || run.testResults[index].testCase,
            status: req.body.status || run.testResults[index].status,
            duration: req.body.duration !== undefined ? req.body.duration : run.testResults[index].duration,
            startTime: req.body.startTime || run.testResults[index].startTime,
            endTime: req.body.endTime || run.testResults[index].endTime,
            retries: req.body.retries !== undefined ? req.body.retries : run.testResults[index].retries,
            error: req.body.error !== undefined ? req.body.error : run.testResults[index].error,
            stackTrace: req.body.stackTrace !== undefined ? req.body.stackTrace : run.testResults[index].stackTrace,
            screenshot: req.body.screenshot || run.testResults[index].screenshot,
            video: req.body.video || run.testResults[index].video
        };

        await run.save();
        console.log(`✅ Updated test case at index ${index} for run: ${run.id}`);

        res.json({
            message: 'Test case updated successfully',
            testCase: run.testResults[index]
        });
    } catch (error) {
        console.error('❌ Error updating test case:', error.message);
        res.status(400).json({ message: error.message });
    }
});

/**
 * Delete a specific test case
 * DELETE /api/automation-runs/:id/test-cases/:index
 */
router.delete('/:id/test-cases/:index', async (req, res) => {
    try {
        const run = await AutomationRun.findOne({ id: req.params.id });
        if (!run) {
            return res.status(404).json({ message: 'Automation run not found' });
        }

        const index = parseInt(req.params.index);
        if (!run.testResults || index < 0 || index >= run.testResults.length) {
            return res.status(404).json({ message: 'Test case not found at index ' + index });
        }

        // Remove test case
        const deleted = run.testResults.splice(index, 1)[0];
        await run.save();

        console.log(`✅ Deleted test case at index ${index} for run: ${run.id}`);

        res.json({
            message: 'Test case deleted successfully',
            testCase: deleted
        });
    } catch (error) {
        console.error('❌ Error deleting test case:', error.message);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;