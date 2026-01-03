/**
 * Warehouse Management System (WMS) Routes
 * Sistema de Gestión de Almacenes y Depósitos
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
// WAREHOUSES (Depósitos)
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
// TRANSFERENCIAS ENTRE DEPÓSITOS
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

module.exports = router;
