/**
 * Warehouse Management System (WMS) Routes
 * Sistema de Gestión de Almacenes
 *
 * Multi-tenant: Company → Branch → Warehouse
 * Features: Products, Categories, Price Lists, Promotions, Stock, Locations
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const WarehouseService = require('../services/WarehouseService');
const WMSAuthorizationService = require('../services/WMSAuthorizationService');
const WMSDocumentService = require('../services/WMSDocumentService');
const WMSRecallService = require('../services/WMSRecallService');
const WMSTransferService = require('../services/WMSTransferService');
const WMSExpiryMonitorService = require('../services/WMSExpiryMonitorService');

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validar ID numérico en parámetros
 */
const validateNumericId = (paramName = 'id') => (req, res, next) => {
    const id = req.params[paramName];
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
            success: false,
            error: `Parámetro ${paramName} debe ser un número válido`
        });
    }
    req.params[paramName] = parseInt(id);
    next();
};

/**
 * Validar campos requeridos en body
 */
const validateRequired = (fields) => (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
        return res.status(400).json({
            success: false,
            error: `Campos requeridos faltantes: ${missing.join(', ')}`
        });
    }
    next();
};

/**
 * Validar cantidad positiva
 */
const validatePositiveNumber = (fieldName) => (req, res, next) => {
    const value = req.body[fieldName];
    if (value !== undefined && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
        return res.status(400).json({
            success: false,
            error: `${fieldName} debe ser un número positivo`
        });
    }
    next();
};

/**
 * Sanitizar string para prevenir XSS
 */
const sanitizeStrings = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key]
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .trim();
            }
        });
    }
    next();
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

// All routes require authentication
router.use(auth);

// Sanitize all incoming strings
router.use(sanitizeStrings);

// ============================================================================
// BRANCHES (Sucursales)
// ============================================================================

// Get all branches for company
router.get('/branches', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branches = await WarehouseService.getBranches(companyId);
        res.json({ success: true, data: branches });
    } catch (error) {
        console.error('[WMS] Error getting branches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create branch
router.post('/branches', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branch = await WarehouseService.createBranch(companyId, req.body);
        res.json({ success: true, data: branch });
    } catch (error) {
        console.error('[WMS] Error creating branch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update branch
router.put('/branches/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branch = await WarehouseService.updateBranch(companyId, req.params.id, req.body);
        res.json({ success: true, data: branch });
    } catch (error) {
        console.error('[WMS] Error updating branch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete branch
router.delete('/branches/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteBranch(companyId, req.params.id);
        res.json({ success: true, message: 'Branch deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting branch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// WAREHOUSES (Almacenes)
// ============================================================================

// Get warehouses (optionally filtered by branch)
router.get('/warehouses', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branchId = req.query.branch_id;
        const warehouses = await WarehouseService.getWarehouses(companyId, branchId);
        res.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('[WMS] Error getting warehouses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create warehouse
router.post('/warehouses', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouse = await WarehouseService.createWarehouse(companyId, req.body);
        res.json({ success: true, data: warehouse });
    } catch (error) {
        console.error('[WMS] Error creating warehouse:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update warehouse
router.put('/warehouses/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouse = await WarehouseService.updateWarehouse(companyId, req.params.id, req.body);
        res.json({ success: true, data: warehouse });
    } catch (error) {
        console.error('[WMS] Error updating warehouse:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete warehouse
router.delete('/warehouses/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteWarehouse(companyId, req.params.id);
        res.json({ success: true, message: 'Warehouse deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting warehouse:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CATEGORIES (Rubros/Subrubros)
// ============================================================================

// Get category tree
router.get('/categories', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branchId = req.query.branch_id;
        const categories = await WarehouseService.getCategories(companyId, branchId);
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('[WMS] Error getting categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create category
router.post('/categories', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const category = await WarehouseService.createCategory(companyId, req.body);
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('[WMS] Error creating category:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update category
router.put('/categories/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const category = await WarehouseService.updateCategory(companyId, req.params.id, req.body);
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('[WMS] Error updating category:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteCategory(companyId, req.params.id);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting category:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// BRANDS (Marcas)
// ============================================================================

router.get('/brands', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const brands = await WarehouseService.getBrands(companyId);
        res.json({ success: true, data: brands });
    } catch (error) {
        console.error('[WMS] Error getting brands:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/brands', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const brand = await WarehouseService.createBrand(companyId, req.body);
        res.json({ success: true, data: brand });
    } catch (error) {
        console.error('[WMS] Error creating brand:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/brands/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const brand = await WarehouseService.updateBrand(companyId, req.params.id, req.body);
        res.json({ success: true, data: brand });
    } catch (error) {
        console.error('[WMS] Error updating brand:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/brands/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteBrand(companyId, req.params.id);
        res.json({ success: true, message: 'Brand deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting brand:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SUPPLIERS (Proveedores)
// ============================================================================

router.get('/suppliers', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const suppliers = await WarehouseService.getSuppliers(companyId);
        res.json({ success: true, data: suppliers });
    } catch (error) {
        console.error('[WMS] Error getting suppliers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/suppliers', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const supplier = await WarehouseService.createSupplier(companyId, req.body);
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('[WMS] Error creating supplier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/suppliers/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const supplier = await WarehouseService.updateSupplier(companyId, req.params.id, req.body);
        res.json({ success: true, data: supplier });
    } catch (error) {
        console.error('[WMS] Error updating supplier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/suppliers/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteSupplier(companyId, req.params.id);
        res.json({ success: true, message: 'Supplier deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting supplier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PRODUCTS (Artículos)
// ============================================================================

// Get products with filters
router.get('/products', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            branch_id: req.query.branch_id,
            category_id: req.query.category_id,
            brand_id: req.query.brand_id,
            supplier_id: req.query.supplier_id,
            product_type: req.query.product_type,
            search: req.query.search,
            is_active: req.query.is_active,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };
        const result = await WarehouseService.getProducts(companyId, filters);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[WMS] Error getting products:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single product with all details
router.get('/products/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const product = await WarehouseService.getProductById(companyId, req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[WMS] Error getting product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create product
router.post('/products', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const product = await WarehouseService.createProduct(companyId, userId, req.body);
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[WMS] Error creating product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update product
router.put('/products/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const product = await WarehouseService.updateProduct(companyId, userId, req.params.id, req.body);
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[WMS] Error updating product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deleteProduct(companyId, req.params.id);
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search product by barcode
router.get('/products/barcode/:barcode', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const product = await WarehouseService.getProductByBarcode(companyId, req.params.barcode);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[WMS] Error searching by barcode:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PRODUCT BARCODES
// ============================================================================

router.get('/products/:productId/barcodes', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const barcodes = await WarehouseService.getProductBarcodes(companyId, req.params.productId);
        res.json({ success: true, data: barcodes });
    } catch (error) {
        console.error('[WMS] Error getting barcodes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/products/:productId/barcodes', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const barcode = await WarehouseService.addProductBarcode(companyId, req.params.productId, req.body);
        res.json({ success: true, data: barcode });
    } catch (error) {
        console.error('[WMS] Error adding barcode:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/products/:productId/barcodes/:barcodeId', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.removeProductBarcode(companyId, req.params.productId, req.params.barcodeId);
        res.json({ success: true, message: 'Barcode removed' });
    } catch (error) {
        console.error('[WMS] Error removing barcode:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PRICE LISTS (Listas de Precios)
// ============================================================================

router.get('/price-lists', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branchId = req.query.branch_id;
        const priceLists = await WarehouseService.getPriceLists(companyId, branchId);
        res.json({ success: true, data: priceLists });
    } catch (error) {
        console.error('[WMS] Error getting price lists:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/price-lists/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const priceList = await WarehouseService.getPriceListById(companyId, req.params.id);
        if (!priceList) {
            return res.status(404).json({ success: false, error: 'Price list not found' });
        }
        res.json({ success: true, data: priceList });
    } catch (error) {
        console.error('[WMS] Error getting price list:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/price-lists', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const priceList = await WarehouseService.createPriceList(companyId, req.body);
        res.json({ success: true, data: priceList });
    } catch (error) {
        console.error('[WMS] Error creating price list:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/price-lists/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const priceList = await WarehouseService.updatePriceList(companyId, req.params.id, req.body);
        res.json({ success: true, data: priceList });
    } catch (error) {
        console.error('[WMS] Error updating price list:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/price-lists/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deletePriceList(companyId, req.params.id);
        res.json({ success: true, message: 'Price list deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting price list:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sync mirror price list
router.post('/price-lists/:id/sync-mirror', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await WarehouseService.syncMirrorPriceList(companyId, req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error syncing mirror:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PRODUCT PRICES
// ============================================================================

// Get prices for a product across all lists
router.get('/products/:productId/prices', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const prices = await WarehouseService.getProductPrices(companyId, req.params.productId);
        res.json({ success: true, data: prices });
    } catch (error) {
        console.error('[WMS] Error getting product prices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set price for product in a list
router.post('/products/:productId/prices', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const price = await WarehouseService.setProductPrice(companyId, userId, req.params.productId, req.body);
        res.json({ success: true, data: price });
    } catch (error) {
        console.error('[WMS] Error setting product price:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk price update
router.post('/price-lists/:listId/bulk-update', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const { filters, adjustment } = req.body;
        const result = await WarehouseService.bulkUpdatePrices(companyId, userId, req.params.listId, filters, adjustment);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error bulk updating prices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PROMOTIONS (Promociones)
// ============================================================================

router.get('/promotions', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            branch_id: req.query.branch_id,
            is_active: req.query.is_active,
            promotion_type: req.query.promotion_type
        };
        const promotions = await WarehouseService.getPromotions(companyId, filters);
        res.json({ success: true, data: promotions });
    } catch (error) {
        console.error('[WMS] Error getting promotions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/promotions/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const promotion = await WarehouseService.getPromotionById(companyId, req.params.id);
        if (!promotion) {
            return res.status(404).json({ success: false, error: 'Promotion not found' });
        }
        res.json({ success: true, data: promotion });
    } catch (error) {
        console.error('[WMS] Error getting promotion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/promotions', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const promotion = await WarehouseService.createPromotion(companyId, req.body);
        res.json({ success: true, data: promotion });
    } catch (error) {
        console.error('[WMS] Error creating promotion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/promotions/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const promotion = await WarehouseService.updatePromotion(companyId, req.params.id, req.body);
        res.json({ success: true, data: promotion });
    } catch (error) {
        console.error('[WMS] Error updating promotion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/promotions/:id', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        await WarehouseService.deletePromotion(companyId, req.params.id);
        res.json({ success: true, message: 'Promotion deleted' });
    } catch (error) {
        console.error('[WMS] Error deleting promotion:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calculate promotion for cart
router.post('/promotions/calculate', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { items, price_list_id } = req.body;
        const result = await WarehouseService.calculatePromotions(companyId, items, price_list_id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error calculating promotions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// STOCK
// ============================================================================

// Get stock for a product across warehouses
router.get('/products/:productId/stock', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const stock = await WarehouseService.getProductStock(companyId, req.params.productId);
        res.json({ success: true, data: stock });
    } catch (error) {
        console.error('[WMS] Error getting product stock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get stock for a warehouse
router.get('/warehouses/:warehouseId/stock', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            category_id: req.query.category_id,
            low_stock: req.query.low_stock === 'true',
            search: req.query.search,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };
        const result = await WarehouseService.getWarehouseStock(companyId, req.params.warehouseId, filters);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[WMS] Error getting warehouse stock:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stock movement (entry/exit/transfer/adjustment)
router.post('/stock/movement', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const movement = await WarehouseService.createStockMovement(companyId, userId, req.body);
        res.json({ success: true, data: movement });
    } catch (error) {
        console.error('[WMS] Error creating stock movement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get stock movements
router.get('/stock/movements', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            warehouse_id: req.query.warehouse_id,
            product_id: req.query.product_id,
            movement_type: req.query.movement_type,
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };
        const result = await WarehouseService.getStockMovements(companyId, filters);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('[WMS] Error getting stock movements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stock alerts
router.get('/stock/alerts', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const alerts = await WarehouseService.getStockAlerts(companyId, warehouseId);
        res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('[WMS] Error getting stock alerts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Expiry alerts
router.get('/stock/expiry-alerts', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const daysAhead = parseInt(req.query.days) || 30;
        const alerts = await WarehouseService.getExpiryAlerts(companyId, warehouseId, daysAhead);
        res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('[WMS] Error getting expiry alerts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// BATCHES (Lotes)
// ============================================================================

router.get('/products/:productId/batches', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const batches = await WarehouseService.getProductBatches(companyId, req.params.productId, warehouseId);
        res.json({ success: true, data: batches });
    } catch (error) {
        console.error('[WMS] Error getting batches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/batches', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const batch = await WarehouseService.createBatch(companyId, req.body);
        res.json({ success: true, data: batch });
    } catch (error) {
        console.error('[WMS] Error creating batch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// WAREHOUSE ZONES & LOCATIONS (Planograma)
// ============================================================================

router.get('/warehouses/:warehouseId/zones', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const zones = await WarehouseService.getWarehouseZones(companyId, req.params.warehouseId);
        res.json({ success: true, data: zones });
    } catch (error) {
        console.error('[WMS] Error getting zones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/warehouses/:warehouseId/zones', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const zone = await WarehouseService.createWarehouseZone(companyId, req.params.warehouseId, req.body);
        res.json({ success: true, data: zone });
    } catch (error) {
        console.error('[WMS] Error creating zone:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/zones/:zoneId/locations', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const locations = await WarehouseService.getZoneLocations(companyId, req.params.zoneId);
        res.json({ success: true, data: locations });
    } catch (error) {
        console.error('[WMS] Error getting locations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/zones/:zoneId/locations', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const location = await WarehouseService.createLocation(companyId, req.params.zoneId, req.body);
        res.json({ success: true, data: location });
    } catch (error) {
        console.error('[WMS] Error creating location:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Assign product to location
router.post('/locations/:locationId/assign', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const assignment = await WarehouseService.assignProductToLocation(companyId, req.params.locationId, req.body);
        res.json({ success: true, data: assignment });
    } catch (error) {
        console.error('[WMS] Error assigning product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get planogram data
router.get('/warehouses/:warehouseId/planogram', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const planogram = await WarehouseService.getPlanogram(companyId, req.params.warehouseId);
        res.json({ success: true, data: planogram });
    } catch (error) {
        console.error('[WMS] Error getting planogram:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FISCAL TEMPLATES
// ============================================================================

router.get('/fiscal-templates', async (req, res) => {
    try {
        const countryCode = req.query.country_code;
        const templates = await WarehouseService.getFiscalTemplates(countryCode);
        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('[WMS] Error getting fiscal templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/fiscal-templates/:id', async (req, res) => {
    try {
        const template = await WarehouseService.getFiscalTemplateById(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        res.json({ success: true, data: template });
    } catch (error) {
        console.error('[WMS] Error getting fiscal template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CURRENCIES
// ============================================================================

router.get('/currencies', async (req, res) => {
    try {
        const currencies = await WarehouseService.getCurrencies();
        res.json({ success: true, data: currencies });
    } catch (error) {
        console.error('[WMS] Error getting currencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/currencies/exchange-rate', async (req, res) => {
    try {
        const { from_currency, to_currency, rate } = req.body;
        const result = await WarehouseService.updateExchangeRate(from_currency, to_currency, rate);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error updating exchange rate:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// BARCODE CONFIGURATION
// ============================================================================

router.get('/barcode-config', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const config = await WarehouseService.getBarcodeConfig(companyId);
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('[WMS] Error getting barcode config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/barcode-config', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const config = await WarehouseService.updateBarcodeConfig(companyId, req.body);
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('[WMS] Error updating barcode config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Parse composite barcode
router.post('/barcode/parse', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { barcode } = req.body;
        const result = await WarehouseService.parseCompositeBarcode(companyId, barcode);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error parsing barcode:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// REPORTS & EXPORTS
// ============================================================================

// Stock valuation report
router.get('/reports/stock-valuation', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const report = await WarehouseService.getStockValuationReport(companyId, warehouseId);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('[WMS] Error generating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Export products to Excel
router.get('/export/products', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            branch_id: req.query.branch_id,
            category_id: req.query.category_id,
            format: req.query.format || 'xlsx'
        };
        const result = await WarehouseService.exportProducts(companyId, filters);

        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
    } catch (error) {
        console.error('[WMS] Error exporting products:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Import products from Excel
router.post('/import/products', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        // Note: Requires multer middleware for file upload
        const result = await WarehouseService.importProducts(companyId, userId, req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[WMS] Error importing products:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DASHBOARD STATS
// ============================================================================

router.get('/dashboard/stats', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branchId = req.query.branch_id;
        const stats = await WarehouseService.getDashboardStats(companyId, branchId);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[WMS] Error getting dashboard stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TRANSFERENCIAS ENTRE ALMACENES
// ============================================================================

// Listar transferencias
router.get('/transfers', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const filters = {
            status: req.query.status,
            source_warehouse_id: req.query.source_warehouse_id,
            destination_warehouse_id: req.query.destination_warehouse_id,
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };
        const transfers = await WMSTransferService.listTransfers(companyId, filters);
        res.json({ success: true, data: transfers });
    } catch (error) {
        console.error('[WMS] Error listing transfers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener transferencia por ID
router.get('/transfers/:id', validateNumericId('id'), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const transfer = await WMSTransferService.getTransferById(req.params.id, companyId);
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error getting transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear transferencia
router.post('/transfers',
    validateRequired(['source_warehouse_id', 'destination_warehouse_id', 'lines']),
    async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.createTransfer(companyId, userId, req.body);
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error creating transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Aprobar transferencia
router.post('/transfers/:id/approve', validateNumericId('id'), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.approveTransfer(req.params.id, companyId, userId);
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error approving transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ignorar alertas FIFO
router.post('/transfers/:id/ignore-fifo', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.ignoreFifoViolations(
            req.params.id, companyId, userId, req.body.reason
        );
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error ignoring FIFO:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Despachar transferencia
router.post('/transfers/:id/dispatch', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.dispatchTransfer(
            req.params.id, companyId, userId, req.body
        );
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error dispatching transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Recibir transferencia
router.post('/transfers/:id/receive', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.receiveTransfer(
            req.params.id, companyId, userId, req.body
        );
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error receiving transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirmar transferencia (ejecuta movimientos de stock)
router.post('/transfers/:id/confirm', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.confirmTransfer(req.params.id, companyId, userId);
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error confirming transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancelar transferencia
router.post('/transfers/:id/cancel', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const transfer = await WMSTransferService.cancelTransfer(
            req.params.id, companyId, userId, req.body.reason
        );
        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('[WMS] Error cancelling transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// STOCK DISPONIBLE POR LOTES
// ============================================================================

// Obtener lotes disponibles para un producto (ordenados FIFO)
router.get('/stock/batches/:productId/:warehouseId', async (req, res) => {
    try {
        const orderBy = req.query.order_by || 'expiry_date';
        const batches = await WMSTransferService.getAvailableBatches(
            req.params.productId, req.params.warehouseId, orderBy
        );
        res.json({ success: true, data: batches });
    } catch (error) {
        console.error('[WMS] Error getting batches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener disponibilidad de stock (incluyendo reservas)
router.get('/stock/availability/:warehouseId', async (req, res) => {
    try {
        const productId = req.query.product_id;
        const availability = await WMSTransferService.getStockAvailability(
            req.params.warehouseId, productId
        );
        res.json({ success: true, data: availability });
    } catch (error) {
        console.error('[WMS] Error getting stock availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ALERTAS DE VENCIMIENTO Y TRAZABILIDAD
// ============================================================================

// Obtener alertas de vencimiento pendientes
router.get('/expiry/alerts', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const alerts = await WMSExpiryMonitorService.getPendingAlerts(companyId, warehouseId);
        res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('[WMS] Error getting expiry alerts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reconocer alerta
router.post('/expiry/alerts/:id/acknowledge', async (req, res) => {
    try {
        const userId = req.user.user_id;
        await WMSExpiryMonitorService.acknowledgeAlert(req.params.id, userId);
        res.json({ success: true, message: 'Alerta reconocida' });
    } catch (error) {
        console.error('[WMS] Error acknowledging alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Resolver alerta
router.post('/expiry/alerts/:id/resolve', async (req, res) => {
    try {
        const userId = req.user.user_id;
        await WMSExpiryMonitorService.resolveAlert(req.params.id, userId, req.body.notes);
        res.json({ success: true, message: 'Alerta resuelta' });
    } catch (error) {
        console.error('[WMS] Error resolving alert:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reporte de vencimientos
router.get('/expiry/report', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.query.warehouse_id;
        const days = parseInt(req.query.days) || 30;
        const report = await WMSExpiryMonitorService.getExpiryReport(companyId, warehouseId, days);
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('[WMS] Error getting expiry report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Trazabilidad de producto
router.get('/traceability/:productId', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const batchId = req.query.batch_id;
        const history = await WMSExpiryMonitorService.getProductTraceability(
            req.params.productId, batchId, companyId
        );
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('[WMS] Error getting traceability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// VENTAS FIFO Y DEVOLUCIONES
// ============================================================================

// Registrar venta con asignación FIFO automática
router.post('/sales/fifo', async (req, res) => {
    try {
        const result = await WMSExpiryMonitorService.allocateSaleFIFO(req.body);
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error allocating FIFO sale:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Procesar devolución
router.post('/returns', async (req, res) => {
    try {
        const result = await WMSExpiryMonitorService.processReturn(req.body);
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error processing return:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ejecutar verificación de vencimientos manualmente
router.post('/expiry/check', async (req, res) => {
    try {
        await WMSExpiryMonitorService.runExpiryCheck();
        res.json({ success: true, message: 'Verificación de vencimientos ejecutada' });
    } catch (error) {
        console.error('[WMS] Error running expiry check:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SISTEMA DE AUTORIZACIONES
// ============================================================================

// Crear solicitud de autorización
router.post('/authorizations', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.createAuthorizationRequest({
            companyId: req.user.company_id,
            requestedBy: req.user.user_id,
            ...req.body
        });
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error creating authorization request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener solicitudes pendientes
router.get('/authorizations/pending', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.getPendingRequests(
            req.user.company_id,
            req.user.user_id
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting pending authorizations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verificar si usuario puede aprobar
router.get('/authorizations/can-approve', async (req, res) => {
    try {
        const { operationType, amount, quantity } = req.query;
        const result = await WMSAuthorizationService.canUserApprove(
            req.user.user_id,
            req.user.company_id,
            operationType,
            parseFloat(amount) || 0,
            parseInt(quantity) || 0
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error checking approval permission:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Aprobar solicitud
router.post('/authorizations/:id/approve', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.approveRequest(
            parseInt(req.params.id),
            req.user.user_id,
            req.body.comments,
            req.ip,
            req.get('User-Agent')
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error approving request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rechazar solicitud
router.post('/authorizations/:id/reject', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.rejectRequest(
            parseInt(req.params.id),
            req.user.user_id,
            req.body.reason,
            req.ip,
            req.get('User-Agent')
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error rejecting request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Escalar solicitud
router.post('/authorizations/:id/escalate', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.escalateRequest(
            parseInt(req.params.id),
            req.body.reason
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error escalating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historial de autorizaciones
router.get('/authorizations/:id/history', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.getAuthorizationHistory(
            parseInt(req.params.id)
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting authorization history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verificar cadena de firmas
router.get('/signatures/verify/:entityType/:entityId', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.verifySignatureChain(
            req.params.entityType,
            parseInt(req.params.entityId)
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error verifying signature chain:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear delegación
router.post('/authorizations/delegations', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.createDelegation({
            companyId: req.user.company_id,
            delegatorId: req.user.user_id,
            ...req.body
        });
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error creating delegation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Revocar delegación
router.post('/authorizations/delegations/:id/revoke', async (req, res) => {
    try {
        const result = await WMSAuthorizationService.revokeDelegation(
            parseInt(req.params.id),
            req.user.user_id,
            req.body.reason
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error revoking delegation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONTROL DOCUMENTAL
// ============================================================================

// Obtener tipos de documentos
router.get('/documents/types', async (req, res) => {
    try {
        const result = await WMSDocumentService.getDocumentTypes();
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting document types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Subir documento
router.post('/documents', async (req, res) => {
    try {
        const result = await WMSDocumentService.uploadDocument({
            companyId: req.user.company_id,
            uploadedBy: req.user.user_id,
            ...req.body
        });
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error uploading document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Vincular documento a entidad
router.post('/documents/link', async (req, res) => {
    try {
        const result = await WMSDocumentService.linkDocument({
            linkedBy: req.user.user_id,
            ...req.body
        });
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error linking document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener documentos de una entidad
router.get('/documents/entity/:entityType/:entityId', async (req, res) => {
    try {
        const result = await WMSDocumentService.getEntityDocuments(
            req.params.entityType,
            parseInt(req.params.entityId)
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting entity documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Documentos por vencer
router.get('/documents/expiring', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const result = await WMSDocumentService.getExpiringDocuments(
            req.user.company_id,
            days
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting expiring documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Buscar documentos
router.get('/documents/search', async (req, res) => {
    try {
        const result = await WMSDocumentService.searchDocuments(
            req.user.company_id,
            req.query.q
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error searching documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nueva versión de documento
router.post('/documents/:id/version', async (req, res) => {
    try {
        const result = await WMSDocumentService.createDocumentVersion(
            parseInt(req.params.id),
            req.body,
            req.user.user_id
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error creating document version:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Archivar documento
router.post('/documents/:id/archive', async (req, res) => {
    try {
        const result = await WMSDocumentService.archiveDocument(
            parseInt(req.params.id),
            req.user.user_id,
            req.body.reason
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error archiving document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SISTEMA DE RECALL (RETIRO DE PRODUCTOS)
// ============================================================================

// Iniciar recall
router.post('/recalls',
    validateRequired(['productId', 'reason', 'severity']),
    async (req, res) => {
    try {
        const result = await WMSRecallService.initiateRecall({
            companyId: req.user.company_id,
            initiatedBy: req.user.user_id,
            ...req.body
        });
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error initiating recall:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar recalls activos
router.get('/recalls', async (req, res) => {
    try {
        const result = await WMSRecallService.getActiveRecalls(req.user.company_id);
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting recalls:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener estado de recall
router.get('/recalls/:id', async (req, res) => {
    try {
        const result = await WMSRecallService.getRecallStatus(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error getting recall status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar estado de recall
router.post('/recalls/:id/status', async (req, res) => {
    try {
        const result = await WMSRecallService.updateRecallStatus(
            parseInt(req.params.id),
            req.body.status,
            req.user.user_id
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error updating recall status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Registrar recuperación de unidades
router.post('/recalls/tracking/:trackingId/recover', async (req, res) => {
    try {
        const result = await WMSRecallService.recordRecovery(
            parseInt(req.params.trackingId),
            req.body
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error recording recovery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Agregar análisis de causa raíz
router.post('/recalls/:id/analysis', async (req, res) => {
    try {
        const result = await WMSRecallService.addRootCauseAnalysis(
            parseInt(req.params.id),
            req.body,
            req.user.user_id
        );
        res.json(result);
    } catch (error) {
        console.error('[WMS] Error adding root cause analysis:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DASHBOARD RESPONSABLE DE ALMACÉN
// ============================================================================

/**
 * Dashboard operativo para el responsable del almacén
 * Incluye: solicitudes pendientes, stock crítico, operaciones del día
 */
router.get('/manager-dashboard/:warehouseId', validateNumericId('warehouseId'), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const warehouseId = req.params.warehouseId;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // 1. Verificar que el usuario tiene acceso al almacén
        const accessCheck = await sequelize.query(`
            SELECT ws.*, u.email, u.role
            FROM wms_warehouse_staff ws
            JOIN users u ON ws.user_id = u.user_id
            WHERE ws.warehouse_id = :warehouseId
              AND ws.user_id = :userId
              AND ws.is_active = true
        `, {
            replacements: { warehouseId, userId: req.user.user_id || req.user.id },
            type: QueryTypes.SELECT
        });

        const isManager = accessCheck.length > 0 &&
            (accessCheck[0].can_approve_requests || accessCheck[0].role_in_warehouse === 'manager');
        const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

        if (!isManager && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos de responsable para este almacén'
            });
        }

        // 2. Solicitudes pendientes de aprobación
        const pendingRequests = await sequelize.query(`
            SELECT mr.*,
                   u.email as requester_email,
                   d.name as requester_department,
                   (SELECT COUNT(*) FROM wms_material_request_lines WHERE request_id = mr.id) as total_lines,
                   (SELECT COALESCE(SUM(requested_quantity), 0) FROM wms_material_request_lines WHERE request_id = mr.id) as total_items
            FROM wms_material_requests mr
            LEFT JOIN users u ON mr.requested_by = u.user_id
            LEFT JOIN departments d ON mr.requester_department_id = d.id
            WHERE mr.source_warehouse_id = :warehouseId
              AND mr.status IN ('submitted', 'approved')
              AND mr.company_id = :companyId
            ORDER BY mr.priority DESC, mr.required_date ASC
            LIMIT 20
        `, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.SELECT
        });

        // 3. Solicitudes para hoy (a despachar)
        const todayDispatch = await sequelize.query(`
            SELECT mr.*,
                   u.email as requester_email,
                   (SELECT COUNT(*) FROM wms_material_request_lines WHERE request_id = mr.id AND available_quantity >= requested_quantity) as ready_lines,
                   (SELECT COUNT(*) FROM wms_material_request_lines WHERE request_id = mr.id) as total_lines
            FROM wms_material_requests mr
            LEFT JOIN users u ON mr.requested_by = u.user_id
            WHERE mr.source_warehouse_id = :warehouseId
              AND mr.required_date <= CURRENT_DATE
              AND mr.status IN ('approved', 'reserved', 'prepared')
              AND mr.company_id = :companyId
            ORDER BY mr.priority DESC
        `, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.SELECT
        });

        // 4. Stock crítico (bajo punto de reorden)
        const criticalStock = await sequelize.query(`
            SELECT s.*, p.internal_code, p.description, p.unit_measure,
                   COALESCE(s.min_stock, 0) as min_stock,
                   COALESCE(s.reorder_point, 0) as reorder_point,
                   CASE
                       WHEN s.quantity_on_hand <= 0 THEN 'SIN_STOCK'
                       WHEN s.quantity_on_hand <= COALESCE(s.min_stock, 0) THEN 'CRITICO'
                       WHEN s.quantity_on_hand <= COALESCE(s.reorder_point, 0) THEN 'BAJO'
                       ELSE 'NORMAL'
                   END as stock_status
            FROM wms_stock s
            JOIN wms_products p ON s.product_id = p.id
            WHERE s.warehouse_id = :warehouseId
              AND (s.quantity_on_hand <= COALESCE(s.reorder_point, 0) OR s.quantity_on_hand <= 0)
            ORDER BY s.quantity_on_hand ASC
            LIMIT 25
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        // 5. Transferencias en tránsito (entrantes y salientes)
        const pendingTransfers = await sequelize.query(`
            SELECT t.*,
                   sw.name as source_warehouse_name,
                   dw.name as dest_warehouse_name,
                   CASE
                       WHEN t.source_warehouse_id = :warehouseId THEN 'SALIENTE'
                       ELSE 'ENTRANTE'
                   END as direction
            FROM wms_transfers t
            JOIN wms_warehouses sw ON t.source_warehouse_id = sw.id
            JOIN wms_warehouses dw ON t.destination_warehouse_id = dw.id
            WHERE (t.source_warehouse_id = :warehouseId OR t.destination_warehouse_id = :warehouseId)
              AND t.status IN ('pending', 'in_transit', 'partial')
            ORDER BY t.created_at DESC
            LIMIT 10
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        // 6. Recepciones pendientes (OC)
        const pendingReceipts = await sequelize.query(`
            SELECT pr.*,
                   (SELECT COUNT(*) FROM wms_pending_receipt_lines WHERE receipt_id = pr.id AND received_quantity < expected_quantity) as pending_lines
            FROM wms_pending_receipts pr
            WHERE pr.destination_warehouse_id = :warehouseId
              AND pr.status IN ('pending', 'partial')
              AND pr.company_id = :companyId
            ORDER BY pr.expected_date ASC
            LIMIT 10
        `, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.SELECT
        });

        // 7. Estadísticas generales
        const stats = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM wms_material_requests WHERE source_warehouse_id = :warehouseId AND status = 'submitted') as pending_requests,
                (SELECT COUNT(*) FROM wms_material_requests WHERE source_warehouse_id = :warehouseId AND required_date = CURRENT_DATE AND status IN ('approved', 'reserved')) as today_dispatches,
                (SELECT COUNT(*) FROM wms_stock WHERE warehouse_id = :warehouseId AND quantity_on_hand <= COALESCE(min_stock, 0)) as critical_items,
                (SELECT COUNT(*) FROM wms_transfers WHERE (source_warehouse_id = :warehouseId OR destination_warehouse_id = :warehouseId) AND status = 'in_transit') as transfers_in_transit,
                (SELECT COUNT(*) FROM wms_pending_receipts WHERE destination_warehouse_id = :warehouseId AND status = 'pending') as pending_receipts,
                (SELECT COALESCE(SUM(total_value), 0) FROM wms_stock WHERE warehouse_id = :warehouseId) as total_stock_value
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                user_role: isManager ? accessCheck[0].role_in_warehouse : 'admin',
                can_approve: isManager ? accessCheck[0].can_approve_requests : true,
                stats: stats[0] || {},
                pending_requests: pendingRequests,
                today_dispatch: todayDispatch,
                critical_stock: criticalStock,
                pending_transfers: pendingTransfers,
                pending_receipts: pendingReceipts
            }
        });

    } catch (error) {
        console.error('[WMS] Error loading manager dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SOLICITUDES DE MATERIAL
// ============================================================================

/**
 * Listar solicitudes de material
 */
router.get('/material-requests', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { warehouse_id, status, from_date, to_date, requester } = req.query;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        let whereClause = 'WHERE mr.company_id = :companyId';
        const replacements = { companyId };

        if (warehouse_id) {
            whereClause += ' AND mr.source_warehouse_id = :warehouseId';
            replacements.warehouseId = parseInt(warehouse_id);
        }

        if (status) {
            whereClause += ' AND mr.status = :status';
            replacements.status = status;
        }

        if (from_date) {
            whereClause += ' AND mr.required_date >= :fromDate';
            replacements.fromDate = from_date;
        }

        if (to_date) {
            whereClause += ' AND mr.required_date <= :toDate';
            replacements.toDate = to_date;
        }

        if (requester) {
            whereClause += ' AND mr.requested_by = :requester';
            replacements.requester = requester;
        }

        const requests = await sequelize.query(`
            SELECT mr.*,
                   u.email as requester_email,
                   d.name as requester_department,
                   w.name as warehouse_name,
                   (SELECT COUNT(*) FROM wms_material_request_lines WHERE request_id = mr.id) as total_lines,
                   (SELECT COALESCE(SUM(estimated_value), 0) FROM wms_material_request_lines WHERE request_id = mr.id) as total_value
            FROM wms_material_requests mr
            LEFT JOIN users u ON mr.requested_by = u.user_id
            LEFT JOIN departments d ON mr.requester_department_id = d.id
            LEFT JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
            ${whereClause}
            ORDER BY mr.created_at DESC
            LIMIT 100
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({ success: true, data: requests });

    } catch (error) {
        console.error('[WMS] Error listing material requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Crear solicitud de material
 */
router.post('/material-requests', async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id || req.user.id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const {
            source_warehouse_id,
            destination_type, // WAREHOUSE, SECTOR, EMPLOYEE, PROJECT
            destination_warehouse_id,
            destination_employee_id,
            destination_department_id,
            destination_project_id,
            required_date,
            priority,
            notes,
            lines // Array de { product_id, requested_quantity, notes }
        } = req.body;

        // Validaciones
        if (!source_warehouse_id || !destination_type || !required_date || !lines || lines.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos: source_warehouse_id, destination_type, required_date, lines'
            });
        }

        // Generar número de solicitud
        const requestNumber = await sequelize.query(
            'SELECT wms_generate_request_number(:companyId) as num',
            { replacements: { companyId }, type: QueryTypes.SELECT }
        );

        const transaction = await sequelize.transaction();

        try {
            // Crear solicitud
            const [requestResult] = await sequelize.query(`
                INSERT INTO wms_material_requests (
                    company_id, request_number, requested_by, requester_department_id,
                    source_warehouse_id, destination_type, destination_warehouse_id,
                    destination_employee_id, destination_department_id, destination_project_id,
                    required_date, priority, notes, status
                ) VALUES (
                    :companyId, :requestNumber, :userId,
                    (SELECT department_id FROM users WHERE user_id = :userId),
                    :sourceWarehouseId, :destinationType, :destWarehouseId,
                    :destEmployeeId, :destDeptId, :destProjectId,
                    :requiredDate, :priority, :notes, 'draft'
                ) RETURNING *
            `, {
                replacements: {
                    companyId,
                    requestNumber: requestNumber[0].num,
                    userId,
                    sourceWarehouseId: source_warehouse_id,
                    destinationType: destination_type,
                    destWarehouseId: destination_warehouse_id || null,
                    destEmployeeId: destination_employee_id || null,
                    destDeptId: destination_department_id || null,
                    destProjectId: destination_project_id || null,
                    requiredDate: required_date,
                    priority: priority || 'normal',
                    notes: notes || null
                },
                type: QueryTypes.INSERT,
                transaction
            });

            const requestId = requestResult[0].id;

            // Crear líneas
            for (const line of lines) {
                // Verificar disponibilidad
                const availability = await sequelize.query(
                    'SELECT * FROM wms_check_material_availability(:productId, :warehouseId, :quantity, :requiredDate)',
                    {
                        replacements: {
                            productId: line.product_id,
                            warehouseId: source_warehouse_id,
                            quantity: line.requested_quantity,
                            requiredDate: required_date
                        },
                        type: QueryTypes.SELECT,
                        transaction
                    }
                );

                const avail = availability[0] || {};

                await sequelize.query(`
                    INSERT INTO wms_material_request_lines (
                        request_id, product_id, requested_quantity,
                        available_quantity, reserved_quantity,
                        pending_po_quantity, expected_po_date,
                        line_notes, status
                    ) VALUES (
                        :requestId, :productId, :requestedQty,
                        :availableQty, 0,
                        :pendingPo, :expectedDate,
                        :notes, 'pending'
                    )
                `, {
                    replacements: {
                        requestId,
                        productId: line.product_id,
                        requestedQty: line.requested_quantity,
                        availableQty: avail.available_now || 0,
                        pendingPo: avail.pending_from_po || 0,
                        expectedDate: avail.expected_po_date || null,
                        notes: line.notes || null
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });
            }

            await transaction.commit();

            res.json({
                success: true,
                data: { id: requestId, request_number: requestNumber[0].num },
                message: 'Solicitud creada correctamente'
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }

    } catch (error) {
        console.error('[WMS] Error creating material request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Obtener detalle de solicitud
 */
router.get('/material-requests/:id', validateNumericId(), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const requestId = req.params.id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const request = await sequelize.query(`
            SELECT mr.*,
                   u.email as requester_email,
                   d.name as requester_department,
                   w.name as source_warehouse_name,
                   dw.name as dest_warehouse_name,
                   du.email as dest_employee_email,
                   dd.name as dest_department_name
            FROM wms_material_requests mr
            LEFT JOIN users u ON mr.requested_by = u.user_id
            LEFT JOIN departments d ON mr.requester_department_id = d.id
            LEFT JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
            LEFT JOIN wms_warehouses dw ON mr.destination_warehouse_id = dw.id
            LEFT JOIN users du ON mr.destination_employee_id = du.user_id
            LEFT JOIN departments dd ON mr.destination_department_id = dd.id
            WHERE mr.id = :requestId AND mr.company_id = :companyId
        `, {
            replacements: { requestId, companyId },
            type: QueryTypes.SELECT
        });

        if (!request.length) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const lines = await sequelize.query(`
            SELECT mrl.*,
                   p.internal_code, p.description, p.unit_measure,
                   p.barcode
            FROM wms_material_request_lines mrl
            JOIN wms_products p ON mrl.product_id = p.id
            WHERE mrl.request_id = :requestId
            ORDER BY mrl.id
        `, {
            replacements: { requestId },
            type: QueryTypes.SELECT
        });

        const history = await sequelize.query(`
            SELECT mrh.*, u.email as changed_by_email
            FROM wms_material_request_history mrh
            LEFT JOIN users u ON mrh.changed_by = u.user_id
            WHERE mrh.request_id = :requestId
            ORDER BY mrh.changed_at DESC
        `, {
            replacements: { requestId },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                ...request[0],
                lines,
                history
            }
        });

    } catch (error) {
        console.error('[WMS] Error getting material request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Aprobar/Rechazar solicitud (Responsable de almacén)
 */
router.post('/material-requests/:id/approve', validateNumericId(), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id || req.user.id;
        const requestId = req.params.id;
        const { action, notes, auto_reserve } = req.body; // action: approve, reject
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // Verificar permiso
        const request = await sequelize.query(`
            SELECT mr.*, ws.can_approve_requests
            FROM wms_material_requests mr
            LEFT JOIN wms_warehouse_staff ws ON ws.warehouse_id = mr.source_warehouse_id AND ws.user_id = :userId
            WHERE mr.id = :requestId AND mr.company_id = :companyId
        `, {
            replacements: { requestId, companyId, userId },
            type: QueryTypes.SELECT
        });

        if (!request.length) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
        if (!request[0].can_approve_requests && !isAdmin) {
            return res.status(403).json({ success: false, error: 'No tiene permisos para aprobar solicitudes' });
        }

        if (request[0].status !== 'submitted') {
            return res.status(400).json({ success: false, error: 'La solicitud no está en estado pendiente de aprobación' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        const transaction = await sequelize.transaction();

        try {
            // Actualizar estado
            await sequelize.query(`
                UPDATE wms_material_requests
                SET status = :newStatus,
                    approved_by = :userId,
                    approved_at = NOW(),
                    approval_notes = :notes,
                    updated_at = NOW()
                WHERE id = :requestId
            `, {
                replacements: { requestId, newStatus, userId, notes: notes || null },
                type: QueryTypes.UPDATE,
                transaction
            });

            // Si se aprueba y auto_reserve es true, hacer reservas
            if (action === 'approve' && auto_reserve) {
                const lines = await sequelize.query(`
                    SELECT mrl.*, s.quantity_on_hand, s.quantity_reserved
                    FROM wms_material_request_lines mrl
                    LEFT JOIN wms_stock s ON s.product_id = mrl.product_id
                        AND s.warehouse_id = (SELECT source_warehouse_id FROM wms_material_requests WHERE id = :requestId)
                    WHERE mrl.request_id = :requestId
                `, {
                    replacements: { requestId },
                    type: QueryTypes.SELECT,
                    transaction
                });

                let allReserved = true;
                for (const line of lines) {
                    const availableToReserve = (line.quantity_on_hand || 0) - (line.quantity_reserved || 0);
                    const toReserve = Math.min(line.requested_quantity, availableToReserve);

                    if (toReserve > 0) {
                        // Reservar en stock
                        await sequelize.query(`
                            UPDATE wms_stock
                            SET quantity_reserved = quantity_reserved + :toReserve
                            WHERE product_id = :productId
                              AND warehouse_id = (SELECT source_warehouse_id FROM wms_material_requests WHERE id = :requestId)
                        `, {
                            replacements: { toReserve, productId: line.product_id, requestId },
                            type: QueryTypes.UPDATE,
                            transaction
                        });

                        // Actualizar línea
                        await sequelize.query(`
                            UPDATE wms_material_request_lines
                            SET reserved_quantity = :toReserve,
                                status = CASE WHEN :toReserve >= requested_quantity THEN 'reserved' ELSE 'partial' END
                            WHERE id = :lineId
                        `, {
                            replacements: { toReserve, lineId: line.id },
                            type: QueryTypes.UPDATE,
                            transaction
                        });
                    }

                    if (toReserve < line.requested_quantity) {
                        allReserved = false;
                    }
                }

                // Actualizar estado de reserva
                await sequelize.query(`
                    UPDATE wms_material_requests
                    SET reservation_status = :status
                    WHERE id = :requestId
                `, {
                    replacements: {
                        requestId,
                        status: allReserved ? 'fully_reserved' : 'partially_reserved'
                    },
                    type: QueryTypes.UPDATE,
                    transaction
                });
            }

            await transaction.commit();

            res.json({
                success: true,
                message: action === 'approve' ? 'Solicitud aprobada' : 'Solicitud rechazada'
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }

    } catch (error) {
        console.error('[WMS] Error approving material request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Convertir solicitud a transferencia o nota de entrega
 */
router.post('/material-requests/:id/convert', validateNumericId(), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id || req.user.id;
        const requestId = req.params.id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const request = await sequelize.query(`
            SELECT * FROM wms_material_requests
            WHERE id = :requestId AND company_id = :companyId
        `, {
            replacements: { requestId, companyId },
            type: QueryTypes.SELECT
        });

        if (!request.length) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        const req_data = request[0];

        if (!['approved', 'reserved', 'prepared'].includes(req_data.status)) {
            return res.status(400).json({
                success: false,
                error: 'La solicitud debe estar aprobada/reservada/preparada para convertir'
            });
        }

        const transaction = await sequelize.transaction();

        try {
            let generatedDocId = null;
            let generatedDocType = null;
            let generatedDocNumber = null;

            if (req_data.destination_type === 'WAREHOUSE') {
                // Crear TRANSFERENCIA
                const transferNumber = await sequelize.query(
                    "SELECT 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('wms_transfer_seq')::text, 6, '0') as num",
                    { type: QueryTypes.SELECT, transaction }
                );

                const [transferResult] = await sequelize.query(`
                    INSERT INTO wms_transfers (
                        company_id, transfer_number, source_warehouse_id, destination_warehouse_id,
                        status, priority, notes, created_by, origin_request_id
                    ) VALUES (
                        :companyId, :transferNumber, :sourceId, :destId,
                        'pending', :priority, :notes, :userId, :requestId
                    ) RETURNING id
                `, {
                    replacements: {
                        companyId,
                        transferNumber: transferNumber[0].num,
                        sourceId: req_data.source_warehouse_id,
                        destId: req_data.destination_warehouse_id,
                        priority: req_data.priority,
                        notes: 'Generado desde solicitud ' + req_data.request_number,
                        userId,
                        requestId
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                generatedDocId = transferResult[0].id;
                generatedDocType = 'TRANSFER';
                generatedDocNumber = transferNumber[0].num;

                // Copiar líneas
                await sequelize.query(`
                    INSERT INTO wms_transfer_lines (transfer_id, product_id, quantity, lot_number, notes)
                    SELECT :transferId, product_id, requested_quantity, NULL, line_notes
                    FROM wms_material_request_lines
                    WHERE request_id = :requestId
                `, {
                    replacements: { transferId: generatedDocId, requestId },
                    type: QueryTypes.INSERT,
                    transaction
                });

            } else {
                // Crear NOTA DE ENTREGA (para SECTOR, EMPLOYEE, PROJECT)
                const deliveryNumber = await sequelize.query(
                    "SELECT 'ENT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('wms_delivery_seq')::text, 6, '0') as num",
                    { type: QueryTypes.SELECT, transaction }
                );

                const [deliveryResult] = await sequelize.query(`
                    INSERT INTO wms_delivery_notes (
                        company_id, delivery_number, source_warehouse_id,
                        recipient_type, recipient_employee_id, recipient_department_id, recipient_project_id,
                        status, notes, created_by, origin_request_id
                    ) VALUES (
                        :companyId, :deliveryNumber, :sourceId,
                        :recipientType, :empId, :deptId, :projId,
                        'pending', :notes, :userId, :requestId
                    ) RETURNING id
                `, {
                    replacements: {
                        companyId,
                        deliveryNumber: deliveryNumber[0].num,
                        sourceId: req_data.source_warehouse_id,
                        recipientType: req_data.destination_type,
                        empId: req_data.destination_employee_id,
                        deptId: req_data.destination_department_id,
                        projId: req_data.destination_project_id,
                        notes: 'Generado desde solicitud ' + req_data.request_number,
                        userId,
                        requestId
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                generatedDocId = deliveryResult[0].id;
                generatedDocType = 'DELIVERY_NOTE';
                generatedDocNumber = deliveryNumber[0].num;

                // Copiar líneas
                await sequelize.query(`
                    INSERT INTO wms_delivery_note_lines (delivery_note_id, product_id, quantity, notes)
                    SELECT :deliveryId, product_id, requested_quantity, line_notes
                    FROM wms_material_request_lines
                    WHERE request_id = :requestId
                `, {
                    replacements: { deliveryId: generatedDocId, requestId },
                    type: QueryTypes.INSERT,
                    transaction
                });
            }

            // Actualizar solicitud
            await sequelize.query(`
                UPDATE wms_material_requests
                SET status = 'converted',
                    generated_document_type = :docType,
                    generated_document_id = :docId,
                    converted_by = :userId,
                    converted_at = NOW(),
                    updated_at = NOW()
                WHERE id = :requestId
            `, {
                replacements: { requestId, docType: generatedDocType, docId: generatedDocId, userId },
                type: QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            res.json({
                success: true,
                data: {
                    document_type: generatedDocType,
                    document_id: generatedDocId,
                    document_number: generatedDocNumber
                },
                message: `Solicitud convertida a ${generatedDocType === 'TRANSFER' ? 'Transferencia' : 'Nota de Entrega'}: ${generatedDocNumber}`
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }

    } catch (error) {
        console.error('[WMS] Error converting material request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Verificar disponibilidad de productos para una solicitud
 */
router.post('/material-requests/check-availability', async (req, res) => {
    try {
        const { warehouse_id, required_date, lines } = req.body;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        if (!warehouse_id || !required_date || !lines || lines.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos'
            });
        }

        const results = [];

        for (const line of lines) {
            const availability = await sequelize.query(
                'SELECT * FROM wms_check_material_availability(:productId, :warehouseId, :quantity, :requiredDate)',
                {
                    replacements: {
                        productId: line.product_id,
                        warehouseId: warehouse_id,
                        quantity: line.requested_quantity,
                        requiredDate: required_date
                    },
                    type: QueryTypes.SELECT
                }
            );

            results.push({
                product_id: line.product_id,
                requested_quantity: line.requested_quantity,
                ...availability[0]
            });
        }

        res.json({ success: true, data: results });

    } catch (error) {
        console.error('[WMS] Error checking availability:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Staff de almacén (empleados asignados)
 */
router.get('/warehouses/:id/staff', validateNumericId(), async (req, res) => {
    try {
        const warehouseId = req.params.id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const staff = await sequelize.query(`
            SELECT ws.*,
                   u.email, u.role as user_role,
                   d.name as department_name
            FROM wms_warehouse_staff ws
            JOIN users u ON ws.user_id = u.user_id
            LEFT JOIN departments d ON ws.department_id = d.id
            WHERE ws.warehouse_id = :warehouseId AND ws.is_active = true
            ORDER BY ws.role_in_warehouse DESC, u.email
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        res.json({ success: true, data: staff });

    } catch (error) {
        console.error('[WMS] Error getting warehouse staff:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Asignar empleado a almacén
 */
router.post('/warehouses/:id/staff', validateNumericId(), async (req, res) => {
    try {
        const warehouseId = req.params.id;
        const { user_id, role_in_warehouse, can_approve_requests, can_approve_transfers, is_primary } = req.body;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // Verificar si ya existe
        const existing = await sequelize.query(`
            SELECT id FROM wms_warehouse_staff
            WHERE warehouse_id = :warehouseId AND user_id = :userId
        `, {
            replacements: { warehouseId, userId: user_id },
            type: QueryTypes.SELECT
        });

        if (existing.length > 0) {
            // Actualizar
            await sequelize.query(`
                UPDATE wms_warehouse_staff SET
                    role_in_warehouse = :role,
                    can_approve_requests = :canApproveReq,
                    can_approve_transfers = :canApproveTrf,
                    is_primary = :isPrimary,
                    is_active = true,
                    updated_at = NOW()
                WHERE id = :id
            `, {
                replacements: {
                    id: existing[0].id,
                    role: role_in_warehouse || 'operator',
                    canApproveReq: can_approve_requests || false,
                    canApproveTrf: can_approve_transfers || false,
                    isPrimary: is_primary || false
                },
                type: QueryTypes.UPDATE
            });
        } else {
            // Insertar
            await sequelize.query(`
                INSERT INTO wms_warehouse_staff (
                    company_id, warehouse_id, user_id, role_in_warehouse,
                    can_approve_requests, can_approve_transfers, is_primary
                ) VALUES (
                    (SELECT company_id FROM wms_warehouses w JOIN wms_branches b ON w.branch_id = b.id WHERE w.id = :warehouseId),
                    :warehouseId, :userId, :role,
                    :canApproveReq, :canApproveTrf, :isPrimary
                )
            `, {
                replacements: {
                    warehouseId,
                    userId: user_id,
                    role: role_in_warehouse || 'operator',
                    canApproveReq: can_approve_requests || false,
                    canApproveTrf: can_approve_transfers || false,
                    isPrimary: is_primary || false
                },
                type: QueryTypes.INSERT
            });
        }

        res.json({ success: true, message: 'Empleado asignado correctamente' });

    } catch (error) {
        console.error('[WMS] Error assigning warehouse staff:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// INTEGRACION WMS ↔ COMPRAS
// ============================================================================

/**
 * Generar solicitud de compra para items sin stock de una solicitud de material
 */
router.post('/material-requests/:id/generate-purchase-request', validateNumericId(), async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id || req.user.id;
        const requestId = req.params.id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // 1. Obtener solicitud y lineas sin stock
        const request = await sequelize.query(`
            SELECT mr.*, w.name as warehouse_name
            FROM wms_material_requests mr
            JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
            WHERE mr.id = :requestId AND mr.company_id = :companyId
        `, {
            replacements: { requestId, companyId },
            type: QueryTypes.SELECT
        });

        if (!request.length) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        // 2. Obtener lineas que necesitan compra (sin stock disponible)
        const itemsNeedPurchase = await sequelize.query(`
            SELECT
                mrl.*,
                p.internal_code,
                p.description,
                p.unit_of_measure_id,
                p.preferred_supplier_id,
                p.last_purchase_price,
                p.avg_purchase_price,
                p.lead_time_days,
                u.code as unit_code,
                s.name as preferred_supplier_name,
                COALESCE(st.quantity_on_hand, 0) as current_stock,
                COALESCE(st.quantity_reserved, 0) as reserved_stock,
                GREATEST(0, mrl.requested_quantity - COALESCE(mrl.available_quantity, 0)) as qty_to_purchase
            FROM wms_material_request_lines mrl
            JOIN wms_products p ON mrl.product_id = p.id
            LEFT JOIN wms_units_of_measure u ON p.unit_of_measure_id = u.id
            LEFT JOIN wms_suppliers s ON p.preferred_supplier_id = s.id
            LEFT JOIN wms_stock st ON st.product_id = p.id
                AND st.warehouse_id = (SELECT source_warehouse_id FROM wms_material_requests WHERE id = :requestId)
            WHERE mrl.request_id = :requestId
              AND mrl.available_quantity < mrl.requested_quantity
        `, {
            replacements: { requestId },
            type: QueryTypes.SELECT
        });

        if (itemsNeedPurchase.length === 0) {
            return res.json({
                success: true,
                message: 'Todos los items tienen stock disponible, no se requiere compra'
            });
        }

        // 3. Agrupar por proveedor preferido
        const itemsBySupplier = {};
        for (const item of itemsNeedPurchase) {
            const supplierId = item.preferred_supplier_id || 'sin_proveedor';
            if (!itemsBySupplier[supplierId]) {
                itemsBySupplier[supplierId] = {
                    supplier_id: item.preferred_supplier_id,
                    supplier_name: item.preferred_supplier_name || 'Sin proveedor asignado',
                    items: []
                };
            }
            itemsBySupplier[supplierId].items.push(item);
        }

        const transaction = await sequelize.transaction();

        try {
            const createdRequisitions = [];

            // 4. Crear requisicion de compra por cada proveedor
            for (const supplierKey of Object.keys(itemsBySupplier)) {
                const group = itemsBySupplier[supplierKey];

                // Generar numero de requisicion
                const reqNum = await sequelize.query(
                    "SELECT 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('purchase_requisition_seq')::text, 4, '0') as num",
                    { type: QueryTypes.SELECT, transaction }
                );

                // Crear requisicion
                const [reqResult] = await sequelize.query(`
                    INSERT INTO purchase_requisitions (
                        company_id, requisition_number, requester_id,
                        department_id, warehouse_id, priority,
                        required_date, reason, status,
                        origin_type, origin_reference_id
                    ) VALUES (
                        :companyId, :reqNumber, :userId,
                        (SELECT department_id FROM users WHERE user_id = :userId),
                        (SELECT source_warehouse_id FROM wms_material_requests WHERE id = :requestId),
                        :priority, :requiredDate,
                        :reason, 'pending',
                        'MATERIAL_REQUEST', :requestId
                    ) RETURNING id
                `, {
                    replacements: {
                        companyId,
                        reqNumber: reqNum[0].num,
                        userId,
                        requestId,
                        priority: request[0].priority || 'normal',
                        requiredDate: request[0].required_date,
                        reason: 'Generado automaticamente desde Solicitud de Material ' + request[0].request_number
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                const requisitionId = reqResult[0].id;

                // Agregar items a la requisicion
                for (const item of group.items) {
                    await sequelize.query(`
                        INSERT INTO purchase_requisition_items (
                            requisition_id, product_id, quantity,
                            unit_of_measure_id, estimated_unit_price,
                            supplier_id, notes
                        ) VALUES (
                            :requisitionId, :productId, :quantity,
                            :unitId, :estimatedPrice,
                            :supplierId, :notes
                        )
                    `, {
                        replacements: {
                            requisitionId,
                            productId: item.product_id,
                            quantity: item.qty_to_purchase,
                            unitId: item.unit_of_measure_id,
                            estimatedPrice: item.last_purchase_price || item.avg_purchase_price || 0,
                            supplierId: item.preferred_supplier_id,
                            notes: 'Para solicitud de material: ' + request[0].request_number
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    });
                }

                createdRequisitions.push({
                    id: requisitionId,
                    number: reqNum[0].num,
                    supplier: group.supplier_name,
                    items_count: group.items.length
                });
            }

            // 5. Actualizar solicitud de material con referencia
            await sequelize.query(`
                UPDATE wms_material_requests
                SET purchase_request_generated = true,
                    purchase_request_ids = :reqIds,
                    updated_at = NOW()
                WHERE id = :requestId
            `, {
                replacements: {
                    requestId,
                    reqIds: JSON.stringify(createdRequisitions.map(r => r.id))
                },
                type: QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            res.json({
                success: true,
                data: {
                    requisitions_created: createdRequisitions,
                    total_items: itemsNeedPurchase.length
                },
                message: `Se crearon ${createdRequisitions.length} requisicion(es) de compra`
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }

    } catch (error) {
        console.error('[WMS] Error generating purchase request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Verificar ordenes de compra pendientes para un producto
 */
router.get('/products/:id/pending-purchases', validateNumericId(), async (req, res) => {
    try {
        const productId = req.params.id;
        const warehouseId = req.query.warehouse_id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const pendingPurchases = await sequelize.query(`
            SELECT
                po.id as order_id,
                po.po_number,
                po.order_date,
                po.expected_delivery_date,
                po.status,
                poi.quantity as ordered_qty,
                poi.quantity_received,
                poi.quantity - COALESCE(poi.quantity_received, 0) as pending_qty,
                poi.unit_price,
                s.name as supplier_name
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.purchase_order_id = po.id
            JOIN wms_suppliers s ON po.supplier_id = s.id
            WHERE poi.product_id = :productId
              AND po.status IN ('approved', 'sent', 'confirmed', 'partial')
              AND poi.quantity > COALESCE(poi.quantity_received, 0)
              ${warehouseId ? 'AND po.warehouse_id = :warehouseId' : ''}
            ORDER BY po.expected_delivery_date ASC
        `, {
            replacements: { productId, warehouseId: warehouseId || null },
            type: QueryTypes.SELECT
        });

        const totals = pendingPurchases.reduce((acc, po) => {
            acc.total_pending_qty += parseFloat(po.pending_qty) || 0;
            return acc;
        }, { total_pending_qty: 0 });

        res.json({
            success: true,
            data: {
                orders: pendingPurchases,
                summary: {
                    total_orders: pendingPurchases.length,
                    total_pending_qty: totals.total_pending_qty,
                    nearest_delivery: pendingPurchases[0]?.expected_delivery_date || null
                }
            }
        });

    } catch (error) {
        console.error('[WMS] Error getting pending purchases:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Obtener productos con stock critico que necesitan compra
 */
router.get('/warehouses/:id/reorder-alerts', validateNumericId(), async (req, res) => {
    try {
        const warehouseId = req.params.id;
        const companyId = req.user.company_id;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        const alerts = await sequelize.query(`
            SELECT
                p.id as product_id,
                p.internal_code,
                p.description,
                p.unit_of_measure_id,
                u.code as unit_code,
                s.quantity_on_hand,
                s.quantity_reserved,
                s.quantity_on_hand - COALESCE(s.quantity_reserved, 0) as available_qty,
                p.reorder_point,
                p.safety_stock,
                p.min_order_qty,
                p.lead_time_days,
                p.economic_order_qty,
                p.preferred_supplier_id,
                sup.name as preferred_supplier_name,
                p.last_purchase_price,
                CASE
                    WHEN s.quantity_on_hand <= 0 THEN 'SIN_STOCK'
                    WHEN s.quantity_on_hand <= COALESCE(p.safety_stock, 0) THEN 'CRITICO'
                    WHEN s.quantity_on_hand <= COALESCE(p.reorder_point, 0) THEN 'BAJO_PUNTO_REORDEN'
                    ELSE 'NORMAL'
                END as alert_level,
                COALESCE(pending.total_pending, 0) as pending_from_po,
                pending.nearest_delivery
            FROM wms_stock s
            JOIN wms_products p ON s.product_id = p.id
            LEFT JOIN wms_units_of_measure u ON p.unit_of_measure_id = u.id
            LEFT JOIN wms_suppliers sup ON p.preferred_supplier_id = sup.id
            LEFT JOIN LATERAL (
                SELECT
                    SUM(poi.quantity - COALESCE(poi.quantity_received, 0)) as total_pending,
                    MIN(po.expected_delivery_date) as nearest_delivery
                FROM purchase_order_items poi
                JOIN purchase_orders po ON poi.purchase_order_id = po.id
                WHERE poi.product_id = p.id
                  AND po.status IN ('approved', 'sent', 'confirmed', 'partial')
                  AND po.warehouse_id = :warehouseId
                  AND poi.quantity > COALESCE(poi.quantity_received, 0)
            ) pending ON true
            WHERE s.warehouse_id = :warehouseId
              AND (s.quantity_on_hand <= COALESCE(p.reorder_point, 0) OR s.quantity_on_hand <= 0)
              AND p.is_active = true
            ORDER BY
                CASE
                    WHEN s.quantity_on_hand <= 0 THEN 0
                    WHEN s.quantity_on_hand <= COALESCE(p.safety_stock, 0) THEN 1
                    ELSE 2
                END,
                s.quantity_on_hand ASC
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                alerts,
                summary: {
                    total_alerts: alerts.length,
                    sin_stock: alerts.filter(a => a.alert_level === 'SIN_STOCK').length,
                    critico: alerts.filter(a => a.alert_level === 'CRITICO').length,
                    bajo_reorden: alerts.filter(a => a.alert_level === 'BAJO_PUNTO_REORDEN').length
                }
            }
        });

    } catch (error) {
        console.error('[WMS] Error getting reorder alerts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Generar requisiciones de compra automaticas para stock critico
 */
router.post('/warehouses/:id/auto-reorder', validateNumericId(), async (req, res) => {
    try {
        const warehouseId = req.params.id;
        const companyId = req.user.company_id;
        const userId = req.user.user_id || req.user.id;
        const { only_critical, product_ids } = req.body;
        const { sequelize } = require('../config/database');
        const { QueryTypes } = require('sequelize');

        // 1. Obtener productos que necesitan reorden
        let whereExtra = '';
        if (only_critical) {
            whereExtra = 'AND s.quantity_on_hand <= COALESCE(p.safety_stock, 0)';
        }
        if (product_ids && product_ids.length > 0) {
            whereExtra += ` AND p.id IN (${product_ids.map(id => parseInt(id)).join(',')})`;
        }

        const productsToReorder = await sequelize.query(`
            SELECT
                p.id,
                p.internal_code,
                p.description,
                p.unit_of_measure_id,
                p.preferred_supplier_id,
                p.economic_order_qty,
                p.reorder_qty,
                p.min_order_qty,
                p.last_purchase_price,
                s.quantity_on_hand,
                s.quantity_reserved,
                GREATEST(
                    COALESCE(p.economic_order_qty, p.reorder_qty, p.min_order_qty, 1),
                    COALESCE(p.reorder_point, 0) - s.quantity_on_hand + COALESCE(s.quantity_reserved, 0)
                ) as suggested_qty
            FROM wms_stock s
            JOIN wms_products p ON s.product_id = p.id
            WHERE s.warehouse_id = :warehouseId
              AND s.quantity_on_hand <= COALESCE(p.reorder_point, 0)
              AND p.is_active = true
              AND p.is_purchasable = true
              ${whereExtra}
        `, {
            replacements: { warehouseId },
            type: QueryTypes.SELECT
        });

        if (productsToReorder.length === 0) {
            return res.json({
                success: true,
                message: 'No hay productos que requieran reorden en este momento'
            });
        }

        // 2. Agrupar por proveedor
        const itemsBySupplier = {};
        for (const product of productsToReorder) {
            const supplierId = product.preferred_supplier_id || 'sin_proveedor';
            if (!itemsBySupplier[supplierId]) {
                itemsBySupplier[supplierId] = [];
            }
            itemsBySupplier[supplierId].push(product);
        }

        const transaction = await sequelize.transaction();

        try {
            const createdRequisitions = [];

            for (const supplierKey of Object.keys(itemsBySupplier)) {
                if (supplierKey === 'sin_proveedor') continue; // Saltar productos sin proveedor asignado

                const items = itemsBySupplier[supplierKey];

                // Generar numero
                const reqNum = await sequelize.query(
                    "SELECT 'REQ-AUTO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('purchase_requisition_seq')::text, 4, '0') as num",
                    { type: QueryTypes.SELECT, transaction }
                );

                // Crear requisicion
                const [reqResult] = await sequelize.query(`
                    INSERT INTO purchase_requisitions (
                        company_id, requisition_number, requester_id,
                        warehouse_id, priority, required_date,
                        reason, status, origin_type
                    ) VALUES (
                        :companyId, :reqNumber, :userId,
                        :warehouseId, 'high',
                        CURRENT_DATE + INTERVAL '7 days',
                        'Reorden automatico por stock bajo', 'pending',
                        'AUTO_REORDER'
                    ) RETURNING id
                `, {
                    replacements: { companyId, reqNumber: reqNum[0].num, userId, warehouseId },
                    type: QueryTypes.INSERT,
                    transaction
                });

                const requisitionId = reqResult[0].id;

                // Agregar items
                for (const item of items) {
                    await sequelize.query(`
                        INSERT INTO purchase_requisition_items (
                            requisition_id, product_id, quantity,
                            unit_of_measure_id, estimated_unit_price,
                            supplier_id
                        ) VALUES (
                            :requisitionId, :productId, :quantity,
                            :unitId, :price, :supplierId
                        )
                    `, {
                        replacements: {
                            requisitionId,
                            productId: item.id,
                            quantity: item.suggested_qty,
                            unitId: item.unit_of_measure_id,
                            price: item.last_purchase_price || 0,
                            supplierId: item.preferred_supplier_id
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    });
                }

                createdRequisitions.push({
                    id: requisitionId,
                    number: reqNum[0].num,
                    items_count: items.length
                });
            }

            await transaction.commit();

            const skippedNoSupplier = itemsBySupplier['sin_proveedor']?.length || 0;

            res.json({
                success: true,
                data: {
                    requisitions_created: createdRequisitions,
                    total_products: productsToReorder.length,
                    skipped_no_supplier: skippedNoSupplier
                },
                message: `Se crearon ${createdRequisitions.length} requisicion(es) de compra automatica. ${skippedNoSupplier > 0 ? `${skippedNoSupplier} productos sin proveedor asignado.` : ''}`
            });

        } catch (innerError) {
            await transaction.rollback();
            throw innerError;
        }

    } catch (error) {
        console.error('[WMS] Error in auto-reorder:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
