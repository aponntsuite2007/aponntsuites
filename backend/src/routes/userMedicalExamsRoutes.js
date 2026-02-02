/**
 * ========================================================================
 * RUTAS: Exámenes Médicos Ocupacionales
 * ========================================================================
 * API REST completa para gestión de exámenes médicos con periodicidad
 * Soporta cálculo automático de próximo examen
 * ========================================================================
 */

const express = require('express');
const router = express.Router();
const { auth: auth } = require('../middleware/auth');
const UserMedicalExams = require('../models/UserMedicalExams');
const { User } = require('../config/database');
const { Op } = require('sequelize');

/**
 * GET /api/v1/users/:userId/medical-exams
 * Obtener todos los exámenes médicos de un usuario
 */
router.get('/users/:userId/medical-exams', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const exams = await UserMedicalExams.findAll({
            where: {
                user_id: userId,
                company_id: companyId
            },
            order: [['exam_date', 'DESC']]
        });

        res.json(exams);

    } catch (error) {
        console.error('❌ Error obteniendo exámenes médicos:', error);
        res.status(500).json({
            error: 'Error al obtener exámenes médicos',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/users/:userId/medical-exams/:examId
 * Obtener un examen médico específico
 */
router.get('/users/:userId/medical-exams/:examId', auth, async (req, res) => {
    try {
        const { userId, examId } = req.params;
        const { companyId } = req.user;

        const exam = await UserMedicalExams.findOne({
            where: {
                id: examId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!exam) {
            return res.status(404).json({
                error: 'Examen médico no encontrado'
            });
        }

        res.json(exam);

    } catch (error) {
        console.error('❌ Error obteniendo examen médico:', error);
        res.status(500).json({
            error: 'Error al obtener examen médico',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/users/:userId/medical-exams
 * Crear nuevo examen médico
 */
router.post('/users/:userId/medical-exams', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario existe y pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Validación básica
        const { exam_type, exam_date } = req.body;
        if (!exam_type || !exam_date) {
            return res.status(400).json({
                error: 'El tipo de examen y fecha son obligatorios'
            });
        }

        // Crear examen (los triggers de BD calcularán next_exam_date si corresponde)
        const exam = await UserMedicalExams.create({
            user_id: userId,
            company_id: companyId,
            exam_type: req.body.exam_type,
            exam_date: req.body.exam_date,
            exam_result: req.body.exam_result || 'pendiente',
            observations: req.body.observations || null,
            doctor_name: req.body.doctor_name || null,
            medical_center: req.body.medical_center || null,
            file_url: req.body.file_url || null,
            restrictions: req.body.restrictions || null,
            restrictions_description: req.body.restrictions_description || null,
            next_exam_date: req.body.next_exam_date || null,
            exam_frequency: req.body.exam_frequency || null,
            frequency_months: req.body.frequency_months || null,
            auto_calculate_next_exam: req.body.auto_calculate_next_exam !== false // Default true
        });

        console.log(`🏥 [MEDICAL-EXAMS] Nuevo examen creado: ${exam.exam_type} para user ${userId}`);

        // Refrescar para obtener next_exam_date calculado por trigger
        await exam.reload();

        // ✅ INTEGRACIÓN: Si el examen tiene deficiencias, auto-asignar capacitaciones
        try {
            const result = req.body.exam_result || req.body.result;
            const restrictions = req.body.restrictions;

            // Detectar deficiencias basadas en resultado y restricciones
            if (result && result !== 'apto' && result !== 'pendiente') {
                const MedicalTrainingIntegration = require('../services/integrations/medical-training-integration');

                // Mapear restricciones a tipos de deficiencia
                const deficiencies = [];

                if (restrictions) {
                    if (restrictions.includes('audit') || restrictions.includes('ruido')) {
                        deficiencies.push({ type: 'audiometry_moderate', severity: 'moderate' });
                    }
                    if (restrictions.includes('visual') || restrictions.includes('pantalla')) {
                        deficiencies.push({ type: 'visual_mild', severity: 'mild' });
                    }
                    if (restrictions.includes('ergon') || restrictions.includes('postura') || restrictions.includes('espalda')) {
                        deficiencies.push({ type: 'ergonomic_posture', severity: 'moderate' });
                    }
                    if (restrictions.includes('respir') || restrictions.includes('pulmon')) {
                        deficiencies.push({ type: 'respiratory_mild', severity: 'mild' });
                    }
                    if (restrictions.includes('estrés') || restrictions.includes('stress') || restrictions.includes('psico')) {
                        deficiencies.push({ type: 'stress_moderate', severity: 'moderate' });
                    }
                }

                // Si no se detectaron por restricciones pero resultado es 'no_apto' o similar
                if (deficiencies.length === 0 && (result === 'no_apto' || result === 'apto_con_restricciones')) {
                    deficiencies.push({ type: `${exam.exam_type}_deficient`, severity: 'moderate' });
                }

                if (deficiencies.length > 0) {
                    console.log(`🔗 [MEDICAL→TRAINING] Detectadas ${deficiencies.length} deficiencias, auto-asignando capacitaciones...`);
                    await MedicalTrainingIntegration.onExamCompleted(exam, deficiencies);
                }
            }
        } catch (integrationError) {
            console.warn(`⚠️ [MEDICAL→TRAINING] Error en integración (no bloquea):`, integrationError.message);
        }

        res.status(201).json(exam);

    } catch (error) {
        console.error('❌ Error creando examen médico:', error);
        res.status(500).json({
            error: 'Error al crear examen médico',
            details: error.message
        });
    }
});

/**
 * PUT /api/v1/users/:userId/medical-exams/:examId
 * Actualizar examen médico existente
 */
router.put('/users/:userId/medical-exams/:examId', auth, async (req, res) => {
    try {
        const { userId, examId } = req.params;
        const { companyId } = req.user;

        const exam = await UserMedicalExams.findOne({
            where: {
                id: examId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!exam) {
            return res.status(404).json({
                error: 'Examen médico no encontrado'
            });
        }

        // Actualizar campos permitidos
        const updateFields = [
            'exam_type', 'exam_date', 'exam_result', 'observations',
            'doctor_name', 'medical_center', 'file_url', 'restrictions',
            'restrictions_description', 'next_exam_date', 'exam_frequency',
            'frequency_months', 'auto_calculate_next_exam'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                exam[field] = req.body[field];
            }
        });

        await exam.save();

        console.log(`🏥 [MEDICAL-EXAMS] Examen actualizado: ${examId}`);

        // Refrescar para obtener next_exam_date recalculado
        await exam.reload();

        res.json(exam);

    } catch (error) {
        console.error('❌ Error actualizando examen médico:', error);
        res.status(500).json({
            error: 'Error al actualizar examen médico',
            details: error.message
        });
    }
});

/**
 * DELETE /api/v1/users/:userId/medical-exams/:examId
 * Eliminar examen médico
 */
router.delete('/users/:userId/medical-exams/:examId', auth, async (req, res) => {
    try {
        const { userId, examId } = req.params;
        const { companyId } = req.user;

        const exam = await UserMedicalExams.findOne({
            where: {
                id: examId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!exam) {
            return res.status(404).json({
                error: 'Examen médico no encontrado'
            });
        }

        await exam.destroy();

        console.log(`🏥 [MEDICAL-EXAMS] Examen eliminado: ${examId}`);

        res.json({
            success: true,
            message: 'Examen médico eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando examen médico:', error);
        res.status(500).json({
            error: 'Error al eliminar examen médico',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/medical-exams/expiring
 * Obtener exámenes que vencen pronto (para dashboard)
 */
router.get('/medical-exams/expiring', auth, async (req, res) => {
    try {
        const { companyId } = req.user;
        const days = parseInt(req.query.days) || 30;

        const expiringExams = await UserMedicalExams.findAll({
            where: {
                company_id: companyId,
                next_exam_date: {
                    [Op.and]: [
                        { [Op.ne]: null },
                        { [Op.lte]: new Date(Date.now() + days * 24 * 60 * 60 * 1000) },
                        { [Op.gt]: new Date() }
                    ]
                }
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['user_id', 'usuario', 'firstName', 'lastName', 'email']
            }],
            order: [['next_exam_date', 'ASC']]
        });

        res.json(expiringExams);

    } catch (error) {
        console.error('❌ Error obteniendo exámenes vencibles:', error);
        res.status(500).json({
            error: 'Error al obtener exámenes vencibles',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/users/:userId/medical-exams/latest
 * Obtener último examen médico de un usuario
 */
router.get('/users/:userId/medical-exams/latest', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        const latestExam = await UserMedicalExams.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            },
            order: [['exam_date', 'DESC']]
        });

        if (!latestExam) {
            return res.status(404).json({
                error: 'No se encontraron exámenes médicos para este usuario'
            });
        }

        res.json(latestExam);

    } catch (error) {
        console.error('❌ Error obteniendo último examen:', error);
        res.status(500).json({
            error: 'Error al obtener último examen',
            details: error.message
        });
    }
});

module.exports = router;
