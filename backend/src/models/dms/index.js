'use strict';

/**
 * DMS (Document Management System) Models Index
 * Exporta todos los modelos del sistema de gestión documental
 */

const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const DocumentAccessLog = require('./DocumentAccessLog');
const DocumentMetadata = require('./DocumentMetadata');
const DocumentPermission = require('./DocumentPermission');
const DocumentRequest = require('./DocumentRequest');
const DocumentAlert = require('./DocumentAlert');
const Folder = require('./Folder');

module.exports = {
  Document,
  DocumentVersion,
  DocumentAccessLog,
  DocumentMetadata,
  DocumentPermission,
  DocumentRequest,
  DocumentAlert,
  Folder
};

/**
 * Inicializar todos los modelos DMS
 * @param {Sequelize} sequelize - Instancia de Sequelize
 * @param {Object} appModels - Modelos principales de la aplicación (User, Company, etc.)
 * @returns {Object} Modelos inicializados
 */
module.exports.initDMSModels = (sequelize, appModels = {}) => {
  const dmsModels = {
    Document: Document(sequelize),
    DocumentVersion: DocumentVersion(sequelize),
    DocumentAccessLog: DocumentAccessLog(sequelize),
    DocumentMetadata: DocumentMetadata(sequelize),
    DocumentPermission: DocumentPermission(sequelize),
    DocumentRequest: DocumentRequest(sequelize),
    DocumentAlert: DocumentAlert(sequelize),
    Folder: Folder(sequelize)
  };

  // Combinar modelos DMS con modelos de la app para asociaciones
  const allModels = { ...appModels, ...dmsModels };

  // Establecer asociaciones (solo si existen los modelos requeridos)
  Object.values(dmsModels).forEach(model => {
    if (model.associate) {
      try {
        model.associate(allModels);
      } catch (assocError) {
        console.warn(`⚠️ [DMS] Asociación pendiente para ${model.name}: ${assocError.message}`);
      }
    }
  });

  return dmsModels;
};
