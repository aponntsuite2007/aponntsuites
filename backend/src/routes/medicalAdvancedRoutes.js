/**
 * Rutas API para Sistema Médico Avanzado
 * Incluye: Antropométricos, Condiciones Crónicas, Cirugías,
 * Tratamientos Psiquiátricos, Deportes y Hábitos Saludables
 */

const express = require('express');
const router = express.Router();
const {
    UserAnthropometricData,
    ChronicConditionsCatalog,
    UserChronicConditionsV2,
    UserSurgeries,
    UserPsychiatricTreatments,
    SportsCatalog,
    UserSportsActivities,
    UserHealthyHabits
} = require('../config/database');

// ============================================================================
// HELPER: Validar formato UUID
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ============================================================================
// DATOS ANTROPOMÉTRICOS
// ============================================================================

// GET /api/medical-advanced/anthropometric/:userId - Obtener historial antropométrico
router.get('/anthropometric/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // ✅ FIX: Validar UUID
        if (!isValidUUID(userId)) {
            return res.json({ success: true, data: [] });
        }

        const { companyId } = req.user || {};

        const data = await UserAnthropometricData.findAll({
            where: { user_id: userId, ...(companyId && { company_id: companyId }) },
            order: [['measurement_date', 'DESC']],
            limit: 50
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching anthropometric data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/anthropometric - Agregar medición antropométrica
router.post('/anthropometric', async (req, res) => {
    try {
        const data = await UserAnthropometricData.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating anthropometric data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/anthropometric/:id - Actualizar medición
router.put('/anthropometric/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserAnthropometricData.update(req.body, { where: { id } });
        const data = await UserAnthropometricData.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating anthropometric data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/medical-advanced/anthropometric/:id - Eliminar medición
router.delete('/anthropometric/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserAnthropometricData.destroy({ where: { id } });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting anthropometric data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CATÁLOGO DE CONDICIONES CRÓNICAS
// ============================================================================

// GET /api/medical-advanced/chronic-conditions-catalog - Obtener catálogo
router.get('/chronic-conditions-catalog', async (req, res) => {
    try {
        const data = await ChronicConditionsCatalog.findAll({
            where: { is_active: true },
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching chronic conditions catalog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONDICIONES CRÓNICAS DEL USUARIO
// ============================================================================

// GET /api/medical-advanced/chronic-conditions/:userId
router.get('/chronic-conditions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};

        const data = await UserChronicConditionsV2.findAll({
            where: { user_id: userId, is_active: true, ...(companyId && { company_id: companyId }) },
            include: [{ model: ChronicConditionsCatalog, as: 'catalogEntry' }],
            order: [['diagnosis_date', 'DESC']]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching user chronic conditions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/chronic-conditions
router.post('/chronic-conditions', async (req, res) => {
    try {
        const data = await UserChronicConditionsV2.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating chronic condition:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/chronic-conditions/:id
router.put('/chronic-conditions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserChronicConditionsV2.update(req.body, { where: { id } });
        const data = await UserChronicConditionsV2.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating chronic condition:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/medical-advanced/chronic-conditions/:id (soft delete)
router.delete('/chronic-conditions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserChronicConditionsV2.update({ is_active: false }, { where: { id } });
        res.json({ success: true, message: 'Condition deactivated' });
    } catch (error) {
        console.error('Error deactivating chronic condition:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CIRUGÍAS
// ============================================================================

// GET /api/medical-advanced/surgeries/:userId
router.get('/surgeries/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};

        const data = await UserSurgeries.findAll({
            where: { user_id: userId, ...(companyId && { company_id: companyId }) },
            order: [['surgery_date', 'DESC']]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching surgeries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/surgeries
router.post('/surgeries', async (req, res) => {
    try {
        const data = await UserSurgeries.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating surgery record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/surgeries/:id
router.put('/surgeries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserSurgeries.update(req.body, { where: { id } });
        const data = await UserSurgeries.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating surgery record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/medical-advanced/surgeries/:id
router.delete('/surgeries/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserSurgeries.destroy({ where: { id } });
        res.json({ success: true, message: 'Surgery record deleted' });
    } catch (error) {
        console.error('Error deleting surgery record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TRATAMIENTOS PSIQUIÁTRICOS
// ============================================================================

// GET /api/medical-advanced/psychiatric/:userId
router.get('/psychiatric/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};
        const { current } = req.query;

        const whereClause = {
            user_id: userId,
            ...(companyId && { company_id: companyId }),
            ...(current === 'true' && { is_current: true })
        };

        const data = await UserPsychiatricTreatments.findAll({
            where: whereClause,
            order: [['is_current', 'DESC'], ['treatment_start_date', 'DESC']]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching psychiatric treatments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/psychiatric
router.post('/psychiatric', async (req, res) => {
    try {
        const data = await UserPsychiatricTreatments.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating psychiatric treatment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/psychiatric/:id
router.put('/psychiatric/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserPsychiatricTreatments.update(req.body, { where: { id } });
        const data = await UserPsychiatricTreatments.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating psychiatric treatment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/medical-advanced/psychiatric/:id
router.delete('/psychiatric/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserPsychiatricTreatments.destroy({ where: { id } });
        res.json({ success: true, message: 'Treatment record deleted' });
    } catch (error) {
        console.error('Error deleting psychiatric treatment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CATÁLOGO DE DEPORTES
// ============================================================================

// GET /api/medical-advanced/sports-catalog
router.get('/sports-catalog', async (req, res) => {
    try {
        const data = await SportsCatalog.findAll({
            where: { is_active: true },
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sports catalog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ACTIVIDADES DEPORTIVAS DEL USUARIO
// ============================================================================

// GET /api/medical-advanced/sports/:userId
router.get('/sports/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};

        const data = await UserSportsActivities.findAll({
            where: { user_id: userId, is_active: true, ...(companyId && { company_id: companyId }) },
            include: [{ model: SportsCatalog, as: 'sportCatalog' }],
            order: [['practice_level', 'DESC'], ['hours_per_week', 'DESC']]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sports activities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/sports
router.post('/sports', async (req, res) => {
    try {
        const data = await UserSportsActivities.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating sports activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/sports/:id
router.put('/sports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserSportsActivities.update(req.body, { where: { id } });
        const data = await UserSportsActivities.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating sports activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/medical-advanced/sports/:id (soft delete)
router.delete('/sports/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserSportsActivities.update({ is_active: false }, { where: { id } });
        res.json({ success: true, message: 'Activity deactivated' });
    } catch (error) {
        console.error('Error deactivating sports activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// HÁBITOS SALUDABLES
// ============================================================================

// GET /api/medical-advanced/healthy-habits/:userId
router.get('/healthy-habits/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};

        const data = await UserHealthyHabits.findOne({
            where: { user_id: userId, ...(companyId && { company_id: companyId }) }
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching healthy habits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/medical-advanced/healthy-habits
router.post('/healthy-habits', async (req, res) => {
    try {
        // Verificar si ya existe un registro para este usuario
        const existing = await UserHealthyHabits.findOne({
            where: { user_id: req.body.user_id }
        });

        if (existing) {
            // Actualizar el existente
            await UserHealthyHabits.update(req.body, { where: { id: existing.id } });
            const data = await UserHealthyHabits.findByPk(existing.id);
            res.json({ success: true, data, updated: true });
        } else {
            // Crear nuevo
            const data = await UserHealthyHabits.create(req.body);
            res.json({ success: true, data, updated: false });
        }
    } catch (error) {
        console.error('Error saving healthy habits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/medical-advanced/healthy-habits/:userId
router.put('/healthy-habits/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const existing = await UserHealthyHabits.findOne({ where: { user_id: userId } });

        if (existing) {
            await UserHealthyHabits.update(req.body, { where: { id: existing.id } });
            const data = await UserHealthyHabits.findByPk(existing.id);
            res.json({ success: true, data });
        } else {
            res.status(404).json({ success: false, error: 'No healthy habits record found' });
        }
    } catch (error) {
        console.error('Error updating healthy habits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENDPOINT COMPLETO - Obtener todos los datos médicos avanzados de un usuario
// ============================================================================

// GET /api/medical-advanced/complete/:userId
router.get('/complete/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // ✅ FIX: Validar UUID
        if (!isValidUUID(userId)) {
            return res.json({ success: false, error: 'userId inválido', data: null });
        }

        const { companyId } = req.user || {};
        const companyFilter = companyId ? { company_id: companyId } : {};

        const [
            anthropometric,
            chronicConditions,
            surgeries,
            psychiatricTreatments,
            sportsActivities,
            healthyHabits
        ] = await Promise.all([
            UserAnthropometricData.findAll({
                where: { user_id: userId, ...companyFilter },
                order: [['measurement_date', 'DESC']],
                limit: 10
            }),
            UserChronicConditionsV2.findAll({
                where: { user_id: userId, is_active: true, ...companyFilter },
                include: [{ model: ChronicConditionsCatalog, as: 'catalogEntry' }]
            }),
            UserSurgeries.findAll({
                where: { user_id: userId, ...companyFilter },
                order: [['surgery_date', 'DESC']]
            }),
            UserPsychiatricTreatments.findAll({
                where: { user_id: userId, ...companyFilter },
                order: [['is_current', 'DESC'], ['treatment_start_date', 'DESC']]
            }),
            UserSportsActivities.findAll({
                where: { user_id: userId, is_active: true, ...companyFilter },
                include: [{ model: SportsCatalog, as: 'sportCatalog' }]
            }),
            UserHealthyHabits.findOne({
                where: { user_id: userId, ...companyFilter }
            })
        ]);

        // Obtener última medición antropométrica para datos actuales
        const latestAnthropometric = anthropometric.length > 0 ? anthropometric[0] : null;

        res.json({
            success: true,
            data: {
                anthropometric: {
                    latest: latestAnthropometric,
                    history: anthropometric
                },
                chronicConditions,
                surgeries,
                psychiatricTreatments: {
                    current: psychiatricTreatments.filter(t => t.is_current),
                    historical: psychiatricTreatments.filter(t => !t.is_current)
                },
                sportsActivities,
                healthyHabits,
                summary: {
                    hasChronicConditions: chronicConditions.length > 0,
                    chronicConditionsCount: chronicConditions.length,
                    hasSurgeryHistory: surgeries.length > 0,
                    surgeriesCount: surgeries.length,
                    hasCurrentPsychiatricTreatment: psychiatricTreatments.some(t => t.is_current),
                    practiceSports: sportsActivities.length > 0,
                    sportsCount: sportsActivities.length,
                    hasExtremesSports: sportsActivities.some(s => s.is_extreme_sport),
                    isProfessionalAthlete: sportsActivities.some(s =>
                        s.practice_level === 'professional' || s.practice_level === 'semi_professional'
                    ),
                    currentBMI: latestAnthropometric?.bmi || null,
                    bloodType: latestAnthropometric?.blood_type || null
                }
            }
        });
    } catch (error) {
        console.error('Error fetching complete medical data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
