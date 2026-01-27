/**
 * Rutas API para el módulo FACTURACIÓN
 * Integración inteligente con módulos Clientes y Productos
 * Triple aislación: EMPRESA → PUNTO_VENTA → CAJA
 */

const express = require('express');
const router = express.Router();
const { Op, fn, col, literal } = require('sequelize');

// Importar modelos
const {
    PuntoVenta,
    Caja,
    TipoComprobante,
    Factura,
    FacturaItem,
    FacturaImpuesto,
    FacturaPago,
    sequelize,
    moduloContratado
} = require('../../models/siac/FacturacionModels');

// Importar modelos de otros módulos si están disponibles
let Cliente, Producto;
try {
    const clienteModels = require('../../models/siac/ClienteFixed');
    Cliente = clienteModels.Cliente;
} catch (error) {
    console.log('Módulo clientes no disponible:', error.message);
}

// Middleware para verificar módulo facturación
const verificarModuloFacturacion = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId || req.body.companyId || req.query.companyId || 1;
        const activo = await moduloContratado(companyId, 'facturacion');

        if (!activo) {
            return res.status(403).json({
                success: false,
                error: 'Módulo de Facturación no está contratado',
                codigo: 'MODULO_NO_CONTRATADO'
            });
        }

        req.companyId = companyId;
        next();
    } catch (error) {
        console.error('Error verificando módulo facturación:', error);
        res.status(500).json({
            success: false,
            error: 'Error verificando permisos del módulo',
            details: error.message
        });
    }
};

// =====================================
// RUTAS PARA PUNTOS DE VENTA
// =====================================

// GET /api/siac/facturacion/puntos-venta - Listar puntos de venta
router.get('/puntos-venta', verificarModuloFacturacion, async (req, res) => {
    try {
        const { activo = 'true', limit = 50, offset = 0 } = req.query;

        const whereClause = {
            companyId: req.companyId
        };

        if (activo !== 'all') {
            whereClause.activo = activo === 'true';
        }

        const puntosVenta = await PuntoVenta.findAndCountAll({
            where: whereClause,
            include: [{
                model: Caja,
                as: 'cajas',
                where: { activo: true },
                required: false
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['nombrePuntoVenta', 'ASC']]
        });

        res.json({
            success: true,
            data: puntosVenta.rows,
            pagination: {
                total: puntosVenta.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(puntosVenta.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error obteniendo puntos de venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo puntos de venta',
            details: error.message
        });
    }
});

// POST /api/siac/facturacion/puntos-venta - Crear punto de venta
router.post('/puntos-venta', verificarModuloFacturacion, async (req, res) => {
    try {
        const puntoVentaData = {
            ...req.body,
            companyId: req.companyId,
            createdBy: req.user?.id || 1
        };

        const puntoVenta = await PuntoVenta.create(puntoVentaData);

        res.status(201).json({
            success: true,
            data: puntoVenta,
            message: 'Punto de venta creado exitosamente'
        });
    } catch (error) {
        console.error('Error creando punto de venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando punto de venta',
            details: error.message
        });
    }
});

// =====================================
// RUTAS PARA CAJAS
// =====================================

// GET /api/siac/facturacion/cajas - Listar cajas
router.get('/cajas', verificarModuloFacturacion, async (req, res) => {
    try {
        const { puntoVentaId, activo = 'true', limit = 50, offset = 0 } = req.query;

        const whereClause = {};

        if (activo !== 'all') {
            whereClause.activo = activo === 'true';
        }

        if (puntoVentaId) {
            whereClause.puntoVentaId = puntoVentaId;
        }

        const cajas = await Caja.findAndCountAll({
            where: whereClause,
            include: [{
                model: PuntoVenta,
                as: 'puntoVenta',
                where: { companyId: req.companyId }
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['nombreCaja', 'ASC']]
        });

        res.json({
            success: true,
            data: cajas.rows,
            pagination: {
                total: cajas.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(cajas.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error obteniendo cajas:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo cajas',
            details: error.message
        });
    }
});

// POST /api/siac/facturacion/cajas - Crear caja
router.post('/cajas', verificarModuloFacturacion, async (req, res) => {
    try {
        const cajaData = {
            ...req.body,
            createdBy: req.user?.id || 1
        };

        const caja = await Caja.create(cajaData);

        res.status(201).json({
            success: true,
            data: caja,
            message: 'Caja creada exitosamente'
        });
    } catch (error) {
        console.error('Error creando caja:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando caja',
            details: error.message
        });
    }
});

// =====================================
// RUTAS PARA TIPOS DE COMPROBANTES
// =====================================

// GET /api/siac/facturacion/tipos-comprobantes - Listar tipos
router.get('/tipos-comprobantes', verificarModuloFacturacion, async (req, res) => {
    try {
        const { activo = 'true' } = req.query;

        const whereClause = {
            companyId: req.companyId
        };

        if (activo !== 'all') {
            whereClause.activo = activo === 'true';
        }

        const tipos = await TipoComprobante.findAll({
            where: whereClause,
            order: [['nombreTipo', 'ASC']]
        });

        res.json({
            success: true,
            data: tipos
        });
    } catch (error) {
        console.error('Error obteniendo tipos de comprobantes:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo tipos de comprobantes',
            details: error.message
        });
    }
});

// =====================================
// RUTAS PARA FACTURAS
// =====================================

// GET /api/siac/facturacion/facturas - Listar facturas
router.get('/facturas', verificarModuloFacturacion, async (req, res) => {
    try {
        const {
            fechaDesde,
            fechaHasta,
            estado,
            cajaId,
            clienteId,
            limit = 50,
            offset = 0
        } = req.query;

        const whereClause = {};

        // Filtros de fecha
        if (fechaDesde || fechaHasta) {
            whereClause.fechaFactura = {};
            if (fechaDesde) whereClause.fechaFactura[Op.gte] = fechaDesde;
            if (fechaHasta) whereClause.fechaFactura[Op.lte] = fechaHasta;
        }

        // Filtros adicionales
        if (estado) whereClause.estado = estado;
        if (cajaId) whereClause.cajaId = cajaId;
        if (clienteId) whereClause.clienteId = clienteId;

        // Incluir datos relacionados
        const includeOptions = [
            {
                model: Caja,
                as: 'caja',
                include: [{
                    model: PuntoVenta,
                    as: 'puntoVenta',
                    where: { companyId: req.companyId }
                }]
            },
            {
                model: TipoComprobante,
                as: 'tipoComprobante'
            },
            {
                model: FacturaItem,
                as: 'items',
                required: false
            },
            {
                model: FacturaPago,
                as: 'pagos',
                required: false
            }
        ];

        const facturas = await Factura.findAndCountAll({
            where: whereClause,
            include: includeOptions,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['fechaFactura', 'DESC'], ['numeroCompleto', 'DESC']]
        });

        res.json({
            success: true,
            data: facturas.rows,
            pagination: {
                total: facturas.count,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(facturas.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error obteniendo facturas:', error);

        // Si la tabla no existe o hay error de BD, devolver array vacío con mensaje
        if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.name === 'SequelizeDatabaseError') {
            return res.json({
                success: true,
                data: [],
                facturas: [],
                pagination: {
                    total: 0,
                    limit: parseInt(req.query.limit) || 50,
                    offset: parseInt(req.query.offset) || 0,
                    pages: 0
                },
                message: 'Módulo de facturación no configurado. Ejecute las migraciones SIAC.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error obteniendo facturas',
            details: error.message
        });
    }
});

// GET /api/siac/facturacion/facturas/:id - Obtener factura específica
router.get('/facturas/:id', verificarModuloFacturacion, async (req, res) => {
    try {
        const factura = await Factura.obtenerCompleta(req.params.id, req.companyId);

        if (!factura) {
            return res.status(404).json({
                success: false,
                error: 'Factura no encontrada'
            });
        }

        res.json({
            success: true,
            data: factura
        });
    } catch (error) {
        console.error('Error obteniendo factura:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo factura',
            details: error.message
        });
    }
});

// POST /api/siac/facturacion/facturas - Crear factura
router.post('/facturas', verificarModuloFacturacion, async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            cajaId,
            tipoComprobanteId,
            clienteData,
            items = [],
            pagos = [],
            observaciones,
            descuentoPorcentaje = 0,
            descuentoImporte = 0
        } = req.body;

        // Verificar configuración de módulos
        const config = await Factura.obtenerConfiguracion(req.companyId);

        // Obtener próximo número de factura
        const proximoNumero = await Factura.obtenerProximoNumero(cajaId, tipoComprobanteId);

        // Obtener información de la caja y punto de venta
        const caja = await Caja.findOne({
            where: { id: cajaId },
            include: [{
                model: PuntoVenta,
                as: 'puntoVenta',
                where: { companyId: req.companyId }
            }]
        });

        if (!caja) {
            throw new Error('Caja no encontrada o no pertenece a la empresa');
        }

        // Preparar datos del cliente
        let facturaCliente = { ...clienteData };

        // Si módulo clientes está activo y se proporciona clienteId, obtener datos completos
        if (config.clientesActivo && clienteData.clienteId && Cliente) {
            const cliente = await Cliente.findByPk(clienteData.clienteId);
            if (cliente) {
                facturaCliente = {
                    clienteId: cliente.id,
                    clienteCodigo: cliente.codigoCliente,
                    clienteRazonSocial: cliente.razonSocial,
                    clienteDocumentoTipo: cliente.documentoTipo,
                    clienteDocumentoNumero: cliente.documentoNumero,
                    clienteDireccion: cliente.direccionFacturacion || cliente.direccion,
                    clienteTelefono: cliente.telefono,
                    clienteEmail: cliente.email,
                    clienteCondicionIva: cliente.condicionIva || 'CONSUMIDOR_FINAL'
                };
            }
        }

        // Crear factura principal
        const factura = await Factura.create({
            cajaId,
            tipoComprobanteId,
            numero: proximoNumero,
            numeroCompleto: `${String(proximoNumero).padStart(8, '0')}`, // Se formatea en el trigger
            ...facturaCliente,
            descuentoPorcentaje,
            descuentoImporte,
            observaciones,
            estado: 'PENDIENTE',
            createdBy: req.user?.id || 1
        }, { transaction });

        // Crear items de la factura
        let numeroItem = 1;
        for (const item of items) {
            let facturaItem = { ...item };

            // Si módulo productos está activo y se proporciona productoId, obtener datos completos
            if (config.productosActivo && item.productoId && Producto) {
                const producto = await Producto.findByPk(item.productoId);
                if (producto) {
                    facturaItem.productoDescripcion = producto.nombreProducto;
                    facturaItem.categoriaProducto = producto.categoria;
                    facturaItem.marcaProducto = producto.marca;
                    facturaItem.codigoBarras = producto.codigoBarras;

                    // Si no se especifica precio, usar el del producto
                    if (!facturaItem.precioUnitario) {
                        facturaItem.precioUnitario = producto.precioVenta;
                    }
                }
            }

            // Calcular subtotales
            const cantidad = parseFloat(facturaItem.cantidad) || 1;
            const precioUnitario = parseFloat(facturaItem.precioUnitario) || 0;
            const subtotal = cantidad * precioUnitario;
            const descuentoItem = parseFloat(facturaItem.descuentoImporte) || 0;
            const subtotalConDescuento = subtotal - descuentoItem;
            const alicuotaIva = parseFloat(facturaItem.alicuotaIva) || 21.0;
            const importeIva = (subtotalConDescuento * alicuotaIva) / 100;
            const totalItem = subtotalConDescuento + importeIva;

            await FacturaItem.create({
                facturaId: factura.id,
                numeroItem: numeroItem++,
                ...facturaItem,
                subtotal,
                subtotalConDescuento,
                importeIva,
                totalItem
            }, { transaction });
        }

        // Crear pagos
        for (const pago of pagos) {
            await FacturaPago.create({
                facturaId: factura.id,
                ...pago
            }, { transaction });
        }

        // Calcular totales automáticamente (trigger lo hará)
        await sequelize.query(
            'SELECT siac_calcular_totales_factura(?)',
            {
                replacements: [factura.id],
                type: sequelize.QueryTypes.SELECT,
                transaction
            }
        );

        await transaction.commit();

        // Obtener factura completa para respuesta
        const facturaCompleta = await Factura.obtenerCompleta(factura.id, req.companyId);

        res.status(201).json({
            success: true,
            data: facturaCompleta,
            message: 'Factura creada exitosamente'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creando factura:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando factura',
            details: error.message
        });
    }
});

// PUT /api/siac/facturacion/facturas/:id/anular - Anular factura
router.put('/facturas/:id/anular', verificarModuloFacturacion, async (req, res) => {
    try {
        const { motivo } = req.body;

        const factura = await Factura.findOne({
            where: {
                id: req.params.id
            },
            include: [{
                model: Caja,
                as: 'caja',
                include: [{
                    model: PuntoVenta,
                    as: 'puntoVenta',
                    where: { companyId: req.companyId }
                }]
            }]
        });

        if (!factura) {
            return res.status(404).json({
                success: false,
                error: 'Factura no encontrada'
            });
        }

        if (factura.estado === 'ANULADA') {
            return res.status(400).json({
                success: false,
                error: 'La factura ya está anulada'
            });
        }

        await factura.update({
            estado: 'ANULADA',
            motivoAnulacion: motivo,
            autorizadaPor: req.user?.id || 1,
            updatedBy: req.user?.id || 1
        });

        res.json({
            success: true,
            data: factura,
            message: 'Factura anulada exitosamente'
        });
    } catch (error) {
        console.error('Error anulando factura:', error);
        res.status(500).json({
            success: false,
            error: 'Error anulando factura',
            details: error.message
        });
    }
});

// =====================================
// RUTAS DE BÚSQUEDA Y CONSULTAS
// =====================================

// GET /api/siac/facturacion/buscar-cliente/:term - Búsqueda de clientes
router.get('/buscar-cliente/:term', verificarModuloFacturacion, async (req, res) => {
    try {
        const config = await Factura.obtenerConfiguracion(req.companyId);

        if (!config.clientesActivo || !Cliente) {
            return res.json({
                success: true,
                data: [],
                message: 'Módulo clientes no está activo - ingreso manual de datos'
            });
        }

        const term = req.params.term;
        const clientes = await Cliente.findAll({
            where: {
                companyId: req.companyId,
                [Op.or]: [
                    { codigoCliente: { [Op.iLike]: `%${term}%` } },
                    { razonSocial: { [Op.iLike]: `%${term}%` } },
                    { documentoNumero: { [Op.iLike]: `%${term}%` } }
                ]
            },
            limit: 10
        });

        res.json({
            success: true,
            data: clientes
        });
    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando clientes',
            details: error.message
        });
    }
});

// GET /api/siac/facturacion/buscar-producto/:term - Búsqueda de productos
router.get('/buscar-producto/:term', verificarModuloFacturacion, async (req, res) => {
    try {
        const config = await Factura.obtenerConfiguracion(req.companyId);

        if (!config.productosActivo || !Producto) {
            return res.json({
                success: true,
                data: [],
                message: 'Módulo productos no está activo - ingreso manual de datos'
            });
        }

        const term = req.params.term;

        // Buscar en base de productos (usar SQL directo por simplicidad)
        const productos = await sequelize.query(`
            SELECT id, codigo_producto, nombre_producto, precio_venta, stock_actual, unidad_medida
            FROM siac_productos
            WHERE company_id = :companyId
              AND activo = true
              AND (codigo_producto ILIKE :term OR nombre_producto ILIKE :term)
            LIMIT 10
        `, {
            replacements: { companyId: req.companyId, term: `%${term}%` },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: productos
        });
    } catch (error) {
        console.error('Error buscando productos:', error);
        res.status(500).json({
            success: false,
            error: 'Error buscando productos',
            details: error.message
        });
    }
});

// GET /api/siac/facturacion/configuracion - Obtener configuración del módulo
router.get('/configuracion', verificarModuloFacturacion, async (req, res) => {
    try {
        const config = await Factura.obtenerConfiguracion(req.companyId);

        res.json({
            success: true,
            data: {
                ...config,
                facturacionActivo: true,
                mensaje: 'Configuración del módulo de facturación',
                integraciones: {
                    clientes: config.clientesActivo ? 'Integración automática activa' : 'Ingreso manual de datos',
                    productos: config.productosActivo ? 'Integración automática activa' : 'Ingreso manual de datos',
                    cuentaCorriente: config.cuentaCorrienteActivo ? 'Genera cuenta corriente automáticamente' : 'Solo contado',
                    inventario: config.inventarioActivo ? 'Actualiza stock automáticamente' : 'No afecta inventario'
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo configuración',
            details: error.message
        });
    }
});

module.exports = router;