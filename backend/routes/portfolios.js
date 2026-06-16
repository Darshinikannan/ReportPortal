const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');

// Get all portfolios
router.get('/', async (req, res) => {
    try {
        const portfolios = await Portfolio.find().sort({ name: 1 });
        res.json(portfolios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get portfolio by ID
router.get('/:id', async (req, res) => {
    try {
        const portfolio = await Portfolio.findById(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ message: 'Portfolio not found' });
        }
        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;