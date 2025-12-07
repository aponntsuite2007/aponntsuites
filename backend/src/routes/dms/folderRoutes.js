'use strict';

const express = require('express');
const router = express.Router();

/**
 * Inicializar rutas de carpetas DMS
 * @param {Object} models - Modelos Sequelize
 * @param {Function} authMiddleware - Middleware de autenticación
 */
module.exports = (models, authMiddleware) => {
  const { Folder, Document } = models;

  /**
   * @route GET /api/dms/folders
   * @desc Listar carpetas (estructura de árbol)
   */
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { parent_id } = req.query;

      const where = {
        company_id: req.user.company_id,
        is_active: true
      };

      if (parent_id === 'root' || parent_id === null || parent_id === 'null') {
        where.parent_id = null;
      } else if (parent_id) {
        where.parent_id = parent_id;
      }

      const folders = await Folder.findAll({
        where,
        order: [['name', 'ASC']],
        include: [{
          model: Folder,
          as: 'children',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'name']
        }]
      });

      res.json({ success: true, data: folders });
    } catch (error) {
      console.error('[DMS Folders] Error listing folders:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/folders/tree
   * @desc Obtener árbol completo de carpetas
   */
  router.get('/tree', authMiddleware, async (req, res) => {
    try {
      // Obtener todas las carpetas
      const folders = await Folder.findAll({
        where: {
          company_id: req.user.company_id,
          is_active: true
        },
        order: [['path', 'ASC'], ['name', 'ASC']]
      });

      // Construir árbol
      const tree = buildFolderTree(folders);

      res.json({ success: true, data: tree });
    } catch (error) {
      console.error('[DMS Folders] Error getting tree:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route GET /api/dms/folders/:id
   * @desc Obtener carpeta por ID
   */
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const folder = await Folder.findOne({
        where: {
          id: req.params.id,
          company_id: req.user.company_id
        },
        include: [
          {
            model: Folder,
            as: 'children',
            where: { is_active: true },
            required: false
          },
          {
            model: Document,
            as: 'documents',
            where: { is_deleted: false },
            required: false,
            limit: 100
          }
        ]
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Carpeta no encontrada'
        });
      }

      res.json({ success: true, data: folder });
    } catch (error) {
      console.error('[DMS Folders] Error getting folder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/folders
   * @desc Crear nueva carpeta
   */
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { name, parent_id, description, color, icon, metadata } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la carpeta es requerido'
        });
      }

      // Verificar unicidad del nombre en el mismo nivel
      const existingFolder = await Folder.findOne({
        where: {
          company_id: req.user.company_id,
          parent_id: parent_id || null,
          name,
          is_active: true
        }
      });

      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una carpeta con ese nombre en esta ubicación'
        });
      }

      // Si hay parent_id, verificar que existe
      let parentPath = '/';
      let depth = 0;

      if (parent_id) {
        const parent = await Folder.findOne({
          where: {
            id: parent_id,
            company_id: req.user.company_id
          }
        });

        if (!parent) {
          return res.status(400).json({
            success: false,
            message: 'Carpeta padre no encontrada'
          });
        }

        parentPath = parent.path;
        depth = parent.depth + 1;
      }

      // Generar slug
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const folder = await Folder.create({
        company_id: req.user.company_id,
        parent_id: parent_id || null,
        name,
        slug,
        path: parentPath === '/' ? `/${slug}` : `${parentPath}/${slug}`,
        depth,
        description,
        color: color || '#6B7280',
        icon: icon || 'folder',
        metadata: metadata || {},
        created_by: req.user.id
      });

      res.status(201).json({
        success: true,
        data: folder,
        message: 'Carpeta creada exitosamente'
      });
    } catch (error) {
      console.error('[DMS Folders] Error creating folder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route PUT /api/dms/folders/:id
   * @desc Actualizar carpeta
   */
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      const { name, description, color, icon, metadata, is_active } = req.body;

      const folder = await Folder.findOne({
        where: {
          id: req.params.id,
          company_id: req.user.company_id
        }
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Carpeta no encontrada'
        });
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      if (metadata !== undefined) updates.metadata = metadata;
      if (is_active !== undefined) updates.is_active = is_active;

      await folder.update(updates);

      res.json({
        success: true,
        data: folder,
        message: 'Carpeta actualizada'
      });
    } catch (error) {
      console.error('[DMS Folders] Error updating folder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route DELETE /api/dms/folders/:id
   * @desc Eliminar carpeta (soft delete)
   */
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const folder = await Folder.findOne({
        where: {
          id: req.params.id,
          company_id: req.user.company_id
        }
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Carpeta no encontrada'
        });
      }

      // Verificar que no tenga subcarpetas activas
      const hasChildren = await Folder.count({
        where: {
          parent_id: folder.id,
          is_active: true
        }
      });

      if (hasChildren > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar una carpeta con subcarpetas'
        });
      }

      // Verificar que no tenga documentos
      const hasDocuments = await Document.count({
        where: {
          folder_id: folder.id,
          is_deleted: false
        }
      });

      if (hasDocuments > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar una carpeta con documentos'
        });
      }

      await folder.update({ is_active: false });

      res.json({
        success: true,
        message: 'Carpeta eliminada'
      });
    } catch (error) {
      console.error('[DMS Folders] Error deleting folder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * @route POST /api/dms/folders/:id/move
   * @desc Mover carpeta a otro padre
   */
  router.post('/:id/move', authMiddleware, async (req, res) => {
    try {
      const { new_parent_id } = req.body;

      const folder = await Folder.findOne({
        where: {
          id: req.params.id,
          company_id: req.user.company_id
        }
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Carpeta no encontrada'
        });
      }

      // No se puede mover a sí misma
      if (new_parent_id === folder.id) {
        return res.status(400).json({
          success: false,
          message: 'No se puede mover una carpeta a sí misma'
        });
      }

      // Calcular nuevos valores
      let newPath = '/';
      let newDepth = 0;

      if (new_parent_id) {
        const newParent = await Folder.findOne({
          where: {
            id: new_parent_id,
            company_id: req.user.company_id
          }
        });

        if (!newParent) {
          return res.status(400).json({
            success: false,
            message: 'Carpeta destino no encontrada'
          });
        }

        // Evitar mover a un descendiente
        if (newParent.path.startsWith(folder.path)) {
          return res.status(400).json({
            success: false,
            message: 'No se puede mover una carpeta a uno de sus descendientes'
          });
        }

        newPath = newParent.path;
        newDepth = newParent.depth + 1;
      }

      await folder.update({
        parent_id: new_parent_id || null,
        path: newPath === '/' ? `/${folder.slug}` : `${newPath}/${folder.slug}`,
        depth: newDepth
      });

      // TODO: Actualizar paths de subcarpetas recursivamente

      res.json({
        success: true,
        data: folder,
        message: 'Carpeta movida exitosamente'
      });
    } catch (error) {
      console.error('[DMS Folders] Error moving folder:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * Helper: Construir árbol de carpetas
   */
  function buildFolderTree(folders) {
    const map = {};
    const roots = [];

    // Crear mapa de carpetas
    folders.forEach(folder => {
      map[folder.id] = { ...folder.toJSON(), children: [] };
    });

    // Construir árbol
    folders.forEach(folder => {
      if (folder.parent_id && map[folder.parent_id]) {
        map[folder.parent_id].children.push(map[folder.id]);
      } else {
        roots.push(map[folder.id]);
      }
    });

    return roots;
  }

  return router;
};
