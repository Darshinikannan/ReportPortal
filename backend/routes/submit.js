/**
 * Flexible Automation Run Submission Route
 * Handles missing or new portfolio/project/pack names automatically
 * NEW endpoint: POST /api/automation-runs/submit
 * OLD endpoint: POST /api/automation-runs (unchanged, still works)
 */

const express = require('express');
const router = express.Router();
const AutomationRun = require('../models/AutomationRun');
const EntityResolver = require('../services/entityResolver');

// Initialize resolver
const resolver = new EntityResolver({
    autoCreatePortfolio: true,
    autoCreateProject: true,
    autoCreatePack: true,
    caseSensitive: false,
    fuzzyMatchThreshold: 0.75  // 75% similarity for fuzzy matching
});

/**
 * POST /api/automation-runs/submit
 * Flexible submission endpoint that handles all scenarios
 * 
 * Accepts multiple patterns:
 * 1. Only pack name: { packName: "RABO Smoke Pack", passed: 24, failed: 1 }
 * 2. Pack + Project: { packName: "...", projectName: "RABO", passed: 24 }
 * 3. Full hierarchy: { portfolioName: "Road", projectName: "RABO", packName: "...", passed: 24 }
 * 4. New entities: Creates them automatically in "Unassigned" or specified locations
 * 5. Case variations: Handles "RABO", "rabo", "Rabo" as same
 */
router.post('/submit', async (req, res) => {
    try {
        // Validate mandatory fields
        const missingFields = [];
        
        if (!req.body.portfolioName || req.body.portfolioName.trim() === '') {
            missingFields.push('portfolioName');
        }
        if (!req.body.projectName || req.body.projectName.trim() === '') {
            missingFields.push('projectName');
        }
        if (!req.body.packName || req.body.packName.trim() === '') {
            missingFields.push('packName');
        }
        if (req.body.passed === undefined || req.body.passed === null) {
            missingFields.push('passed');
        }
        if (req.body.failed === undefined || req.body.failed === null) {
            missingFields.push('failed');
        }
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields. Please provide all mandatory fields.',
                missingFields: missingFields,
                requiredFields: {
                    portfolioName: 'string (name of portfolio)',
                    projectName: 'string (name of project)',
                    packName: 'string (name of automation pack)',
                    passed: 'number (count of passed tests)',
                    failed: 'number (count of failed tests)'
                },
                example: {
                    portfolioName: 'Road',
                    projectName: 'RABO',
                    packName: 'Smoke Tests',
                    passed: 45,
                    failed: 2,
                    skipped: 3
                }
            });
        }

        console.log('\n📥 Flexible submission received:', {
            packName: req.body.packName,
            projectName: req.body.projectName,
            portfolioName: req.body.portfolioName
        });

        if (req.body.testResults && req.body.testResults.length > 0) {
            console.log(`   📋 Test Results Array (${req.body.testResults.length} tests):`, 
                req.body.testResults.map(t => ({ name: t.testCase, status: t.status }))
            );
        } else {
            console.log('   ⚠️  No testResults array in request body');
            console.log('   Request body keys:', Object.keys(req.body));
        }

        // Resolve entities (find existing or create new)
        const { portfolio, project, pack, resolution } = await resolver.resolve({
            packName: req.body.packName,
            projectName: req.body.projectName,
            portfolioName: req.body.portfolioName
        });

        if (!portfolio || !project) {
            return res.status(400).json({
                success: false,
                message: 'Unable to resolve portfolio and project',
                resolution
            });
        }

        // Generate unique run ID if not provided
        const runId = req.body.id || `RUN-${Date.now()}`;

        // Calculate totals if not provided
        const passed = req.body.passed || 0;
        const failed = req.body.failed || 0;
        const skipped = req.body.skipped || 0;
        const total = req.body.total || (passed + failed + skipped);
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        // Calculate status based on results (if not explicitly provided)
        let status = req.body.status;
        if (!status) {
            if (failed > 0) {
                status = 'failed';
            } else if (passed > 0) {
                status = 'passed';
            } else {
                status = 'skipped';
            }
        }

        // Create automation run with resolved IDs
        const runData = {
            id: runId,
            name: req.body.name || `${pack ? pack.name : 'Test Run'} - ${runId}`,
            displayName: req.body.displayName || runId,
            packId: pack ? pack._id : null,
            projectId: project._id,
            portfolioId: portfolio._id,
            packName: pack ? pack.name : req.body.packName || 'Unnamed Pack',
            projectName: project.name,
            portfolioName: portfolio.name,
            status: status,
            passed,
            failed,
            skipped,
            total,
            passRate,
            duration: req.body.duration || 0,
            startTime: req.body.startTime || new Date(),
            endTime: req.body.endTime || new Date(),
            environment: req.body.environment || {},
            cicd: req.body.cicd || {},
            trigger: req.body.trigger || { type: 'api', triggeredBy: 'external', triggeredAt: new Date() },
            testResults: req.body.testResults || [],
            failures: req.body.failures || [],
            reports: req.body.reports || {},
            performance: req.body.performance || {},
            tags: req.body.tags || [],
            createdAt: new Date()
        };

        const run = new AutomationRun(runData);
        const savedRun = await run.save();

        console.log(`✅ Run created: ${savedRun.id}`);
        console.log(`   Portfolio: ${portfolio.name} (${resolution.portfolio.action})`);
        console.log(`   Project: ${project.name} (${resolution.project.action})`);
        console.log(`   Pack: ${pack ? pack.name : 'N/A'} (${resolution.pack.action || 'none'})`);

        // Trigger sync cascade
        const syncService = req.app.get('syncService');
        if (syncService && pack) {
            try {
                await syncService.syncAll(pack._id);
            } catch (syncError) {
                console.error('⚠️  Sync cascade error (but run was saved):', syncError.message);
            }
        }

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('runCreated', {
                id: savedRun.id,
                packName: savedRun.packName,
                projectName: savedRun.projectName,
                portfolioName: savedRun.portfolioName,
                passed: savedRun.passed,
                failed: savedRun.failed,
                total: savedRun.total,
                status: savedRun.status,
                createdAt: savedRun.createdAt
            });
        }

        // Build response with resolution details
        const warnings = [];
        if (resolution.portfolio.isNew) {
            warnings.push(`Portfolio "${portfolio.name}" was auto-created`);
        }
        if (resolution.project.isNew) {
            warnings.push(`Project "${project.name}" was auto-created`);
        }
        if (resolution.pack.isNew) {
            warnings.push(`Pack "${pack.name}" was auto-created`);
        }
        if (resolution.portfolio.action === 'default') {
            warnings.push('Using default "Unassigned" portfolio');
        }
        if (resolution.project.action === 'default') {
            warnings.push('Using default "Unassigned" project');
        }

        res.status(201).json({
            success: true,
            runId: savedRun.id,
            message: 'Test run submitted successfully',
            location: `${portfolio.name} > ${project.name} > ${pack ? pack.name : 'N/A'}`,
            resolution: {
                portfolio: {
                    name: portfolio.name,
                    action: resolution.portfolio.action,
                    isNew: resolution.portfolio.isNew
                },
                project: {
                    name: project.name,
                    action: resolution.project.action,
                    isNew: resolution.project.isNew
                },
                pack: pack ? {
                    name: pack.name,
                    action: resolution.pack.action,
                    isNew: resolution.pack.isNew
                } : null
            },
            warnings: warnings.length > 0 ? warnings : undefined,
            data: {
                _id: savedRun._id,
                id: savedRun.id,
                portfolioName: savedRun.portfolioName,
                projectName: savedRun.projectName,
                packName: savedRun.packName,
                passed: savedRun.passed,
                failed: savedRun.failed,
                total: savedRun.total,
                passRate: savedRun.passRate,
                status: savedRun.status,
                duration: savedRun.duration,
                createdAt: savedRun.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Error in flexible submission:', error.message);
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit test run',
            error: error.message
        });
    }
});

/**
 * POST /api/automation-runs/validate
 * Dry-run validation - shows what would be created without saving
 */
router.post('/validate', async (req, res) => {
    try {
        const { portfolio, project, pack, resolution } = await resolver.resolve({
            packName: req.body.packName,
            projectName: req.body.projectName,
            portfolioName: req.body.portfolioName
        });

        const actions = [];
        if (resolution.portfolio.isNew) {
            actions.push(`Would create portfolio: "${resolution.portfolio.name}"`);
        } else if (resolution.portfolio.action === 'found') {
            actions.push(`✅ Portfolio "${resolution.portfolio.name}" exists`);
        }
        
        if (resolution.project.isNew) {
            actions.push(`Would create project: "${resolution.project.name}"`);
        } else if (resolution.project.action === 'found') {
            actions.push(`✅ Project "${resolution.project.name}" exists`);
        }
        
        if (resolution.pack.isNew) {
            actions.push(`Would create pack: "${resolution.pack.name}"`);
        } else if (pack) {
            actions.push(`✅ Pack "${resolution.pack.name}" exists`);
        }

        res.json({
            valid: true,
            wouldCreate: resolution.portfolio.isNew || resolution.project.isNew || resolution.pack.isNew,
            location: `${portfolio.name} > ${project.name} > ${pack ? pack.name : req.body.packName || 'N/A'}`,
            resolution,
            actions
        });

    } catch (error) {
        res.status(400).json({
            valid: false,
            message: error.message
        });
    }
});

module.exports = router;
