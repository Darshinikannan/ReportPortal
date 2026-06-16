const express = require('express');
const router = express.Router();
const AutomationPack = require('../models/AutomationPack');
const SyncService = require('../services/syncService');

// GET all automation packs
router.get('/', async (req, res) => {
    try {
        const { project, portfolio } = req.query;
        const filter = {};
        
        if (project) filter.projectName = project;
        if (portfolio) filter.portfolioName = portfolio;
        
        const packs = await AutomationPack.find(filter).sort({ lastRun: -1 });
        res.json(packs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE automation pack (this triggers real-time sync)
router.patch('/:id', async (req, res) => {
    try {
        const pack = await AutomationPack.findByIdAndUpdate(
            req.params.id,
            { ...req.body, lastUpdated: new Date() },
            { new: true }
        );

        if (!pack) {
            return res.status(404).json({ message: 'Pack not found' });
        }

        // Trigger real-time sync
        const io = req.app.get('io');
        const syncService = new SyncService(io);
        await syncService.syncAll(pack._id);

        res.json(pack);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// CREATE automation pack
router.post('/', async (req, res) => {
    try {
        const pack = new AutomationPack(req.body);
        const newPack = await pack.save();

        // Trigger real-time sync
        const io = req.app.get('io');
        const syncService = new SyncService(io);
        await syncService.syncAll(newPack._id);

        res.status(201).json(newPack);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE automation pack
router.delete('/:id', async (req, res) => {
    try {
        const pack = await AutomationPack.findById(req.params.id);
        
        if (!pack) {
            return res.status(404).json({ message: 'Automation pack not found' });
        }

        // Store IDs before deletion
        const projectId = pack.projectId;
        const portfolioId = pack.portfolioId;
        const packName = pack.name;
        
        // Delete the pack
        await AutomationPack.findByIdAndDelete(req.params.id);
        
        console.log(`✅ Automation pack deleted: ${packName}`);

        // Trigger sync to update parent collections
        // Don't use syncAll since pack is now deleted
        const io = req.app.get('io');
        const syncService = req.app.get('syncService');
        
        if (syncService) {
            try {
                if (projectId) {
                    await syncService.syncProject(projectId);
                }
                if (portfolioId) {
                    await syncService.syncPortfolio(portfolioId);
                }
                await syncService.syncGlobalMetrics();
            } catch (syncError) {
                console.error('⚠️  Sync error after pack deletion:', syncError.message);
            }
        }

        res.json({ 
            message: 'Automation pack deleted successfully',
            data: { name: packName }
        });
    } catch (error) {
        console.error('❌ Error deleting pack:', error.message);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;