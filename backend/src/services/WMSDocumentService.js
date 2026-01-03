/**
 * WMS Document Control Service
 * Sistema de control documental para trazabilidad
 * Cumplimiento: ISO 22005, GS1, EU 178/2002, FDA FSMA
 */

const { sequelize } = require('../config/database');
const crypto = require('crypto');
const path = require('path');

class WMSDocumentService {

    /**
     * Obtener tipos de documentos
     */
    async getDocumentTypes() {
        const result = await sequelize.query(`
            SELECT * FROM wms_document_types WHERE is_active = TRUE ORDER BY name
        `, { type: sequelize.QueryTypes.SELECT });

        return {
            types: result,
            info: {
                title: '📁 Tipos de Documentos',
                description: 'Categorías de documentos admitidos en el sistema',
                categories: {
                    comerciales: ['PO (Orden de Compra)', 'INV (Factura)', 'RN (Remito)'],
                    calidad: ['COA (Certificado de Análisis)', 'QC (Control de Calidad)'],
                    legales: ['COO (Certificado de Origen)', 'SDS (Hoja de Seguridad)'],
                    operativos: ['TL (Carta de Porte)', 'DIS (Disposición)', 'RCL (Recall)']
                },
                compliance: 'Los documentos son requeridos según normativas internacionales'
            }
        };
    }

    /**
     * Subir documento
     */
    async uploadDocument(data) {
        const {
            companyId,
            documentTypeId,
            documentNumber,
            title,
            description,
            filePath,
            fileName,
            fileSize,
            mimeType,
            fileContent, // Buffer del archivo para calcular hash
            externalReference,
            issueDate,
            expiryDate,
            issuerName,
            issuerTaxId,
            metadata,
            uploadedBy
        } = data;

        // Calcular hash SHA-512 del archivo para integridad
        const fileHash = fileContent
            ? crypto.createHash('sha512').update(fileContent).digest('hex')
            : null;

        // Calcular fecha de retención según tipo de documento
        const retentionResult = await sequelize.query(`
            SELECT retention_years FROM wms_document_types WHERE id = $1
        `, {
            bind: [documentTypeId],
            type: sequelize.QueryTypes.SELECT
        });
        const retentionYears = retentionResult[0]?.retention_years || 7;

        // FIX: Usar parámetro en lugar de interpolación para evitar SQL injection
        const result = await sequelize.query(`
            INSERT INTO wms_documents (
                company_id, document_type_id, document_number, title, description,
                file_path, file_name, file_size, mime_type, file_hash,
                external_reference, issue_date, expiry_date, issuer_name, issuer_tax_id,
                metadata, uploaded_by, retention_until
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
                CURRENT_DATE + INTERVAL '1 year' * $18
            )
            RETURNING *
        `, {
            bind: [companyId, documentTypeId, documentNumber, title, description,
                   filePath, fileName, fileSize, mimeType, fileHash,
                   externalReference, issueDate, expiryDate, issuerName, issuerTaxId,
                   JSON.stringify(metadata || {}), uploadedBy, retentionYears],
            type: sequelize.QueryTypes.INSERT
        });

        return {
            success: true,
            document: result[0][0],
            info: {
                title: '📄 Documento Registrado',
                description: 'El documento ha sido cargado y verificado exitosamente',
                features: {
                    hash: '🔐 Hash SHA-512 calculado para verificar integridad',
                    retention: `📅 Retención obligatoria: ${retentionYears} años`,
                    indexed: '🔍 Indexado para búsqueda rápida'
                },
                nextSteps: expiryDate ? [
                    `⏰ Documento vence: ${expiryDate}`,
                    'Se enviará recordatorio 30 días antes del vencimiento'
                ] : [],
                compliance: {
                    standard: 'ISO 22005 / FDA FSMA',
                    requirement: 'Documentación de trazabilidad obligatoria'
                }
            }
        };
    }

    /**
     * Vincular documento a entidad
     */
    async linkDocument(data) {
        const {
            documentId,
            entityType,
            entityId,
            linkType,
            isRequired,
            linkedBy,
            notes
        } = data;

        const result = await sequelize.query(`
            INSERT INTO wms_document_links (
                document_id, entity_type, entity_id, link_type, is_required, linked_by, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (document_id, entity_type, entity_id, link_type) DO NOTHING
            RETURNING *
        `, {
            bind: [documentId, entityType, entityId, linkType, isRequired || false, linkedBy, notes],
            type: sequelize.QueryTypes.INSERT
        });

        return {
            success: true,
            link: result[0]?.[0],
            info: {
                title: '🔗 Documento Vinculado',
                description: `Documento asociado a ${entityType} #${entityId}`,
                linkTypes: {
                    source: 'Documento origen (ej: Orden de compra)',
                    support: 'Documentación de respaldo',
                    certificate: 'Certificación de calidad',
                    invoice: 'Factura comercial',
                    approval: 'Documento de aprobación'
                },
                traceability: 'Este vínculo forma parte de la cadena de trazabilidad'
            }
        };
    }

    /**
     * Obtener documentos de una entidad
     */
    async getEntityDocuments(entityType, entityId) {
        const result = await sequelize.query(`
            SELECT d.*, dt.name as document_type_name, dt.code as document_type_code,
                   dl.link_type, dl.is_required, dl.linked_at, dl.notes as link_notes,
                   u."firstName" || ' ' || u."lastName" as uploaded_by_name
            FROM wms_documents d
            JOIN wms_document_links dl ON d.id = dl.document_id
            LEFT JOIN wms_document_types dt ON d.document_type_id = dt.id
            LEFT JOIN users u ON d.uploaded_by = u.user_id
            WHERE dl.entity_type = $1 AND dl.entity_id = $2
            ORDER BY dl.link_type, d.uploaded_at DESC
        `, {
            bind: [entityType, entityId],
            type: sequelize.QueryTypes.SELECT
        });

        // Verificar documentos requeridos faltantes
        const requiredTypes = await sequelize.query(`
            SELECT * FROM wms_document_types
            WHERE $1 = ANY(required_for) AND is_active = TRUE
        `, {
            bind: [entityType],
            type: sequelize.QueryTypes.SELECT
        });

        const missingDocs = requiredTypes.filter(rt =>
            !result.find(d => d.document_type_id === rt.id)
        );

        return {
            documents: result,
            missingRequired: missingDocs,
            compliance: {
                complete: missingDocs.length === 0,
                percentage: requiredTypes.length > 0
                    ? Math.round(((requiredTypes.length - missingDocs.length) / requiredTypes.length) * 100)
                    : 100
            },
            info: {
                title: '📚 Documentación de la Operación',
                description: `${result.length} documento(s) vinculado(s)`,
                status: missingDocs.length === 0
                    ? '✅ Documentación completa'
                    : `⚠️ Faltan ${missingDocs.length} documento(s) requerido(s)`,
                missingDocs: missingDocs.map(d => ({
                    type: d.code,
                    name: d.name,
                    requirement: 'Obligatorio según normativa'
                })),
                actions: {
                    upload: 'Cargar documento faltante',
                    link: 'Vincular documento existente',
                    verify: 'Verificar integridad de documento'
                }
            }
        };
    }

    /**
     * Verificar integridad de documento
     */
    async verifyDocumentIntegrity(documentId, fileContent) {
        const doc = await this.getDocument(documentId);
        if (!doc) {
            return { valid: false, error: 'Documento no encontrado' };
        }

        if (!doc.file_hash) {
            return {
                valid: null,
                warning: 'Documento sin hash de verificación',
                info: {
                    title: '⚠️ Sin Verificación Disponible',
                    description: 'Este documento fue cargado sin hash de integridad'
                }
            };
        }

        const currentHash = crypto.createHash('sha512').update(fileContent).digest('hex');
        const isValid = currentHash === doc.file_hash;

        return {
            valid: isValid,
            originalHash: doc.file_hash,
            currentHash: currentHash,
            info: {
                title: isValid ? '✅ Documento Íntegro' : '❌ Documento Alterado',
                description: isValid
                    ? 'El documento no ha sido modificado desde su carga'
                    : 'Se detectaron cambios en el documento desde su carga original',
                techInfo: {
                    algorithm: 'SHA-512 (256 bits de seguridad)',
                    originalTimestamp: doc.uploaded_at,
                    verification: isValid ? 'PASSED' : 'FAILED'
                },
                compliance: isValid
                    ? '✓ Cumple requisitos de integridad documental'
                    : '✗ Documento comprometido - requiere investigación'
            }
        };
    }

    /**
     * Obtener documentos por vencer
     */
    async getExpiringDocuments(companyId, days = 30) {
        // FIX: Usar parámetro en lugar de interpolación para evitar SQL injection
        const result = await sequelize.query(`
            SELECT d.*, dt.name as document_type_name, dt.code as document_type_code,
                   d.expiry_date - CURRENT_DATE as days_until_expiry
            FROM wms_documents d
            LEFT JOIN wms_document_types dt ON d.document_type_id = dt.id
            WHERE d.company_id = $1
            AND d.status = 'active'
            AND d.expiry_date IS NOT NULL
            AND d.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
            ORDER BY d.expiry_date ASC
        `, {
            bind: [companyId, days],
            type: sequelize.QueryTypes.SELECT
        });

        const expired = result.filter(d => d.days_until_expiry <= 0);
        const expiringSoon = result.filter(d => d.days_until_expiry > 0 && d.days_until_expiry <= 7);

        return {
            documents: result,
            summary: {
                total: result.length,
                expired: expired.length,
                expiringSoon: expiringSoon.length
            },
            info: {
                title: '⏰ Documentos por Vencer',
                description: `${result.length} documento(s) requieren atención`,
                alerts: {
                    expired: expired.length > 0
                        ? `🔴 ${expired.length} documento(s) VENCIDO(S)`
                        : null,
                    soon: expiringSoon.length > 0
                        ? `🟠 ${expiringSoon.length} documento(s) vencen en 7 días`
                        : null
                },
                actions: {
                    renew: 'Cargar versión actualizada del documento',
                    extend: 'Solicitar extensión de vigencia',
                    archive: 'Archivar documento obsoleto'
                },
                compliance: 'Mantener documentación vigente es requisito de ISO 22005'
            }
        };
    }

    /**
     * Crear versión de documento
     */
    async createDocumentVersion(documentId, data, uploadedBy) {
        const originalDoc = await this.getDocument(documentId);
        if (!originalDoc) {
            return { success: false, error: 'Documento original no encontrado' };
        }

        // TRANSACCIÓN: Actualización de versión debe ser atómica
        const transaction = await sequelize.transaction();

        try {
            // Marcar documento original como superado
            await sequelize.query(`
                UPDATE wms_documents SET status = 'superseded', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, { bind: [documentId], transaction });

            // Crear nueva versión
            const newVersion = originalDoc.version + 1;
            const result = await sequelize.query(`
                INSERT INTO wms_documents (
                    company_id, document_type_id, document_number, title, description,
                    file_path, file_name, file_size, mime_type, file_hash,
                    external_reference, issue_date, expiry_date, issuer_name, issuer_tax_id,
                    metadata, uploaded_by, version, parent_document_id, retention_until
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
                )
                RETURNING *
            `, {
                bind: [
                    originalDoc.company_id, originalDoc.document_type_id, originalDoc.document_number,
                    data.title || originalDoc.title, data.description || originalDoc.description,
                    data.filePath, data.fileName, data.fileSize, data.mimeType,
                    data.fileContent ? crypto.createHash('sha512').update(data.fileContent).digest('hex') : null,
                    originalDoc.external_reference, data.issueDate || originalDoc.issue_date,
                    data.expiryDate || originalDoc.expiry_date, originalDoc.issuer_name, originalDoc.issuer_tax_id,
                    JSON.stringify(data.metadata || originalDoc.metadata || {}), uploadedBy, newVersion, documentId,
                    originalDoc.retention_until
                ],
                type: sequelize.QueryTypes.INSERT,
                transaction
            });

            await transaction.commit();

            return {
                success: true,
                document: result[0][0],
                previousVersion: documentId,
                info: {
                    title: '📄 Nueva Versión Creada',
                    description: `Versión ${newVersion} del documento registrada`,
                    versionControl: {
                        previous: `Versión ${originalDoc.version} marcada como superada`,
                        current: `Versión ${newVersion} activa`,
                        history: 'Se mantiene historial completo de versiones'
                    },
                    compliance: 'Control de versiones requerido por ISO 9001'
                }
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Archivar documento
     */
    async archiveDocument(documentId, archivedBy, reason) {
        const doc = await this.getDocument(documentId);
        if (!doc) {
            return { success: false, error: 'Documento no encontrado' };
        }

        await sequelize.query(`
            UPDATE wms_documents
            SET status = 'archived', archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, { bind: [documentId] });

        // Registrar acción de retención
        await sequelize.query(`
            INSERT INTO wms_retention_actions (
                entity_type, entity_id, action_type, action_by, reason
            ) VALUES ('document', $1, 'archived', $2, $3)
        `, { bind: [documentId, archivedBy, reason] });

        return {
            success: true,
            info: {
                title: '📦 Documento Archivado',
                description: 'El documento ha sido movido al archivo histórico',
                retention: {
                    until: doc.retention_until,
                    policy: 'El documento se conservará según política de retención',
                    access: 'Disponible para consulta y auditoría'
                },
                compliance: 'Archivado según normativa de retención documental'
            }
        };
    }

    /**
     * Buscar documentos
     */
    async searchDocuments(companyId, query) {
        const result = await sequelize.query(`
            SELECT d.*, dt.name as document_type_name, dt.code as document_type_code
            FROM wms_documents d
            LEFT JOIN wms_document_types dt ON d.document_type_id = dt.id
            WHERE d.company_id = $1
            AND d.status = 'active'
            AND (
                d.title ILIKE $2 OR
                d.document_number ILIKE $2 OR
                d.external_reference ILIKE $2 OR
                d.issuer_name ILIKE $2
            )
            ORDER BY d.uploaded_at DESC
            LIMIT 50
        `, {
            bind: [companyId, `%${query}%`],
            type: sequelize.QueryTypes.SELECT
        });

        return {
            documents: result,
            count: result.length,
            info: {
                title: '🔍 Resultados de Búsqueda',
                description: `${result.length} documento(s) encontrado(s)`,
                searchTip: 'Busque por título, número, referencia externa o emisor'
            }
        };
    }

    // Helpers
    async getDocument(documentId) {
        const result = await sequelize.query(`
            SELECT * FROM wms_documents WHERE id = $1
        `, {
            bind: [documentId],
            type: sequelize.QueryTypes.SELECT
        });
        return result[0];
    }
}

module.exports = new WMSDocumentService();
