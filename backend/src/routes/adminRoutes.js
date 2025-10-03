const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  next();
};

// Importar servicios
const medicalStatisticsService = require('../services/medicalStatisticsService');

// Ruta para estadísticas RRHH tipo cubo
router.get('/statistics/hr-cube', 
  auth, 
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const { period = 'yearly' } = req.query;
      
      // Obtener estadísticas de toda la empresa
      const companyStats = await medicalStatisticsService.getCompanyStatistics(
        req.user.companyId, 
        { periodType: period }
      );
      
      res.json({
        success: true,
        data: companyStats
      });
    } catch (error) {
      console.error('Error getting HR statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Ruta para configuración de cuestionarios
router.get('/questionnaires',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const MedicalQuestionnaire = require('../models/MedicalQuestionnaire');
      
      const questionnaires = await MedicalQuestionnaire.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: questionnaires
      });
    } catch (error) {
      console.error('Error getting questionnaires:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Crear cuestionario
router.post('/questionnaires',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const MedicalQuestionnaire = require('../models/MedicalQuestionnaire');
      
      const questionnaire = await MedicalQuestionnaire.create({
        ...req.body,
        createdBy: req.user.user_id
      });
      
      res.status(201).json({
        success: true,
        data: questionnaire
      });
    } catch (error) {
      console.error('Error creating questionnaire:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Actualizar cuestionario
router.put('/questionnaires/:id',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const MedicalQuestionnaire = require('../models/MedicalQuestionnaire');
      
      const questionnaire = await MedicalQuestionnaire.findByPk(req.params.id);
      
      if (!questionnaire) {
        return res.status(404).json({
          success: false,
          error: 'Cuestionario no encontrado'
        });
      }
      
      await questionnaire.update({
        ...req.body,
        lastModifiedBy: req.user.user_id
      });
      
      res.json({
        success: true,
        data: questionnaire
      });
    } catch (error) {
      console.error('Error updating questionnaire:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Activar/desactivar cuestionario
router.put('/questionnaires/:id/toggle',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const MedicalQuestionnaire = require('../models/MedicalQuestionnaire');
      
      const questionnaire = await MedicalQuestionnaire.findByPk(req.params.id);
      
      if (!questionnaire) {
        return res.status(404).json({
          success: false,
          error: 'Cuestionario no encontrado'
        });
      }
      
      await questionnaire.update({
        isActive: !questionnaire.isActive,
        lastModifiedBy: req.user.user_id
      });
      
      res.json({
        success: true,
        data: questionnaire
      });
    } catch (error) {
      console.error('Error toggling questionnaire:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

// Eliminar cuestionario
router.delete('/questionnaires/:id',
  auth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const MedicalQuestionnaire = require('../models/MedicalQuestionnaire');
      
      const questionnaire = await MedicalQuestionnaire.findByPk(req.params.id);
      
      if (!questionnaire) {
        return res.status(404).json({
          success: false,
          error: 'Cuestionario no encontrado'
        });
      }
      
      await questionnaire.destroy();
      
      res.json({
        success: true,
        message: 'Cuestionario eliminado'
      });
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

module.exports = router;