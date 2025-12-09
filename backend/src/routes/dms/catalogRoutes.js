'use strict';

const express = require('express');
const router = express.Router();

/**
 * Inicializar rutas de catálogos DMS
 * @param {Object} sequelize - Instancia de Sequelize
 * @param {Function} authMiddleware - Middleware de autenticación
 */
module.exports = (sequelize, authMiddleware) => {
  /**
   * @route GET /api/dms/catalogs/categories
   * @desc Listar categorías de documentos
   */
  router.get('/categories', authMiddleware, async (req, res) => {
    try {
      const [categories] = await sequelize.query(`
        SELECT
          id, name, description, parent_id, color, icon,
          sort_order, is_active
        FROM document_categories
        WHERE is_active = true
        ORDER BY sort_order, name
      `);

      // Construir árbol de categorías
      const tree = buildCategoryTree(categories);

      res.json({
        success: true,
        data: tree,
        flat: categories
      });
    } catch (error) {
      console.error('[DMS Catalogs] Error listing categories:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/types
   * @desc Listar tipos de documentos
   */
  router.get('/types', authMiddleware, async (req, res) => {
    try {
      const { category_code } = req.query;

      let whereClause = 'WHERE dt.is_active = true';
      const replacements = {};

      if (category_code) {
        whereClause += ' AND dt.category_code = :category_code';
        replacements.category_code = category_code;
      }

      const [types] = await sequelize.query(`
        SELECT
          dt.id,
          dt.code,
          dt.name,
          dt.description,
          dt.category_code,
          dc.name as category_name,
          dc.color as category_color,
          dt.required_metadata as required_fields,
          dt.optional_metadata as optional_fields,
          dt.retention_years,
          dt.requires_signature,
          dt.requires_expiration as requires_approval,
          dt.max_file_size_mb,
          dt.allowed_extensions,
          dt.is_active
        FROM document_types dt
        LEFT JOIN document_categories dc ON dt.category_code = dc.code
        ${whereClause}
        ORDER BY dc.sort_order, dt.name
      `, { replacements });

      res.json({ success: true, data: types });
    } catch (error) {
      console.error('[DMS Catalogs] Error listing types:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/types/:id
   * @desc Obtener tipo de documento por ID
   */
  router.get('/types/:id', authMiddleware, async (req, res) => {
    try {
      const [types] = await sequelize.query(`
        SELECT
          dt.*,
          dc.name as category_name,
          dc.color as category_color,
          dc.icon as category_icon
        FROM document_types dt
        LEFT JOIN document_categories dc ON dt.category_code = dc.code
        WHERE dt.id = :id
      `, {
        replacements: { id: parseInt(req.params.id) }
      });

      if (types.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tipo de documento no encontrado'
        });
      }

      res.json({ success: true, data: types[0] });
    } catch (error) {
      console.error('[DMS Catalogs] Error getting type:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/statuses
   * @desc Listar estados de documentos
   */
  router.get('/statuses', authMiddleware, async (req, res) => {
    try {
      const [statuses] = await sequelize.query(`
        SELECT
          id, code, name, description, color, icon,
          is_terminal, requires_reason, allowed_roles,
          allowed_transitions
        FROM document_statuses
        ORDER BY id
      `);

      res.json({ success: true, data: statuses });
    } catch (error) {
      console.error('[DMS Catalogs] Error listing statuses:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/statuses/:code/transitions
   * @desc Obtener transiciones válidas para un estado
   */
  router.get('/statuses/:code/transitions', authMiddleware, async (req, res) => {
    try {
      const [statuses] = await sequelize.query(`
        SELECT allowed_transitions
        FROM document_statuses
        WHERE code = :code
      `, {
        replacements: { code: req.params.code }
      });

      if (statuses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Estado no encontrado'
        });
      }

      const transitions = statuses[0].allowed_transitions || [];

      // Obtener detalles de estados destino
      if (transitions.length > 0) {
        const [targetStatuses] = await sequelize.query(`
          SELECT id, code, name, color, icon, requires_reason
          FROM document_statuses
          WHERE code = ANY(:transitions)
        `, {
          replacements: { transitions }
        });

        res.json({
          success: true,
          data: {
            current_status: req.params.code,
            valid_transitions: targetStatuses
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            current_status: req.params.code,
            valid_transitions: []
          }
        });
      }
    } catch (error) {
      console.error('[DMS Catalogs] Error getting transitions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/templates
   * @desc Listar plantillas de documentos disponibles
   */
  router.get('/templates', authMiddleware, async (req, res) => {
    try {
      const [templates] = await sequelize.query(`
        SELECT
          dt.id,
          dt.code,
          dt.name,
          dt.description,
          dt.template_url,
          dc.name as category_name,
          dc.color as category_color
        FROM document_types dt
        LEFT JOIN document_categories dc ON dt.category_code = dc.code
        WHERE dt.is_active = true
        ORDER BY dc.sort_order, dt.name
      `);

      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('[DMS Catalogs] Error listing templates:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/catalogs/retention-policies
   * @desc Listar políticas de retención
   */
  router.get('/retention-policies', authMiddleware, async (req, res) => {
    try {
      const [policies] = await sequelize.query(`
        SELECT
          id,
          code,
          name,
          category_id,
          retention_days,
          CASE
            WHEN retention_days IS NULL THEN 'Indefinido'
            WHEN retention_days <= 365 THEN retention_days || ' días'
            ELSE (retention_days / 365) || ' años'
          END as retention_display,
          requires_signature,
          requires_approval
        FROM document_types
        WHERE is_active = true
        ORDER BY
          CASE WHEN retention_days IS NULL THEN 999999 ELSE retention_days END DESC,
          name
      `);

      res.json({ success: true, data: policies });
    } catch (error) {
      console.error('[DMS Catalogs] Error listing retention policies:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/catalogs/types (admin only)
   * @desc Crear tipo de documento personalizado
   */
  router.post('/types', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden crear tipos de documento'
        });
      }

      const {
        code,
        name,
        description,
        category_id,
        required_fields,
        optional_fields,
        retention_days,
        requires_signature,
        requires_approval,
        max_file_size_mb,
        allowed_extensions
      } = req.body;

      if (!code || !name || !category_id) {
        return res.status(400).json({
          success: false,
          message: 'Código, nombre y categoría son requeridos'
        });
      }

      // Verificar que no exista el código
      const [existing] = await sequelize.query(`
        SELECT id FROM document_types WHERE code = :code
      `, { replacements: { code } });

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un tipo con ese código'
        });
      }

      const [result] = await sequelize.query(`
        INSERT INTO document_types (
          code, name, description, category_id,
          required_fields, optional_fields, retention_days,
          requires_signature, requires_approval,
          max_file_size_mb, allowed_extensions, is_active
        ) VALUES (
          :code, :name, :description, :category_id,
          :required_fields, :optional_fields, :retention_days,
          :requires_signature, :requires_approval,
          :max_file_size_mb, :allowed_extensions, true
        )
        RETURNING *
      `, {
        replacements: {
          code,
          name,
          description: description || null,
          category_id: parseInt(category_id),
          required_fields: required_fields ? JSON.stringify(required_fields) : null,
          optional_fields: optional_fields ? JSON.stringify(optional_fields) : null,
          retention_days: retention_days || null,
          requires_signature: requires_signature || false,
          requires_approval: requires_approval || false,
          max_file_size_mb: max_file_size_mb || 10,
          allowed_extensions: allowed_extensions || ['pdf', 'doc', 'docx', 'jpg', 'png']
        }
      });

      res.status(201).json({
        success: true,
        data: result[0],
        message: 'Tipo de documento creado'
      });
    } catch (error) {
      console.error('[DMS Catalogs] Error creating type:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Helper: Construir árbol de categorías
   */
  function buildCategoryTree(categories) {
    const map = {};
    const roots = [];

    categories.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        roots.push(map[cat.id]);
      }
    });

    return roots;
  }

  return router;
};
