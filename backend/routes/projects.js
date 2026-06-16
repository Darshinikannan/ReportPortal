const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Get all projects
router.get('/', async (req, res) => {
    try {
        const { portfolio } = req.query;
        const query = portfolio ? { portfolioName: portfolio } : {};
        const projects = await Project.find(query).sort({ name: 1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get project by ID
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }


});

// Create new project
router.post('/', async (req, res) => {
    try {
        const project = new Project(req.body);
        const newProject = await project.save();
        
        console.log(`✅ New project created: ${newProject.name}`);
        
        res.status(201).json({
            message: 'Project created successfully',
            data: newProject
        });
    } catch (error) {
        console.error('❌ Error creating project:', error.message);
        res.status(400).json({ message: error.message });
    }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        console.log(`✅ Project updated: ${project.name}`);
        
        res.json({
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        console.error('❌ Error updating project:', error.message);
        res.status(400).json({ message: error.message });
    }
});

// Delete project
router.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        console.log(`✅ Project deleted: ${project.name}`);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;