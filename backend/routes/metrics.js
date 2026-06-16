const express = require('express');
const router = express.Router();
const GlobalMetrics = require('../models/GlobalMetrics');

// Get global metrics
router.get('/', async (req, res) => {
    try {
        const metrics = await GlobalMetrics.findOne();
        if (!metrics) {
            return res.status(404).json({ message: 'Metrics not found' });
        }
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;