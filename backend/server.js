require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const SyncService = require('./services/syncService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/portfolios', require('./routes/portfolios'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/automation-packs', require('./routes/automationPacks'));
app.use('/api/automation-runs', require('./routes/automationRuns'));

// NEW: Flexible submission endpoint (handles missing/new entities automatically)
app.use('/api/automation-runs', require('./routes/submit'));

/**
 * Manual sync endpoint - Repairs data consistency
 * POST /api/sync/full
 * 
 * This endpoint runs a complete data consistency check and repair:
 * 1. Iterates through all Automation Packs
 * 2. For each pack: syncPackFromRun() → syncProject() → syncPortfolio()
 * 3. Final: syncGlobalMetrics() to update global counters
 * 
 * Use cases:
 * - After bulk data imports
 * - When sync cascade fails
 * - Periodic maintenance/verification
 * - Data corruption recovery
 */
app.post('/api/sync/full', async (req, res) => {
    try {
        const syncService = app.get('syncService');
        console.log('🔧 MANUAL FULL SYNC INITIATED');
        
        const result = await syncService.fullSync();
        
        res.json({
            message: 'Full sync completed successfully',
            status: result.status,
            packsProcessed: result.packsProcessed,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('❌ Full sync error:', error.message);
        res.status(500).json({ 
            message: 'Full sync failed',
            error: error.message,
            timestamp: new Date()
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Connect to MongoDB and start server
let changeStream;
connectDB().then(async ({ connection, changeStream: cs }) => {
    changeStream = cs;
    
    // Initialize sync service
    const syncService = new SyncService(io);
    app.set('syncService', syncService);

    console.log('✅ Connected to MongoDB');

    // Watch for database changes
    if (changeStream) {
        changeStream.on('change', async (change) => {
            console.log('📝 Database change detected:', change.operationType, change.ns?.coll);
            
            try {
                // Handle AutomationRun changes
                if (change.ns?.coll === 'Automation_Run') {
                    if (change.operationType === 'insert' || change.operationType === 'update') {
                        const run = change.fullDocument;
                        if (run?.packId) {
                            console.log('🔄 Syncing from Automation_Run change');
                            await syncService.syncAll(run.packId);
                        }
                    } else if (change.operationType === 'delete') {
                        console.log('🗑️  Delete detected - checking available data...');
                        const deletedRun = change.fullDocumentBeforeChange;
                        
                        if (deletedRun?.packId) {
                            console.log('🔄 Syncing after Automation_Run deletion');
                            await syncService.syncAll(deletedRun.packId);
                        } else {
                            console.warn('⚠️  Could not get packId, triggering full sync...');
                            const AutomationPack = require('./models/AutomationPack');
                            const packs = await AutomationPack.find();
                            for (const pack of packs) {
                                await syncService.syncAll(pack._id);
                            }
                            console.log('✅ Full sync completed after delete');
                        }
                    }
                }
                
                // Handle AutomationPack INSERT only (not updates - those are from sync)
                else if (change.ns?.coll === 'Automation_Pack' && change.operationType === 'insert') {
                    const pack = change.fullDocument;
                    console.log('📦 New Automation Pack created:', pack.name);
                    
                    // Update parent collections to reflect new pack count
                    if (pack.projectId) {
                        await syncService.syncProject(pack.projectId);
                    }
                    if (pack.portfolioId) {
                        await syncService.syncPortfolio(pack.portfolioId);
                    }
                    await syncService.syncGlobalMetrics();
                    
                    console.log('✅ Parent collections updated with new pack count');
                }
                
                // Handle AutomationPack DELETE
                else if (change.ns?.coll === 'Automation_Pack' && change.operationType === 'delete') {
                    const deletedPack = change.fullDocumentBeforeChange;
                    console.log('🗑️  Automation Pack deleted');
                    
                    // Update parent collections to reflect decreased pack count
                    if (deletedPack?.projectId) {
                        await syncService.syncProject(deletedPack.projectId);
                    }
                    if (deletedPack?.portfolioId) {
                        await syncService.syncPortfolio(deletedPack.portfolioId);
                    }
                    await syncService.syncGlobalMetrics();
                    
                    console.log('✅ Parent collections updated after pack deletion');
                }

                
                // Handle Project INSERT only (not updates - those are from sync)
                else if (change.ns?.coll === 'Project' && change.operationType === 'insert') {
                    const project = change.fullDocument;
                    console.log('📁 New Project created:', project.name);
                    
                    // Update parent collections to reflect new project count
                    if (project.portfolioId) {
                        await syncService.syncPortfolio(project.portfolioId);
                    }
                    await syncService.syncGlobalMetrics();
                    
                    console.log('✅ Parent collections updated with new project count');
                }
                
                // Handle Project DELETE
                else if (change.ns?.coll === 'Project' && change.operationType === 'delete') {
                    const deletedProject = change.fullDocumentBeforeChange;
                    console.log('🗑️  Project deleted:', deletedProject?.name);
                    
                    // Update parent collections to reflect decreased project count
                    if (deletedProject?.portfolioId) {
                        await syncService.syncPortfolio(deletedProject.portfolioId);
                    }
                    await syncService.syncGlobalMetrics();
                    
                    console.log('✅ Parent collections updated after project deletion');
                }

                
            } catch (error) {
                console.error('❌ Error handling database change:', error);
            }
        });

        console.log('🔗 Database change stream active (AutomationRun, AutomationPack, Project)');
    }

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });

        socket.on('requestSync', async () => {
            try {
                console.log('🔄 Manual sync requested by client');
                await syncService.syncGlobalMetrics();
            } catch (error) {
                console.error('❌ Error on requestSync:', error);
            }
        });
    });

    // Start Server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 Socket.IO initialized on http://localhost:${PORT}`);
        console.log(`📡 Real-time updates enabled`);
    });

}).catch(error => {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (changeStream) {
        changeStream.close();
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down...');
    if (changeStream) {
        changeStream.close();
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});