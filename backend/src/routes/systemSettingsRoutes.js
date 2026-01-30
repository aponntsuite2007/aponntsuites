/**
 * SYSTEM SETTINGS ROUTES
 * API para gestionar configuraciones del sistema desde UI.
 *
 * SEGURIDAD:
 * - Solo staff autenticado (nivel gerente o superior para modificar)
 * - Audit trail de cambios
 *
 * @version 1.0.0
 * @date 2026-01-28
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sequelize, SystemSetting } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARES
// ═══════════════════════════════════════════════════════════════════════════

// Middleware: Verificar token JWT de staff Aponnt
function verifyStaffToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autenticación de staff requerida' });
    }

    const token = authHeader.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET || 'aponnt-secret-key-2024';

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar que sea un token de staff Aponnt
    if (!decoded.staff_id && !decoded.staffId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Se requiere token de staff Aponnt'
      });
    }

    // Agregar datos del staff al request
    req.staffId = decoded.staff_id || decoded.staffId;
    req.staffLevel = decoded.level ?? 1;
    req.staffEmail = decoded.email;

    console.log(`✅ [SystemSettings] Staff autenticado: ${req.staffEmail} (level: ${req.staffLevel})`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('[SystemSettings] Error verificando token:', error.message);
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

// Alias for backward compatibility
const requireStaffAuth = verifyStaffToken;

// Middleware: Solo nivel gerente o superior para modificar
function requireManagerForWrite(req, res, next) {
  const level = req.staffLevel;

  // Solo para métodos de escritura
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (level === undefined || level === null || level > 1) {
      return res.status(403).json({
        error: 'Permiso denegado',
        message: `Se requiere nivel gerente o superior para modificar settings. Nivel actual: ${level ?? 'desconocido'}`
      });
    }
  }
  next();
}

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE LECTURA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/system-settings
 * Obtener todos los settings agrupados por categoría
 */
router.get('/', requireStaffAuth, async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      where: { is_active: true },
      order: [['category', 'ASC'], ['sort_order', 'ASC']],
      attributes: { exclude: ['created_at', 'updated_at'] }
    });

    // Agrupar por categoría
    const grouped = {};
    const categoryInfo = {
      google_drive: { icon: '☁️', label: 'Google Drive', description: 'Integración con Google Drive para exports' },
      offboarding: { icon: '🔴', label: 'Baja de Empresas', description: 'Parámetros del proceso de baja' },
      restoration: { icon: '🔄', label: 'Restauración', description: 'Parámetros de restauración de empresas' },
      notifications: { icon: '🔔', label: 'Notificaciones', description: 'Configuración de notificaciones' },
      security: { icon: '🔒', label: 'Seguridad', description: 'Parámetros de seguridad' },
      billing: { icon: '💰', label: 'Facturación', description: 'Configuración de facturación' },
      system: { icon: '⚙️', label: 'Sistema', description: 'Configuración general' },
      integrations: { icon: '🔗', label: 'Integraciones', description: 'Integraciones externas' }
    };

    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = {
          ...categoryInfo[setting.category] || { icon: '📋', label: setting.category, description: '' },
          settings: []
        };
      }

      // Enmascarar valores sensibles
      const settingData = setting.toJSON();
      if (setting.is_sensitive && setting.value) {
        settingData.value = '********';
        settingData.masked = true;
      }

      grouped[setting.category].settings.push(settingData);
    }

    res.json({
      success: true,
      categories: grouped
    });
  } catch (error) {
    console.error('[SystemSettings] Error obteniendo settings:', error);
    res.status(500).json({ error: 'Error al obtener settings', details: error.message });
  }
});

/**
 * GET /api/system-settings/category/:category
 * Obtener settings de una categoría específica
 */
router.get('/category/:category', requireStaffAuth, async (req, res) => {
  try {
    const { category } = req.params;

    const settings = await SystemSetting.findAll({
      where: { category, is_active: true },
      order: [['sort_order', 'ASC']]
    });

    res.json({
      success: true,
      category,
      settings: settings.map(s => {
        const data = s.toJSON();
        if (s.is_sensitive && s.value) {
          data.value = '********';
          data.masked = true;
        }
        return data;
      })
    });
  } catch (error) {
    console.error('[SystemSettings] Error obteniendo categoría:', error);
    res.status(500).json({ error: 'Error al obtener settings', details: error.message });
  }
});

/**
 * GET /api/system-settings/key/:key
 * Obtener un setting específico por key
 */
router.get('/key/:key', requireStaffAuth, async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await SystemSetting.findOne({
      where: { key, is_active: true }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting no encontrado' });
    }

    const data = setting.toJSON();
    if (setting.is_sensitive && setting.value) {
      data.value = '********';
      data.masked = true;
    }

    res.json({
      success: true,
      setting: data
    });
  } catch (error) {
    console.error('[SystemSettings] Error obteniendo setting:', error);
    res.status(500).json({ error: 'Error al obtener setting', details: error.message });
  }
});

/**
 * GET /api/system-settings/value/:key
 * Obtener solo el valor de un setting (para uso interno)
 */
router.get('/value/:key', requireStaffAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { default: defaultValue } = req.query;

    const value = await SystemSetting.getValue(key, defaultValue || null);

    res.json({
      success: true,
      key,
      value
    });
  } catch (error) {
    console.error('[SystemSettings] Error obteniendo valor:', error);
    res.status(500).json({ error: 'Error al obtener valor', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE ESCRITURA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/system-settings/key/:key
 * Actualizar valor de un setting
 */
router.put('/key/:key', requireStaffAuth, requireManagerForWrite, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const setting = await SystemSetting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({ error: 'Setting no encontrado' });
    }

    // Validar valor si hay regex
    if (setting.validation_regex && value) {
      const regex = new RegExp(setting.validation_regex);
      if (!regex.test(String(value))) {
        return res.status(400).json({
          error: 'Valor inválido',
          message: `El valor no cumple con el formato requerido`
        });
      }
    }

    // Convertir a string para almacenar
    let stringValue;
    if (value === null || value === undefined) {
      stringValue = null;
    } else if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    await setting.update({
      value: stringValue,
      modified_by_staff_id: req.staffId,
      modified_at: new Date()
    });

    // Log de auditoría
    console.log(`[SystemSettings] Setting '${key}' actualizado por staff ${req.staffId}`);

    res.json({
      success: true,
      message: 'Setting actualizado',
      setting: {
        key: setting.key,
        value: setting.is_sensitive ? '********' : setting.value,
        requires_restart: setting.requires_restart
      }
    });
  } catch (error) {
    console.error('[SystemSettings] Error actualizando setting:', error);
    res.status(500).json({ error: 'Error al actualizar setting', details: error.message });
  }
});

/**
 * PUT /api/system-settings/bulk
 * Actualizar múltiples settings a la vez
 */
router.put('/bulk', requireStaffAuth, requireManagerForWrite, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Se requiere array de settings' });
    }

    const results = [];
    const requiresRestart = [];

    for (const { key, value } of settings) {
      const setting = await SystemSetting.findOne({ where: { key } });

      if (!setting) {
        results.push({ key, success: false, error: 'No encontrado' });
        continue;
      }

      let stringValue = value === null ? null : String(value);
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }

      await setting.update({
        value: stringValue,
        modified_by_staff_id: req.staffId,
        modified_at: new Date()
      });

      results.push({ key, success: true });

      if (setting.requires_restart) {
        requiresRestart.push(key);
      }
    }

    console.log(`[SystemSettings] Bulk update: ${results.filter(r => r.success).length} settings actualizados por staff ${req.staffId}`);

    res.json({
      success: true,
      results,
      requiresRestart: requiresRestart.length > 0 ? requiresRestart : null,
      message: requiresRestart.length > 0
        ? `${requiresRestart.length} settings requieren reinicio del servidor`
        : 'Settings actualizados'
    });
  } catch (error) {
    console.error('[SystemSettings] Error en bulk update:', error);
    res.status(500).json({ error: 'Error al actualizar settings', details: error.message });
  }
});

/**
 * POST /api/system-settings/reset/:key
 * Resetear setting a su valor por defecto
 */
router.post('/reset/:key', requireStaffAuth, requireManagerForWrite, async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await SystemSetting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({ error: 'Setting no encontrado' });
    }

    await setting.update({
      value: null, // NULL significa usar default_value
      modified_by_staff_id: req.staffId,
      modified_at: new Date()
    });

    console.log(`[SystemSettings] Setting '${key}' reseteado a default por staff ${req.staffId}`);

    res.json({
      success: true,
      message: 'Setting reseteado a valor por defecto',
      default_value: setting.default_value
    });
  } catch (error) {
    console.error('[SystemSettings] Error reseteando setting:', error);
    res.status(500).json({ error: 'Error al resetear setting', details: error.message });
  }
});

/**
 * POST /api/system-settings/seed
 * Ejecutar seed de settings por defecto (solo crea los que no existen)
 */
router.post('/seed', requireStaffAuth, requireManagerForWrite, async (req, res) => {
  try {
    const created = await SystemSetting.seedDefaults();

    res.json({
      success: true,
      message: `Seed completado: ${created} settings creados`
    });
  } catch (error) {
    console.error('[SystemSettings] Error en seed:', error);
    res.status(500).json({ error: 'Error en seed', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINT ESPECIAL: Test de Google Drive
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/system-settings/test-google-drive
 * Probar conexión con Google Drive
 */
router.post('/test-google-drive', requireStaffAuth, requireManagerForWrite, async (req, res) => {
  try {
    const GoogleDriveService = require('../services/GoogleDriveService');

    const health = await GoogleDriveService.healthCheck();

    res.json({
      success: true,
      result: health
    });
  } catch (error) {
    console.error('[SystemSettings] Error testing Google Drive:', error);
    res.status(500).json({ error: 'Error al probar Google Drive', details: error.message });
  }
});

module.exports = router;
