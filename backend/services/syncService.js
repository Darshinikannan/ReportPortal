const GlobalMetrics = require('../models/GlobalMetrics');
const Portfolio = require('../models/Portfolio');
const Project = require('../models/Project');
const AutomationPack = require('../models/AutomationPack');
const AutomationRun = require('../models/AutomationRun');

class SyncService {
    constructor(io) {
        this.io = io;
        this.isSyncing = false; // Add this line to track sync state
    }

    /**
     * STEP 1: Sync Automation Pack aggregations from runs
     * Called when: New AutomationRun is created/updated
     * Updates: runCount, passed, failed, skipped, passRate, avgDuration
     */
    async syncPackFromRun(packId) {
        try {
            if (!packId) throw new Error('packId is required');
            
            const runs = await AutomationRun.find({ packId }).sort({ createdAt: -1 });
            
            if (runs.length === 0) {
                console.log(`⚠️  No runs found for pack ${packId}, skipping sync`);
                return null;
            }

            const updates = {
                runCount: runs.length,
                passed: runs.reduce((sum, r) => sum + (r.passed || 0), 0),
                failed: runs.reduce((sum, r) => sum + (r.failed || 0), 0),
                skipped: runs.reduce((sum, r) => sum + (r.skipped || 0), 0),
                avgDuration: Math.round(
                    runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length
                ),
                lastRun: runs[0].endTime || runs[0].startTime || new Date(),
                lastUpdated: new Date()
            };

            // Calculate pass rate and failure rate
            const totalTests = updates.passed + updates.failed + updates.skipped;
            updates.testCount = totalTests;  // Add testCount to updates
            updates.passRate = totalTests > 0 
                ? parseFloat(((updates.passed / totalTests) * 100).toFixed(1))
                : 0;
            updates.failureRate = totalTests > 0
                ? parseFloat(((updates.failed / totalTests) * 100).toFixed(1))
                : 0;

            // Update Automation_Pack document
            const pack = await AutomationPack.findByIdAndUpdate(
                packId,
                updates,
                { new: true }
            );

            if (!pack) {
                console.error(`❌ Automation Pack ${packId} not found for update`);
                return null;
            }

            // Emit real-time update to all connected clients
            if (this.io) {
                this.io.emit('packUpdated', {
                    _id: pack._id,
                    name: pack.name,
                    projectId: pack.projectId,
                    portfolioId: pack.portfolioId,
                    runCount: pack.runCount,
                    passed: pack.passed,
                    failed: pack.failed,
                    skipped: pack.skipped,
                    passRate: pack.passRate,
                    avgDuration: pack.avgDuration,
                    lastUpdated: pack.lastUpdated
                });
            }

            console.log(`✅ Pack ${pack.name} synced (${updates.runCount} runs)`);
            return pack;
        } catch (error) {
            console.error('❌ Error syncing pack from run:', error.message);
            throw error;
        }
    }

    /**
     * STEP 2: Sync Project aggregations from packs
     * Called after: syncPackFromRun completes
     * Updates: packCount, runCount, totalTests, passedTests, failedTests, passRate
     */
    async syncProject(projectId) {
        try {
            if (!projectId) throw new Error('projectId is required');
            
            const packs = await AutomationPack.find({ projectId }).sort({ lastRun: -1 });

            const updates = {
                packCount: packs.length,
                runCount: packs.reduce((sum, p) => sum + (p.runCount || 0), 0),
                totalTests: packs.reduce((sum, p) => sum + (p.testCount || 0), 0),
                passedTests: packs.reduce((sum, p) => sum + (p.passed || 0), 0),
                failedTests: packs.reduce((sum, p) => sum + (p.failed || 0), 0),
                skippedTests: packs.reduce((sum, p) => sum + (p.skipped || 0), 0),
                avgExecutionTime: packs.length > 0 
                    ? Math.round(packs.reduce((sum, p) => sum + (p.avgDuration || 0), 0) / packs.length)
                    : 0,
                totalExecutionTime: packs.reduce((sum, p) => sum + ((p.avgDuration || 0) * (p.runCount || 0)), 0),
                lastRun: packs.length > 0 && packs[0].lastRun ? packs[0].lastRun : null,
                lastUpdated: new Date()
            };

            // Calculate pass rate
            updates.passRate = updates.totalTests > 0 
                ? parseFloat(((updates.passedTests / updates.totalTests) * 100).toFixed(1))
                : 0;

            // Determine health status based on pass rate
            if (updates.passRate >= 95) updates.health = 'good';
            else if (updates.passRate >= 85) updates.health = 'fair';
            else updates.health = 'poor';

            const project = await Project.findByIdAndUpdate(
                projectId,
                updates,
                { new: true }
            );

            if (!project) {
                console.error(`❌ Project ${projectId} not found for update`);
                return null;
            }

            // Emit real-time update
            if (this.io) {
                this.io.emit('projectUpdated', {
                    _id: project._id,
                    name: project.name,
                    portfolioId: project.portfolioId,
                    packCount: project.packCount,
                    runCount: project.runCount,
                    totalTests: project.totalTests,
                    passedTests: project.passedTests,
                    passRate: project.passRate,
                    health: project.health,
                    lastUpdated: project.lastUpdated
                });
            }

            console.log(`✅ Project ${project.name} synced (${updates.packCount} packs)`);
            return project;
        } catch (error) {
            console.error('❌ Error syncing project:', error.message);
            throw error;
        }
    }

    /**
     * STEP 3: Sync Portfolio aggregations from projects
     * Called after: syncProject completes
     * Updates: projectCount, packCount, runCount, totalTests, passedTests, passRate
     */
    async syncPortfolio(portfolioId) {
        try {
            if (!portfolioId) throw new Error('portfolioId is required');
            
            const projects = await Project.find({ portfolioId }).sort({ lastRun: -1 });
            const packs = await AutomationPack.find({ portfolioId });

            const updates = {
                projectCount: projects.length,
                packCount: packs.length,
                runCount: projects.reduce((sum, p) => sum + (p.runCount || 0), 0),
                totalTests: projects.reduce((sum, p) => sum + (p.totalTests || 0), 0),
                passedTests: projects.reduce((sum, p) => sum + (p.passedTests || 0), 0),
                failedTests: projects.reduce((sum, p) => sum + (p.failedTests || 0), 0),
                skippedTests: projects.reduce((sum, p) => sum + (p.skippedTests || 0), 0),
                lastRun: projects.length > 0 && projects[0].lastRun ? projects[0].lastRun : null,
                lastUpdated: new Date()
            };

            // Calculate pass rate
            updates.passRate = updates.totalTests > 0 
                ? parseFloat(((updates.passedTests / updates.totalTests) * 100).toFixed(1))
                : 0;

            // Determine health status
            if (updates.passRate >= 95) updates.health = 'good';
            else if (updates.passRate >= 85) updates.health = 'fair';
            else updates.health = 'poor';

            const portfolio = await Portfolio.findByIdAndUpdate(
                portfolioId,
                updates,
                { new: true }
            );

            if (!portfolio) {
                console.error(`❌ Portfolio ${portfolioId} not found for update`);
                return null;
            }

            // Emit real-time update
            if (this.io) {
                this.io.emit('portfolioUpdated', {
                    _id: portfolio._id,
                    name: portfolio.name,
                    projectCount: portfolio.projectCount,
                    packCount: portfolio.packCount,
                    runCount: portfolio.runCount,
                    totalTests: portfolio.totalTests,
                    passedTests: portfolio.passedTests,
                    passRate: portfolio.passRate,
                    health: portfolio.health,
                    lastUpdated: portfolio.lastUpdated
                });
            }

            console.log(`✅ Portfolio ${portfolio.name} synced (${updates.projectCount} projects)`);
            return portfolio;
        } catch (error) {
            console.error('❌ Error syncing portfolio:', error.message);
            throw error;
        }
    }

    /**
     * STEP 4: Sync Global Metrics from all collections
     * Called after: syncPortfolio completes
     * Updates: totalPortfolios, totalProjects, totalTests, passRate, trends
     */
    async syncGlobalMetrics() {
        try {
            const portfolios = await Portfolio.find();
            const projects = await Project.find();
            const packs = await AutomationPack.find();
            const runs = await AutomationRun.find();

            // Calculate time-based metrics
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const runsLast24h = runs.filter(r => r.createdAt >= last24h).length;
            const runsLast7d = runs.filter(r => r.createdAt >= last7d).length;
            const runsLast30d = runs.filter(r => r.createdAt >= last30d).length;

            const metrics = {
                // Entity counts
                totalPortfolios: portfolios.length,
                totalProjects: projects.length,
                totalAutomationPacks: packs.length,
                totalAutomationRuns: runsLast30d,

                // Test aggregations
                totalTests: packs.reduce((sum, p) => sum + (p.testCount || 0), 0),
                totalPassedTests: packs.reduce((sum, p) => sum + (p.passed || 0), 0),
                totalFailedTests: packs.reduce((sum, p) => sum + (p.failed || 0), 0),
                totalSkippedTests: packs.reduce((sum, p) => sum + (p.skipped || 0), 0),

                // Active counts
                activePortfolios: portfolios.filter(p => p.status === 'active').length,
                activeProjects: projects.filter(p => p.status === 'active').length,
                activeAutomationPacks: packs.filter(p => p.status === 'active').length,

                // Run trends
                runsLast24Hours: runsLast24h,
                runsLast7Days: runsLast7d,
                runsLast30Days: runsLast30d,

                // Timing
                avgExecutionTime: packs.length > 0 
                    ? Math.round(packs.reduce((sum, p) => sum + (p.avgDuration || 0), 0) / packs.length)
                    : 0,
                totalExecutionTime: packs.reduce((sum, p) => sum + ((p.avgDuration || 0) * (p.runCount || 0)), 0),

                lastUpdated: new Date()
            };

            // Calculate pass rate
            metrics.globalPassRate = metrics.totalTests > 0 
                ? parseFloat(((metrics.totalPassedTests / metrics.totalTests) * 100).toFixed(1))
                : 0;

            // Status breakdown
            metrics.statusBreakdown = {
                passed: runs.filter(r => r.status === 'passed').length,
                failed: runs.filter(r => r.status === 'failed').length,
                running: runs.filter(r => r.status === 'running').length,
                pending: runs.filter(r => r.status === 'pending').length
            };

            // Most active entities
            if (portfolios.length > 0) {
                const mostActive = portfolios.reduce((max, p) => 
                    (p.runCount || 0) > (max.runCount || 0) ? p : max
                );
                metrics.mostActivePortfolio = { name: mostActive.name, runCount: mostActive.runCount };
            }

            if (projects.length > 0) {
                const mostActive = projects.reduce((max, p) => 
                    (p.runCount || 0) > (max.runCount || 0) ? p : max
                );
                metrics.mostActiveProject = { name: mostActive.name, runCount: mostActive.runCount };
            }

            if (packs.length > 0) {
                const mostActive = packs.reduce((max, p) => 
                    (p.runCount || 0) > (max.runCount || 0) ? p : max
                );
                metrics.mostActiveAutomationPack = { name: mostActive.name, runCount: mostActive.runCount };
            }

            // Update database
            const globalMetrics = await GlobalMetrics.findOneAndUpdate(
                {},
                metrics,
                { upsert: true, new: true }
            );

            // Emit to all connected clients
            if (this.io) {
                this.io.emit('globalMetricsUpdated', {
                    totalPortfolios: metrics.totalPortfolios,
                    totalProjects: metrics.totalProjects,
                    totalAutomationPacks: metrics.totalAutomationPacks,
                    totalTests: metrics.totalTests,
                    totalPassedTests: metrics.totalPassedTests,
                    totalFailedTests: metrics.totalFailedTests,
                    globalPassRate: metrics.globalPassRate,
                    runsLast24Hours: metrics.runsLast24Hours,
                    runsLast7Days: metrics.runsLast7Days,
                    runsLast30Days: metrics.runsLast30Days,
                    avgExecutionTime: metrics.avgExecutionTime,
                    statusBreakdown: metrics.statusBreakdown,
                    lastUpdated: metrics.lastUpdated
                });
            }

            console.log('📊 Global metrics synced and emitted');
            return metrics;
        } catch (error) {
            console.error('❌ Error syncing global metrics:', error.message);
            throw error;
        }
    }

    /**
     * COMPLETE CASCADE: Triggered when AutomationRun is created/updated
     * Executes all 4 sync steps in sequence
     * Ensures data consistency across all 5 collections
     */
    async syncAll(packId) {
    try {
        if (!packId) throw new Error('packId is required');

        // Prevent concurrent syncs (ADD THIS CHECK)
        if (this.isSyncing) {
            console.log('⏭️  Sync already in progress, skipping...');
            return null;
        }

        this.isSyncing = true; // Lock sync
        console.log(`\n🔄 === SYNC CASCADE STARTED for Pack ${packId} ===`);

        // STEP 1: Sync pack from runs
        const pack = await this.syncPackFromRun(packId);
        if (!pack) {
            this.isSyncing = false; // Unlock before returning
            return null;
        }

        // STEP 2: Sync project from packs
        if (pack.projectId) {
            await this.syncProject(pack.projectId);
        }

        // STEP 3: Sync portfolio from projects
        if (pack.portfolioId) {
            await this.syncPortfolio(pack.portfolioId);
        }

        // STEP 4: Sync global metrics
        await this.syncGlobalMetrics();

        console.log(`✅ === SYNC CASCADE COMPLETED ===\n`);
        this.isSyncing = false; // Unlock after completion
        return pack;
    } catch (error) {
        console.error('❌ === SYNC CASCADE FAILED ===');
        console.error(error.message);
        this.isSyncing = false; // Unlock even on error
        throw error;
    }
    }

    /**
     * Manual full sync endpoint - repairs data consistency
     * Use when: Data inconsistency detected or cascade fails
     */
    async fullSync() {
        try {
            console.log('🔧 MANUAL FULL SYNC STARTED');
            
            // Get all packs
            const packs = await AutomationPack.find();
            console.log(`Found ${packs.length} automation packs`);

            // Re-sync each pack (triggers full cascade)
            for (const pack of packs) {
                await this.syncPackFromRun(pack._id);
                await this.syncProject(pack.projectId);
                await this.syncPortfolio(pack.portfolioId);
            }

            // Final global sync
            await this.syncGlobalMetrics();

            console.log('✅ MANUAL FULL SYNC COMPLETED');
            return { status: 'success', packsProcessed: packs.length };
        } catch (error) {
            console.error('❌ MANUAL FULL SYNC FAILED:', error.message);
            throw error;
        }
    }
}

module.exports = SyncService;