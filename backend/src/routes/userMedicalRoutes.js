/**
 * RUTAS: ANTECEDENTES MÉDICOS DEL EMPLEADO
 * Endpoints CRUD para todas las secciones médicas
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

async function auth(req, res, next) {
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



// Importar modelos médicos
const UserPrimaryPhysician = require('../models/UserPrimaryPhysician');
const UserChronicConditions = require('../models/UserChronicConditions');
const UserMedications = require('../models/UserMedications');
const UserAllergies = require('../models/UserAllergies');
const UserActivityRestrictions = require('../models/UserActivityRestrictions');
const UserWorkRestrictions = require('../models/UserWorkRestrictions');
const UserVaccinations = require('../models/UserVaccinations');
const UserMedicalExams = require('../models/UserMedicalExams');
const UserMedicalDocuments = require('../models/UserMedicalDocuments');

// Middleware
const verifyCompanyAccess = (req, res, next) => {
    if (!req.user || !req.user.company_id) {
        return res.status(403).json({ error: 'No se pudo verificar la empresa del usuario' });
    }
    next();
};

// ============================================================================
// 1. MÉDICO DE CABECERA (Primary Physician)
// ============================================================================

router.get('/:userId/primary-physician', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const physician = await UserPrimaryPhysician.findOne({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(physician || {});
    } catch (error) {
        console.error('Error al obtener médico de cabecera:', error);
        res.status(500).json({ error: 'Error al obtener médico de cabecera' });
    }
});

router.put('/:userId/primary-physician', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const [physician] = await UserPrimaryPhysician.upsert({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.json(physician);
    } catch (error) {
        console.error('Error al guardar médico de cabecera:', error);
        res.status(500).json({ error: 'Error al guardar médico de cabecera' });
    }
});

// ============================================================================
// 2. ENFERMEDADES CRÓNICAS (Chronic Conditions)
// ============================================================================

router.get('/:userId/chronic-conditions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const conditions = await UserChronicConditions.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(conditions);
    } catch (error) {
        console.error('Error al obtener enfermedades crónicas:', error);
        res.status(500).json({ error: 'Error al obtener enfermedades crónicas' });
    }
});

router.post('/:userId/chronic-conditions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const condition = await UserChronicConditions.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(condition);
    } catch (error) {
        console.error('Error al agregar enfermedad crónica:', error);
        res.status(500).json({ error: 'Error al agregar enfermedad crónica' });
    }
});

router.put('/:userId/chronic-conditions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const condition = await UserChronicConditions.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!condition) {
            return res.status(404).json({ error: 'Enfermedad crónica no encontrada' });
        }

        await condition.update(req.body);
        res.json(condition);
    } catch (error) {
        console.error('Error al actualizar enfermedad crónica:', error);
        res.status(500).json({ error: 'Error al actualizar enfermedad crónica' });
    }
});

router.delete('/:userId/chronic-conditions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserChronicConditions.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Enfermedad crónica no encontrada' });
        }

        res.json({ message: 'Enfermedad crónica eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar enfermedad crónica:', error);
        res.status(500).json({ error: 'Error al eliminar enfermedad crónica' });
    }
});

// ============================================================================
// 3. MEDICAMENTOS (Medications)
// ============================================================================

router.get('/:userId/medications', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const medications = await UserMedications.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(medications);
    } catch (error) {
        console.error('Error al obtener medicamentos:', error);
        res.status(500).json({ error: 'Error al obtener medicamentos' });
    }
});

router.post('/:userId/medications', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const medication = await UserMedications.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(medication);
    } catch (error) {
        console.error('Error al agregar medicamento:', error);
        res.status(500).json({ error: 'Error al agregar medicamento' });
    }
});

router.put('/:userId/medications/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const medication = await UserMedications.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!medication) {
            return res.status(404).json({ error: 'Medicamento no encontrado' });
        }

        await medication.update(req.body);
        res.json(medication);
    } catch (error) {
        console.error('Error al actualizar medicamento:', error);
        res.status(500).json({ error: 'Error al actualizar medicamento' });
    }
});

router.delete('/:userId/medications/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserMedications.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Medicamento no encontrado' });
        }

        res.json({ message: 'Medicamento eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar medicamento:', error);
        res.status(500).json({ error: 'Error al eliminar medicamento' });
    }
});

// ============================================================================
// 4. ALERGIAS (Allergies)
// ============================================================================

router.get('/:userId/allergies', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const allergies = await UserAllergies.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(allergies);
    } catch (error) {
        console.error('Error al obtener alergias:', error);
        res.status(500).json({ error: 'Error al obtener alergias' });
    }
});

router.post('/:userId/allergies', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const allergy = await UserAllergies.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(allergy);
    } catch (error) {
        console.error('Error al agregar alergia:', error);
        res.status(500).json({ error: 'Error al agregar alergia' });
    }
});

router.put('/:userId/allergies/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const allergy = await UserAllergies.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!allergy) {
            return res.status(404).json({ error: 'Alergia no encontrada' });
        }

        await allergy.update(req.body);
        res.json(allergy);
    } catch (error) {
        console.error('Error al actualizar alergia:', error);
        res.status(500).json({ error: 'Error al actualizar alergia' });
    }
});

router.delete('/:userId/allergies/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserAllergies.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Alergia no encontrada' });
        }

        res.json({ message: 'Alergia eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar alergia:', error);
        res.status(500).json({ error: 'Error al eliminar alergia' });
    }
});

// ============================================================================
// 5. RESTRICCIONES DE ACTIVIDAD (Activity Restrictions)
// ============================================================================

router.get('/:userId/activity-restrictions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const restrictions = await UserActivityRestrictions.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(restrictions);
    } catch (error) {
        console.error('Error al obtener restricciones de actividad:', error);
        res.status(500).json({ error: 'Error al obtener restricciones de actividad' });
    }
});

router.post('/:userId/activity-restrictions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const restriction = await UserActivityRestrictions.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(restriction);
    } catch (error) {
        console.error('Error al agregar restricción de actividad:', error);
        res.status(500).json({ error: 'Error al agregar restricción de actividad' });
    }
});

router.put('/:userId/activity-restrictions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const restriction = await UserActivityRestrictions.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!restriction) {
            return res.status(404).json({ error: 'Restricción de actividad no encontrada' });
        }

        await restriction.update(req.body);
        res.json(restriction);
    } catch (error) {
        console.error('Error al actualizar restricción de actividad:', error);
        res.status(500).json({ error: 'Error al actualizar restricción de actividad' });
    }
});

router.delete('/:userId/activity-restrictions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserActivityRestrictions.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Restricción de actividad no encontrada' });
        }

        res.json({ message: 'Restricción de actividad eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar restricción de actividad:', error);
        res.status(500).json({ error: 'Error al eliminar restricción de actividad' });
    }
});

// ============================================================================
// 6. RESTRICCIONES LABORALES (Work Restrictions)
// ============================================================================

router.get('/:userId/work-restrictions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const restrictions = await UserWorkRestrictions.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(restrictions);
    } catch (error) {
        console.error('Error al obtener restricciones laborales:', error);
        res.status(500).json({ error: 'Error al obtener restricciones laborales' });
    }
});

router.post('/:userId/work-restrictions', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const restriction = await UserWorkRestrictions.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(restriction);
    } catch (error) {
        console.error('Error al agregar restricción laboral:', error);
        res.status(500).json({ error: 'Error al agregar restricción laboral' });
    }
});

router.put('/:userId/work-restrictions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const restriction = await UserWorkRestrictions.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!restriction) {
            return res.status(404).json({ error: 'Restricción laboral no encontrada' });
        }

        await restriction.update(req.body);
        res.json(restriction);
    } catch (error) {
        console.error('Error al actualizar restricción laboral:', error);
        res.status(500).json({ error: 'Error al actualizar restricción laboral' });
    }
});

router.delete('/:userId/work-restrictions/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserWorkRestrictions.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Restricción laboral no encontrada' });
        }

        res.json({ message: 'Restricción laboral eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar restricción laboral:', error);
        res.status(500).json({ error: 'Error al eliminar restricción laboral' });
    }
});

// ============================================================================
// 7. VACUNAS (Vaccinations)
// ============================================================================

router.get('/:userId/vaccinations', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const vaccinations = await UserVaccinations.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['date_administered', 'DESC']]
        });

        res.json(vaccinations);
    } catch (error) {
        console.error('Error al obtener vacunas:', error);
        res.status(500).json({ error: 'Error al obtener vacunas' });
    }
});

router.post('/:userId/vaccinations', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const vaccination = await UserVaccinations.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(vaccination);
    } catch (error) {
        console.error('Error al agregar vacuna:', error);
        res.status(500).json({ error: 'Error al agregar vacuna' });
    }
});

router.put('/:userId/vaccinations/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const vaccination = await UserVaccinations.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!vaccination) {
            return res.status(404).json({ error: 'Vacuna no encontrada' });
        }

        await vaccination.update(req.body);
        res.json(vaccination);
    } catch (error) {
        console.error('Error al actualizar vacuna:', error);
        res.status(500).json({ error: 'Error al actualizar vacuna' });
    }
});

router.delete('/:userId/vaccinations/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserVaccinations.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Vacuna no encontrada' });
        }

        res.json({ message: 'Vacuna eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar vacuna:', error);
        res.status(500).json({ error: 'Error al eliminar vacuna' });
    }
});

// ============================================================================
// 8. EXÁMENES MÉDICOS (Medical Exams)
// ============================================================================

router.get('/:userId/medical-exams', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const exams = await UserMedicalExams.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['exam_date', 'DESC']]
        });

        res.json(exams);
    } catch (error) {
        console.error('Error al obtener exámenes médicos:', error);
        res.status(500).json({ error: 'Error al obtener exámenes médicos' });
    }
});

router.post('/:userId/medical-exams', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const exam = await UserMedicalExams.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(exam);
    } catch (error) {
        console.error('Error al agregar examen médico:', error);
        res.status(500).json({ error: 'Error al agregar examen médico' });
    }
});

router.put('/:userId/medical-exams/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const exam = await UserMedicalExams.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!exam) {
            return res.status(404).json({ error: 'Examen médico no encontrado' });
        }

        await exam.update(req.body);
        res.json(exam);
    } catch (error) {
        console.error('Error al actualizar examen médico:', error);
        res.status(500).json({ error: 'Error al actualizar examen médico' });
    }
});

router.delete('/:userId/medical-exams/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserMedicalExams.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Examen médico no encontrado' });
        }

        res.json({ message: 'Examen médico eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar examen médico:', error);
        res.status(500).json({ error: 'Error al eliminar examen médico' });
    }
});

// ============================================================================
// 9. DOCUMENTOS MÉDICOS (Medical Documents)
// ============================================================================

router.get('/:userId/medical-documents', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const documents = await UserMedicalDocuments.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['upload_date', 'DESC']]
        });

        res.json(documents);
    } catch (error) {
        console.error('Error al obtener documentos médicos:', error);
        res.status(500).json({ error: 'Error al obtener documentos médicos' });
    }
});

router.post('/:userId/medical-documents', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const document = await UserMedicalDocuments.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(document);
    } catch (error) {
        console.error('Error al agregar documento médico:', error);
        res.status(500).json({ error: 'Error al agregar documento médico' });
    }
});

router.put('/:userId/medical-documents/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const document = await UserMedicalDocuments.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento médico no encontrado' });
        }

        await document.update(req.body);
        res.json(document);
    } catch (error) {
        console.error('Error al actualizar documento médico:', error);
        res.status(500).json({ error: 'Error al actualizar documento médico' });
    }
});

router.delete('/:userId/medical-documents/:id', auth, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserMedicalDocuments.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Documento médico no encontrado' });
        }

        res.json({ message: 'Documento médico eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar documento médico:', error);
        res.status(500).json({ error: 'Error al eliminar documento médico' });
    }
});

module.exports = router;
