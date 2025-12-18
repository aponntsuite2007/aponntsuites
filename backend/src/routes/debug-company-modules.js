const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// GET /api/debug/company/:slug/modules - Verificar módulos activos de una empresa
router.get('/company/:slug/modules', async (req, res) => {
    try {
        const { slug } = req.params;

        const companies = await sequelize.query(`
            SELECT company_id, name, slug, active_modules
            FROM companies
            WHERE slug = :slug
        `, {
            replacements: { slug },
            type: QueryTypes.SELECT
        });

        if (companies.length === 0) {
            return res.json({
                success: false,
                error: `Empresa con slug '${slug}' no encontrada`
            });
        }

        const company = companies[0];

        // Parse active_modules
        let activeModules = company.active_modules;
        if (typeof activeModules === 'string') {
            activeModules = JSON.parse(activeModules);
        }

        // Check benefits-management
        const hasBenefits = Array.isArray(activeModules)
            ? activeModules.includes('benefits-management')
            : activeModules['benefits-management'] === true;

        res.json({
            success: true,
            company: {
                id: company.company_id,
                name: company.name,
                slug: company.slug
            },
            activeModules: {
                type: Array.isArray(activeModules) ? 'array' : 'object',
                total: Array.isArray(activeModules) ? activeModules.length : Object.keys(activeModules).length,
                hasBenefitsManagement: hasBenefits,
                list: activeModules
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
