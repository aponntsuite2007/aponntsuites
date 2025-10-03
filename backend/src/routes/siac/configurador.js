const express = require('express');
const router = express.Router();
const ConfiguracionEmpresa = require('../../models/siac/ConfiguracionEmpresa');
const { auth } = require('../../middleware/auth');

/**
 * CONFIGURADOR SIAC - APIs para Panel Administrativo
 * Replica la funcionalidad del módulo Configurador.pas
 */

// ===============================================
// OBTENER CONFIGURACIÓN DE UNA EMPRESA
// ===============================================
router.get('/empresa/:companyId', auth, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Verificar que el usuario tenga acceso al panel administrativo
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo administradores pueden configurar empresas.'
            });
        }

        let configuracion = await ConfiguracionEmpresa.findOne({
            where: { companyId: parseInt(companyId) }
        });

        // Si no existe configuración, crear una por defecto
        if (!configuracion) {
            configuracion = await ConfiguracionEmpresa.create({
                ...ConfiguracionEmpresa.getDefault(parseInt(companyId)),
                createdBy: req.user.user_id
            });
        }

        res.json({
            success: true,
            data: configuracion
        });

    } catch (error) {
        console.error('Error obteniendo configuración SIAC:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// ACTUALIZAR CONFIGURACIÓN DE EMPRESA
// ===============================================
router.put('/empresa/:companyId', auth, async (req, res) => {
    try {
        const { companyId } = req.params;
        const datosActualizacion = req.body;

        // Verificar permisos de administrador
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo administradores pueden modificar configuraciones.'
            });
        }

        // Buscar configuración existente
        let configuracion = await ConfiguracionEmpresa.findOne({
            where: { companyId: parseInt(companyId) }
        });

        if (!configuracion) {
            // Crear nueva configuración
            configuracion = await ConfiguracionEmpresa.create({
                ...ConfiguracionEmpresa.getDefault(parseInt(companyId)),
                ...datosActualizacion,
                companyId: parseInt(companyId),
                createdBy: req.user.user_id
            });
        } else {
            // Actualizar configuración existente
            await configuracion.update({
                ...datosActualizacion,
                updatedBy: req.user.user_id
            });
        }

        res.json({
            success: true,
            data: configuracion,
            message: 'Configuración actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando configuración SIAC:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// OBTENER PRÓXIMO NÚMERO DE COMPROBANTE
// ===============================================
router.get('/empresa/:companyId/proximo-numero/:tipo', auth, async (req, res) => {
    try {
        const { companyId, tipo } = req.params;

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { companyId: parseInt(companyId) }
        });

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                error: 'Configuración no encontrada'
            });
        }

        const proximoNumero = configuracion.getProximoNumero(tipo);

        res.json({
            success: true,
            data: {
                tipo,
                proximoNumero
            }
        });

    } catch (error) {
        console.error('Error obteniendo próximo número:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// INCREMENTAR NÚMERO DE COMPROBANTE
// ===============================================
router.post('/empresa/:companyId/incrementar-numero/:tipo', auth, async (req, res) => {
    try {
        const { companyId, tipo } = req.params;

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { companyId: parseInt(companyId) }
        });

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                error: 'Configuración no encontrada'
            });
        }

        const nuevoNumero = await configuracion.incrementarNumero(tipo);

        res.json({
            success: true,
            data: {
                tipo,
                numeroAnterior: nuevoNumero - 1,
                numeroActual: nuevoNumero
            }
        });

    } catch (error) {
        console.error('Error incrementando número:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// OBTENER CONFIGURACIONES DE LOCALIZACIÓN
// ===============================================
router.get('/localizacion/paises', auth, async (req, res) => {
    try {
        // Por ahora devolvemos configuración estática
        // Más adelante se puede mover a base de datos
        const paises = [
            {
                codigo: 'ARG',
                nombre: 'Argentina',
                moneda: 'ARS',
                sistemaImpositivo: {
                    iva: { rates: [10.5, 21, 27], types: ['GENERAL', 'REDUCIDA', 'AUMENTADA'] },
                    iibb: { enabled: true },
                    ganancias: { enabled: true, rate: 35 }
                }
            },
            {
                codigo: 'URU',
                nombre: 'Uruguay',
                moneda: 'UYU',
                sistemaImpositivo: {
                    iva: { rates: [10, 22], types: ['MINIMA', 'BASICA'] },
                    irae: { enabled: true, rate: 25 }
                }
            },
            {
                codigo: 'BRA',
                nombre: 'Brasil',
                moneda: 'BRL',
                sistemaImpositivo: {
                    icms: { enabled: true },
                    ipi: { enabled: true },
                    pis_cofins: { enabled: true }
                }
            }
        ];

        res.json({
            success: true,
            data: paises
        });

    } catch (error) {
        console.error('Error obteniendo países:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// VALIDAR CONFIGURACIÓN
// ===============================================
router.post('/empresa/:companyId/validar', auth, async (req, res) => {
    try {
        const { companyId } = req.params;
        const configuracion = req.body;

        const errores = [];
        const advertencias = [];

        // Validaciones críticas
        if (!configuracion.razonSocial || configuracion.razonSocial.trim() === '') {
            errores.push('Razón social es obligatoria');
        }

        if (!configuracion.cuit || configuracion.cuit.trim() === '') {
            errores.push('CUIT es obligatorio');
        }

        if (configuracion.pais === 'ARG' && configuracion.cuit) {
            // Validar formato CUIT argentino
            const cuitLimpio = configuracion.cuit.replace(/[-\s]/g, '');
            if (cuitLimpio.length !== 11) {
                errores.push('CUIT debe tener 11 dígitos');
            }
        }

        // Validaciones de advertencia
        if (!configuracion.domicilio || configuracion.domicilio.trim() === '') {
            advertencias.push('Se recomienda completar el domicilio');
        }

        if (!configuracion.ingresosBrutos || configuracion.ingresosBrutos.trim() === '') {
            advertencias.push('Se recomienda completar el número de Ingresos Brutos');
        }

        // Validar fechas de licencia
        if (configuracion.licenciaInicio && configuracion.licenciaFin) {
            const inicio = new Date(configuracion.licenciaInicio);
            const fin = new Date(configuracion.licenciaFin);

            if (fin <= inicio) {
                errores.push('La fecha de fin de licencia debe ser posterior a la fecha de inicio');
            }
        }

        res.json({
            success: true,
            data: {
                valida: errores.length === 0,
                errores,
                advertencias
            }
        });

    } catch (error) {
        console.error('Error validando configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ===============================================
// RESETEAR CONFIGURACIÓN A VALORES POR DEFECTO
// ===============================================
router.post('/empresa/:companyId/resetear', auth, async (req, res) => {
    try {
        const { companyId } = req.params;

        // Solo super_admin puede resetear configuraciones
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo super administradores pueden resetear configuraciones'
            });
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { companyId: parseInt(companyId) }
        });

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                error: 'Configuración no encontrada'
            });
        }

        // Resetear a valores por defecto pero mantener datos de empresa
        const valoresPorDefecto = ConfiguracionEmpresa.getDefault(parseInt(companyId));

        await configuracion.update({
            ...valoresPorDefecto,
            // Mantener datos críticos de la empresa
            razonSocial: configuracion.razonSocial,
            cuit: configuracion.cuit,
            domicilio: configuracion.domicilio,
            updatedBy: req.user.user_id
        });

        res.json({
            success: true,
            data: configuracion,
            message: 'Configuración reseteada a valores por defecto'
        });

    } catch (error) {
        console.error('Error reseteando configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;