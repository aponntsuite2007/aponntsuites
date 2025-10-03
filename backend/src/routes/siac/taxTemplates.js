const express = require('express');
const router = express.Router();
const { TaxTemplate, TaxCondition, TaxConcept, TaxRate, CompanyTaxConfig } = require('../../models/siac/TaxTemplate');
// Temporary simple auth for testing
const simpleAuth = (req, res, next) => {
    // Accept any request for now during development
    req.user = { role: 'admin', id: 'test-user' };
    next();
};

const { auth } = require('../../middleware/auth');

/**
 * PLANTILLAS FISCALES - APIs
 * Sistema configurable de matriz impositiva por país
 */

// ===============================================
// OBTENER TODAS LAS PLANTILLAS
// ===============================================
router.get('/', simpleAuth, async (req, res) => {
    try {
        const templates = await TaxTemplate.findAll({
            where: { isActive: true },
            include: [
                {
                    model: TaxCondition,
                    as: 'conditions',
                    where: { isActive: true },
                    required: false
                },
                {
                    model: TaxConcept,
                    as: 'concepts',
                    where: { isActive: true },
                    required: false,
                    include: [{
                        model: TaxRate,
                        as: 'rates',
                        where: { isActive: true },
                        required: false
                    }]
                }
            ],
            order: [['country', 'ASC']]
        });

        res.json({
            success: true,
            templates: templates.map(template => ({
                id: template.id,
                country: template.country,
                countryCode: template.countryCode,
                templateName: template.templateName,
                taxIdFormat: template.taxIdFormat,
                taxIdFieldName: template.taxIdFieldName,
                currencies: template.currencies,
                defaultCurrency: template.defaultCurrency,
                conditionsCount: template.conditions?.length || 0,
                conceptsCount: template.concepts?.length || 0,
                createdAt: template.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Error obteniendo plantillas fiscales:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER PLANTILLA ESPECÍFICA CON DETALLE COMPLETO
// ===============================================
router.get('/:id', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const template = await TaxTemplate.findByPk(id, {
            include: [
                {
                    model: TaxCondition,
                    as: 'conditions',
                    where: { isActive: true },
                    required: false,
                    order: [['displayOrder', 'ASC']]
                },
                {
                    model: TaxConcept,
                    as: 'concepts',
                    where: { isActive: true },
                    required: false,
                    include: [{
                        model: TaxRate,
                        as: 'rates',
                        where: { isActive: true },
                        required: false,
                        order: [['ratePercentage', 'ASC']]
                    }],
                    order: [['calculationOrder', 'ASC']]
                }
            ]
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla fiscal no encontrada'
            });
        }

        res.json({
            success: true,
            template
        });

    } catch (error) {
        console.error('❌ Error obteniendo plantilla fiscal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CREAR NUEVA PLANTILLA FISCAL
// ===============================================
router.post('/', simpleAuth, async (req, res) => {
    try {
        // Solo admins pueden crear plantillas
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden crear plantillas fiscales'
            });
        }

        const {
            country,
            countryCode,
            templateName,
            taxIdFormat,
            taxIdFieldName,
            taxIdValidationRegex,
            currencies,
            defaultCurrency
        } = req.body;

        const newTemplate = await TaxTemplate.create({
            country,
            countryCode: countryCode.toUpperCase(),
            templateName,
            taxIdFormat,
            taxIdFieldName: taxIdFieldName || 'CUIT',
            taxIdValidationRegex,
            currencies: currencies || ['ARS'],
            defaultCurrency: defaultCurrency || 'ARS'
        });

        console.log(`✅ [TAX TEMPLATES] Plantilla creada: ${country} (${countryCode})`);

        res.status(201).json({
            success: true,
            template: newTemplate,
            message: `Plantilla fiscal para ${country} creada exitosamente`
        });

    } catch (error) {
        console.error('❌ Error creando plantilla fiscal:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: `Ya existe una plantilla para el código de país ${req.body.countryCode}`
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// ACTUALIZAR PLANTILLA FISCAL
// ===============================================
router.put('/:id', simpleAuth, async (req, res) => {
    try {
        // Solo admins pueden actualizar plantillas
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden actualizar plantillas fiscales'
            });
        }

        const { id } = req.params;
        const updateData = req.body;

        const template = await TaxTemplate.findByPk(id);

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla fiscal no encontrada'
            });
        }

        await template.update(updateData);

        console.log(`✅ [TAX TEMPLATES] Plantilla actualizada: ${template.country}`);

        res.json({
            success: true,
            template,
            message: 'Plantilla fiscal actualizada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error actualizando plantilla fiscal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// AGREGAR CONDICIÓN IMPOSITIVA A PLANTILLA
// ===============================================
router.post('/:id/conditions', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { conditionCode, conditionName, description, displayOrder } = req.body;

        const template = await TaxTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla fiscal no encontrada'
            });
        }

        const newCondition = await TaxCondition.create({
            taxTemplateId: id,
            conditionCode: conditionCode.toUpperCase(),
            conditionName,
            description,
            displayOrder: displayOrder || 1
        });

        console.log(`✅ [TAX TEMPLATES] Condición agregada: ${conditionName} a ${template.country}`);

        res.status(201).json({
            success: true,
            condition: newCondition,
            message: 'Condición impositiva agregada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error agregando condición impositiva:', error);

        // Manejo específico para error de clave duplicada
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: `Ya existe una condición con el código ${req.body.conditionCode} en esta plantilla`
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// AGREGAR CONCEPTO IMPOSITIVO A PLANTILLA
// ===============================================
router.post('/:id/concepts', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            conceptCode,
            conceptName,
            description,
            calculationOrder,
            baseAmount,
            conceptType
        } = req.body;

        const template = await TaxTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla fiscal no encontrada'
            });
        }

        const newConcept = await TaxConcept.create({
            taxTemplateId: id,
            conceptCode: conceptCode.toUpperCase(),
            conceptName,
            description,
            calculationOrder: calculationOrder || 1,
            baseAmount: baseAmount || 'neto_final',
            conceptType: conceptType || 'tax'
        });

        console.log(`✅ [TAX TEMPLATES] Concepto agregado: ${conceptName} a ${template.country}`);

        res.status(201).json({
            success: true,
            concept: newConcept,
            message: 'Concepto impositivo agregado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error agregando concepto impositivo:', error);

        // Manejo específico para error de clave duplicada
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: `Ya existe un concepto con el código ${req.body.conceptCode} en esta plantilla`
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// AGREGAR ALÍCUOTA A CONCEPTO
// ===============================================
router.post('/concepts/:conceptId/rates', simpleAuth, async (req, res) => {
    try {
        const { conceptId } = req.params;
        const {
            rateCode,
            rateName,
            ratePercentage,
            minimumAmount,
            maximumAmount,
            isDefault
        } = req.body;

        const concept = await TaxConcept.findByPk(conceptId);
        if (!concept) {
            return res.status(404).json({
                success: false,
                error: 'Concepto impositivo no encontrado'
            });
        }

        const newRate = await TaxRate.create({
            taxConceptId: conceptId,
            rateCode: rateCode.toUpperCase(),
            rateName,
            ratePercentage,
            minimumAmount: minimumAmount || 0,
            maximumAmount,
            isDefault: isDefault || false
        });

        console.log(`✅ [TAX TEMPLATES] Alícuota agregada: ${rateName} (${ratePercentage}%)`);

        res.status(201).json({
            success: true,
            rate: newRate,
            message: 'Alícuota agregada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error agregando alícuota:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER PLANTILLA POR CÓDIGO DE PAÍS
// ===============================================
router.get('/country/:countryCode', simpleAuth, async (req, res) => {
    try {
        const { countryCode } = req.params;

        const template = await TaxTemplate.getByCountryCode(countryCode.toUpperCase());

        if (!template) {
            return res.status(404).json({
                success: false,
                error: `No se encontró plantilla fiscal para ${countryCode}`
            });
        }

        res.json({
            success: true,
            template
        });

    } catch (error) {
        console.error('❌ Error obteniendo plantilla por país:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CONFIGURACIÓN DE EMPRESA - OBTENER
// ===============================================
router.get('/company/:companyId', simpleAuth, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verificar que el usuario tenga acceso a la empresa
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (req.user.companyId !== parseInt(companyId)) {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado a configuración de esta empresa'
                });
            }
        }

        const config = await CompanyTaxConfig.getCompanyConfig(parseInt(companyId));

        if (!config) {
            return res.status(404).json({
                success: false,
                error: 'Configuración fiscal no encontrada para esta empresa',
                needsSetup: true
            });
        }

        res.json({
            success: true,
            config
        });

    } catch (error) {
        console.error('❌ Error obteniendo configuración de empresa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CONFIGURACIÓN DE EMPRESA - CREAR/ACTUALIZAR
// ===============================================
router.put('/company/:companyId', simpleAuth, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verificar que el usuario tenga acceso a la empresa
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (req.user.companyId !== parseInt(companyId)) {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado a configuración de esta empresa'
                });
            }
        }

        const configData = req.body;

        let config = await CompanyTaxConfig.findOne({
            where: { companyId: parseInt(companyId) }
        });

        if (!config) {
            // Crear nueva configuración
            config = await CompanyTaxConfig.create({
                companyId: parseInt(companyId),
                ...configData
            });

            console.log(`✅ [TAX CONFIG] Configuración creada para empresa ${companyId}`);
        } else {
            // Actualizar configuración existente
            await config.update(configData);

            console.log(`✅ [TAX CONFIG] Configuración actualizada para empresa ${companyId}`);
        }

        // Recargar con relaciones
        const fullConfig = await CompanyTaxConfig.getCompanyConfig(parseInt(companyId));

        res.json({
            success: true,
            config: fullConfig,
            message: 'Configuración fiscal guardada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error guardando configuración de empresa:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// ELIMINAR PLANTILLA FISCAL (SOFT DELETE)
// ===============================================
router.delete('/:id', simpleAuth, async (req, res) => {
    try {
        // Solo admins pueden eliminar plantillas
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden eliminar plantillas fiscales'
            });
        }

        const { id } = req.params;

        const template = await TaxTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla fiscal no encontrada'
            });
        }

        await template.update({ isActive: false });

        console.log(`✅ [TAX TEMPLATES] Plantilla desactivada: ${template.country}`);

        res.json({
            success: true,
            message: 'Plantilla fiscal desactivada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando plantilla fiscal:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;