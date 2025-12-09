const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
    Cliente,
    ClienteContacto,
    ClienteDireccion,
    ClientePrecioEspecial,
    ModuloContratado
} = require('../../models/siac/ClienteFixed');
const { CompanyTaxConfig } = require('../../models/siac/TaxTemplate');

// Temporary simple auth for testing
const simpleAuth = (req, res, next) => {
    // Accept any request for now during development
    req.user = { role: 'admin', id: 'test-user', companyId: 1 };
    next();
};

/**
 * MÓDULO CLIENTES - APIs SIAC
 * Sistema modular escalable con detección automática de módulos
 */

// ===============================================
// OBTENER TODOS LOS CLIENTES CON PAGINACIÓN
// ===============================================
router.get('/', simpleAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search, activo } = req.query;
        const companyId = req.user.companyId;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClause = { companyId };

        // Filtro por estado activo/inactivo
        if (activo !== undefined) {
            whereClause.estado = activo === 'true' ? 'ACTIVO' : 'INACTIVO';
        }

        // Búsqueda por nombre, código o documento
        if (search) {
            whereClause = {
                ...whereClause,
                [Op.or]: [
                    { razonSocial: { [Op.iLike]: `%${search}%` } },
                    { nombreFantasia: { [Op.iLike]: `%${search}%` } },
                    { codigoCliente: { [Op.iLike]: `%${search}%` } },
                    { documentoNumero: { [Op.iLike]: `%${search}%` } }
                ]
            };
        }

        const { count, rows: clientes } = await Cliente.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: ClienteDireccion,
                    as: 'direcciones',
                    where: { esDireccionPrincipal: true },
                    required: false
                },
                {
                    model: ClienteContacto,
                    as: 'contactos',
                    where: { esContactoPrincipal: true },
                    required: false
                }
            ],
            limit: parseInt(limit),
            offset: offset,
            order: [['razonSocial', 'ASC']],
            distinct: true
        });

        // Detectar módulos contratados para personalizar respuesta
        const modulos = await ModuloContratado.findAll({
            where: { companyId, activo: true }
        });

        const modulosMap = {};
        modulos.forEach(mod => {
            modulosMap[mod.moduloCodigo] = mod.configuracion;
        });

        res.json({
            success: true,
            clientes: clientes.map(cliente => ({
                id: cliente.id,
                codigo: cliente.codigo,
                razonSocial: cliente.razonSocial,
                nombreFantasia: cliente.nombreFantasia,
                documento: cliente.documento,
                tipoDocumento: cliente.tipoDocumento,
                condicionIva: cliente.condicionIva,
                email: cliente.email,
                telefono: cliente.telefono,
                activo: cliente.activo,
                saldoCtaCte: cliente.saldoCtaCte,
                limiteCredito: cliente.limiteCredito,
                // Dirección principal
                direccion: cliente.direcciones?.[0] || null,
                // Contacto principal
                contacto: cliente.contactos?.[0] || null,
                // Indicadores de integración modular
                tieneProductos: modulosMap.productos ? true : false,
                tieneFacturacion: modulosMap.facturacion ? true : false,
                tieneCtaCte: modulosMap.cuenta_corriente ? true : false
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            },
            modulos: Object.keys(modulosMap)
        });

    } catch (error) {
        console.error('❌ Error obteniendo clientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER CLIENTE ESPECÍFICO CON DETALLE COMPLETO
// ===============================================
router.get('/:id', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        const cliente = await Cliente.obtenerCompleto(id, companyId);

        if (!cliente) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        res.json({
            success: true,
            cliente
        });

    } catch (error) {
        console.error('❌ Error obteniendo cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CREAR NUEVO CLIENTE CON VALIDACIÓN AUTOMÁTICA
// ===============================================
router.post('/', simpleAuth, async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const clienteData = req.body;

        // Obtener configuración fiscal de la empresa
        const taxConfig = await CompanyTaxConfig.getCompanyConfig(companyId);

        // Generar código automático si no se proporciona
        if (!clienteData.codigoCliente) {
            const ultimoCliente = await Cliente.findOne({
                where: { companyId },
                order: [['id', 'DESC']]
            });

            const siguienteNumero = (ultimoCliente && ultimoCliente.codigoCliente) ?
                parseInt(ultimoCliente.codigoCliente.replace(/\D/g, '')) + 1 : 1;

            clienteData.codigoCliente = `CLI${siguienteNumero.toString().padStart(6, '0')}`;
        }

        // Formatear documento según configuración fiscal
        if (clienteData.documentoNumero && taxConfig) {
            clienteData.documentoFormateado = Cliente.formatearDocumento(
                clienteData.documentoNumero,
                taxConfig.template
            );
        }

        // Crear cliente principal
        const nuevoCliente = await Cliente.create({
            companyId,
            ...clienteData,
            fechaAlta: new Date(),
            usuarioAlta: req.user.user_id
        });

        // Agregar direcciones si se proporcionan
        if (clienteData.direcciones && clienteData.direcciones.length > 0) {
            for (const direccion of clienteData.direcciones) {
                await ClienteDireccion.create({
                    clienteId: nuevoCliente.id,
                    ...direccion
                });
            }
        }

        // Agregar contactos si se proporcionan
        if (clienteData.contactos && clienteData.contactos.length > 0) {
            for (const contacto of clienteData.contactos) {
                await ClienteContacto.create({
                    clienteId: nuevoCliente.id,
                    ...contacto
                });
            }
        }

        // Obtener cliente completo con relaciones
        const clienteCompleto = await Cliente.obtenerCompleto(nuevoCliente.id, companyId);

        console.log(`✅ [CLIENTES] Cliente creado: ${clienteData.razonSocial} - Código: ${clienteData.codigo}`);

        res.status(201).json({
            success: true,
            cliente: clienteCompleto,
            message: `Cliente ${clienteData.razonSocial} creado exitosamente`
        });

    } catch (error) {
        console.error('❌ Error creando cliente:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path;
            let fieldName = 'campo';

            switch (field) {
                case 'codigo': fieldName = 'código'; break;
                case 'documento': fieldName = 'documento'; break;
                case 'email': fieldName = 'email'; break;
            }

            return res.status(400).json({
                success: false,
                error: `Ya existe un cliente con ese ${fieldName}`
            });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// ACTUALIZAR CLIENTE EXISTENTE
// ===============================================
router.put('/:id', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const clienteData = req.body;

        const cliente = await Cliente.findOne({
            where: { id, companyId }
        });

        if (!cliente) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        // Formatear documento si se actualiza
        if (clienteData.documento) {
            const taxConfig = await CompanyTaxConfig.getCompanyConfig(companyId);
            if (taxConfig) {
                clienteData.documento = Cliente.formatearDocumento(
                    clienteData.documento,
                    taxConfig.template
                );
            }
        }

        // Actualizar cliente
        await cliente.update({
            ...clienteData,
            fechaModificacion: new Date(),
            usuarioModificacion: req.user.user_id
        });

        // Actualizar direcciones si se proporcionan
        if (clienteData.direcciones) {
            // Eliminar direcciones existentes
            await ClienteDireccion.destroy({
                where: { clienteId: id }
            });

            // Agregar nuevas direcciones
            for (const direccion of clienteData.direcciones) {
                await ClienteDireccion.create({
                    clienteId: id,
                    ...direccion
                });
            }
        }

        // Actualizar contactos si se proporcionan
        if (clienteData.contactos) {
            // Eliminar contactos existentes
            await ClienteContacto.destroy({
                where: { clienteId: id }
            });

            // Agregar nuevos contactos
            for (const contacto of clienteData.contactos) {
                await ClienteContacto.create({
                    clienteId: id,
                    ...contacto
                });
            }
        }

        // Obtener cliente actualizado
        const clienteActualizado = await Cliente.obtenerCompleto(id, companyId);

        console.log(`✅ [CLIENTES] Cliente actualizado: ${cliente.razonSocial}`);

        res.json({
            success: true,
            cliente: clienteActualizado,
            message: 'Cliente actualizado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error actualizando cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// CAMBIAR ESTADO DE CLIENTE (ACTIVAR/DESACTIVAR)
// ===============================================
router.patch('/:id/estado', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        const companyId = req.user.companyId;

        const cliente = await Cliente.findOne({
            where: { id, companyId }
        });

        if (!cliente) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        await cliente.update({
            activo,
            fechaModificacion: new Date(),
            usuarioModificacion: req.user.user_id
        });

        console.log(`✅ [CLIENTES] Cliente ${activo ? 'activado' : 'desactivado'}: ${cliente.razonSocial}`);

        res.json({
            success: true,
            message: `Cliente ${activo ? 'activado' : 'desactivado'} exitosamente`
        });

    } catch (error) {
        console.error('❌ Error cambiando estado de cliente:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// BÚSQUEDA RÁPIDA DE CLIENTES (PARA AUTOCOMPLETADO)
// ===============================================
router.get('/search/:term', simpleAuth, async (req, res) => {
    try {
        const { term } = req.params;
        const companyId = req.user.companyId;

        if (term.length < 2) {
            return res.json({
                success: true,
                clientes: []
            });
        }

        const clientes = await Cliente.findAll({
            where: {
                companyId,
                activo: true,
                [Op.or]: [
                    { razonSocial: { [Op.iLike]: `%${term}%` } },
                    { nombreFantasia: { [Op.iLike]: `%${term}%` } },
                    { codigo: { [Op.iLike]: `%${term}%` } },
                    { documento: { [Op.iLike]: `%${term}%` } }
                ]
            },
            attributes: ['id', 'codigo', 'razonSocial', 'nombreFantasia', 'documento'],
            limit: 10,
            order: [['razonSocial', 'ASC']]
        });

        res.json({
            success: true,
            clientes: clientes.map(cliente => ({
                id: cliente.id,
                codigo: cliente.codigo,
                nombre: cliente.nombreFantasia || cliente.razonSocial,
                razonSocial: cliente.razonSocial,
                documento: cliente.documento
            }))
        });

    } catch (error) {
        console.error('❌ Error en búsqueda de clientes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER PRECIOS ESPECIALES DE UN CLIENTE
// ===============================================
router.get('/:id/precios', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;

        // Verificar que el módulo productos esté contratado
        const moduloProductos = await Cliente.moduloContratado(companyId, 'productos');
        if (!moduloProductos) {
            return res.status(400).json({
                success: false,
                error: 'Módulo de productos no contratado',
                needsModule: 'productos'
            });
        }

        const preciosEspeciales = await ClientePrecioEspecial.findAll({
            where: { clienteId: id },
            order: [['fechaVigencia', 'DESC']]
        });

        res.json({
            success: true,
            precios: preciosEspeciales
        });

    } catch (error) {
        console.error('❌ Error obteniendo precios especiales:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// AGREGAR PRECIO ESPECIAL PARA CLIENTE
// ===============================================
router.post('/:id/precios', simpleAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.companyId;
        const precioData = req.body;

        // Verificar que el módulo productos esté contratado
        const moduloProductos = await Cliente.moduloContratado(companyId, 'productos');
        if (!moduloProductos) {
            return res.status(400).json({
                success: false,
                error: 'Módulo de productos no contratado',
                needsModule: 'productos'
            });
        }

        const nuevoPrecio = await ClientePrecioEspecial.create({
            clienteId: id,
            ...precioData,
            usuarioCreacion: req.user.user_id
        });

        console.log(`✅ [CLIENTES] Precio especial agregado para cliente ${id}`);

        res.status(201).json({
            success: true,
            precio: nuevoPrecio,
            message: 'Precio especial agregado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error agregando precio especial:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================================
// OBTENER ESTADÍSTICAS DE CLIENTES
// ===============================================
router.get('/stats/dashboard', simpleAuth, async (req, res) => {
    try {
        const companyId = req.user.companyId;

        const stats = await Cliente.obtenerEstadisticas(companyId);

        res.json({
            success: true,
            estadisticas: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;