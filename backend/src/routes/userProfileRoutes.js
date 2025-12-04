/**
 * RUTAS: SISTEMA COMPLETO DE PERFIL DE EMPLEADO
 * Endpoints CRUD para todas las secciones del modal de usuario
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}



// Importar modelos
const UserWorkHistory = require('../models/UserWorkHistory');
const UserMaritalStatus = require('../models/UserMaritalStatus');
const UserChildren = require('../models/UserChildren');
const UserFamilyMembers = require('../models/UserFamilyMembers');
const UserEducation = require('../models/UserEducation');

// ============================================================================
// MIDDLEWARE HELPERS
// ============================================================================

// Verificar que el usuario pertenece a la empresa
const verifyCompanyAccess = (req, res, next) => {
    if (!req.user || !req.user.company_id) {
        return res.status(403).json({ error: 'No se pudo verificar la empresa del usuario' });
    }
    next();
};

// ============================================================================
// 1. ANTECEDENTES LABORALES (Work History)
// ============================================================================

// GET - Listar historial laboral
router.get('/:userId/work-history', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const workHistory = await UserWorkHistory.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['start_date', 'DESC']]
        });

        res.json(workHistory);
    } catch (error) {
        console.error('Error al obtener historial laboral:', error);
        res.status(500).json({ error: 'Error al obtener historial laboral' });
    }
});

// POST - Crear antecedente laboral
router.post('/:userId/work-history', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const workHistory = await UserWorkHistory.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(workHistory);
    } catch (error) {
        console.error('Error al crear antecedente laboral:', error);
        res.status(500).json({ error: 'Error al crear antecedente laboral' });
    }
});

// PUT - Actualizar antecedente laboral
router.put('/:userId/work-history/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const workHistory = await UserWorkHistory.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!workHistory) {
            return res.status(404).json({ error: 'Antecedente laboral no encontrado' });
        }

        await workHistory.update(req.body);
        res.json(workHistory);
    } catch (error) {
        console.error('Error al actualizar antecedente laboral:', error);
        res.status(500).json({ error: 'Error al actualizar antecedente laboral' });
    }
});

// DELETE - Eliminar antecedente laboral
router.delete('/:userId/work-history/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserWorkHistory.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Antecedente laboral no encontrado' });
        }

        res.json({ message: 'Antecedente laboral eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar antecedente laboral:', error);
        res.status(500).json({ error: 'Error al eliminar antecedente laboral' });
    }
});

// ============================================================================
// 2. ESTADO CIVIL Y CÓNYUGE (Marital Status)
// ============================================================================

// GET - Obtener estado civil
router.get('/:userId/marital-status', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const maritalStatus = await UserMaritalStatus.findOne({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(maritalStatus || {});
    } catch (error) {
        console.error('Error al obtener estado civil:', error);
        res.status(500).json({ error: 'Error al obtener estado civil' });
    }
});

// POST/PUT - Crear o actualizar estado civil
router.put('/:userId/marital-status', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const [maritalStatus, created] = await UserMaritalStatus.upsert({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.json(maritalStatus);
    } catch (error) {
        console.error('Error al guardar estado civil:', error);
        res.status(500).json({ error: 'Error al guardar estado civil' });
    }
});

// ============================================================================
// 3. HIJOS (Children)
// ============================================================================

// GET - Listar hijos
router.get('/:userId/children', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const children = await UserChildren.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['birth_date', 'ASC']]
        });

        res.json(children);
    } catch (error) {
        console.error('Error al obtener hijos:', error);
        res.status(500).json({ error: 'Error al obtener hijos' });
    }
});

// POST - Agregar hijo
router.post('/:userId/children', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const child = await UserChildren.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(child);
    } catch (error) {
        console.error('Error al agregar hijo:', error);
        res.status(500).json({ error: 'Error al agregar hijo' });
    }
});

// PUT - Actualizar hijo
router.put('/:userId/children/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const child = await UserChildren.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!child) {
            return res.status(404).json({ error: 'Hijo no encontrado' });
        }

        await child.update(req.body);
        res.json(child);
    } catch (error) {
        console.error('Error al actualizar hijo:', error);
        res.status(500).json({ error: 'Error al actualizar hijo' });
    }
});

// DELETE - Eliminar hijo
router.delete('/:userId/children/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserChildren.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Hijo no encontrado' });
        }

        res.json({ message: 'Hijo eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar hijo:', error);
        res.status(500).json({ error: 'Error al eliminar hijo' });
    }
});

// ============================================================================
// 4. OTROS FAMILIARES (Family Members)
// ============================================================================

// GET - Listar familiares
router.get('/:userId/family-members', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const familyMembers = await UserFamilyMembers.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(familyMembers);
    } catch (error) {
        console.error('Error al obtener familiares:', error);
        res.status(500).json({ error: 'Error al obtener familiares' });
    }
});

// POST - Agregar familiar
router.post('/:userId/family-members', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const familyMember = await UserFamilyMembers.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(familyMember);
    } catch (error) {
        console.error('Error al agregar familiar:', error);
        res.status(500).json({ error: 'Error al agregar familiar' });
    }
});

// PUT - Actualizar familiar
router.put('/:userId/family-members/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const familyMember = await UserFamilyMembers.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!familyMember) {
            return res.status(404).json({ error: 'Familiar no encontrado' });
        }

        await familyMember.update(req.body);
        res.json(familyMember);
    } catch (error) {
        console.error('Error al actualizar familiar:', error);
        res.status(500).json({ error: 'Error al actualizar familiar' });
    }
});

// DELETE - Eliminar familiar
router.delete('/:userId/family-members/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserFamilyMembers.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Familiar no encontrado' });
        }

        res.json({ message: 'Familiar eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar familiar:', error);
        res.status(500).json({ error: 'Error al eliminar familiar' });
    }
});

// ============================================================================
// 5. EDUCACIÓN (Education)
// ============================================================================

// GET - Listar educación
router.get('/:userId/education', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const education = await UserEducation.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['start_date', 'DESC']]
        });

        res.json(education);
    } catch (error) {
        console.error('Error al obtener educación:', error);
        res.status(500).json({ error: 'Error al obtener educación' });
    }
});

// POST - Agregar educación
router.post('/:userId/education', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const education = await UserEducation.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(education);
    } catch (error) {
        console.error('Error al agregar educación:', error);
        res.status(500).json({ error: 'Error al agregar educación' });
    }
});

// PUT - Actualizar educación
router.put('/:userId/education/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const education = await UserEducation.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!education) {
            return res.status(404).json({ error: 'Educación no encontrada' });
        }

        await education.update(req.body);
        res.json(education);
    } catch (error) {
        console.error('Error al actualizar educación:', error);
        res.status(500).json({ error: 'Error al actualizar educación' });
    }
});

// DELETE - Eliminar educación
router.delete('/:userId/education/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserEducation.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Educación no encontrada' });
        }

        res.json({ message: 'Educación eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar educación:', error);
        res.status(500).json({ error: 'Error al eliminar educación' });
    }
});

// ============================================================================
// EXPORTAR MÁS RUTAS EN ARCHIVOS SEPARADOS POR TAMAÑO
// ============================================================================

module.exports = router;
