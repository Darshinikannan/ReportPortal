/**
 * Entity Resolver Service
 * Intelligently finds or creates portfolios, projects, and packs
 * Handles case-insensitive matching and fuzzy search
 */

const Portfolio = require('../models/Portfolio');
const Project = require('../models/Project');
const AutomationPack = require('../models/AutomationPack');

class EntityResolver {
    constructor(config = {}) {
        this.config = {
            autoCreatePortfolio: true,
            autoCreateProject: true,
            autoCreatePack: true,
            caseSensitive: false,
            fuzzyMatchThreshold: 0.75,  // 75% similarity threshold for fuzzy matching
            ...config
        };
        
        // Cache for frequently accessed entities
        this.cache = {
            portfolios: null,
            projects: null,
            packs: null,
            lastRefresh: null
        };
    }

    /**
     * Main resolution function - Independent hierarchical evaluation
     * Each field is evaluated independently:
     * 1. Portfolio: Find existing (exact/fuzzy) OR create new
     * 2. Project: Find existing under portfolio (exact/fuzzy) OR create new
     * 3. Pack: Find existing under project (exact/fuzzy) OR create new
     * 
     * @param {Object} data - { portfolioName, projectName, packName }
     * @returns {Object} - { portfolio, project, pack, resolution }
     */
    async resolve(data) {
        const resolution = {
            portfolio: { name: null, action: null, isNew: false },
            project: { name: null, action: null, isNew: false },
            pack: { name: null, action: null, isNew: false }
        };

        // STEP 1: Resolve Portfolio (required)
        // Try to find existing (exact or fuzzy match), otherwise create new
        let portfolio = await this.findPortfolioByName(data.portfolioName);
        
        if (portfolio) {
            // Found existing portfolio (exact or fuzzy match)
            resolution.portfolio = { 
                name: portfolio.name, 
                action: 'found', 
                isNew: false 
            };
        } else {
            // Create new portfolio
            portfolio = await this.createPortfolio(data.portfolioName);
            resolution.portfolio = { 
                name: portfolio.name, 
                action: 'created', 
                isNew: true 
            };
        }

        // STEP 2: Resolve Project under the portfolio (required)
        // Try to find existing under this portfolio (exact or fuzzy), otherwise create new
        let project = await this.findProjectByName(data.projectName, portfolio._id);
        
        if (project) {
            // Found existing project under this portfolio (exact or fuzzy match)
            resolution.project = { 
                name: project.name, 
                action: 'found', 
                isNew: false 
            };
        } else {
            // Create new project under this portfolio
            project = await this.createProject(data.projectName, portfolio);
            resolution.project = { 
                name: project.name, 
                action: 'created', 
                isNew: true 
            };
        }

        // STEP 3: Resolve Pack under the project (required)
        // Try to find existing under this project (exact or fuzzy), otherwise create new
        let pack = await this.findPackByName(data.packName, project._id);
        
        if (pack) {
            // Found existing pack under this project (exact or fuzzy match)
            resolution.pack = { 
                name: pack.name, 
                action: 'found', 
                isNew: false 
            };
        } else {
            // Create new pack under this project
            pack = await this.createPack(data.packName, project, portfolio);
            resolution.pack = { 
                name: pack.name, 
                action: 'created', 
                isNew: true 
            };
        }

        return { portfolio, project, pack, resolution };
    }

    /**
     * Find pack by name under specific project (case-insensitive + fuzzy matching)
     * @param {string} packName - Name of the pack to find
     * @param {ObjectId} projectId - Project ID to search within
     */
    async findPackByName(packName, projectId = null) {
        const searchName = this.config.caseSensitive ? packName : packName.trim();
        
        // Build query
        const query = this.config.caseSensitive 
            ? { name: searchName }
            : { name: { $regex: new RegExp(`^${this.escapeRegex(searchName)}$`, 'i') } };
        
        // Add project scope if provided
        if (projectId) {
            query.projectId = projectId;
        }
        
        // Try exact match first (case-insensitive)
        let pack = await AutomationPack.findOne(query);
        
        if (pack) {
            return pack;
        }
        
        // If no exact match, try fuzzy matching
        if (!this.config.caseSensitive) {
            // Get all packs under this project (or all if no project specified)
            const fuzzyQuery = projectId ? { projectId } : {};
            const allPacks = await AutomationPack.find(fuzzyQuery);
            const fuzzyMatch = this.findBestFuzzyMatch(searchName, allPacks, 'name');
            if (fuzzyMatch) {
                console.log(`🔍 Fuzzy matched pack "${searchName}" to "${fuzzyMatch.name}" (similarity: ${fuzzyMatch.similarity}%)`);
                return fuzzyMatch.entity;
            }
        }
        
        return null;
    }

    /**
     * Find project by name (case-insensitive + fuzzy matching, optionally scoped to portfolio)
     */
    async findProjectByName(projectName, portfolioId = null) {
        const searchName = this.config.caseSensitive ? projectName : projectName.trim();
        
        const query = this.config.caseSensitive 
            ? { name: searchName }
            : { name: { $regex: new RegExp(`^${this.escapeRegex(searchName)}$`, 'i') } };
        
        if (portfolioId) {
            query.portfolioId = portfolioId;
        }
        
        let project = await Project.findOne(query);
        
        if (project) {
            return project;
        }
        
        // If no exact match, try fuzzy matching
        if (!this.config.caseSensitive) {
            const queryForFuzzy = portfolioId ? { portfolioId } : {};
            const allProjects = await Project.find(queryForFuzzy);
            const fuzzyMatch = this.findBestFuzzyMatch(searchName, allProjects, 'name');
            if (fuzzyMatch) {
                console.log(`🔍 Fuzzy matched "${searchName}" to "${fuzzyMatch.name}" (similarity: ${fuzzyMatch.similarity})`);
                return fuzzyMatch.entity;
            }
        }
        
        return null;
    }

    /**
     * Find portfolio by name (case-insensitive + fuzzy matching)
     */
    async findPortfolioByName(portfolioName) {
        const searchName = this.config.caseSensitive ? portfolioName : portfolioName.trim();
        
        let portfolio;
        if (this.config.caseSensitive) {
            portfolio = await Portfolio.findOne({ name: searchName });
        } else {
            portfolio = await Portfolio.findOne({ 
                name: { $regex: new RegExp(`^${this.escapeRegex(searchName)}$`, 'i') }
            });
        }
        
        if (portfolio) {
            return portfolio;
        }
        
        // If no exact match, try fuzzy matching
        if (!this.config.caseSensitive) {
            const allPortfolios = await Portfolio.find({});
            const fuzzyMatch = this.findBestFuzzyMatch(searchName, allPortfolios, 'name');
            if (fuzzyMatch) {
                console.log(`🔍 Fuzzy matched "${searchName}" to "${fuzzyMatch.name}" (similarity: ${fuzzyMatch.similarity})`);
                return fuzzyMatch.entity;
            }
        }
        
        return null;
    }

    /**
     * Create new portfolio
     */
    async createPortfolio(portfolioName) {
        console.log(`📁 Creating new portfolio: ${portfolioName}`);
        
        return await Portfolio.create({
            name: portfolioName,
            description: `Auto-created portfolio for ${portfolioName}`,
            projectCount: 0,
            packCount: 0,
            runCount: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            passRate: 0,
            status: 'active',
            health: 'good',
            owner: 'System',
            createdAt: new Date(),
            lastUpdated: new Date(),
            version: 1
        });
    }

    /**
     * Create new project under portfolio
     */
    async createProject(projectName, portfolio) {
        console.log(`📂 Creating new project: ${projectName} under ${portfolio.name}`);
        
        return await Project.create({
            name: projectName,
            displayName: projectName,
            description: `Auto-created project for ${projectName}`,
            portfolioId: portfolio._id,
            portfolioName: portfolio.name,
            packCount: 0,
            runCount: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            passRate: 0,
            status: 'active',
            health: 'good',
            owner: 'System',
            ownerEmail: 'system@reportportal.com',
            team: 'System',
            framework: 'Multiple',
            language: 'Multiple',
            createdAt: new Date(),
            lastUpdated: new Date(),
            version: 1
        });
    }

    /**
     * Create new pack under project
     */
    async createPack(packName, project, portfolio) {
        console.log(`📋 Creating new pack: ${packName} under ${project.name}`);
        
        return await AutomationPack.create({
            name: packName,
            displayName: packName,
            description: `Auto-created pack for ${packName}`,
            projectId: project._id,
            portfolioId: portfolio._id,
            projectName: project.name,
            portfolioName: portfolio.name,
            testCount: 0,
            runCount: 0,
            passRate: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            avgDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            failureRate: 0,
            consecutiveFailures: 0,
            status: 'active',
            createdAt: new Date(),
            lastUpdated: new Date(),
            version: 1
        });
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Used for fuzzy matching
     */
    levenshteinDistance(str1, str2) {
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        const len1 = s1.length;
        const len2 = s2.length;
        
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + cost  // substitution
                );
            }
        }
        
        return matrix[len2][len1];
    }

    /**
     * Calculate similarity percentage between two strings
     * Returns a value between 0 and 1
     */
    calculateSimilarity(str1, str2) {
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1.0;
        
        const distance = this.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLen);
    }

    /**
     * Find best fuzzy match from a list of entities
     * @param {string} searchName - The name to search for
     * @param {Array} entities - Array of entity objects
     * @param {string} fieldName - The field name to compare (e.g., 'name')
     * @returns {Object|null} - { entity, name, similarity } or null
     */
    findBestFuzzyMatch(searchName, entities, fieldName) {
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (const entity of entities) {
            const entityName = entity[fieldName];
            if (!entityName) continue;
            
            const similarity = this.calculateSimilarity(searchName, entityName);
            
            if (similarity >= this.config.fuzzyMatchThreshold && similarity > bestSimilarity) {
                bestMatch = entity;
                bestSimilarity = similarity;
            }
        }
        
        if (bestMatch) {
            return {
                entity: bestMatch,
                name: bestMatch[fieldName],
                similarity: Math.round(bestSimilarity * 100)
            };
        }
        
        return null;
    }

    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {
            portfolios: null,
            projects: null,
            packs: null,
            lastRefresh: null
        };
    }
}

module.exports = EntityResolver;
