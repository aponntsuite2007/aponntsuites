/**
 * ============================================================================
 * AFIP ROUTES - API REST para Integración con AFIP
 * ============================================================================
 *
 * Endpoints para gestión de facturación electrónica y configuración fiscal.
 *
 * Created: 2025-01-20
 */

const express = require('express');
const router = express.Router();
const AfipBillingService = require('../services/afip/AfipBillingService');
const AfipAuthService = require('../services/afip/AfipAuthService');
const AfipCertificateManager = require('../services/afip/AfipCertificateManager');
const { auth, requireRole } = require('../middleware/auth');

// ============================================
// CERTIFICADOS DIGITALES
// ============================================

/**
 * POST /api/afip/certificates/upload
 * Subir certificado digital de empresa
 */
router.post('/certificates/upload', auth, requireRole(['admin']), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            certificatePEM,
            privateKeyPEM,
            certificateExpiration,
            certificateType
        } = req.body;

        if (!certificatePEM || !privateKeyPEM) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren certificatePEM y privateKeyPEM'
            });
        }

        await AfipCertificateManager.saveCertificate(companyId, {
            certificatePEM,
            privateKeyPEM,
            certificateExpiration,
            certificateType: certificateType || 'TESTING'
        });

        res.json({
            success: true,
            message: 'Certificado guardado exitosamente'
        });

    } catch (error) {
        console.error('Error al guardar certificado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/afip/certificates/validate
 * Validar certificado actual de empresa
 */
router.get('/certificates/validate', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const validation = await AfipCertificateManager.validateCertificate(companyId);

        res.json({
            success: true,
            validation
        });

    } catch (error) {
        console.error('Error al validar certificado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * DELETE /api/afip/certificates
 * Eliminar certificado de empresa
 */
router.delete('/certificates', auth, requireRole(['admin']), async (req, res) => {
    try {
        const companyId = req.user.company_id;

        await AfipCertificateManager.removeCertificate(companyId);

        res.json({
            success: true,
            message: 'Certificado eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar certificado:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// AUTENTICACIÓN WSAA
// ============================================

/**
 * POST /api/afip/auth/token
 * Obtener Token de Acceso (TA) de WSAA
 */
router.post('/auth/token', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { service } = req.body; // wsfe, wsfex, etc.

        const ticket = await AfipAuthService.getAccessTicket(companyId, service || 'wsfe');

        res.json({
            success: true,
            ticket
        });

    } catch (error) {
        console.error('Error al obtener token AFIP:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/afip/auth/invalidate
 * Invalidar token cacheado
 */
router.post('/auth/invalidate', auth, requireRole(['admin']), async (req, res) => {
    try {
        const companyId = req.user.company_id;

        await AfipAuthService.invalidateToken(companyId);

        res.json({
            success: true,
            message: 'Token invalidado exitosamente'
        });

    } catch (error) {
        console.error('Error al invalidar token:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// FACTURACIÓN ELECTRÓNICA (CAE)
// ============================================

/**
 * POST /api/afip/cae/solicitar/:invoiceId
 * Solicitar CAE para una factura
 */
router.post('/cae/solicitar/:invoiceId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { invoiceId } = req.params;

        const caeData = await AfipBillingService.solicitarCAE(companyId, parseInt(invoiceId));

        res.json({
            success: true,
            message: 'CAE obtenido exitosamente',
            data: caeData
        });

    } catch (error) {
        console.error('Error al solicitar CAE:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            details: error.stack
        });
    }
});

/**
 * GET /api/afip/cae/consultar
 * Consultar estado de CAE en AFIP
 */
router.get('/cae/consultar', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { puntoVenta, tipoComprobante, numeroComprobante } = req.query;

        if (!puntoVenta || !tipoComprobante || !numeroComprobante) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren puntoVenta, tipoComprobante y numeroComprobante'
            });
        }

        const result = await AfipBillingService.consultarCAE(
            companyId,
            parseInt(puntoVenta),
            parseInt(tipoComprobante),
            parseInt(numeroComprobante)
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error al consultar CAE:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/afip/cae/log
 * Obtener log de CAEs
 */
router.get('/cae/log', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { limit = 50, offset = 0 } = req.query;

        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            process.env.POSTGRES_DB || 'attendance_system',
            process.env.POSTGRES_USER || 'postgres',
            process.env.POSTGRES_PASSWORD,
            {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                dialect: 'postgres',
                logging: false
            }
        );

        const logs = await sequelize.query(
            `SELECT
                acl.id,
                acl.factura_id,
                acl.punto_venta,
                acl.tipo_comprobante,
                acl.numero_comprobante,
                acl.cae,
                acl.cae_vencimiento,
                acl.resultado,
                acl.fecha_proceso,
                acl.observaciones,
                acl.created_at,
                sf.invoice_number,
                sf.cliente_razon_social,
                sf.total
             FROM afip_cae_log acl
             LEFT JOIN siac_facturas sf ON acl.factura_id = sf.id
             WHERE acl.company_id = :companyId
             ORDER BY acl.created_at DESC
             LIMIT :limit OFFSET :offset`,
            {
                replacements: {
                    companyId,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            data: logs,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('Error al obtener log de CAE:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// CONFIGURACIÓN FISCAL
// ============================================

/**
 * GET /api/afip/config
 * Obtener configuración fiscal de empresa
 */
router.get('/config', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            process.env.POSTGRES_DB || 'attendance_system',
            process.env.POSTGRES_USER || 'postgres',
            process.env.POSTGRES_PASSWORD,
            {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                dialect: 'postgres',
                logging: false
            }
        );

        const [config] = await sequelize.query(
            `SELECT * FROM get_company_fiscal_config(:companyId)`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró configuración fiscal para esta empresa'
            });
        }

        res.json({
            success: true,
            data: config
        });

    } catch (error) {
        console.error('Error al obtener configuración fiscal:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PUT /api/afip/config
 * Actualizar configuración fiscal de empresa
 */
router.put('/config', auth, requireRole(['admin']), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            cuit,
            razonSocial,
            condicionIva,
            inicioActividades,
            afipEnvironment
        } = req.body;

        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            process.env.POSTGRES_DB || 'attendance_system',
            process.env.POSTGRES_USER || 'postgres',
            process.env.POSTGRES_PASSWORD,
            {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                dialect: 'postgres',
                logging: false
            }
        );

        // Verificar si existe configuración
        const [existing] = await sequelize.query(
            `SELECT id FROM company_fiscal_config WHERE company_id = :companyId`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        if (existing) {
            // UPDATE
            await sequelize.query(
                `UPDATE company_fiscal_config
                 SET cuit = :cuit,
                     razon_social = :razonSocial,
                     condicion_iva = :condicionIva,
                     inicio_actividades = :inicioActividades,
                     afip_environment = :afipEnvironment,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE company_id = :companyId`,
                {
                    replacements: {
                        companyId,
                        cuit,
                        razonSocial,
                        condicionIva,
                        inicioActividades,
                        afipEnvironment: afipEnvironment || 'TESTING'
                    },
                    type: Sequelize.QueryTypes.UPDATE
                }
            );
        } else {
            // INSERT
            await sequelize.query(
                `INSERT INTO company_fiscal_config (
                    company_id, cuit, razon_social, condicion_iva,
                    inicio_actividades, afip_environment
                 ) VALUES (
                    :companyId, :cuit, :razonSocial, :condicionIva,
                    :inicioActividades, :afipEnvironment
                 )`,
                {
                    replacements: {
                        companyId,
                        cuit,
                        razonSocial,
                        condicionIva,
                        inicioActividades,
                        afipEnvironment: afipEnvironment || 'TESTING'
                    },
                    type: Sequelize.QueryTypes.INSERT
                }
            );
        }

        res.json({
            success: true,
            message: 'Configuración fiscal actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar configuración fiscal:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// PUNTOS DE VENTA (BRANCH OFFICES)
// ============================================

/**
 * GET /api/afip/puntos-venta
 * Listar puntos de venta de empresa
 */
router.get('/puntos-venta', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            process.env.POSTGRES_DB || 'attendance_system',
            process.env.POSTGRES_USER || 'postgres',
            process.env.POSTGRES_PASSWORD,
            {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                dialect: 'postgres',
                logging: false
            }
        );

        const puntosVenta = await sequelize.query(
            `SELECT
                id,
                nombre,
                codigo,
                punto_venta,
                punto_venta_descripcion,
                domicilio_fiscal,
                codigo_postal,
                localidad,
                provincia,
                pais,
                comprobantes_habilitados,
                is_active
             FROM branch_offices_fiscal
             WHERE company_id = :companyId
             ORDER BY punto_venta ASC`,
            {
                replacements: { companyId },
                type: Sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            success: true,
            data: puntosVenta
        });

    } catch (error) {
        console.error('Error al listar puntos de venta:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * POST /api/afip/puntos-venta
 * Crear punto de venta
 */
router.post('/puntos-venta', auth, requireRole(['admin']), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            nombre,
            codigo,
            puntoVenta,
            puntoVentaDescripcion,
            domicilioFiscal,
            codigoPostal,
            localidad,
            provincia,
            pais,
            comprobantesHabilitados
        } = req.body;

        if (!nombre || !puntoVenta || !domicilioFiscal) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren nombre, puntoVenta y domicilioFiscal'
            });
        }

        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize(
            process.env.POSTGRES_DB || 'attendance_system',
            process.env.POSTGRES_USER || 'postgres',
            process.env.POSTGRES_PASSWORD,
            {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: process.env.POSTGRES_PORT || 5432,
                dialect: 'postgres',
                logging: false
            }
        );

        await sequelize.query(
            `INSERT INTO branch_offices_fiscal (
                company_id, nombre, codigo, punto_venta,
                punto_venta_descripcion, domicilio_fiscal,
                codigo_postal, localidad, provincia, pais,
                comprobantes_habilitados
             ) VALUES (
                :companyId, :nombre, :codigo, :puntoVenta,
                :puntoVentaDescripcion, :domicilioFiscal,
                :codigoPostal, :localidad, :provincia, :pais,
                :comprobantesHabilitados
             )`,
            {
                replacements: {
                    companyId,
                    nombre,
                    codigo,
                    puntoVenta: parseInt(puntoVenta),
                    puntoVentaDescripcion,
                    domicilioFiscal,
                    codigoPostal,
                    localidad,
                    provincia,
                    pais: pais || 'Argentina',
                    comprobantesHabilitados: JSON.stringify(comprobantesHabilitados || [])
                },
                type: Sequelize.QueryTypes.INSERT
            }
        );

        res.json({
            success: true,
            message: 'Punto de venta creado exitosamente'
        });

    } catch (error) {
        console.error('Error al crear punto de venta:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
