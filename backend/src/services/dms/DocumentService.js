'use strict';

const { Op, fn, col, literal } = require('sequelize');
const path = require('path');
const crypto = require('crypto');

/**
 * DocumentService - Servicio principal de gestión de documentos DMS
 *
 * Operaciones CRUD, versionamiento, estados, permisos y más
 */
class DocumentService {
  constructor(models, storageService, auditService) {
    this.models = models;
    this.storageService = storageService;
    this.auditService = auditService;
  }

  /**
   * Crear un nuevo documento
   */
  async createDocument(data, file, userId, companyId, transaction = null) {
    const {
      folder_id,
      document_type_id,
      category_code,  // Nuevo: código de categoría (RRHH, LEGAL, etc.)
      type_code,      // Nuevo: código de tipo de documento
      title,
      description,
      tags,
      metadata = {},
      owner_type = 'user',
      owner_id = null,
      access_level = 'private',
      requires_signature = false,
      signature_required_from,
      due_date,
      expiration_date
    } = data;

    const t = transaction || await this.models.Document.sequelize.transaction();

    try {
      // Determinar category_code y type_code
      // Si se pasan los nuevos campos, usarlos; sino, usar defaults o buscar por document_type_id
      let finalCategoryCode = category_code || 'GENERAL';
      let finalTypeCode = type_code || 'GENERAL_DOC';

      // Si se pasó document_type_id, intentar obtener los códigos del catálogo
      if (document_type_id && !type_code) {
        try {
          const docType = await this.models.DocumentType?.findByPk(document_type_id);
          if (docType) {
            finalCategoryCode = docType.category_code || finalCategoryCode;
            finalTypeCode = docType.code || finalTypeCode;
          }
        } catch (e) {
          // Ignorar si no existe el modelo o tabla
        }
      }

      // Generar número de documento único
      const documentNumber = await this.generateDocumentNumber(companyId, finalTypeCode);

      // Si hay archivo, procesarlo
      let fileData = {};
      if (file) {
        fileData = await this.storageService.uploadFile(file, companyId, documentNumber);
      }

      // Crear documento con nombres de campos correctos para el modelo
      const document = await this.models.Document.create({
        company_id: companyId,
        folder_id,
        category_code: finalCategoryCode,
        type_code: finalTypeCode,
        document_number: documentNumber,
        title,
        description,
        // Campos de archivo con nombres correctos para la BD
        original_filename: fileData.fileName || file?.originalname || 'unknown',
        stored_filename: fileData.storedFileName || fileData.fileName || `${documentNumber}_${Date.now()}`,
        storage_path: fileData.filePath || fileData.storagePath || `/uploads/${companyId}/${documentNumber}`,
        file_size_bytes: fileData.fileSize || file?.size || 0,
        mime_type: fileData.mimeType || file?.mimetype || 'application/octet-stream',
        file_extension: fileData.extension || path.extname(file?.originalname || '.bin').replace('.', ''),
        checksum_sha256: fileData.checksum || this._calculateChecksum(file?.buffer) || 'pending',
        status: file ? 'DRAFT' : 'PENDING_UPLOAD',
        owner_type,
        owner_id: owner_id || userId,
        access_level: typeof access_level === 'string' ? 1 : access_level,
        tags: tags || [],
        requires_signature,
        signature_required_from,
        due_date,
        expiration_date,
        created_by: userId,
        updated_by: userId,
        version: file ? 1 : 0
      }, { transaction: t });

      // Crear versión inicial si hay archivo
      if (file) {
        await this.models.DocumentVersion.create({
          document_id: document.id,
          company_id: companyId,
          version_number: 1,
          // Nombres correctos segun modelo DocumentVersion
          original_filename: fileData.fileName || file?.originalname || 'unknown',
          stored_filename: fileData.storedFileName || fileData.fileName || documentNumber + '_v1',
          storage_path: fileData.filePath || fileData.storagePath || '/uploads/' + companyId + '/' + documentNumber,
          file_path: fileData.filePath,
          file_size: fileData.fileSize,
          mime_type: fileData.mimeType,
          file_size_bytes: fileData.fileSize || file?.size || 0,
          checksum_sha256: fileData.checksum || this._calculateChecksum(file?.buffer) || 'pending',
          created_by: userId,
          change_summary: 'Version inicial'
        }, { transaction: t });
      }

      // Guardar metadata adicional
      if (Object.keys(metadata).length > 0) {
        await this.saveMetadata(document.id, companyId, metadata, t);
      }

      // Registrar en auditoría
      await this.models.DocumentAccessLog.logAction({
        document_id: document.id,
        company_id: companyId,
        user_id: userId,
        action: 'upload',
        details: {
          title,
          document_type_id,
          file_size: fileData.fileSize,
          status: document.status
        }
      }, t);

      if (!transaction) await t.commit();

      return this.getDocument(document.id, userId, companyId);

    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }

  /**
   * Obtener documento por ID
   */
  async getDocument(documentId, userId, companyId, options = {}) {
    const {
      includeVersions = false,
      includeMetadata = true,
      includePermissions = false,
      checkPermission = true
    } = options;

    const include = [
      {
        model: this.models.User,
        as: 'creator',
        attributes: ['user_id', 'firstName', 'lastName', 'email']
      },
      {
        model: this.models.Folder,
        as: 'folder',
        attributes: ['id', 'name', 'full_path']
      }
    ];

    if (includeVersions) {
      include.push({
        model: this.models.DocumentVersion,
        as: 'versions',
        order: [['version_number', 'DESC']],
        include: [{
          model: this.models.User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName']
        }]
      });
    }

    if (includeMetadata) {
      include.push({
        model: this.models.DocumentMetadata,
        as: 'metadata'
      });
    }

    if (includePermissions) {
      include.push({
        model: this.models.DocumentPermission,
        as: 'permissions',
        where: { is_active: true },
        required: false
      });
    }

    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      },
      include
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Verificar permisos
    if (checkPermission) {
      const hasAccess = await this.checkDocumentAccess(document, userId, 'view');
      if (!hasAccess) {
        throw new Error('No tiene permisos para ver este documento');
      }
    }

    // Incrementar contador de vistas
    await document.incrementViewCount();

    // Registrar acceso
    await this.models.DocumentAccessLog.logAction({
      document_id: documentId,
      company_id: companyId,
      user_id: userId,
      action: 'view'
    });

    return document;
  }

  /**
   * Actualizar documento (metadata, no archivo)
   */
  async updateDocument(documentId, updates, userId, companyId) {
    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Verificar permisos de edición
    const canEdit = await this.checkDocumentAccess(document, userId, 'edit');
    if (!canEdit) {
      throw new Error('No tiene permisos para editar este documento');
    }

    // Verificar que no esté bloqueado por otro usuario
    if (document.is_locked && document.locked_by !== userId) {
      throw new Error('Documento bloqueado por otro usuario');
    }

    const allowedFields = [
      'title', 'description', 'tags', 'folder_id',
      'access_level', 'expiration_date', 'due_date',
      'requires_signature', 'signature_required_from'
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    filteredUpdates.updated_by = userId;

    const oldValues = {};
    for (const field of Object.keys(filteredUpdates)) {
      oldValues[field] = document[field];
    }

    await document.update(filteredUpdates);

    // Actualizar metadata si se proporciona
    if (updates.metadata) {
      await this.saveMetadata(documentId, companyId, updates.metadata);
    }

    // Registrar en auditoría
    await this.models.DocumentAccessLog.logAction({
      document_id: documentId,
      company_id: companyId,
      user_id: userId,
      action: 'update',
      details: {
        old_values: oldValues,
        new_values: filteredUpdates
      }
    });

    return this.getDocument(documentId, userId, companyId);
  }

  /**
   * Crear nueva versión de documento
   */
  async createVersion(documentId, file, notes, userId, companyId) {
    const t = await this.models.Document.sequelize.transaction();

    try {
      const document = await this.models.Document.findOne({
        where: {
          id: documentId,
          company_id: companyId,
          is_deleted: false
        },
        transaction: t
      });

      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Verificar permisos
      const canEdit = await this.checkDocumentAccess(document, userId, 'edit');
      if (!canEdit) {
        throw new Error('No tiene permisos para crear versiones');
      }

      // Verificar bloqueo
      if (document.is_locked && document.locked_by !== userId) {
        throw new Error('Documento bloqueado por otro usuario');
      }

      // Subir nuevo archivo
      const fileData = await this.storageService.uploadFile(
        file,
        companyId,
        document.document_number,
        document.current_version + 1
      );

      const newVersionNumber = document.current_version + 1;

      // Crear registro de versión
      const version = await this.models.DocumentVersion.create({
        document_id: documentId,
        company_id: companyId,
        version_number: newVersionNumber,
        // Nombres correctos segun modelo DocumentVersion
          original_filename: fileData.fileName || file?.originalname || 'unknown',
          stored_filename: fileData.storedFileName || fileData.fileName || documentNumber + '_v1',
          storage_path: fileData.filePath || fileData.storagePath || '/uploads/' + companyId + '/' + documentNumber,
        file_path: fileData.filePath,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        file_size_bytes: fileData.fileSize || file?.size || 0,
          checksum_sha256: fileData.checksum || this._calculateChecksum(file?.buffer) || 'pending',
        created_by: userId,
        change_notes: notes || `Versión ${newVersionNumber}`
      }, { transaction: t });

      // Actualizar documento principal
      await document.update({
        // Nombres correctos segun modelo DocumentVersion
          original_filename: fileData.fileName || file?.originalname || 'unknown',
          stored_filename: fileData.storedFileName || fileData.fileName || documentNumber + '_v1',
          storage_path: fileData.filePath || fileData.storagePath || '/uploads/' + companyId + '/' + documentNumber,
        file_path: fileData.filePath,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        file_size_bytes: fileData.fileSize || file?.size || 0,
          checksum_sha256: fileData.checksum || this._calculateChecksum(file?.buffer) || 'pending',
        current_version: newVersionNumber,
        updated_by: userId,
        status: document.status === 'pending_upload' ? 'draft' : document.status
      }, { transaction: t });

      // Desbloquear si estaba bloqueado por este usuario
      if (document.is_locked && document.locked_by === userId) {
        await document.update({
          is_locked: false,
          locked_by: null,
          locked_at: null
        }, { transaction: t });
      }

      // Auditoría
      await this.models.DocumentAccessLog.logAction({
        document_id: documentId,
        company_id: companyId,
        user_id: userId,
        action: 'version_created',
        version_number: newVersionNumber,
        details: {
          change_notes: notes,
          file_size: fileData.fileSize
        }
      }, t);

      await t.commit();

      return version;

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Cambiar estado del documento
   */
  async changeStatus(documentId, newStatus, reason, userId, companyId) {
    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    const oldStatus = document.status;

    // Validar transición de estado
    const validTransitions = this.getValidStatusTransitions(oldStatus);
    if (!validTransitions.includes(newStatus)) {
      throw new Error(`Transición de estado inválida: ${oldStatus} -> ${newStatus}`);
    }

    // Verificar permisos según el nuevo estado
    let requiredPermission = 'edit';
    if (['approved', 'rejected'].includes(newStatus)) {
      requiredPermission = 'approve';
    } else if (['archived', 'deleted'].includes(newStatus)) {
      requiredPermission = 'manage';
    }

    const hasPermission = await this.checkDocumentAccess(document, userId, requiredPermission);
    if (!hasPermission) {
      throw new Error(`No tiene permisos para cambiar a estado ${newStatus}`);
    }

    // Actualizar estado
    const updateData = {
      status: newStatus,
      updated_by: userId
    };

    // Campos adicionales según estado
    if (newStatus === 'published') {
      updateData.published_at = new Date();
      updateData.published_by = userId;
    } else if (newStatus === 'archived') {
      updateData.archived_at = new Date();
      updateData.archived_by = userId;
    } else if (newStatus === 'deleted') {
      updateData.is_deleted = true;
      updateData.deleted_at = new Date();
      updateData.deleted_by = userId;
      updateData.deletion_reason = reason;
    }

    await document.update(updateData);

    // Auditoría
    await this.models.DocumentAccessLog.logAction({
      document_id: documentId,
      company_id: companyId,
      user_id: userId,
      action: 'status_changed',
      details: {
        old_status: oldStatus,
        new_status: newStatus,
        reason
      }
    });

    // Crear alertas si es necesario
    if (newStatus === 'pending_approval') {
      await this.createApprovalAlert(document, userId, companyId);
    }

    return document;
  }

  /**
   * Eliminar documento (soft delete)
   */
  async deleteDocument(documentId, reason, userId, companyId) {
    return this.changeStatus(documentId, 'deleted', reason, userId, companyId);
  }

  /**
   * Eliminar documento permanentemente (hard delete)
   */
  async permanentlyDeleteDocument(documentId, userId, companyId) {
    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Solo admins pueden eliminar permanentemente
    const user = await this.models.User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      throw new Error('Solo administradores pueden eliminar permanentemente');
    }

    const t = await this.models.Document.sequelize.transaction();

    try {
      // Eliminar archivo físico
      if (document.file_path) {
        await this.storageService.deleteFile(document.file_path);
      }

      // Eliminar versiones y sus archivos
      const versions = await this.models.DocumentVersion.findAll({
        where: { document_id: documentId }
      });

      for (const version of versions) {
        if (version.file_path) {
          await this.storageService.deleteFile(version.file_path);
        }
      }

      // Registrar antes de eliminar
      await this.models.DocumentAccessLog.logAction({
        document_id: documentId,
        company_id: companyId,
        user_id: userId,
        action: 'permanent_delete',
        details: {
          document_number: document.document_number,
          title: document.title
        }
      }, t);

      // Eliminar registros relacionados
      await this.models.DocumentVersion.destroy({ where: { document_id: documentId }, transaction: t });
      await this.models.DocumentMetadata.destroy({ where: { document_id: documentId }, transaction: t });
      await this.models.DocumentPermission.destroy({ where: { document_id: documentId }, transaction: t });
      await this.models.DocumentAlert.destroy({ where: { document_id: documentId }, transaction: t });

      // Eliminar documento
      await document.destroy({ transaction: t });

      await t.commit();

      return { success: true, message: 'Documento eliminado permanentemente' };

    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Bloquear documento para edición (check-out)
   */
  async lockDocument(documentId, userId, companyId) {
    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    if (document.is_locked) {
      if (document.locked_by === userId) {
        throw new Error('Ya tiene el documento bloqueado');
      }
      throw new Error('Documento bloqueado por otro usuario');
    }

    // Verificar permisos de edición
    const canEdit = await this.checkDocumentAccess(document, userId, 'edit');
    if (!canEdit) {
      throw new Error('No tiene permisos para bloquear este documento');
    }

    await document.update({
      is_locked: true,
      locked_by: userId,
      locked_at: new Date()
    });

    await this.models.DocumentAccessLog.logAction({
      document_id: documentId,
      company_id: companyId,
      user_id: userId,
      action: 'checkout'
    });

    return document;
  }

  /**
   * Desbloquear documento (check-in)
   */
  async unlockDocument(documentId, userId, companyId, force = false) {
    const document = await this.models.Document.findOne({
      where: {
        id: documentId,
        company_id: companyId,
        is_deleted: false
      }
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    if (!document.is_locked) {
      throw new Error('Documento no está bloqueado');
    }

    // Solo el usuario que bloqueó puede desbloquear, a menos que sea forzado por admin
    if (document.locked_by !== userId) {
      if (!force) {
        throw new Error('Solo el usuario que bloqueó puede desbloquear');
      }
      const user = await this.models.User.findByPk(userId);
      if (!user || user.role !== 'admin') {
        throw new Error('Solo administradores pueden forzar desbloqueo');
      }
    }

    await document.update({
      is_locked: false,
      locked_by: null,
      locked_at: null
    });

    await this.models.DocumentAccessLog.logAction({
      document_id: documentId,
      company_id: companyId,
      user_id: userId,
      action: 'checkin',
      details: { forced: force }
    });

    return document;
  }

  /**
   * Listar documentos con filtros
   */
  async listDocuments(filters, userId, companyId, pagination = {}) {
    const {
      folder_id,
      document_type_id,
      category_id,
      status,
      owner_type,
      owner_id,
      tags,
      search,
      date_from,
      date_to,
      expiring_in_days,
      created_by
    } = filters;

    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = pagination;

    const where = {
      company_id: companyId,
      is_deleted: false
    };

    // Aplicar filtros
    if (folder_id) where.folder_id = folder_id;
    if (document_type_id) where.document_type_id = document_type_id;
    if (status) where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    if (owner_type) where.owner_type = owner_type;
    if (owner_id) where.owner_id = owner_id;
    if (created_by) where.created_by = created_by;

    if (tags && tags.length > 0) {
      where.tags = { [Op.overlap]: tags };
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { document_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    if (expiring_in_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + expiring_in_days);
      where.expiration_date = {
        [Op.between]: [new Date(), futureDate]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await this.models.Document.findAndCountAll({
      where,
      include: [
        {
          model: this.models.User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName']
        },
        {
          model: this.models.Folder,
          as: 'folder',
          attributes: ['id', 'name', 'full_path']
        }
      ],
      order: [[sort_by, sort_order]],
      limit,
      offset
    });

    return {
      documents: rows,
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Buscar documentos por texto completo
   */
  async searchDocuments(query, userId, companyId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      filters = {}
    } = options;

    // Usar búsqueda full-text de PostgreSQL
    const results = await this.models.Document.sequelize.query(`
      SELECT
        d.*,
        ts_rank(d.search_vector, plainto_tsquery('spanish', :query)) as rank
      FROM dms_documents d
      WHERE d.company_id = :companyId
        AND d.is_deleted = false
        AND d.search_vector @@ plainto_tsquery('spanish', :query)
      ORDER BY rank DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { query, companyId, limit, offset },
      type: this.models.Document.sequelize.QueryTypes.SELECT
    });

    // Nota: No registramos log de búsqueda porque DocumentAccessLog requiere document_id
    // Las búsquedas no son accesos a documentos específicos

    return results;
  }

  /**
   * Obtener estadísticas de documentos
   */
  async getStatistics(companyId, filters = {}) {
    const { date_from, date_to, owner_type } = filters;

    const baseWhere = {
      company_id: companyId,
      is_deleted: false
    };

    if (owner_type) baseWhere.owner_type = owner_type;
    if (date_from || date_to) {
      baseWhere.created_at = {};
      if (date_from) baseWhere.created_at[Op.gte] = new Date(date_from);
      if (date_to) baseWhere.created_at[Op.lte] = new Date(date_to);
    }

    const [
      totalDocuments,
      byStatus,
      byType,
      storageUsed,
      recentActivity
    ] = await Promise.all([
      // Total de documentos
      this.models.Document.count({ where: baseWhere }),

      // Por estado
      this.models.Document.findAll({
        where: baseWhere,
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status']
      }),

      // Por tipo (usando type_code que es el campo correcto en la BD)
      this.models.Document.findAll({
        where: baseWhere,
        attributes: ['type_code', [fn('COUNT', col('id')), 'count']],
        group: ['type_code'],
        limit: 10
      }),

      // Almacenamiento usado (file_size_bytes es el campo correcto)
      this.models.Document.sum('file_size_bytes', { where: baseWhere }),

      // Actividad reciente
      this.models.DocumentAccessLog.findAll({
        where: { company_id: companyId },
        attributes: ['action', [fn('COUNT', col('id')), 'count']],
        group: ['action'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 10
      })
    ]);

    return {
      total_documents: totalDocuments,
      by_status: byStatus,
      by_type: byType,
      storage_used_bytes: storageUsed || 0,
      storage_used_mb: ((storageUsed || 0) / (1024 * 1024)).toFixed(2),
      recent_activity: recentActivity
    };
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  /**
   * Generar número de documento único
   */
  async generateDocumentNumber(companyId, typeId) {
    const year = new Date().getFullYear();
    const prefix = `DOC-${companyId}-${year}`;

    const lastDoc = await this.models.Document.findOne({
      where: {
        company_id: companyId,
        document_number: { [Op.like]: `${prefix}%` }
      },
      order: [['created_at', 'DESC']]
    });

    let sequence = 1;
    if (lastDoc) {
      const lastNumber = lastDoc.document_number.split('-').pop();
      sequence = parseInt(lastNumber, 10) + 1;
    }

    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Guardar metadata del documento
   */
  async saveMetadata(documentId, companyId, metadata, transaction = null) {
    for (const [key, value] of Object.entries(metadata)) {
      const dataType = typeof value === 'number' ? 'number' :
                       typeof value === 'boolean' ? 'boolean' :
                       value instanceof Date ? 'date' :
                       typeof value === 'object' ? 'json' : 'string';

      await this.models.DocumentMetadata.upsert({
        document_id: documentId,
        company_id: companyId,
        metadata_key: key,
        metadata_value: this.models.DocumentMetadata.formatValue(value, dataType),
        data_type: dataType
      }, { transaction });
    }
  }

  /**
   * Verificar acceso a documento
   */
  async checkDocumentAccess(document, userId, requiredPermission) {
    // El creador siempre tiene acceso
    if (document.created_by === userId) {
      return true;
    }

    // El propietario tiene acceso
    if (document.owner_type === 'employee' && document.owner_id === userId) {
      return true;
    }

    // Verificar usuario
    const user = await this.models.User.findByPk(userId);
    if (!user) return false;

    // Admins tienen acceso total
    if (user.role === 'admin') {
      return true;
    }

    // Documentos públicos
    if (document.access_level === 'public' && requiredPermission === 'view') {
      return true;
    }

    // Documentos de departamento
    if (document.access_level === 'department' && requiredPermission === 'view') {
      // TODO: Verificar si usuario pertenece al mismo departamento
    }

    // Verificar permisos específicos
    const permission = await this.models.DocumentPermission.findOne({
      where: {
        document_id: document.id,
        is_active: true,
        [Op.or]: [
          { grantee_type: 'user', grantee_id: userId },
          { grantee_type: 'role', grantee_role: user.role }
        ],
        [Op.or]: [
          { valid_until: null },
          { valid_until: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (!permission) return false;

    // Verificar permiso específico
    switch (requiredPermission) {
      case 'view': return permission.can_view;
      case 'download': return permission.can_download;
      case 'edit': return permission.can_edit;
      case 'sign': return permission.can_sign;
      case 'approve': return permission.can_approve;
      case 'manage': return permission.can_share && permission.can_delete;
      default: return false;
    }
  }

  /**
   * Obtener transiciones de estado válidas
   */
  getValidStatusTransitions(currentStatus) {
    const transitions = {
      'pending_upload': ['draft', 'cancelled'],
      'draft': ['pending_review', 'cancelled'],
      'pending_review': ['approved', 'rejected', 'draft'],
      'approved': ['published', 'archived'],
      'rejected': ['draft', 'cancelled'],
      'published': ['archived', 'expired'],
      'archived': ['published', 'deleted'],
      'expired': ['archived', 'deleted'],
      'cancelled': ['deleted']
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Crear alerta de aprobación pendiente
   */
  async createApprovalAlert(document, userId, companyId) {
    // TODO: Obtener aprobadores según flujo de trabajo
    // Por ahora, alertar a admins
    const admins = await this.models.User.findAll({
      where: { company_id: companyId, role: 'admin', is_active: true }
    });

    for (const admin of admins) {
      await this.models.DocumentAlert.create({
        document_id: document.id,
        company_id: companyId,
        user_id: admin.id,
        alert_type: 'pending_approval',
        severity: 'info',
        title: 'Documento pendiente de aprobación',
        message: `El documento "${document.title}" requiere su aprobación.`
      });
    }
  }

  /**
   * Calcular checksum SHA256 de un buffer
   * @private
   */
  _calculateChecksum(buffer) {
    if (!buffer) return null;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

module.exports = DocumentService;
