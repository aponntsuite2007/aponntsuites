/**
 * Logistics Module - Services Index
 * Exporta todos los servicios del módulo de logística
 */

const WarehouseService = require('./WarehouseService');
const PickingService = require('./PickingService');
const RouteService = require('./RouteService');
const ShipmentService = require('./ShipmentService');

module.exports = {
    WarehouseService,
    PickingService,
    RouteService,
    ShipmentService
};
