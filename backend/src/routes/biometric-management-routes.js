/**
 * 🛠️ BIOMETRIC MANAGEMENT ROUTES - GESTIÓN BIOMÉTRICA
 * ====================================================
 * Rutas para gestionar templates biométricos: borrar, reasignar, auditar
 * Compatible con sistema anti-duplicados
 */

const express = require('express');
const router = express.Router();
const { faceDuplicateDetector } = require('../services/face-duplicate-detector');

// Development auth middleware
const devAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token || 'token_development';

  if (token.startsWith('token_')) {
    req.user = {
      id: 'dev-user-' + Date.now(),
      companyId: 11, // ISI company
      role: 'admin',
      firstName: 'Dev',
      lastName: 'User'
    };
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

/**
 * 🔍 Obtener lista de templates biométricos de la empresa
 */
router.get('/templates', devAuth, async (req, res) => {
  try {
    const companyId = req.user?.companyId || 11; // Default ISI

    console.log(`📋 [BIOMETRIC-MGMT] Obteniendo templates de empresa ${companyId}`);

    const templates = await faceDuplicateDetector.getCompanyTemplates(companyId);

    res.json({
      success: true,
      data: {
        companyId: companyId,
        totalTemplates: templates.length,
        templates: templates.map(template => ({
          id: template.id,
          employeeId: template.employee_id,
          userInfo: template.user_info,
          registeredAt: template.created_at,
          hasEncryption: !!template.encrypted_template
        }))
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error obteniendo templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo templates biométricos',
      details: error.message
    });
  }
});

/**
 * 🔍 Verificar duplicados manualmente
 */
router.post('/check-duplicates', devAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    const companyId = req.user?.companyId || 11;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'employeeId es requerido'
      });
    }

    console.log(`🔍 [BIOMETRIC-MGMT] Verificando duplicados para empleado ${employeeId}`);

    // Obtener template del empleado
    const { sequelize } = require('../config/database');
    const userTemplate = await sequelize.query(
      'SELECT encrypted_template FROM biometric_templates WHERE employee_id = :employeeId AND company_id = :companyId',
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { employeeId, companyId }
      }
    );

    if (!userTemplate || userTemplate.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template biométrico no encontrado para este empleado'
      });
    }

    // Desencriptar template
    const embedding = faceDuplicateDetector.decryptTemplate(userTemplate[0].encrypted_template);

    // Verificar duplicados
    const duplicateCheck = await faceDuplicateDetector.checkForDuplicates(
      embedding,
      companyId,
      employeeId
    );

    res.json({
      success: true,
      data: {
        employeeId: employeeId,
        hasDuplicates: duplicateCheck.isDuplicate,
        matches: duplicateCheck.matches || [],
        threshold: duplicateCheck.threshold,
        totalChecked: duplicateCheck.totalChecked,
        recommendation: duplicateCheck.isDuplicate ?
          'Se encontraron rostros similares. Verifique si son la misma persona.' :
          'No se encontraron duplicados para este empleado.'
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error verificando duplicados:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando duplicados',
      details: error.message
    });
  }
});

/**
 * 🗑️ Eliminar template biométrico
 */
router.delete('/templates/:templateId', devAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { reason } = req.body;
    const companyId = req.user?.companyId || 11;

    console.log(`🗑️ [BIOMETRIC-MGMT] Eliminando template ${templateId}, razón: ${reason}`);

    // Verificar que el template existe y pertenece a la empresa
    const { sequelize } = require('../config/database');
    const templateInfo = await sequelize.query(
      `SELECT bt.*, u."firstName", u."lastName"
       FROM biometric_templates bt
       LEFT JOIN users u ON u.user_id::text = bt.employee_id
       WHERE bt.id = :templateId AND bt.company_id = :companyId`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { templateId, companyId }
      }
    );

    if (!templateInfo || templateInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado o no pertenece a esta empresa'
      });
    }

    const template = templateInfo[0];

    // Registrar auditoría antes de eliminar
    await sequelize.query(
      `INSERT INTO biometric_audit_log (
        company_id, template_id, employee_id, action, reason,
        performed_by, user_name, timestamp
      ) VALUES (
        :companyId, :templateId, :employeeId, 'DELETE', :reason,
        :performedBy, :userName, NOW()
      )`,
      {
        type: sequelize.QueryTypes.INSERT,
        replacements: {
          companyId,
          templateId,
          employeeId: template.employee_id,
          reason: reason || 'Eliminación manual',
          performedBy: req.user?.id || 'system',
          userName: `${template.firstName || ''} ${template.lastName || ''}`.trim()
        }
      }
    );

    // Eliminar template
    const deleteResult = await faceDuplicateDetector.deleteTemplate(templateId, companyId);

    if (deleteResult.success) {
      console.log(`✅ [BIOMETRIC-MGMT] Template ${templateId} eliminado exitosamente`);

      res.json({
        success: true,
        message: 'Template biométrico eliminado exitosamente',
        data: {
          templateId: templateId,
          employeeId: template.employee_id,
          userName: `${template.firstName || ''} ${template.lastName || ''}`.trim(),
          reason: reason || 'Eliminación manual',
          auditLogged: true
        },
        timestamp: new Date()
      });
    } else {
      res.status(400).json({
        success: false,
        error: deleteResult.message || 'Error eliminando template'
      });
    }

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error eliminando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando template biométrico',
      details: error.message
    });
  }
});

/**
 * 🔄 Reasignar template a otro empleado
 */
router.put('/templates/:templateId/reassign', devAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { newEmployeeId, reason } = req.body;
    const companyId = req.user?.companyId || 11;

    if (!newEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'newEmployeeId es requerido'
      });
    }

    console.log(`🔄 [BIOMETRIC-MGMT] Reasignando template ${templateId} a empleado ${newEmployeeId}`);

    // Verificar que el template existe
    const { sequelize } = require('../config/database');
    const templateInfo = await sequelize.query(
      `SELECT bt.*, u."firstName" as old_first_name, u."lastName" as old_last_name
       FROM biometric_templates bt
       LEFT JOIN users u ON u.user_id::text = bt.employee_id
       WHERE bt.id = :templateId AND bt.company_id = :companyId`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { templateId, companyId }
      }
    );

    if (!templateInfo || templateInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    const template = templateInfo[0];

    // Verificar que el nuevo empleado existe
    const newUserInfo = await sequelize.query(
      'SELECT "firstName", "lastName" FROM users WHERE user_id::text = :newEmployeeId AND company_id = :companyId',
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { newEmployeeId, companyId }
      }
    );

    if (!newUserInfo || newUserInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nuevo empleado no encontrado en la empresa'
      });
    }

    const newUser = newUserInfo[0];

    // Registrar auditoría
    await sequelize.query(
      `INSERT INTO biometric_audit_log (
        company_id, template_id, employee_id, action, reason,
        performed_by, user_name, old_employee_id, new_employee_id, timestamp
      ) VALUES (
        :companyId, :templateId, :newEmployeeId, 'REASSIGN', :reason,
        :performedBy, :newUserName, :oldEmployeeId, :newEmployeeId, NOW()
      )`,
      {
        type: sequelize.QueryTypes.INSERT,
        replacements: {
          companyId,
          templateId,
          newEmployeeId,
          reason: reason || 'Reasignación manual',
          performedBy: req.user?.id || 'system',
          newUserName: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim(),
          oldEmployeeId: template.employee_id
        }
      }
    );

    // Reasignar template
    const reassignResult = await faceDuplicateDetector.reassignTemplate(templateId, newEmployeeId, companyId);

    if (reassignResult.success) {
      console.log(`✅ [BIOMETRIC-MGMT] Template ${templateId} reasignado exitosamente`);

      res.json({
        success: true,
        message: 'Template reasignado exitosamente',
        data: {
          templateId: templateId,
          oldEmployeeId: template.employee_id,
          newEmployeeId: newEmployeeId,
          oldUserName: `${template.old_first_name || ''} ${template.old_last_name || ''}`.trim(),
          newUserName: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim(),
          reason: reason || 'Reasignación manual',
          auditLogged: true
        },
        timestamp: new Date()
      });
    } else {
      res.status(400).json({
        success: false,
        error: reassignResult.message || 'Error reasignando template'
      });
    }

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error reasignando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error reasignando template biométrico',
      details: error.message
    });
  }
});

/**
 * 📊 Estadísticas de duplicados
 */
router.get('/statistics', devAuth, async (req, res) => {
  try {
    const companyId = req.user?.companyId || 11;

    console.log(`📊 [BIOMETRIC-MGMT] Obteniendo estadísticas de empresa ${companyId}`);

    const stats = await faceDuplicateDetector.getDuplicateStatistics(companyId);

    res.json({
      success: true,
      data: {
        companyId: companyId,
        statistics: stats,
        recommendations: {
          duplicateRatio: stats.duplicateRatio,
          status: stats.duplicateRatio > 0.1 ? 'high_duplicates' :
                  stats.duplicateRatio > 0.05 ? 'moderate_duplicates' : 'low_duplicates',
          message: stats.duplicateRatio > 0.1 ? 'Alto nivel de posibles duplicados detectado' :
                   stats.duplicateRatio > 0.05 ? 'Nivel moderado de posibles duplicados' :
                   'Bajo nivel de duplicados - sistema saludable'
        }
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
});

/**
 * 📋 Auditoría de acciones biométricas
 */
router.get('/audit-log', devAuth, async (req, res) => {
  try {
    const companyId = req.user?.companyId || 11;
    const { limit = 50, offset = 0 } = req.query;

    const { sequelize } = require('../config/database');

    // Crear tabla de auditoría si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS biometric_audit_log (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL,
        template_id INTEGER,
        employee_id TEXT,
        action VARCHAR(50) NOT NULL,
        reason TEXT,
        performed_by TEXT,
        user_name TEXT,
        old_employee_id TEXT,
        new_employee_id TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    const auditLogs = await sequelize.query(
      `SELECT * FROM biometric_audit_log
       WHERE company_id = :companyId
       ORDER BY timestamp DESC
       LIMIT :limit OFFSET :offset`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { companyId, limit: parseInt(limit), offset: parseInt(offset) }
      }
    );

    const totalCount = await sequelize.query(
      'SELECT COUNT(*) as total FROM biometric_audit_log WHERE company_id = :companyId',
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { companyId }
      }
    );

    res.json({
      success: true,
      data: {
        companyId: companyId,
        auditLogs: auditLogs,
        pagination: {
          total: parseInt(totalCount[0]?.total || 0),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(totalCount[0]?.total || 0)
        }
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error obteniendo auditoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo auditoría',
      details: error.message
    });
  }
});

/**
 * ⚙️ Configurar umbral de duplicados
 */
router.put('/settings/duplicate-threshold', devAuth, async (req, res) => {
  try {
    const { threshold } = req.body;

    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      return res.status(400).json({
        success: false,
        error: 'Umbral debe ser un número entre 0 y 1'
      });
    }

    faceDuplicateDetector.setDuplicateThreshold(threshold);

    res.json({
      success: true,
      message: 'Umbral de duplicados actualizado',
      data: {
        newThreshold: threshold,
        percentage: Math.round(threshold * 100)
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ [BIOMETRIC-MGMT] Error configurando umbral:', error);
    res.status(500).json({
      success: false,
      error: 'Error configurando umbral',
      details: error.message
    });
  }
});

module.exports = router;