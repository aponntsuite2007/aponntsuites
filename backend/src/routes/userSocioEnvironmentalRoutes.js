/**
 * ========================================================================
 * RUTAS: Datos Socio-Ambientales de Usuarios
 * ========================================================================
 * API REST para gestión de:
 * - Miembros del hogar (user_household_members)
 * - Contactos de emergencia (user_emergency_contacts)
 *
 * Basado en mejores prácticas de SAP SuccessFactors, Workday HCM, Oracle HCM
 * ========================================================================
 */

const express = require('express');
const router = express.Router();
const { auth: authenticateToken } = require('../middleware/auth');
const { User, sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════════
// MIEMBROS DEL HOGAR (Household Members)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/:userId/household-members
 * Obtener todos los miembros del hogar de un usuario
 */
router.get('/:userId/household-members', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: { id: userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const members = await sequelize.query(`
            SELECT * FROM user_household_members
            WHERE user_id = :userId AND is_active = TRUE
            ORDER BY
                CASE relationship
                    WHEN 'spouse' THEN 1
                    WHEN 'child' THEN 2
                    WHEN 'parent' THEN 3
                    ELSE 4
                END,
                created_at ASC
        `, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        res.json(members);

    } catch (error) {
        console.error('❌ [HOUSEHOLD] Error obteniendo miembros:', error);
        res.status(500).json({ error: 'Error al obtener miembros del hogar', details: error.message });
    }
});

/**
 * POST /api/v1/:userId/household-members
 * Agregar un nuevo miembro del hogar
 */
router.post('/:userId/household-members', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;
        const currentUserId = req.user.user_id || req.user.userId || req.user.id;

        // Verificar usuario
        const user = await User.findOne({
            where: { id: userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const {
            full_name, relationship, birth_date, dni, gender,
            is_dependent, is_cohabitant, has_disability, disability_type,
            has_chronic_illness, chronic_illness_notes, works_externally,
            occupation, education_level, is_student, school_name,
            has_own_health_insurance, health_insurance_provider,
            is_covered_by_employee, is_life_insurance_beneficiary,
            beneficiary_percentage, notes
        } = req.body;

        // Validar campos requeridos
        if (!full_name || !relationship) {
            return res.status(400).json({ error: 'Nombre y relación son requeridos' });
        }

        const [result] = await sequelize.query(`
            INSERT INTO user_household_members (
                user_id, company_id, full_name, relationship, birth_date, dni, gender,
                is_dependent, is_cohabitant, has_disability, disability_type,
                has_chronic_illness, chronic_illness_notes, works_externally,
                occupation, education_level, is_student, school_name,
                has_own_health_insurance, health_insurance_provider,
                is_covered_by_employee, is_life_insurance_beneficiary,
                beneficiary_percentage, notes, created_by, updated_by
            ) VALUES (
                :userId, :companyId, :full_name, :relationship, :birth_date, :dni, :gender,
                :is_dependent, :is_cohabitant, :has_disability, :disability_type,
                :has_chronic_illness, :chronic_illness_notes, :works_externally,
                :occupation, :education_level, :is_student, :school_name,
                :has_own_health_insurance, :health_insurance_provider,
                :is_covered_by_employee, :is_life_insurance_beneficiary,
                :beneficiary_percentage, :notes, :currentUserId, :currentUserId
            )
            RETURNING *
        `, {
            replacements: {
                userId, companyId, full_name, relationship,
                birth_date: birth_date || null,
                dni: dni || null,
                gender: gender || null,
                is_dependent: is_dependent || false,
                is_cohabitant: is_cohabitant !== false,
                has_disability: has_disability || false,
                disability_type: disability_type || null,
                has_chronic_illness: has_chronic_illness || false,
                chronic_illness_notes: chronic_illness_notes || null,
                works_externally: works_externally || false,
                occupation: occupation || null,
                education_level: education_level || null,
                is_student: is_student || false,
                school_name: school_name || null,
                has_own_health_insurance: has_own_health_insurance || false,
                health_insurance_provider: health_insurance_provider || null,
                is_covered_by_employee: is_covered_by_employee || false,
                is_life_insurance_beneficiary: is_life_insurance_beneficiary || false,
                beneficiary_percentage: beneficiary_percentage || null,
                notes: notes || null,
                currentUserId
            },
            type: QueryTypes.INSERT
        });

        console.log('✅ [HOUSEHOLD] Miembro agregado para usuario:', userId);
        res.status(201).json({ success: true, member: result[0] || result });

    } catch (error) {
        console.error('❌ [HOUSEHOLD] Error agregando miembro:', error);
        res.status(500).json({ error: 'Error al agregar miembro del hogar', details: error.message });
    }
});

/**
 * PUT /api/v1/:userId/household-members/:memberId
 * Actualizar un miembro del hogar
 */
router.put('/:userId/household-members/:memberId', authenticateToken, async (req, res) => {
    try {
        const { userId, memberId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;
        const currentUserId = req.user.user_id || req.user.userId || req.user.id;

        // Verificar que existe
        const [existing] = await sequelize.query(`
            SELECT id FROM user_household_members
            WHERE id = :memberId AND user_id = :userId
        `, {
            replacements: { memberId, userId },
            type: QueryTypes.SELECT
        });

        if (!existing) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }

        const fields = req.body;
        const updates = [];
        const values = { memberId, currentUserId };

        Object.keys(fields).forEach(key => {
            if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
                updates.push(`${key} = :${key}`);
                values[key] = fields[key];
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updates.push('updated_at = NOW()', 'updated_by = :currentUserId');

        await sequelize.query(`
            UPDATE user_household_members
            SET ${updates.join(', ')}
            WHERE id = :memberId
        `, {
            replacements: values,
            type: QueryTypes.UPDATE
        });

        console.log('✅ [HOUSEHOLD] Miembro actualizado:', memberId);
        res.json({ success: true });

    } catch (error) {
        console.error('❌ [HOUSEHOLD] Error actualizando miembro:', error);
        res.status(500).json({ error: 'Error al actualizar miembro', details: error.message });
    }
});

/**
 * DELETE /api/v1/:userId/household-members/:memberId
 * Eliminar (desactivar) un miembro del hogar
 */
router.delete('/:userId/household-members/:memberId', authenticateToken, async (req, res) => {
    try {
        const { userId, memberId } = req.params;
        const currentUserId = req.user.user_id || req.user.userId || req.user.id;

        await sequelize.query(`
            UPDATE user_household_members
            SET is_active = FALSE, updated_at = NOW(), updated_by = :currentUserId
            WHERE id = :memberId AND user_id = :userId
        `, {
            replacements: { memberId, userId, currentUserId },
            type: QueryTypes.UPDATE
        });

        console.log('✅ [HOUSEHOLD] Miembro eliminado:', memberId);
        res.json({ success: true });

    } catch (error) {
        console.error('❌ [HOUSEHOLD] Error eliminando miembro:', error);
        res.status(500).json({ error: 'Error al eliminar miembro', details: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTOS DE EMERGENCIA (Emergency Contacts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/:userId/emergency-contacts
 * Obtener todos los contactos de emergencia de un usuario
 */
router.get('/:userId/emergency-contacts', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        // Verificar usuario
        const user = await User.findOne({
            where: { id: userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const contacts = await sequelize.query(`
            SELECT * FROM user_emergency_contacts
            WHERE user_id = :userId AND is_active = TRUE
            ORDER BY priority ASC
        `, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        res.json(contacts);

    } catch (error) {
        console.error('❌ [EMERGENCY] Error obteniendo contactos:', error);
        res.status(500).json({ error: 'Error al obtener contactos de emergencia', details: error.message });
    }
});

/**
 * POST /api/v1/:userId/emergency-contacts
 * Agregar un nuevo contacto de emergencia
 */
router.post('/:userId/emergency-contacts', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        // Verificar usuario
        const user = await User.findOne({
            where: { id: userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const {
            full_name, relationship, phone_primary, phone_secondary, phone_work,
            email, address, city, province, available_hours, preferred_contact_method,
            special_instructions, speaks_languages, can_make_medical_decisions,
            can_pickup_employee, has_keys_to_home, priority
        } = req.body;

        // Validar campos requeridos
        if (!full_name || !relationship || !phone_primary) {
            return res.status(400).json({ error: 'Nombre, relación y teléfono son requeridos' });
        }

        // Determinar prioridad
        let finalPriority = priority || 2;

        // Si no hay prioridad especificada, asignar la siguiente disponible
        if (!priority) {
            const [maxPriority] = await sequelize.query(`
                SELECT COALESCE(MAX(priority), 0) + 1 as next_priority
                FROM user_emergency_contacts
                WHERE user_id = :userId AND is_active = TRUE
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });
            finalPriority = maxPriority.next_priority;
        }

        const [result] = await sequelize.query(`
            INSERT INTO user_emergency_contacts (
                user_id, company_id, priority, full_name, relationship,
                phone_primary, phone_secondary, phone_work, email,
                address, city, province, available_hours, preferred_contact_method,
                special_instructions, speaks_languages, can_make_medical_decisions,
                can_pickup_employee, has_keys_to_home
            ) VALUES (
                :userId, :companyId, :priority, :full_name, :relationship,
                :phone_primary, :phone_secondary, :phone_work, :email,
                :address, :city, :province, :available_hours, :preferred_contact_method,
                :special_instructions, :speaks_languages, :can_make_medical_decisions,
                :can_pickup_employee, :has_keys_to_home
            )
            RETURNING *
        `, {
            replacements: {
                userId, companyId,
                priority: finalPriority,
                full_name, relationship,
                phone_primary,
                phone_secondary: phone_secondary || null,
                phone_work: phone_work || null,
                email: email || null,
                address: address || null,
                city: city || null,
                province: province || null,
                available_hours: available_hours || null,
                preferred_contact_method: preferred_contact_method || 'phone',
                special_instructions: special_instructions || null,
                speaks_languages: speaks_languages || null,
                can_make_medical_decisions: can_make_medical_decisions || false,
                can_pickup_employee: can_pickup_employee !== false,
                has_keys_to_home: has_keys_to_home || false
            },
            type: QueryTypes.INSERT
        });

        console.log('✅ [EMERGENCY] Contacto agregado para usuario:', userId);
        res.status(201).json({ success: true, contact: result[0] || result });

    } catch (error) {
        console.error('❌ [EMERGENCY] Error agregando contacto:', error);
        res.status(500).json({ error: 'Error al agregar contacto de emergencia', details: error.message });
    }
});

/**
 * PUT /api/v1/:userId/emergency-contacts/:contactId
 * Actualizar un contacto de emergencia
 */
router.put('/:userId/emergency-contacts/:contactId', authenticateToken, async (req, res) => {
    try {
        const { userId, contactId } = req.params;

        // Verificar que existe
        const [existing] = await sequelize.query(`
            SELECT id FROM user_emergency_contacts
            WHERE id = :contactId AND user_id = :userId
        `, {
            replacements: { contactId, userId },
            type: QueryTypes.SELECT
        });

        if (!existing) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        const fields = req.body;
        const updates = [];
        const values = { contactId };

        Object.keys(fields).forEach(key => {
            if (key !== 'id' && key !== 'user_id' && key !== 'created_at') {
                updates.push(`${key} = :${key}`);
                values[key] = fields[key];
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updates.push('updated_at = NOW()');

        await sequelize.query(`
            UPDATE user_emergency_contacts
            SET ${updates.join(', ')}
            WHERE id = :contactId
        `, {
            replacements: values,
            type: QueryTypes.UPDATE
        });

        console.log('✅ [EMERGENCY] Contacto actualizado:', contactId);
        res.json({ success: true });

    } catch (error) {
        console.error('❌ [EMERGENCY] Error actualizando contacto:', error);
        res.status(500).json({ error: 'Error al actualizar contacto', details: error.message });
    }
});

/**
 * DELETE /api/v1/:userId/emergency-contacts/:contactId
 * Eliminar (desactivar) un contacto de emergencia
 */
router.delete('/:userId/emergency-contacts/:contactId', authenticateToken, async (req, res) => {
    try {
        const { userId, contactId } = req.params;

        await sequelize.query(`
            UPDATE user_emergency_contacts
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = :contactId AND user_id = :userId
        `, {
            replacements: { contactId, userId },
            type: QueryTypes.UPDATE
        });

        console.log('✅ [EMERGENCY] Contacto eliminado:', contactId);
        res.json({ success: true });

    } catch (error) {
        console.error('❌ [EMERGENCY] Error eliminando contacto:', error);
        res.status(500).json({ error: 'Error al eliminar contacto', details: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DATOS SOCIODEMOGRÁFICOS COMPLETOS (Helper endpoint)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/:userId/socioeconomic-data
 * Obtener todos los datos sociodemográficos de un usuario (usando función PostgreSQL)
 */
router.get('/:userId/socioeconomic-data', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id || req.user.companyId;

        // Verificar usuario
        const user = await User.findOne({
            where: { id: userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const [result] = await sequelize.query(`
            SELECT get_user_socioeconomic_data(:userId) as data
        `, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        res.json(result?.data || {});

    } catch (error) {
        console.error('❌ [SOCIO] Error obteniendo datos:', error);
        res.status(500).json({ error: 'Error al obtener datos sociodemográficos', details: error.message });
    }
});

module.exports = router;
