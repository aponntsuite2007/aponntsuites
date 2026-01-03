/**
 * Logistics Routes - API REST Completa
 * WMS + TMS integrado
 */

const express = require('express');
const router = express.Router();
const { WarehouseService, PickingService, RouteService, ShipmentService } = require('../services/logistics');

// Middleware de autenticación (debe estar configurado globalmente)
// const { authenticateToken } = require('../middleware/auth');

// Helper para manejar errores
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================================
// WAREHOUSES (Almacenes)
// ============================================================================

/**
 * GET /api/logistics/warehouses
 * Listar almacenes de la empresa
 */
router.get('/warehouses', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const warehouses = await WarehouseService.getWarehouses(companyId, req.query);
    res.json({ success: true, data: warehouses });
}));

/**
 * GET /api/logistics/warehouses/:id
 * Obtener almacén por ID
 */
router.get('/warehouses/:id', asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.getWarehouseById(req.params.id);
    if (!warehouse) {
        return res.status(404).json({ success: false, error: 'Almacén no encontrado' });
    }
    res.json({ success: true, data: warehouse });
}));

/**
 * POST /api/logistics/warehouses
 * Crear almacén
 */
router.post('/warehouses', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const warehouse = await WarehouseService.createWarehouse(data);
    res.status(201).json({ success: true, data: warehouse });
}));

/**
 * PUT /api/logistics/warehouses/:id
 * Actualizar almacén
 */
router.put('/warehouses/:id', asyncHandler(async (req, res) => {
    const warehouse = await WarehouseService.updateWarehouse(req.params.id, req.body);
    res.json({ success: true, data: warehouse });
}));

/**
 * PUT /api/logistics/warehouses/:id/config
 * Actualizar configuración del almacén
 */
router.put('/warehouses/:id/config', asyncHandler(async (req, res) => {
    const config = await WarehouseService.updateWarehouseConfig(req.params.id, req.body);
    res.json({ success: true, data: config });
}));

/**
 * GET /api/logistics/warehouses/:id/kpis
 * KPIs del almacén
 */
router.get('/warehouses/:id/kpis', asyncHandler(async (req, res) => {
    const kpis = await WarehouseService.getWarehouseKPIs(req.params.id);
    res.json({ success: true, data: kpis });
}));

// ============================================================================
// LOCATIONS (Ubicaciones)
// ============================================================================

/**
 * GET /api/logistics/warehouses/:warehouseId/locations
 * Listar ubicaciones del almacén
 */
router.get('/warehouses/:warehouseId/locations', asyncHandler(async (req, res) => {
    const locations = await WarehouseService.getLocations(req.params.warehouseId, req.query);
    res.json({ success: true, data: locations });
}));

/**
 * GET /api/logistics/locations/:id
 * Obtener ubicación por ID
 */
router.get('/locations/:id', asyncHandler(async (req, res) => {
    const location = await WarehouseService.getLocationById(req.params.id);
    if (!location) {
        return res.status(404).json({ success: false, error: 'Ubicación no encontrada' });
    }
    res.json({ success: true, data: location });
}));

/**
 * POST /api/logistics/locations
 * Crear ubicación
 */
router.post('/locations', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        created_by: req.user?.id
    };
    const location = await WarehouseService.createLocation(data);
    res.status(201).json({ success: true, data: location });
}));

/**
 * POST /api/logistics/warehouses/:warehouseId/locations/bulk
 * Crear ubicaciones masivamente
 */
router.post('/warehouses/:warehouseId/locations/bulk', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.body.company_id;
    const result = await WarehouseService.createLocationsBulk(
        req.params.warehouseId,
        companyId,
        req.body
    );
    res.status(201).json({ success: true, data: result });
}));

/**
 * GET /api/logistics/location-types
 * Tipos de ubicación
 */
router.get('/location-types', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const types = await WarehouseService.getLocationTypes(companyId);
    res.json({ success: true, data: types });
}));

/**
 * POST /api/logistics/location-types
 * Crear tipo de ubicación
 */
router.post('/location-types', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id
    };
    const type = await WarehouseService.createLocationType(data);
    res.status(201).json({ success: true, data: type });
}));

// ============================================================================
// STOCK (Inventario)
// ============================================================================

/**
 * GET /api/logistics/warehouses/:warehouseId/stock
 * Stock por almacén
 */
router.get('/warehouses/:warehouseId/stock', asyncHandler(async (req, res) => {
    const stock = await WarehouseService.getStock(req.params.warehouseId, req.query);
    res.json({ success: true, data: stock });
}));

/**
 * GET /api/logistics/stock/product/:productId
 * Stock de producto en todos los almacenes
 */
router.get('/stock/product/:productId', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const stock = await WarehouseService.getProductStock(companyId, req.params.productId);
    res.json({ success: true, data: stock });
}));

/**
 * POST /api/logistics/stock/adjust
 * Ajuste de inventario
 */
router.post('/stock/adjust', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        user_id: req.user?.id
    };
    const result = await WarehouseService.adjustStock(data);
    res.json({ success: true, data: result });
}));

/**
 * POST /api/logistics/stock/transfer
 * Transferencia entre ubicaciones
 */
router.post('/stock/transfer', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        user_id: req.user?.id
    };
    const result = await WarehouseService.transferStock(data);
    res.json({ success: true, data: result });
}));

/**
 * GET /api/logistics/warehouses/:warehouseId/movements
 * Historial de movimientos
 */
router.get('/warehouses/:warehouseId/movements', asyncHandler(async (req, res) => {
    const movements = await WarehouseService.getMovements(req.params.warehouseId, req.query);
    res.json({ success: true, data: movements });
}));

// ============================================================================
// WAVES (Olas de Picking)
// ============================================================================

/**
 * GET /api/logistics/warehouses/:warehouseId/waves
 * Listar olas de picking
 */
router.get('/warehouses/:warehouseId/waves', asyncHandler(async (req, res) => {
    const waves = await PickingService.getWaves(req.params.warehouseId, req.query);
    res.json({ success: true, data: waves });
}));

/**
 * GET /api/logistics/waves/:id
 * Obtener ola por ID
 */
router.get('/waves/:id', asyncHandler(async (req, res) => {
    const wave = await PickingService.getWaveById(req.params.id);
    if (!wave) {
        return res.status(404).json({ success: false, error: 'Ola no encontrada' });
    }
    res.json({ success: true, data: wave });
}));

/**
 * POST /api/logistics/waves
 * Crear ola de picking
 */
router.post('/waves', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const wave = await PickingService.createWave(data);
    res.status(201).json({ success: true, data: wave });
}));

/**
 * POST /api/logistics/waves/generate
 * Generar ola desde pedidos
 */
router.post('/waves/generate', asyncHandler(async (req, res) => {
    const { warehouse_id, order_ids, ...options } = req.body;
    const companyId = req.user?.company_id || req.body.company_id;
    options.created_by = req.user?.id;

    const wave = await PickingService.generateWaveFromOrders(
        warehouse_id, companyId, order_ids, options
    );
    res.status(201).json({ success: true, data: wave });
}));

/**
 * POST /api/logistics/waves/:id/start
 * Iniciar ola
 */
router.post('/waves/:id/start', asyncHandler(async (req, res) => {
    const wave = await PickingService.startWave(req.params.id, req.body.picker_assignments);
    res.json({ success: true, data: wave });
}));

/**
 * POST /api/logistics/waves/:id/complete
 * Completar ola
 */
router.post('/waves/:id/complete', asyncHandler(async (req, res) => {
    const wave = await PickingService.completeWave(req.params.id);
    res.json({ success: true, data: wave });
}));

// ============================================================================
// PICK LISTS
// ============================================================================

/**
 * GET /api/logistics/warehouses/:warehouseId/pick-lists
 * Listar pick lists
 */
router.get('/warehouses/:warehouseId/pick-lists', asyncHandler(async (req, res) => {
    const pickLists = await PickingService.getPickLists(req.params.warehouseId, req.query);
    res.json({ success: true, data: pickLists });
}));

/**
 * GET /api/logistics/pick-lists/:id
 * Obtener pick list por ID
 */
router.get('/pick-lists/:id', asyncHandler(async (req, res) => {
    const pickList = await PickingService.getPickListById(req.params.id);
    if (!pickList) {
        return res.status(404).json({ success: false, error: 'Pick list no encontrada' });
    }
    res.json({ success: true, data: pickList });
}));

/**
 * POST /api/logistics/pick-list-lines/:lineId/confirm
 * Confirmar línea de picking (para escáner móvil)
 */
router.post('/pick-list-lines/:lineId/confirm', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        picker_id: req.user?.id
    };
    const result = await PickingService.confirmPickLine(req.params.lineId, data);
    res.json({ success: true, data: result });
}));

/**
 * GET /api/logistics/picking/kpis
 * KPIs de picking
 */
router.get('/picking/kpis', asyncHandler(async (req, res) => {
    const { warehouse_id, date_from, date_to } = req.query;
    const kpis = await PickingService.getPickingKPIs(warehouse_id, {
        dateFrom: date_from,
        dateTo: date_to
    });
    res.json({ success: true, data: kpis });
}));

// ============================================================================
// PACKING
// ============================================================================

/**
 * GET /api/logistics/warehouses/:warehouseId/pack-orders
 * Listar órdenes de empaque
 */
router.get('/warehouses/:warehouseId/pack-orders', asyncHandler(async (req, res) => {
    const packOrders = await PickingService.getPackOrders(req.params.warehouseId, req.query);
    res.json({ success: true, data: packOrders });
}));

/**
 * POST /api/logistics/pack-orders
 * Crear orden de empaque desde pick list
 */
router.post('/pack-orders', asyncHandler(async (req, res) => {
    const { pick_list_id } = req.body;
    const packerId = req.user?.id;
    const packOrder = await PickingService.createPackOrderFromPickList(pick_list_id, packerId);
    res.status(201).json({ success: true, data: packOrder });
}));

/**
 * POST /api/logistics/packages
 * Crear paquete
 */
router.post('/packages', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        created_by: req.user?.id
    };
    const pkg = await PickingService.createPackage(data);
    res.status(201).json({ success: true, data: pkg });
}));

/**
 * POST /api/logistics/packages/:id/items
 * Agregar item a paquete
 */
router.post('/packages/:id/items', asyncHandler(async (req, res) => {
    const item = await PickingService.addItemToPackage(req.params.id, req.body);
    res.status(201).json({ success: true, data: item });
}));

/**
 * POST /api/logistics/packages/:id/close
 * Cerrar paquete
 */
router.post('/packages/:id/close', asyncHandler(async (req, res) => {
    const pkg = await PickingService.closePackage(req.params.id, req.body.final_weight);
    res.json({ success: true, data: pkg });
}));

/**
 * POST /api/logistics/pack-orders/:id/complete
 * Completar orden de empaque
 */
router.post('/pack-orders/:id/complete', asyncHandler(async (req, res) => {
    const packOrder = await PickingService.completePackOrder(req.params.id);
    res.json({ success: true, data: packOrder });
}));

/**
 * GET /api/logistics/package-types
 * Tipos de paquete
 */
router.get('/package-types', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const types = await PickingService.getPackageTypes(companyId);
    res.json({ success: true, data: types });
}));

/**
 * POST /api/logistics/package-types
 * Crear tipo de paquete
 */
router.post('/package-types', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id
    };
    const type = await PickingService.createPackageType(data);
    res.status(201).json({ success: true, data: type });
}));

// ============================================================================
// CARRIERS (Transportistas)
// ============================================================================

/**
 * GET /api/logistics/carriers
 * Listar transportistas
 */
router.get('/carriers', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const carriers = await RouteService.getCarriers(companyId, req.query);
    res.json({ success: true, data: carriers });
}));

/**
 * GET /api/logistics/carriers/:id
 * Obtener transportista por ID
 */
router.get('/carriers/:id', asyncHandler(async (req, res) => {
    const carrier = await RouteService.getCarrierById(req.params.id);
    if (!carrier) {
        return res.status(404).json({ success: false, error: 'Transportista no encontrado' });
    }
    res.json({ success: true, data: carrier });
}));

/**
 * POST /api/logistics/carriers
 * Crear transportista
 */
router.post('/carriers', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const carrier = await RouteService.createCarrier(data);
    res.status(201).json({ success: true, data: carrier });
}));

/**
 * PUT /api/logistics/carriers/:id
 * Actualizar transportista
 */
router.put('/carriers/:id', asyncHandler(async (req, res) => {
    const carrier = await RouteService.updateCarrier(req.params.id, req.body);
    res.json({ success: true, data: carrier });
}));

// ============================================================================
// VEHICLES (Vehículos)
// ============================================================================

/**
 * GET /api/logistics/vehicles
 * Listar vehículos
 */
router.get('/vehicles', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const vehicles = await RouteService.getVehicles(companyId, req.query);
    res.json({ success: true, data: vehicles });
}));

/**
 * POST /api/logistics/vehicles
 * Crear vehículo
 */
router.post('/vehicles', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const vehicle = await RouteService.createVehicle(data);
    res.status(201).json({ success: true, data: vehicle });
}));

/**
 * PUT /api/logistics/vehicles/:id/availability
 * Actualizar disponibilidad de vehículo
 */
router.put('/vehicles/:id/availability', asyncHandler(async (req, res) => {
    const vehicle = await RouteService.updateVehicleAvailability(
        req.params.id,
        req.body.is_available,
        req.body.current_driver_id
    );
    res.json({ success: true, data: vehicle });
}));

// ============================================================================
// DRIVERS (Conductores)
// ============================================================================

/**
 * GET /api/logistics/drivers
 * Listar conductores
 */
router.get('/drivers', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const drivers = await RouteService.getDrivers(companyId, req.query);
    res.json({ success: true, data: drivers });
}));

/**
 * POST /api/logistics/drivers
 * Crear conductor
 */
router.post('/drivers', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const driver = await RouteService.createDriver(data);
    res.status(201).json({ success: true, data: driver });
}));

// ============================================================================
// DELIVERY ZONES (Zonas de Entrega)
// ============================================================================

/**
 * GET /api/logistics/delivery-zones
 * Listar zonas de entrega
 */
router.get('/delivery-zones', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const zones = await RouteService.getDeliveryZones(companyId, req.query);
    res.json({ success: true, data: zones });
}));

/**
 * GET /api/logistics/delivery-zones/:id
 * Obtener zona por ID
 */
router.get('/delivery-zones/:id', asyncHandler(async (req, res) => {
    const zone = await RouteService.getDeliveryZoneById(req.params.id);
    if (!zone) {
        return res.status(404).json({ success: false, error: 'Zona no encontrada' });
    }
    res.json({ success: true, data: zone });
}));

/**
 * POST /api/logistics/delivery-zones
 * Crear zona de entrega
 */
router.post('/delivery-zones', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const zone = await RouteService.createDeliveryZone(data);
    res.status(201).json({ success: true, data: zone });
}));

/**
 * PUT /api/logistics/delivery-zones/:id
 * Actualizar zona de entrega
 */
router.put('/delivery-zones/:id', asyncHandler(async (req, res) => {
    const zone = await RouteService.updateDeliveryZone(req.params.id, req.body);
    res.json({ success: true, data: zone });
}));

/**
 * POST /api/logistics/delivery-zones/customer-config
 * Configurar zona específica para cliente
 */
router.post('/delivery-zones/customer-config', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id
    };
    const config = await RouteService.setCustomerZoneConfig(data);
    res.json({ success: true, data: config });
}));

/**
 * GET /api/logistics/delivery-zones/:zoneId/customer/:customerId
 * Obtener configuración efectiva de entrega para cliente
 */
router.get('/delivery-zones/:zoneId/customer/:customerId', asyncHandler(async (req, res) => {
    const config = await RouteService.getEffectiveDeliveryConfig(
        req.params.customerId,
        req.params.zoneId
    );
    res.json({ success: true, data: config });
}));

// ============================================================================
// ROUTES (Rutas de Entrega)
// ============================================================================

/**
 * GET /api/logistics/routes
 * Listar rutas
 */
router.get('/routes', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const routes = await RouteService.getRoutes(companyId, req.query);
    res.json({ success: true, data: routes });
}));

/**
 * GET /api/logistics/routes/:id
 * Obtener ruta por ID
 */
router.get('/routes/:id', asyncHandler(async (req, res) => {
    const route = await RouteService.getRouteById(req.params.id);
    if (!route) {
        return res.status(404).json({ success: false, error: 'Ruta no encontrada' });
    }
    res.json({ success: true, data: route });
}));

/**
 * POST /api/logistics/routes
 * Crear ruta
 */
router.post('/routes', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const route = await RouteService.createRoute(data);
    res.status(201).json({ success: true, data: route });
}));

/**
 * POST /api/logistics/routes/:id/stops
 * Agregar parada a ruta
 */
router.post('/routes/:id/stops', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        route_id: req.params.id
    };
    const stop = await RouteService.addRouteStop(data);
    res.status(201).json({ success: true, data: stop });
}));

/**
 * PUT /api/logistics/route-stops/:id
 * Actualizar estado de parada (app móvil)
 */
router.put('/route-stops/:id', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        updated_by: req.user?.id
    };
    const route = await RouteService.updateStopStatus(req.params.id, data);
    res.json({ success: true, data: route });
}));

/**
 * POST /api/logistics/routes/:id/start
 * Iniciar ruta
 */
router.post('/routes/:id/start', asyncHandler(async (req, res) => {
    const driverId = req.user?.id || req.body.driver_id;
    const route = await RouteService.startRoute(req.params.id, driverId);
    res.json({ success: true, data: route });
}));

/**
 * POST /api/logistics/routes/:id/optimize
 * Optimizar orden de paradas
 */
router.post('/routes/:id/optimize', asyncHandler(async (req, res) => {
    const route = await RouteService.optimizeRoute(req.params.id);
    res.json({ success: true, data: route });
}));

/**
 * GET /api/logistics/routes/kpis
 * KPIs de rutas
 */
router.get('/routes/kpis', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const { date_from, date_to } = req.query;
    const kpis = await RouteService.getRouteKPIs(companyId, {
        dateFrom: date_from,
        dateTo: date_to
    });
    res.json({ success: true, data: kpis });
}));

// ============================================================================
// SHIPMENTS (Envíos)
// ============================================================================

/**
 * GET /api/logistics/shipments
 * Listar envíos
 */
router.get('/shipments', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const shipments = await ShipmentService.getShipments(companyId, req.query);
    res.json({ success: true, data: shipments });
}));

/**
 * GET /api/logistics/shipments/:id
 * Obtener envío por ID
 */
router.get('/shipments/:id', asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.getShipmentById(req.params.id);
    if (!shipment) {
        return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }
    res.json({ success: true, data: shipment });
}));

/**
 * GET /api/logistics/shipments/track/:trackingNumber
 * Tracking público por número de seguimiento
 */
router.get('/shipments/track/:trackingNumber', asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.getShipmentByTracking(req.params.trackingNumber);
    if (!shipment) {
        return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments
 * Crear envío
 */
router.post('/shipments', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        company_id: req.user?.company_id || req.body.company_id,
        created_by: req.user?.id
    };
    const shipment = await ShipmentService.createShipment(data);
    res.status(201).json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/bulk
 * Crear envíos masivos desde pack orders
 */
router.post('/shipments/bulk', asyncHandler(async (req, res) => {
    const { pack_order_ids, ...commonData } = req.body;
    commonData.created_by = req.user?.id;
    const result = await ShipmentService.createShipmentsFromPackOrders(pack_order_ids, commonData);
    res.status(201).json({ success: true, data: result });
}));

/**
 * PUT /api/logistics/shipments/:id/status
 * Actualizar estado del envío
 */
router.put('/shipments/:id/status', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        updated_by: req.user?.id
    };
    const shipment = await ShipmentService.updateShipmentStatus(req.params.id, data);
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/:id/tracking
 * Agregar evento de tracking
 */
router.post('/shipments/:id/tracking', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        created_by: req.user?.id
    };
    const event = await ShipmentService.addTrackingEvent(req.params.id, data);
    res.status(201).json({ success: true, data: event });
}));

/**
 * PUT /api/logistics/shipments/:id/assign-carrier
 * Asignar transportista a envío
 */
router.put('/shipments/:id/assign-carrier', asyncHandler(async (req, res) => {
    const { carrier_id, vehicle_id, driver_id } = req.body;
    const shipment = await ShipmentService.assignCarrier(
        req.params.id, carrier_id, vehicle_id, driver_id
    );
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/:id/in-transit
 * Marcar envío en tránsito
 */
router.post('/shipments/:id/in-transit', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        updated_by: req.user?.id
    };
    const shipment = await ShipmentService.markInTransit(req.params.id, data);
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/:id/deliver
 * Confirmar entrega
 */
router.post('/shipments/:id/deliver', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        updated_by: req.user?.id
    };
    const shipment = await ShipmentService.confirmDelivery(req.params.id, data);
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/:id/issue
 * Reportar problema de entrega
 */
router.post('/shipments/:id/issue', asyncHandler(async (req, res) => {
    const data = {
        ...req.body,
        updated_by: req.user?.id
    };
    const shipment = await ShipmentService.reportDeliveryIssue(req.params.id, data);
    res.json({ success: true, data: shipment });
}));

/**
 * POST /api/logistics/shipments/:id/cancel
 * Cancelar envío
 */
router.post('/shipments/:id/cancel', asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.cancelShipment(
        req.params.id,
        req.body.reason,
        req.user?.id
    );
    res.json({ success: true, data: shipment });
}));

/**
 * GET /api/logistics/shipments/:id/pod
 * Obtener Proof of Delivery
 */
router.get('/shipments/:id/pod', asyncHandler(async (req, res) => {
    const pod = await ShipmentService.getProofOfDelivery(req.params.id);
    res.json({ success: true, data: pod });
}));

/**
 * GET /api/logistics/shipments/:id/label
 * Datos para etiqueta de envío
 */
router.get('/shipments/:id/label', asyncHandler(async (req, res) => {
    const label = await ShipmentService.getShippingLabelData(req.params.id);
    res.json({ success: true, data: label });
}));

/**
 * GET /api/logistics/shipments/pending
 * Envíos pendientes de entrega
 */
router.get('/shipments/pending', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const shipments = await ShipmentService.getPendingDeliveries(companyId, req.query);
    res.json({ success: true, data: shipments });
}));

/**
 * GET /api/logistics/shipments/kpis
 * KPIs de envíos
 */
router.get('/shipments/kpis', asyncHandler(async (req, res) => {
    const companyId = req.user?.company_id || req.query.company_id;
    const { date_from, date_to } = req.query;
    const kpis = await ShipmentService.getShipmentKPIs(companyId, {
        dateFrom: date_from,
        dateTo: date_to
    });
    res.json({ success: true, data: kpis });
}));

// Error handler
router.use((err, req, res, next) => {
    console.error('Logistics API Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Error interno del servidor'
    });
});

module.exports = router;
