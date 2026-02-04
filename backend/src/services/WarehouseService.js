/**
 * Warehouse Management System (WMS) Service
 * Sistema de Gestión de Almacenes y Depósitos
 *
 * Business logic for multi-tenant warehouse management
 */

const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

class WarehouseService {
    // ========================================================================
    // BRANCHES (Sucursales)
    // ========================================================================

    static async getBranches(companyId) {
        const query = `
            SELECT b.*,
                   (SELECT COUNT(*) FROM wms_warehouses WHERE branch_id = b.id AND is_active = true) as warehouse_count
            FROM wms_branches b
            WHERE b.company_id = :companyId AND b.is_active = true
            ORDER BY b.name
        `;
        return sequelize.query(query, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });
    }

    static async createBranch(companyId, data) {
        const query = `
            INSERT INTO wms_branches (company_id, code, name, address, city, province, country_code, phone, email, is_main, config)
            VALUES (:companyId, :code, :name, :address, :city, :province, :countryCode, :phone, :email, :isMain, :config)
            RETURNING *
        `;
        const [branch] = await sequelize.query(query, {
            replacements: {
                companyId,
                code: data.code,
                name: data.name,
                address: data.address || null,
                city: data.city || null,
                province: data.province || null,
                countryCode: data.country_code || 'AR',
                phone: data.phone || null,
                email: data.email || null,
                isMain: data.is_main || false,
                config: JSON.stringify(data.config || {})
            },
            type: QueryTypes.INSERT
        });
        return branch[0];
    }

    static async updateBranch(companyId, branchId, data) {
        const query = `
            UPDATE wms_branches SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                address = COALESCE(:address, address),
                city = COALESCE(:city, city),
                province = COALESCE(:province, province),
                country_code = COALESCE(:countryCode, country_code),
                phone = COALESCE(:phone, phone),
                email = COALESCE(:email, email),
                is_main = COALESCE(:isMain, is_main),
                config = COALESCE(:config, config),
                updated_at = NOW()
            WHERE id = :branchId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                branchId,
                companyId,
                code: data.code || null,
                name: data.name || null,
                address: data.address,
                city: data.city,
                province: data.province,
                countryCode: data.country_code,
                phone: data.phone,
                email: data.email,
                isMain: data.is_main,
                config: data.config ? JSON.stringify(data.config) : null
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deleteBranch(companyId, branchId) {
        const query = `
            UPDATE wms_branches SET is_active = false, updated_at = NOW()
            WHERE id = :branchId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { branchId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    // ========================================================================
    // WAREHOUSES (Depósitos)
    // ========================================================================

    static async getWarehouses(companyId, branchId = null) {
        // Query resiliente: usa 0 si unit_cost no existe
        let query = `
            SELECT w.*, b.name as branch_name,
                   (SELECT COUNT(DISTINCT product_id) FROM wms_stock WHERE warehouse_id = w.id) as product_count,
                   (SELECT COALESCE(SUM(quantity), 0) FROM wms_stock WHERE warehouse_id = w.id) as total_quantity
            FROM wms_warehouses w
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = :companyId AND w.is_active = true
        `;
        const replacements = { companyId };

        if (branchId) {
            query += ` AND w.branch_id = :branchId`;
            replacements.branchId = branchId;
        }

        query += ` ORDER BY b.name, w.name`;

        try {
            return await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });
        } catch (error) {
            // Si falla, intentar query sin subqueries complejas
            console.error('[WMS] Error in getWarehouses, trying simple query:', error.message);
            const simpleQuery = `
                SELECT w.*, b.name as branch_name, 0 as product_count, 0 as total_quantity
                FROM wms_warehouses w
                JOIN wms_branches b ON w.branch_id = b.id
                WHERE b.company_id = :companyId AND w.is_active = true
                ORDER BY b.name, w.name
            `;
            return sequelize.query(simpleQuery, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });
        }
    }

    static async createWarehouse(companyId, data) {
        // First verify branch belongs to company
        const verifyQuery = `SELECT id FROM wms_branches WHERE id = :branchId AND company_id = :companyId`;
        const [branch] = await sequelize.query(verifyQuery, {
            replacements: { branchId: data.branch_id, companyId },
            type: QueryTypes.SELECT
        });

        if (!branch) {
            throw new Error('Branch not found or does not belong to company');
        }

        const query = `
            INSERT INTO wms_warehouses (branch_id, code, name, warehouse_type, address, allows_negative_stock,
                                        default_costing_method, config)
            VALUES (:branchId, :code, :name, :warehouseType, :address, :allowsNegativeStock,
                    :defaultCostingMethod, :config)
            RETURNING *
        `;
        const [warehouse] = await sequelize.query(query, {
            replacements: {
                branchId: data.branch_id,
                code: data.code,
                name: data.name,
                warehouseType: data.warehouse_type || 'warehouse',
                address: data.address || null,
                allowsNegativeStock: data.allows_negative_stock || false,
                defaultCostingMethod: data.default_costing_method || 'weighted_average',
                config: JSON.stringify(data.config || {})
            },
            type: QueryTypes.INSERT
        });
        return warehouse[0];
    }

    static async updateWarehouse(companyId, warehouseId, data) {
        const query = `
            UPDATE wms_warehouses w SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                warehouse_type = COALESCE(:warehouseType, warehouse_type),
                address = COALESCE(:address, address),
                allows_negative_stock = COALESCE(:allowsNegativeStock, allows_negative_stock),
                default_costing_method = COALESCE(:defaultCostingMethod, default_costing_method),
                config = COALESCE(:config, config),
                updated_at = NOW()
            FROM wms_branches b
            WHERE w.id = :warehouseId AND w.branch_id = b.id AND b.company_id = :companyId
            RETURNING w.*
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                warehouseId,
                companyId,
                code: data.code || null,
                name: data.name || null,
                warehouseType: data.warehouse_type || null,
                address: data.address,
                allowsNegativeStock: data.allows_negative_stock,
                defaultCostingMethod: data.default_costing_method,
                config: data.config ? JSON.stringify(data.config) : null
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deleteWarehouse(companyId, warehouseId) {
        const query = `
            UPDATE wms_warehouses w SET is_active = false, updated_at = NOW()
            FROM wms_branches b
            WHERE w.id = :warehouseId AND w.branch_id = b.id AND b.company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    // ========================================================================
    // CATEGORIES (Rubros/Subrubros)
    // ========================================================================

    static async getCategories(companyId, branchId = null) {
        const query = `
            WITH RECURSIVE category_tree AS (
                SELECT c.*, 0 as level,
                       ARRAY[c.id] as path
                FROM wms_categories c
                WHERE c.company_id = :companyId AND c.parent_id IS NULL AND c.is_active = true
                  AND (c.branch_id IS NULL OR c.branch_id = :branchId OR :branchId IS NULL)

                UNION ALL

                SELECT c.*, ct.level + 1,
                       ct.path || c.id
                FROM wms_categories c
                JOIN category_tree ct ON c.parent_id = ct.id
                WHERE c.is_active = true
            )
            SELECT ct.*,
                   (SELECT COUNT(*) FROM wms_products WHERE category_id = ct.id AND is_active = true) as product_count
            FROM category_tree ct
            ORDER BY ct.path
        `;
        return sequelize.query(query, {
            replacements: { companyId, branchId },
            type: QueryTypes.SELECT
        });
    }

    static async createCategory(companyId, data) {
        const query = `
            INSERT INTO wms_categories (company_id, branch_id, parent_id, code, name, description,
                                        default_margin_percent, image_url, sort_order)
            VALUES (:companyId, :branchId, :parentId, :code, :name, :description,
                    :defaultMarginPercent, :imageUrl, :sortOrder)
            RETURNING *
        `;
        const [category] = await sequelize.query(query, {
            replacements: {
                companyId,
                branchId: data.branch_id || null,
                parentId: data.parent_id || null,
                code: data.code,
                name: data.name,
                description: data.description || null,
                defaultMarginPercent: data.default_margin_percent || null,
                imageUrl: data.image_url || null,
                sortOrder: data.sort_order || 0
            },
            type: QueryTypes.INSERT
        });
        return category[0];
    }

    static async updateCategory(companyId, categoryId, data) {
        const query = `
            UPDATE wms_categories SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                description = COALESCE(:description, description),
                parent_id = COALESCE(:parentId, parent_id),
                default_margin_percent = COALESCE(:defaultMarginPercent, default_margin_percent),
                image_url = COALESCE(:imageUrl, image_url),
                sort_order = COALESCE(:sortOrder, sort_order),
                updated_at = NOW()
            WHERE id = :categoryId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                categoryId,
                companyId,
                code: data.code || null,
                name: data.name || null,
                description: data.description,
                parentId: data.parent_id,
                defaultMarginPercent: data.default_margin_percent,
                imageUrl: data.image_url,
                sortOrder: data.sort_order
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deleteCategory(companyId, categoryId) {
        // Check for products
        const checkQuery = `SELECT COUNT(*) as count FROM wms_products WHERE category_id = :categoryId AND is_active = true`;
        const [check] = await sequelize.query(checkQuery, {
            replacements: { categoryId },
            type: QueryTypes.SELECT
        });

        if (parseInt(check.count) > 0) {
            throw new Error('Cannot delete category with active products');
        }

        const query = `
            UPDATE wms_categories SET is_active = false, updated_at = NOW()
            WHERE id = :categoryId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { categoryId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    // ========================================================================
    // BRANDS (Marcas)
    // ========================================================================

    static async getBrands(companyId) {
        const query = `
            SELECT b.*,
                   (SELECT COUNT(*) FROM wms_products WHERE brand_id = b.id AND is_active = true) as product_count
            FROM wms_brands b
            WHERE b.company_id = :companyId AND b.is_active = true
            ORDER BY b.name
        `;
        return sequelize.query(query, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });
    }

    static async createBrand(companyId, data) {
        const query = `
            INSERT INTO wms_brands (company_id, code, name, logo_url)
            VALUES (:companyId, :code, :name, :logoUrl)
            RETURNING *
        `;
        const [brand] = await sequelize.query(query, {
            replacements: {
                companyId,
                code: data.code || null,
                name: data.name,
                logoUrl: data.logo_url || null
            },
            type: QueryTypes.INSERT
        });
        return brand[0];
    }

    static async updateBrand(companyId, brandId, data) {
        const query = `
            UPDATE wms_brands SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                logo_url = COALESCE(:logoUrl, logo_url),
                updated_at = NOW()
            WHERE id = :brandId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                brandId,
                companyId,
                code: data.code,
                name: data.name,
                logoUrl: data.logo_url
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deleteBrand(companyId, brandId) {
        const query = `
            UPDATE wms_brands SET is_active = false, updated_at = NOW()
            WHERE id = :brandId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { brandId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    // ========================================================================
    // SUPPLIERS (Proveedores)
    // ========================================================================

    static async getSuppliers(companyId) {
        const query = `
            SELECT s.*,
                   (SELECT COUNT(*) FROM wms_products WHERE supplier_id = s.id AND is_active = true) as product_count
            FROM wms_suppliers s
            WHERE s.company_id = :companyId AND s.is_active = true
            ORDER BY s.name
        `;
        return sequelize.query(query, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });
    }

    static async createSupplier(companyId, data) {
        const query = `
            INSERT INTO wms_suppliers (company_id, code, name, tax_id, contact_name, phone, email,
                                       address, city, province, country_code, payment_terms, notes)
            VALUES (:companyId, :code, :name, :taxId, :contactName, :phone, :email,
                    :address, :city, :province, :countryCode, :paymentTerms, :notes)
            RETURNING *
        `;
        const [supplier] = await sequelize.query(query, {
            replacements: {
                companyId,
                code: data.code || null,
                name: data.name,
                taxId: data.tax_id || null,
                contactName: data.contact_name || null,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                city: data.city || null,
                province: data.province || null,
                countryCode: data.country_code || 'AR',
                paymentTerms: data.payment_terms || null,
                notes: data.notes || null
            },
            type: QueryTypes.INSERT
        });
        return supplier[0];
    }

    static async updateSupplier(companyId, supplierId, data) {
        const query = `
            UPDATE wms_suppliers SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                tax_id = COALESCE(:taxId, tax_id),
                contact_name = COALESCE(:contactName, contact_name),
                phone = COALESCE(:phone, phone),
                email = COALESCE(:email, email),
                address = COALESCE(:address, address),
                city = COALESCE(:city, city),
                province = COALESCE(:province, province),
                country_code = COALESCE(:countryCode, country_code),
                payment_terms = COALESCE(:paymentTerms, payment_terms),
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :supplierId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                supplierId,
                companyId,
                code: data.code,
                name: data.name,
                taxId: data.tax_id,
                contactName: data.contact_name,
                phone: data.phone,
                email: data.email,
                address: data.address,
                city: data.city,
                province: data.province,
                countryCode: data.country_code,
                paymentTerms: data.payment_terms,
                notes: data.notes
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deleteSupplier(companyId, supplierId) {
        const query = `
            UPDATE wms_suppliers SET is_active = false, updated_at = NOW()
            WHERE id = :supplierId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { supplierId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    // ========================================================================
    // PRODUCTS (Artículos)
    // ========================================================================

    static async getProducts(companyId, filters = {}) {
        const { branch_id, category_id, brand_id, supplier_id, product_type, search, is_active, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        let whereConditions = ['p.company_id = :companyId'];
        const replacements = { companyId, limit, offset };

        // NOTA: branch_id filtro removido porque wms_products no tiene esa columna
        // Los productos se asocian a través de wms_stock → warehouse → branch
        // if (branch_id) {
        //     whereConditions.push('p.branch_id = :branchId');
        //     replacements.branchId = branch_id;
        // }
        if (category_id) {
            whereConditions.push('p.category_id = :categoryId');
            replacements.categoryId = category_id;
        }
        if (brand_id) {
            whereConditions.push('p.brand_id = :brandId');
            replacements.brandId = brand_id;
        }
        if (supplier_id) {
            whereConditions.push('p.supplier_id = :supplierId');
            replacements.supplierId = supplier_id;
        }
        if (product_type) {
            whereConditions.push('p.product_type = :productType');
            replacements.productType = product_type;
        }
        if (is_active !== undefined) {
            whereConditions.push('p.is_active = :isActive');
            replacements.isActive = is_active === 'true' || is_active === true;
        } else {
            whereConditions.push('p.is_active = true');
        }
        if (search) {
            whereConditions.push(`(
                p.internal_code ILIKE :search OR
                p.description ILIKE :search OR
                p.description_alt ILIKE :search OR
                EXISTS (SELECT 1 FROM wms_product_barcodes pb WHERE pb.product_id = p.id AND pb.barcode ILIKE :search)
            )`);
            replacements.search = `%${search}%`;
        }

        const whereClause = whereConditions.join(' AND ');

        const countQuery = `SELECT COUNT(*) as total FROM wms_products p WHERE ${whereClause}`;
        const [countResult] = await sequelize.query(countQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        const query = `
            SELECT p.*,
                   c.name as category_name,
                   br.name as brand_name,
                   s.name as supplier_name,
                   (SELECT barcode FROM wms_product_barcodes WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_barcode,
                   (SELECT COALESCE(SUM(quantity), 0) FROM wms_stock WHERE product_id = p.id) as total_stock
            FROM wms_products p
            LEFT JOIN wms_categories c ON p.category_id = c.id
            LEFT JOIN wms_brands br ON p.brand_id = br.id
            LEFT JOIN wms_suppliers s ON p.supplier_id = s.id
            WHERE ${whereClause}
            ORDER BY p.description
            LIMIT :limit OFFSET :offset
        `;

        const products = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            data: products,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.total),
                pages: Math.ceil(parseInt(countResult.total) / limit)
            }
        };
    }

    static async getProductById(companyId, productId) {
        const query = `
            SELECT p.*,
                   c.name as category_name, c.code as category_code,
                   br.name as brand_name,
                   s.name as supplier_name
            FROM wms_products p
            LEFT JOIN wms_categories c ON p.category_id = c.id
            LEFT JOIN wms_brands br ON p.brand_id = br.id
            LEFT JOIN wms_suppliers s ON p.supplier_id = s.id
            WHERE p.id = :productId AND p.company_id = :companyId
        `;
        const [product] = await sequelize.query(query, {
            replacements: { productId, companyId },
            type: QueryTypes.SELECT
        });

        if (product) {
            // Get barcodes
            const barcodesQuery = `SELECT * FROM wms_product_barcodes WHERE product_id = :productId ORDER BY is_primary DESC`;
            product.barcodes = await sequelize.query(barcodesQuery, {
                replacements: { productId },
                type: QueryTypes.SELECT
            });

            // Get costs
            const costsQuery = `
                SELECT pc.*, c.code as currency_code, c.symbol as currency_symbol
                FROM wms_product_costs pc
                LEFT JOIN wms_currencies c ON pc.currency_id = c.id
                WHERE pc.product_id = :productId AND pc.is_current = true
            `;
            product.costs = await sequelize.query(costsQuery, {
                replacements: { productId },
                type: QueryTypes.SELECT
            });

            // Get stock by warehouse
            const stockQuery = `
                SELECT st.*, w.name as warehouse_name, w.code as warehouse_code, b.name as branch_name
                FROM wms_stock st
                JOIN wms_warehouses w ON st.warehouse_id = w.id
                JOIN wms_branches b ON w.branch_id = b.id
                WHERE st.product_id = :productId
            `;
            product.stock = await sequelize.query(stockQuery, {
                replacements: { productId },
                type: QueryTypes.SELECT
            });

            // Get prices
            const pricesQuery = `
                SELECT pp.*, pl.name as price_list_name, pl.code as price_list_code
                FROM wms_product_prices pp
                JOIN wms_price_lists pl ON pp.price_list_id = pl.id
                WHERE pp.product_id = :productId
            `;
            product.prices = await sequelize.query(pricesQuery, {
                replacements: { productId },
                type: QueryTypes.SELECT
            });
        }

        return product;
    }

    static async createProduct(companyId, userId, data) {
        const transaction = await sequelize.transaction();

        try {
            // Create product
            const productQuery = `
                INSERT INTO wms_products (
                    company_id, branch_id, internal_code, description, description_alt,
                    category_id, brand_id, supplier_id, product_type, unit_measure,
                    pack_quantity, is_bulk, is_perishable, shelf_life_days,
                    min_stock, max_stock, reorder_point, weight_kg, volume_m3,
                    is_composite_barcode, composite_barcode_type, special_commission_percent,
                    allows_general_discount, highlight, notes, created_by
                ) VALUES (
                    :companyId, :branchId, :internalCode, :description, :descriptionAlt,
                    :categoryId, :brandId, :supplierId, :productType, :unitMeasure,
                    :packQuantity, :isBulk, :isPerishable, :shelfLifeDays,
                    :minStock, :maxStock, :reorderPoint, :weightKg, :volumeM3,
                    :isCompositeBarcode, :compositeBarcodeType, :specialCommissionPercent,
                    :allowsGeneralDiscount, :highlight, :notes, :createdBy
                ) RETURNING *
            `;

            const [product] = await sequelize.query(productQuery, {
                replacements: {
                    companyId,
                    branchId: data.branch_id || null,
                    internalCode: data.internal_code,
                    description: data.description,
                    descriptionAlt: data.description_alt || null,
                    categoryId: data.category_id || null,
                    brandId: data.brand_id || null,
                    supplierId: data.supplier_id || null,
                    productType: data.product_type || 'resale',
                    unitMeasure: data.unit_measure || 'UNIT',
                    packQuantity: data.pack_quantity || 1,
                    isBulk: data.is_bulk || false,
                    isPerishable: data.is_perishable || false,
                    shelfLifeDays: data.shelf_life_days || null,
                    minStock: data.min_stock || 0,
                    maxStock: data.max_stock || null,
                    reorderPoint: data.reorder_point || null,
                    weightKg: data.weight_kg || null,
                    volumeM3: data.volume_m3 || null,
                    isCompositeBarcode: data.is_composite_barcode || false,
                    compositeBarcodeType: data.composite_barcode_type || null,
                    specialCommissionPercent: data.special_commission_percent || null,
                    allowsGeneralDiscount: data.allows_general_discount !== false,
                    highlight: data.highlight || false,
                    notes: data.notes || null,
                    createdBy: userId
                },
                type: QueryTypes.INSERT,
                transaction
            });

            const productId = product[0].id;

            // Add barcodes if provided
            if (data.barcodes && data.barcodes.length > 0) {
                for (let i = 0; i < data.barcodes.length; i++) {
                    const bc = data.barcodes[i];
                    await sequelize.query(`
                        INSERT INTO wms_product_barcodes (product_id, barcode, barcode_type, is_primary, description)
                        VALUES (:productId, :barcode, :barcodeType, :isPrimary, :description)
                    `, {
                        replacements: {
                            productId,
                            barcode: bc.barcode,
                            barcodeType: bc.barcode_type || 'EAN13',
                            isPrimary: i === 0 || bc.is_primary,
                            description: bc.description || null
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    });
                }
            }

            // Add cost if provided
            if (data.cost) {
                await sequelize.query(`
                    INSERT INTO wms_product_costs (product_id, currency_id, base_cost, freight_cost, other_costs, is_current)
                    VALUES (:productId, :currencyId, :baseCost, :freightCost, :otherCosts, true)
                `, {
                    replacements: {
                        productId,
                        currencyId: data.cost.currency_id || 1,
                        baseCost: data.cost.base_cost || 0,
                        freightCost: data.cost.freight_cost || 0,
                        otherCosts: data.cost.other_costs || 0
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });
            }

            await transaction.commit();
            return this.getProductById(companyId, productId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateProduct(companyId, userId, productId, data) {
        const query = `
            UPDATE wms_products SET
                internal_code = COALESCE(:internalCode, internal_code),
                description = COALESCE(:description, description),
                description_alt = COALESCE(:descriptionAlt, description_alt),
                category_id = COALESCE(:categoryId, category_id),
                brand_id = COALESCE(:brandId, brand_id),
                supplier_id = COALESCE(:supplierId, supplier_id),
                product_type = COALESCE(:productType, product_type),
                unit_measure = COALESCE(:unitMeasure, unit_measure),
                pack_quantity = COALESCE(:packQuantity, pack_quantity),
                is_bulk = COALESCE(:isBulk, is_bulk),
                is_perishable = COALESCE(:isPerishable, is_perishable),
                shelf_life_days = COALESCE(:shelfLifeDays, shelf_life_days),
                min_stock = COALESCE(:minStock, min_stock),
                max_stock = COALESCE(:maxStock, max_stock),
                reorder_point = COALESCE(:reorderPoint, reorder_point),
                weight_kg = COALESCE(:weightKg, weight_kg),
                volume_m3 = COALESCE(:volumeM3, volume_m3),
                is_composite_barcode = COALESCE(:isCompositeBarcode, is_composite_barcode),
                composite_barcode_type = COALESCE(:compositeBarcodeType, composite_barcode_type),
                special_commission_percent = COALESCE(:specialCommissionPercent, special_commission_percent),
                allows_general_discount = COALESCE(:allowsGeneralDiscount, allows_general_discount),
                highlight = COALESCE(:highlight, highlight),
                notes = COALESCE(:notes, notes),
                updated_at = NOW()
            WHERE id = :productId AND company_id = :companyId
            RETURNING *
        `;

        const [result] = await sequelize.query(query, {
            replacements: {
                productId,
                companyId,
                internalCode: data.internal_code || null,
                description: data.description || null,
                descriptionAlt: data.description_alt,
                categoryId: data.category_id,
                brandId: data.brand_id,
                supplierId: data.supplier_id,
                productType: data.product_type,
                unitMeasure: data.unit_measure,
                packQuantity: data.pack_quantity,
                isBulk: data.is_bulk,
                isPerishable: data.is_perishable,
                shelfLifeDays: data.shelf_life_days,
                minStock: data.min_stock,
                maxStock: data.max_stock,
                reorderPoint: data.reorder_point,
                weightKg: data.weight_kg,
                volumeM3: data.volume_m3,
                isCompositeBarcode: data.is_composite_barcode,
                compositeBarcodeType: data.composite_barcode_type,
                specialCommissionPercent: data.special_commission_percent,
                allowsGeneralDiscount: data.allows_general_discount,
                highlight: data.highlight,
                notes: data.notes
            },
            type: QueryTypes.UPDATE
        });

        return this.getProductById(companyId, productId);
    }

    static async deleteProduct(companyId, productId) {
        const query = `
            UPDATE wms_products SET is_active = false, updated_at = NOW()
            WHERE id = :productId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { productId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    static async getProductByBarcode(companyId, barcode) {
        const query = `
            SELECT p.*, pb.barcode, pb.barcode_type
            FROM wms_products p
            JOIN wms_product_barcodes pb ON p.id = pb.product_id
            WHERE p.company_id = :companyId AND pb.barcode = :barcode AND p.is_active = true
        `;
        const [product] = await sequelize.query(query, {
            replacements: { companyId, barcode },
            type: QueryTypes.SELECT
        });
        return product;
    }

    // ========================================================================
    // PRODUCT BARCODES
    // ========================================================================

    static async getProductBarcodes(companyId, productId) {
        const query = `
            SELECT pb.* FROM wms_product_barcodes pb
            JOIN wms_products p ON pb.product_id = p.id
            WHERE p.id = :productId AND p.company_id = :companyId
            ORDER BY pb.is_primary DESC, pb.created_at
        `;
        return sequelize.query(query, {
            replacements: { productId, companyId },
            type: QueryTypes.SELECT
        });
    }

    static async addProductBarcode(companyId, productId, data) {
        // Verify product belongs to company
        const verifyQuery = `SELECT id FROM wms_products WHERE id = :productId AND company_id = :companyId`;
        const [product] = await sequelize.query(verifyQuery, {
            replacements: { productId, companyId },
            type: QueryTypes.SELECT
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const query = `
            INSERT INTO wms_product_barcodes (product_id, barcode, barcode_type, is_primary, description)
            VALUES (:productId, :barcode, :barcodeType, :isPrimary, :description)
            RETURNING *
        `;
        const [barcode] = await sequelize.query(query, {
            replacements: {
                productId,
                barcode: data.barcode,
                barcodeType: data.barcode_type || 'EAN13',
                isPrimary: data.is_primary || false,
                description: data.description || null
            },
            type: QueryTypes.INSERT
        });
        return barcode[0];
    }

    static async removeProductBarcode(companyId, productId, barcodeId) {
        const query = `
            DELETE FROM wms_product_barcodes pb
            USING wms_products p
            WHERE pb.id = :barcodeId AND pb.product_id = :productId
                  AND p.id = pb.product_id AND p.company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { barcodeId, productId, companyId },
            type: QueryTypes.DELETE
        });
    }

    // ========================================================================
    // PRICE LISTS (Listas de Precios)
    // ========================================================================

    static async getPriceLists(companyId, branchId = null) {
        let query = `
            SELECT pl.*,
                   parent.name as mirror_parent_name,
                   (SELECT COUNT(*) FROM wms_product_prices WHERE price_list_id = pl.id) as product_count
            FROM wms_price_lists pl
            LEFT JOIN wms_price_lists parent ON pl.mirror_of_list_id = parent.id
            WHERE pl.company_id = :companyId AND pl.is_active = true
        `;
        const replacements = { companyId };

        if (branchId) {
            query += ` AND (pl.branch_id IS NULL OR pl.branch_id = :branchId)`;
            replacements.branchId = branchId;
        }

        query += ` ORDER BY pl.is_default DESC, pl.name`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async getPriceListById(companyId, priceListId) {
        const query = `
            SELECT pl.*,
                   parent.name as mirror_parent_name
            FROM wms_price_lists pl
            LEFT JOIN wms_price_lists parent ON pl.mirror_of_list_id = parent.id
            WHERE pl.id = :priceListId AND pl.company_id = :companyId
        `;
        const [priceList] = await sequelize.query(query, {
            replacements: { priceListId, companyId },
            type: QueryTypes.SELECT
        });
        return priceList;
    }

    static async createPriceList(companyId, data) {
        const query = `
            INSERT INTO wms_price_lists (
                company_id, branch_id, code, name, description, currency_id,
                is_mirror, mirror_of_list_id, mirror_adjustment_type, mirror_adjustment_value,
                rounding_type, rounding_value, applies_to_scope, applies_to_ids,
                valid_from, valid_to, is_default
            ) VALUES (
                :companyId, :branchId, :code, :name, :description, :currencyId,
                :isMirror, :mirrorOfListId, :mirrorAdjustmentType, :mirrorAdjustmentValue,
                :roundingType, :roundingValue, :appliesToScope, :appliesToIds,
                :validFrom, :validTo, :isDefault
            ) RETURNING *
        `;
        const [priceList] = await sequelize.query(query, {
            replacements: {
                companyId,
                branchId: data.branch_id || null,
                code: data.code,
                name: data.name,
                description: data.description || null,
                currencyId: data.currency_id || 1,
                isMirror: data.is_mirror || false,
                mirrorOfListId: data.mirror_of_list_id || null,
                mirrorAdjustmentType: data.mirror_adjustment_type || null,
                mirrorAdjustmentValue: data.mirror_adjustment_value || null,
                roundingType: data.rounding_type || 'none',
                roundingValue: data.rounding_value || null,
                appliesToScope: data.applies_to_scope || 'all',
                appliesToIds: data.applies_to_ids ? JSON.stringify(data.applies_to_ids) : null,
                validFrom: data.valid_from || null,
                validTo: data.valid_to || null,
                isDefault: data.is_default || false
            },
            type: QueryTypes.INSERT
        });
        return priceList[0];
    }

    static async updatePriceList(companyId, priceListId, data) {
        const query = `
            UPDATE wms_price_lists SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                description = COALESCE(:description, description),
                currency_id = COALESCE(:currencyId, currency_id),
                is_mirror = COALESCE(:isMirror, is_mirror),
                mirror_of_list_id = COALESCE(:mirrorOfListId, mirror_of_list_id),
                mirror_adjustment_type = COALESCE(:mirrorAdjustmentType, mirror_adjustment_type),
                mirror_adjustment_value = COALESCE(:mirrorAdjustmentValue, mirror_adjustment_value),
                rounding_type = COALESCE(:roundingType, rounding_type),
                rounding_value = COALESCE(:roundingValue, rounding_value),
                applies_to_scope = COALESCE(:appliesToScope, applies_to_scope),
                applies_to_ids = COALESCE(:appliesToIds, applies_to_ids),
                valid_from = COALESCE(:validFrom, valid_from),
                valid_to = COALESCE(:validTo, valid_to),
                is_default = COALESCE(:isDefault, is_default),
                updated_at = NOW()
            WHERE id = :priceListId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                priceListId,
                companyId,
                code: data.code || null,
                name: data.name || null,
                description: data.description,
                currencyId: data.currency_id,
                isMirror: data.is_mirror,
                mirrorOfListId: data.mirror_of_list_id,
                mirrorAdjustmentType: data.mirror_adjustment_type,
                mirrorAdjustmentValue: data.mirror_adjustment_value,
                roundingType: data.rounding_type,
                roundingValue: data.rounding_value,
                appliesToScope: data.applies_to_scope,
                appliesToIds: data.applies_to_ids ? JSON.stringify(data.applies_to_ids) : null,
                validFrom: data.valid_from,
                validTo: data.valid_to,
                isDefault: data.is_default
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deletePriceList(companyId, priceListId) {
        // Check if it's a mirror parent
        const checkQuery = `SELECT COUNT(*) as count FROM wms_price_lists WHERE mirror_of_list_id = :priceListId`;
        const [check] = await sequelize.query(checkQuery, {
            replacements: { priceListId },
            type: QueryTypes.SELECT
        });

        if (parseInt(check.count) > 0) {
            throw new Error('Cannot delete price list that has mirror lists');
        }

        const query = `
            UPDATE wms_price_lists SET is_active = false, updated_at = NOW()
            WHERE id = :priceListId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { priceListId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    static async syncMirrorPriceList(companyId, priceListId) {
        // Get mirror list details
        const listQuery = `
            SELECT * FROM wms_price_lists
            WHERE id = :priceListId AND company_id = :companyId AND is_mirror = true
        `;
        const [mirrorList] = await sequelize.query(listQuery, {
            replacements: { priceListId, companyId },
            type: QueryTypes.SELECT
        });

        if (!mirrorList) {
            throw new Error('Mirror list not found');
        }

        // Sync prices from parent list
        const syncQuery = `
            INSERT INTO wms_product_prices (product_id, price_list_id, margin_percent, net_price, tax_amount, final_price)
            SELECT
                pp.product_id,
                :mirrorListId,
                pp.margin_percent,
                CASE
                    WHEN :adjustmentType = 'percent' THEN pp.net_price * (1 + :adjustmentValue / 100)
                    WHEN :adjustmentType = 'fixed' THEN pp.net_price + :adjustmentValue
                    ELSE pp.net_price
                END,
                pp.tax_amount,
                CASE
                    WHEN :adjustmentType = 'percent' THEN pp.final_price * (1 + :adjustmentValue / 100)
                    WHEN :adjustmentType = 'fixed' THEN pp.final_price + :adjustmentValue
                    ELSE pp.final_price
                END
            FROM wms_product_prices pp
            WHERE pp.price_list_id = :parentListId
            ON CONFLICT (product_id, price_list_id) DO UPDATE SET
                margin_percent = EXCLUDED.margin_percent,
                net_price = EXCLUDED.net_price,
                tax_amount = EXCLUDED.tax_amount,
                final_price = EXCLUDED.final_price,
                updated_at = NOW()
        `;

        await sequelize.query(syncQuery, {
            replacements: {
                mirrorListId: priceListId,
                parentListId: mirrorList.mirror_of_list_id,
                adjustmentType: mirrorList.mirror_adjustment_type,
                adjustmentValue: mirrorList.mirror_adjustment_value || 0
            },
            type: QueryTypes.INSERT
        });

        return { synced: true, list_id: priceListId };
    }

    // ========================================================================
    // PRODUCT PRICES
    // ========================================================================

    static async getProductPrices(companyId, productId) {
        const query = `
            SELECT pp.*, pl.name as price_list_name, pl.code as price_list_code,
                   c.code as currency_code, c.symbol as currency_symbol
            FROM wms_product_prices pp
            JOIN wms_price_lists pl ON pp.price_list_id = pl.id
            LEFT JOIN wms_currencies c ON pl.currency_id = c.id
            WHERE pp.product_id = :productId AND pl.company_id = :companyId AND pl.is_active = true
        `;
        return sequelize.query(query, {
            replacements: { productId, companyId },
            type: QueryTypes.SELECT
        });
    }

    static async setProductPrice(companyId, userId, productId, data) {
        // Verify price list belongs to company
        const verifyQuery = `SELECT id FROM wms_price_lists WHERE id = :priceListId AND company_id = :companyId`;
        const [priceList] = await sequelize.query(verifyQuery, {
            replacements: { priceListId: data.price_list_id, companyId },
            type: QueryTypes.SELECT
        });

        if (!priceList) {
            throw new Error('Price list not found');
        }

        const query = `
            INSERT INTO wms_product_prices (product_id, price_list_id, margin_percent, net_price, tax_amount, final_price,
                                            price_per_pack, discount_1_percent, discount_1_min_qty, discount_2_percent, discount_2_min_qty)
            VALUES (:productId, :priceListId, :marginPercent, :netPrice, :taxAmount, :finalPrice,
                    :pricePerPack, :discount1Percent, :discount1MinQty, :discount2Percent, :discount2MinQty)
            ON CONFLICT (product_id, price_list_id) DO UPDATE SET
                margin_percent = EXCLUDED.margin_percent,
                net_price = EXCLUDED.net_price,
                tax_amount = EXCLUDED.tax_amount,
                final_price = EXCLUDED.final_price,
                price_per_pack = EXCLUDED.price_per_pack,
                discount_1_percent = EXCLUDED.discount_1_percent,
                discount_1_min_qty = EXCLUDED.discount_1_min_qty,
                discount_2_percent = EXCLUDED.discount_2_percent,
                discount_2_min_qty = EXCLUDED.discount_2_min_qty,
                updated_at = NOW()
            RETURNING *
        `;
        const [price] = await sequelize.query(query, {
            replacements: {
                productId,
                priceListId: data.price_list_id,
                marginPercent: data.margin_percent || 0,
                netPrice: data.net_price || 0,
                taxAmount: data.tax_amount || 0,
                finalPrice: data.final_price || 0,
                pricePerPack: data.price_per_pack || null,
                discount1Percent: data.discount_1_percent || null,
                discount1MinQty: data.discount_1_min_qty || null,
                discount2Percent: data.discount_2_percent || null,
                discount2MinQty: data.discount_2_min_qty || null
            },
            type: QueryTypes.INSERT
        });
        return price[0];
    }

    static async bulkUpdatePrices(companyId, userId, priceListId, filters, adjustment) {
        // Build filter conditions
        let whereConditions = ['p.company_id = :companyId', 'p.is_active = true'];
        const replacements = { companyId, priceListId };

        if (filters.category_ids && filters.category_ids.length > 0) {
            whereConditions.push('p.category_id = ANY(:categoryIds)');
            replacements.categoryIds = filters.category_ids;
        }
        if (filters.brand_ids && filters.brand_ids.length > 0) {
            whereConditions.push('p.brand_id = ANY(:brandIds)');
            replacements.brandIds = filters.brand_ids;
        }
        if (filters.supplier_ids && filters.supplier_ids.length > 0) {
            whereConditions.push('p.supplier_id = ANY(:supplierIds)');
            replacements.supplierIds = filters.supplier_ids;
        }

        const whereClause = whereConditions.join(' AND ');

        // Calculate new prices
        let priceCalculation;
        if (adjustment.type === 'percent') {
            priceCalculation = `final_price * (1 + ${parseFloat(adjustment.value)} / 100)`;
        } else if (adjustment.type === 'fixed') {
            priceCalculation = `final_price + ${parseFloat(adjustment.value)}`;
        } else {
            throw new Error('Invalid adjustment type');
        }

        // Apply rounding if specified
        if (adjustment.rounding_type === 'decimal') {
            priceCalculation = `ROUND(${priceCalculation}, ${adjustment.rounding_value || 2})`;
        } else if (adjustment.rounding_type === 'integer') {
            priceCalculation = `ROUND(${priceCalculation} / ${adjustment.rounding_value || 1}) * ${adjustment.rounding_value || 1}`;
        }

        const query = `
            UPDATE wms_product_prices pp
            SET final_price = ${priceCalculation},
                margin_percent = CASE
                    WHEN pc.total_cost > 0 THEN ((${priceCalculation} - pc.total_cost) / pc.total_cost) * 100
                    ELSE margin_percent
                END,
                updated_at = NOW()
            FROM wms_products p
            LEFT JOIN wms_product_costs pc ON p.id = pc.product_id AND pc.is_current = true
            WHERE pp.product_id = p.id
              AND pp.price_list_id = :priceListId
              AND ${whereClause}
        `;

        const result = await sequelize.query(query, {
            replacements,
            type: QueryTypes.UPDATE
        });

        return { updated: result[1] || 0 };
    }

    // ========================================================================
    // PROMOTIONS
    // ========================================================================

    static async getPromotions(companyId, filters = {}) {
        let query = `
            SELECT pr.*,
                   (SELECT COUNT(*) FROM wms_promotion_items WHERE promotion_id = pr.id) as item_count
            FROM wms_promotions pr
            WHERE pr.company_id = :companyId
        `;
        const replacements = { companyId };

        if (filters.branch_id) {
            query += ` AND (pr.branch_id IS NULL OR pr.branch_id = :branchId)`;
            replacements.branchId = filters.branch_id;
        }
        if (filters.is_active !== undefined) {
            query += ` AND pr.is_active = :isActive`;
            replacements.isActive = filters.is_active === 'true' || filters.is_active === true;
        }
        if (filters.promotion_type) {
            query += ` AND pr.promotion_type = :promotionType`;
            replacements.promotionType = filters.promotion_type;
        }

        query += ` ORDER BY pr.start_date DESC`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async getPromotionById(companyId, promotionId) {
        const query = `
            SELECT pr.* FROM wms_promotions pr
            WHERE pr.id = :promotionId AND pr.company_id = :companyId
        `;
        const [promotion] = await sequelize.query(query, {
            replacements: { promotionId, companyId },
            type: QueryTypes.SELECT
        });

        if (promotion) {
            // Get items
            const itemsQuery = `
                SELECT pi.*, p.description as product_description, p.internal_code
                FROM wms_promotion_items pi
                JOIN wms_products p ON pi.product_id = p.id
                WHERE pi.promotion_id = :promotionId
            `;
            promotion.items = await sequelize.query(itemsQuery, {
                replacements: { promotionId },
                type: QueryTypes.SELECT
            });

            // Get tiers
            const tiersQuery = `SELECT * FROM wms_promotion_tiers WHERE promotion_id = :promotionId ORDER BY min_quantity`;
            promotion.tiers = await sequelize.query(tiersQuery, {
                replacements: { promotionId },
                type: QueryTypes.SELECT
            });
        }

        return promotion;
    }

    static async createPromotion(companyId, data) {
        const transaction = await sequelize.transaction();

        try {
            const query = `
                INSERT INTO wms_promotions (
                    company_id, branch_id, code, name, description, promotion_type,
                    discount_type, discount_value, buy_quantity, get_quantity,
                    start_date, end_date, applies_to_scope, applies_to_ids, is_combinable
                ) VALUES (
                    :companyId, :branchId, :code, :name, :description, :promotionType,
                    :discountType, :discountValue, :buyQuantity, :getQuantity,
                    :startDate, :endDate, :appliesToScope, :appliesToIds, :isCombinable
                ) RETURNING *
            `;
            const [promotion] = await sequelize.query(query, {
                replacements: {
                    companyId,
                    branchId: data.branch_id || null,
                    code: data.code,
                    name: data.name,
                    description: data.description || null,
                    promotionType: data.promotion_type,
                    discountType: data.discount_type || null,
                    discountValue: data.discount_value || null,
                    buyQuantity: data.buy_quantity || null,
                    getQuantity: data.get_quantity || null,
                    startDate: data.start_date,
                    endDate: data.end_date || null,
                    appliesToScope: data.applies_to_scope || 'products',
                    appliesToIds: data.applies_to_ids ? JSON.stringify(data.applies_to_ids) : null,
                    isCombinable: data.is_combinable || false
                },
                type: QueryTypes.INSERT,
                transaction
            });

            const promotionId = promotion[0].id;

            // Add items if provided
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    await sequelize.query(`
                        INSERT INTO wms_promotion_items (promotion_id, product_id, is_trigger, is_reward, discount_override)
                        VALUES (:promotionId, :productId, :isTrigger, :isReward, :discountOverride)
                    `, {
                        replacements: {
                            promotionId,
                            productId: item.product_id,
                            isTrigger: item.is_trigger || false,
                            isReward: item.is_reward || false,
                            discountOverride: item.discount_override || null
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    });
                }
            }

            // Add tiers if provided
            if (data.tiers && data.tiers.length > 0) {
                for (const tier of data.tiers) {
                    await sequelize.query(`
                        INSERT INTO wms_promotion_tiers (promotion_id, min_quantity, max_quantity, discount_type, discount_value)
                        VALUES (:promotionId, :minQuantity, :maxQuantity, :discountType, :discountValue)
                    `, {
                        replacements: {
                            promotionId,
                            minQuantity: tier.min_quantity,
                            maxQuantity: tier.max_quantity || null,
                            discountType: tier.discount_type,
                            discountValue: tier.discount_value
                        },
                        type: QueryTypes.INSERT,
                        transaction
                    });
                }
            }

            await transaction.commit();
            return this.getPromotionById(companyId, promotionId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updatePromotion(companyId, promotionId, data) {
        const query = `
            UPDATE wms_promotions SET
                code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                description = COALESCE(:description, description),
                promotion_type = COALESCE(:promotionType, promotion_type),
                discount_type = COALESCE(:discountType, discount_type),
                discount_value = COALESCE(:discountValue, discount_value),
                buy_quantity = COALESCE(:buyQuantity, buy_quantity),
                get_quantity = COALESCE(:getQuantity, get_quantity),
                start_date = COALESCE(:startDate, start_date),
                end_date = COALESCE(:endDate, end_date),
                is_active = COALESCE(:isActive, is_active),
                is_combinable = COALESCE(:isCombinable, is_combinable),
                updated_at = NOW()
            WHERE id = :promotionId AND company_id = :companyId
            RETURNING *
        `;
        const [result] = await sequelize.query(query, {
            replacements: {
                promotionId,
                companyId,
                code: data.code || null,
                name: data.name || null,
                description: data.description,
                promotionType: data.promotion_type,
                discountType: data.discount_type,
                discountValue: data.discount_value,
                buyQuantity: data.buy_quantity,
                getQuantity: data.get_quantity,
                startDate: data.start_date,
                endDate: data.end_date,
                isActive: data.is_active,
                isCombinable: data.is_combinable
            },
            type: QueryTypes.UPDATE
        });
        return result[0];
    }

    static async deletePromotion(companyId, promotionId) {
        const query = `
            UPDATE wms_promotions SET is_active = false, updated_at = NOW()
            WHERE id = :promotionId AND company_id = :companyId
        `;
        await sequelize.query(query, {
            replacements: { promotionId, companyId },
            type: QueryTypes.UPDATE
        });
    }

    static async calculatePromotions(companyId, items, priceListId) {
        // Get active promotions for today
        const promotionsQuery = `
            SELECT * FROM wms_promotions
            WHERE company_id = :companyId AND is_active = true
              AND start_date <= CURRENT_DATE
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        `;
        const promotions = await sequelize.query(promotionsQuery, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });

        let totalDiscount = 0;
        const appliedPromotions = [];

        for (const item of items) {
            for (const promo of promotions) {
                // Simple promotion calculation - can be extended
                if (promo.promotion_type === 'percent_discount') {
                    const discount = item.price * item.quantity * (promo.discount_value / 100);
                    totalDiscount += discount;
                    appliedPromotions.push({
                        promotion_id: promo.id,
                        promotion_name: promo.name,
                        product_id: item.product_id,
                        discount_amount: discount
                    });
                } else if (promo.promotion_type === 'buy_x_get_y' && item.quantity >= promo.buy_quantity) {
                    const freeItems = Math.floor(item.quantity / promo.buy_quantity) * promo.get_quantity;
                    const discount = item.price * freeItems;
                    totalDiscount += discount;
                    appliedPromotions.push({
                        promotion_id: promo.id,
                        promotion_name: promo.name,
                        product_id: item.product_id,
                        free_items: freeItems,
                        discount_amount: discount
                    });
                }
            }
        }

        return {
            total_discount: totalDiscount,
            applied_promotions: appliedPromotions
        };
    }

    // ========================================================================
    // STOCK
    // ========================================================================

    static async getProductStock(companyId, productId) {
        const query = `
            SELECT s.*, w.name as warehouse_name, w.code as warehouse_code, b.name as branch_name
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE s.product_id = :productId AND b.company_id = :companyId
        `;
        return sequelize.query(query, {
            replacements: { productId, companyId },
            type: QueryTypes.SELECT
        });
    }

    static async getWarehouseStock(companyId, warehouseId, filters = {}) {
        const { category_id, low_stock, search, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        let whereConditions = ['s.warehouse_id = :warehouseId', 'b.company_id = :companyId'];
        const replacements = { warehouseId, companyId, limit, offset };

        if (category_id) {
            whereConditions.push('p.category_id = :categoryId');
            replacements.categoryId = category_id;
        }
        if (low_stock) {
            whereConditions.push('s.quantity <= p.reorder_point');
        }
        if (search) {
            whereConditions.push(`(p.internal_code ILIKE :search OR p.description ILIKE :search)`);
            replacements.search = `%${search}%`;
        }

        const whereClause = whereConditions.join(' AND ');

        const countQuery = `
            SELECT COUNT(*) as total
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            JOIN wms_products p ON s.product_id = p.id
            WHERE ${whereClause}
        `;
        const [countResult] = await sequelize.query(countQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        const query = `
            SELECT s.*, p.internal_code, p.description, p.unit_measure, p.min_stock, p.max_stock, p.reorder_point,
                   c.name as category_name
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            JOIN wms_products p ON s.product_id = p.id
            LEFT JOIN wms_categories c ON p.category_id = c.id
            WHERE ${whereClause}
            ORDER BY p.description
            LIMIT :limit OFFSET :offset
        `;

        const stock = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            data: stock,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.total),
                pages: Math.ceil(parseInt(countResult.total) / limit)
            }
        };
    }

    static async createStockMovement(companyId, userId, data) {
        const transaction = await sequelize.transaction();

        try {
            // Verify warehouse belongs to company
            const verifyQuery = `
                SELECT w.id FROM wms_warehouses w
                JOIN wms_branches b ON w.branch_id = b.id
                WHERE w.id = :warehouseId AND b.company_id = :companyId
            `;
            const [warehouse] = await sequelize.query(verifyQuery, {
                replacements: { warehouseId: data.warehouse_id, companyId },
                type: QueryTypes.SELECT,
                transaction
            });

            if (!warehouse) {
                throw new Error('Warehouse not found');
            }

            // Get current stock
            const stockQuery = `
                SELECT * FROM wms_stock
                WHERE product_id = :productId AND warehouse_id = :warehouseId
                FOR UPDATE
            `;
            let [currentStock] = await sequelize.query(stockQuery, {
                replacements: { productId: data.product_id, warehouseId: data.warehouse_id },
                type: QueryTypes.SELECT,
                transaction
            });

            const previousQuantity = currentStock ? parseFloat(currentStock.quantity) : 0;
            let newQuantity;

            switch (data.movement_type) {
                case 'entry':
                case 'purchase':
                case 'production':
                case 'transfer_in':
                case 'return':
                    newQuantity = previousQuantity + parseFloat(data.quantity);
                    break;
                case 'exit':
                case 'sale':
                case 'transfer_out':
                case 'adjustment_out':
                case 'waste':
                    newQuantity = previousQuantity - parseFloat(data.quantity);
                    break;
                case 'adjustment':
                    newQuantity = parseFloat(data.quantity); // Absolute value
                    break;
                default:
                    throw new Error('Invalid movement type');
            }

            // Check negative stock
            if (newQuantity < 0) {
                const warehouseCheckQuery = `SELECT allows_negative_stock FROM wms_warehouses WHERE id = :warehouseId`;
                const [warehouseConfig] = await sequelize.query(warehouseCheckQuery, {
                    replacements: { warehouseId: data.warehouse_id },
                    type: QueryTypes.SELECT,
                    transaction
                });

                if (!warehouseConfig.allows_negative_stock) {
                    throw new Error('Insufficient stock');
                }
            }

            // Create movement record
            const movementQuery = `
                INSERT INTO wms_stock_movements (
                    warehouse_id, product_id, batch_id, movement_type, quantity,
                    previous_quantity, new_quantity, unit_cost, reference_type, reference_id,
                    notes, created_by
                ) VALUES (
                    :warehouseId, :productId, :batchId, :movementType, :quantity,
                    :previousQuantity, :newQuantity, :unitCost, :referenceType, :referenceId,
                    :notes, :createdBy
                ) RETURNING *
            `;
            const [movement] = await sequelize.query(movementQuery, {
                replacements: {
                    warehouseId: data.warehouse_id,
                    productId: data.product_id,
                    batchId: data.batch_id || null,
                    movementType: data.movement_type,
                    quantity: data.quantity,
                    previousQuantity,
                    newQuantity,
                    unitCost: data.unit_cost || null,
                    referenceType: data.reference_type || null,
                    referenceId: data.reference_id || null,
                    notes: data.notes || null,
                    createdBy: userId
                },
                type: QueryTypes.INSERT,
                transaction
            });

            // Update stock
            if (currentStock) {
                await sequelize.query(`
                    UPDATE wms_stock SET
                        quantity = :newQuantity,
                        unit_cost = COALESCE(:unitCost, unit_cost),
                        last_movement_at = NOW(),
                        updated_at = NOW()
                    WHERE product_id = :productId AND warehouse_id = :warehouseId
                `, {
                    replacements: {
                        newQuantity,
                        unitCost: data.unit_cost,
                        productId: data.product_id,
                        warehouseId: data.warehouse_id
                    },
                    type: QueryTypes.UPDATE,
                    transaction
                });
            } else {
                await sequelize.query(`
                    INSERT INTO wms_stock (warehouse_id, product_id, quantity, unit_cost, last_movement_at)
                    VALUES (:warehouseId, :productId, :quantity, :unitCost, NOW())
                `, {
                    replacements: {
                        warehouseId: data.warehouse_id,
                        productId: data.product_id,
                        quantity: newQuantity,
                        unitCost: data.unit_cost || 0
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });
            }

            await transaction.commit();
            return movement[0];
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async getStockMovements(companyId, filters = {}) {
        const { warehouse_id, product_id, movement_type, from_date, to_date, page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        let whereConditions = ['b.company_id = :companyId'];
        const replacements = { companyId, limit, offset };

        if (warehouse_id) {
            whereConditions.push('m.warehouse_id = :warehouseId');
            replacements.warehouseId = warehouse_id;
        }
        if (product_id) {
            whereConditions.push('m.product_id = :productId');
            replacements.productId = product_id;
        }
        if (movement_type) {
            whereConditions.push('m.movement_type = :movementType');
            replacements.movementType = movement_type;
        }
        if (from_date) {
            whereConditions.push('m.created_at >= :fromDate');
            replacements.fromDate = from_date;
        }
        if (to_date) {
            whereConditions.push('m.created_at <= :toDate');
            replacements.toDate = to_date;
        }

        const whereClause = whereConditions.join(' AND ');

        const query = `
            SELECT m.*, p.internal_code, p.description as product_description,
                   w.name as warehouse_name, u.first_name || ' ' || u.last_name as created_by_name
            FROM wms_stock_movements m
            JOIN wms_warehouses w ON m.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            JOIN wms_products p ON m.product_id = p.id
            LEFT JOIN users u ON m.created_by = u.id
            WHERE ${whereClause}
            ORDER BY m.created_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const movements = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            data: movements,
            pagination: { page, limit }
        };
    }

    static async getStockAlerts(companyId, warehouseId = null) {
        let query = `
            SELECT * FROM wms_vw_stock_alerts
            WHERE company_id = :companyId
        `;
        const replacements = { companyId };

        if (warehouseId) {
            query += ` AND warehouse_id = :warehouseId`;
            replacements.warehouseId = warehouseId;
        }

        query += ` ORDER BY alert_priority`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async getExpiryAlerts(companyId, warehouseId = null, daysAhead = 30) {
        let query = `
            SELECT * FROM wms_vw_expiry_alerts
            WHERE company_id = :companyId AND days_until_expiry <= :daysAhead
        `;
        const replacements = { companyId, daysAhead };

        if (warehouseId) {
            query += ` AND warehouse_id = :warehouseId`;
            replacements.warehouseId = warehouseId;
        }

        query += ` ORDER BY expiry_date`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    // ========================================================================
    // BATCHES (Lotes)
    // ========================================================================

    static async getProductBatches(companyId, productId, warehouseId = null) {
        let query = `
            SELECT sb.*, w.name as warehouse_name
            FROM wms_stock_batches sb
            JOIN wms_warehouses w ON sb.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE sb.product_id = :productId AND b.company_id = :companyId AND sb.quantity > 0
        `;
        const replacements = { productId, companyId };

        if (warehouseId) {
            query += ` AND sb.warehouse_id = :warehouseId`;
            replacements.warehouseId = warehouseId;
        }

        query += ` ORDER BY sb.expiry_date NULLS LAST, sb.received_date`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async createBatch(companyId, data) {
        const query = `
            INSERT INTO wms_stock_batches (
                warehouse_id, product_id, batch_number, lot_number, serial_number,
                quantity, unit_cost, expiry_date, manufacturing_date, received_date,
                supplier_id, notes
            ) VALUES (
                :warehouseId, :productId, :batchNumber, :lotNumber, :serialNumber,
                :quantity, :unitCost, :expiryDate, :manufacturingDate, :receivedDate,
                :supplierId, :notes
            ) RETURNING *
        `;
        const [batch] = await sequelize.query(query, {
            replacements: {
                warehouseId: data.warehouse_id,
                productId: data.product_id,
                batchNumber: data.batch_number,
                lotNumber: data.lot_number || null,
                serialNumber: data.serial_number || null,
                quantity: data.quantity,
                unitCost: data.unit_cost || 0,
                expiryDate: data.expiry_date || null,
                manufacturingDate: data.manufacturing_date || null,
                receivedDate: data.received_date || new Date(),
                supplierId: data.supplier_id || null,
                notes: data.notes || null
            },
            type: QueryTypes.INSERT
        });
        return batch[0];
    }

    // ========================================================================
    // WAREHOUSE ZONES & LOCATIONS (Planograma)
    // ========================================================================

    static async getWarehouseZones(companyId, warehouseId) {
        const query = `
            SELECT z.*,
                   (SELECT COUNT(*) FROM wms_locations WHERE zone_id = z.id) as location_count
            FROM wms_warehouse_zones z
            JOIN wms_warehouses w ON z.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE z.warehouse_id = :warehouseId AND b.company_id = :companyId AND z.is_active = true
            ORDER BY z.name
        `;
        return sequelize.query(query, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.SELECT
        });
    }

    static async createWarehouseZone(companyId, warehouseId, data) {
        const query = `
            INSERT INTO wms_warehouse_zones (warehouse_id, code, name, zone_type, temperature_min, temperature_max, description)
            VALUES (:warehouseId, :code, :name, :zoneType, :temperatureMin, :temperatureMax, :description)
            RETURNING *
        `;
        const [zone] = await sequelize.query(query, {
            replacements: {
                warehouseId,
                code: data.code,
                name: data.name,
                zoneType: data.zone_type || 'storage',
                temperatureMin: data.temperature_min || null,
                temperatureMax: data.temperature_max || null,
                description: data.description || null
            },
            type: QueryTypes.INSERT
        });
        return zone[0];
    }

    static async getZoneLocations(companyId, zoneId) {
        const query = `
            SELECT l.*, p.internal_code, p.description as product_description
            FROM wms_locations l
            LEFT JOIN wms_location_assignments la ON l.id = la.location_id AND la.is_current = true
            LEFT JOIN wms_products p ON la.product_id = p.id
            WHERE l.zone_id = :zoneId AND l.is_active = true
            ORDER BY l.aisle, l.rack, l.shelf, l.position
        `;
        return sequelize.query(query, {
            replacements: { zoneId },
            type: QueryTypes.SELECT
        });
    }

    static async createLocation(companyId, zoneId, data) {
        const query = `
            INSERT INTO wms_locations (zone_id, code, aisle, rack, shelf, position, width_cm, height_cm, depth_cm, max_weight_kg, location_type)
            VALUES (:zoneId, :code, :aisle, :rack, :shelf, :position, :widthCm, :heightCm, :depthCm, :maxWeightKg, :locationType)
            RETURNING *
        `;
        const [location] = await sequelize.query(query, {
            replacements: {
                zoneId,
                code: data.code,
                aisle: data.aisle || null,
                rack: data.rack || null,
                shelf: data.shelf || null,
                position: data.position || null,
                widthCm: data.width_cm || null,
                heightCm: data.height_cm || null,
                depthCm: data.depth_cm || null,
                maxWeightKg: data.max_weight_kg || null,
                locationType: data.location_type || 'shelf'
            },
            type: QueryTypes.INSERT
        });
        return location[0];
    }

    static async assignProductToLocation(companyId, locationId, data) {
        // First, mark any existing assignment as not current
        await sequelize.query(`
            UPDATE wms_location_assignments SET is_current = false, end_date = NOW()
            WHERE location_id = :locationId AND is_current = true
        `, {
            replacements: { locationId },
            type: QueryTypes.UPDATE
        });

        const query = `
            INSERT INTO wms_location_assignments (location_id, product_id, facing_quantity, min_quantity, max_quantity, is_current)
            VALUES (:locationId, :productId, :facingQuantity, :minQuantity, :maxQuantity, true)
            RETURNING *
        `;
        const [assignment] = await sequelize.query(query, {
            replacements: {
                locationId,
                productId: data.product_id,
                facingQuantity: data.facing_quantity || 1,
                minQuantity: data.min_quantity || null,
                maxQuantity: data.max_quantity || null
            },
            type: QueryTypes.INSERT
        });
        return assignment[0];
    }

    static async getPlanogram(companyId, warehouseId) {
        const query = `
            SELECT
                z.id as zone_id, z.code as zone_code, z.name as zone_name, z.zone_type,
                l.id as location_id, l.code as location_code, l.aisle, l.rack, l.shelf, l.position,
                l.width_cm, l.height_cm, l.depth_cm,
                la.product_id, la.facing_quantity,
                p.internal_code, p.description as product_description,
                p.weight_kg, p.volume_m3
            FROM wms_warehouse_zones z
            LEFT JOIN wms_locations l ON z.id = l.zone_id AND l.is_active = true
            LEFT JOIN wms_location_assignments la ON l.id = la.location_id AND la.is_current = true
            LEFT JOIN wms_products p ON la.product_id = p.id
            JOIN wms_warehouses w ON z.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE z.warehouse_id = :warehouseId AND b.company_id = :companyId AND z.is_active = true
            ORDER BY z.name, l.aisle, l.rack, l.shelf, l.position
        `;
        const rows = await sequelize.query(query, {
            replacements: { warehouseId, companyId },
            type: QueryTypes.SELECT
        });

        // Structure as zones with locations
        const zones = {};
        for (const row of rows) {
            if (!zones[row.zone_id]) {
                zones[row.zone_id] = {
                    id: row.zone_id,
                    code: row.zone_code,
                    name: row.zone_name,
                    zone_type: row.zone_type,
                    locations: []
                };
            }
            if (row.location_id) {
                zones[row.zone_id].locations.push({
                    id: row.location_id,
                    code: row.location_code,
                    aisle: row.aisle,
                    rack: row.rack,
                    shelf: row.shelf,
                    position: row.position,
                    dimensions: {
                        width_cm: row.width_cm,
                        height_cm: row.height_cm,
                        depth_cm: row.depth_cm
                    },
                    product: row.product_id ? {
                        id: row.product_id,
                        internal_code: row.internal_code,
                        description: row.product_description,
                        facing_quantity: row.facing_quantity
                    } : null
                });
            }
        }

        return Object.values(zones);
    }

    // ========================================================================
    // FISCAL TEMPLATES
    // ========================================================================

    static async getFiscalTemplates(countryCode = null) {
        let query = `
            SELECT tt.*, c.name as country_name
            FROM wms_tax_templates tt
            JOIN wms_countries c ON tt.country_code = c.code
            WHERE tt.is_active = true
        `;
        const replacements = {};

        if (countryCode) {
            query += ` AND tt.country_code = :countryCode`;
            replacements.countryCode = countryCode;
        }

        query += ` ORDER BY c.name, tt.name`;

        return sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });
    }

    static async getFiscalTemplateById(templateId) {
        const query = `
            SELECT tt.*, c.name as country_name
            FROM wms_tax_templates tt
            JOIN wms_countries c ON tt.country_code = c.code
            WHERE tt.id = :templateId
        `;
        const [template] = await sequelize.query(query, {
            replacements: { templateId },
            type: QueryTypes.SELECT
        });

        if (template) {
            const itemsQuery = `
                SELECT tti.*, tr.code as tax_code, tr.name as tax_name
                FROM wms_tax_template_items tti
                JOIN wms_tax_rates tr ON tti.tax_rate_id = tr.id
                WHERE tti.template_id = :templateId
                ORDER BY tti.apply_order
            `;
            template.items = await sequelize.query(itemsQuery, {
                replacements: { templateId },
                type: QueryTypes.SELECT
            });
        }

        return template;
    }

    // ========================================================================
    // CURRENCIES
    // ========================================================================

    static async getCurrencies() {
        const query = `SELECT * FROM wms_currencies WHERE is_active = true ORDER BY is_default DESC, code`;
        return sequelize.query(query, { type: QueryTypes.SELECT });
    }

    static async updateExchangeRate(fromCurrency, toCurrency, rate) {
        const query = `
            UPDATE wms_currencies SET
                exchange_rate = :rate,
                exchange_rate_date = NOW(),
                updated_at = NOW()
            WHERE code = :fromCurrency
        `;
        await sequelize.query(query, {
            replacements: { fromCurrency, rate },
            type: QueryTypes.UPDATE
        });
        return { from: fromCurrency, to: toCurrency, rate };
    }

    // ========================================================================
    // BARCODE CONFIGURATION
    // ========================================================================

    static async getBarcodeConfig(companyId) {
        const query = `SELECT * FROM wms_barcode_configs WHERE company_id = :companyId`;
        const [config] = await sequelize.query(query, {
            replacements: { companyId },
            type: QueryTypes.SELECT
        });
        return config;
    }

    static async updateBarcodeConfig(companyId, data) {
        const query = `
            INSERT INTO wms_barcode_configs (company_id, composite_code_prefix, article_digits, weight_digits, price_digits, check_digit_position)
            VALUES (:companyId, :compositeCodePrefix, :articleDigits, :weightDigits, :priceDigits, :checkDigitPosition)
            ON CONFLICT (company_id) DO UPDATE SET
                composite_code_prefix = EXCLUDED.composite_code_prefix,
                article_digits = EXCLUDED.article_digits,
                weight_digits = EXCLUDED.weight_digits,
                price_digits = EXCLUDED.price_digits,
                check_digit_position = EXCLUDED.check_digit_position,
                updated_at = NOW()
            RETURNING *
        `;
        const [config] = await sequelize.query(query, {
            replacements: {
                companyId,
                compositeCodePrefix: data.composite_code_prefix || '2',
                articleDigits: data.article_digits || 5,
                weightDigits: data.weight_digits || 5,
                priceDigits: data.price_digits || 5,
                checkDigitPosition: data.check_digit_position || 13
            },
            type: QueryTypes.INSERT
        });
        return config[0];
    }

    static async parseCompositeBarcode(companyId, barcode) {
        const config = await this.getBarcodeConfig(companyId);
        if (!config) {
            throw new Error('Barcode configuration not found');
        }

        const prefix = barcode.substring(0, config.composite_code_prefix.length);
        if (prefix !== config.composite_code_prefix) {
            // Not a composite barcode, return as regular
            return { type: 'regular', barcode };
        }

        const articleStart = config.composite_code_prefix.length;
        const articleEnd = articleStart + config.article_digits;
        const articleCode = barcode.substring(articleStart, articleEnd);

        // Determine if weight or price based on barcode
        const valueStart = articleEnd;
        const valueEnd = valueStart + config.weight_digits;
        const rawValue = barcode.substring(valueStart, valueEnd);
        const value = parseFloat(rawValue) / 1000; // Convert to kg or currency

        return {
            type: 'composite',
            article_code: articleCode,
            value,
            value_type: 'weight', // Could be 'price' based on configuration
            raw_barcode: barcode
        };
    }

    // ========================================================================
    // REPORTS
    // ========================================================================

    static async getStockValuationReport(companyId, warehouseId = null) {
        let query = `
            SELECT
                w.name as warehouse_name,
                c.name as category_name,
                COUNT(DISTINCT s.product_id) as product_count,
                SUM(s.quantity) as total_quantity,
                SUM(s.quantity * s.unit_cost) as total_value
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            JOIN wms_products p ON s.product_id = p.id
            LEFT JOIN wms_categories c ON p.category_id = c.id
            WHERE b.company_id = :companyId
        `;
        const replacements = { companyId };

        if (warehouseId) {
            query += ` AND s.warehouse_id = :warehouseId`;
            replacements.warehouseId = warehouseId;
        }

        query += ` GROUP BY w.id, w.name, c.id, c.name ORDER BY w.name, c.name`;

        const details = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Get totals
        let totalsQuery = `
            SELECT
                COUNT(DISTINCT s.product_id) as total_products,
                SUM(s.quantity) as total_quantity,
                SUM(s.quantity * s.unit_cost) as total_value
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = :companyId
        `;

        if (warehouseId) {
            totalsQuery += ` AND s.warehouse_id = :warehouseId`;
        }

        const [totals] = await sequelize.query(totalsQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            details,
            totals
        };
    }

    static async exportProducts(companyId, filters = {}) {
        // Simple implementation - in production would use excel library
        const products = await this.getProducts(companyId, { ...filters, limit: 10000 });

        // Return as CSV for simplicity
        const headers = ['Código', 'Descripción', 'Categoría', 'Marca', 'Proveedor', 'Stock Total'];
        const rows = products.data.map(p => [
            p.internal_code,
            p.description,
            p.category_name || '',
            p.brand_name || '',
            p.supplier_name || '',
            p.total_stock || 0
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

        return {
            buffer: Buffer.from(csv),
            filename: `products_${new Date().toISOString().split('T')[0]}.csv`,
            contentType: 'text/csv'
        };
    }

    static async importProducts(companyId, userId, data) {
        // Basic implementation - would need proper CSV/Excel parsing
        const results = {
            imported: 0,
            updated: 0,
            errors: []
        };

        for (const row of data.products || []) {
            try {
                const existing = await this.getProductByBarcode(companyId, row.barcode);
                if (existing) {
                    await this.updateProduct(companyId, userId, existing.id, row);
                    results.updated++;
                } else {
                    await this.createProduct(companyId, userId, row);
                    results.imported++;
                }
            } catch (error) {
                results.errors.push({
                    row: row.internal_code || row.barcode,
                    error: error.message
                });
            }
        }

        return results;
    }

    // ========================================================================
    // DASHBOARD STATS
    // ========================================================================

    static async getDashboardStats(companyId, branchId = null) {
        const replacements = { companyId };
        let branchFilter = '';

        if (branchId) {
            branchFilter = 'AND b.id = :branchId';
            replacements.branchId = branchId;
        }

        // Products count (sin filtro por branch porque wms_products no tiene branch_id)
        const productsQuery = `
            SELECT COUNT(*) as count FROM wms_products p
            WHERE p.company_id = :companyId AND p.is_active = true
        `;
        const [products] = await sequelize.query(productsQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Warehouses count
        const warehousesQuery = `
            SELECT COUNT(*) as count FROM wms_warehouses w
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = :companyId AND w.is_active = true
            ${branchFilter}
        `;
        const [warehouses] = await sequelize.query(warehousesQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Stock value
        const stockValueQuery = `
            SELECT COALESCE(SUM(s.quantity * s.unit_cost), 0) as total_value
            FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            WHERE b.company_id = :companyId
            ${branchFilter}
        `;
        const [stockValue] = await sequelize.query(stockValueQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Low stock alerts count
        const alertsQuery = `
            SELECT COUNT(*) as count FROM wms_stock s
            JOIN wms_warehouses w ON s.warehouse_id = w.id
            JOIN wms_branches b ON w.branch_id = b.id
            JOIN wms_products p ON s.product_id = p.id
            WHERE b.company_id = :companyId
              AND p.reorder_point IS NOT NULL
              AND s.quantity <= p.reorder_point
            ${branchFilter}
        `;
        const [alerts] = await sequelize.query(alertsQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Active promotions
        const promotionsQuery = `
            SELECT COUNT(*) as count FROM wms_promotions
            WHERE company_id = :companyId AND is_active = true
              AND start_date <= CURRENT_DATE
              AND (end_date IS NULL OR end_date >= CURRENT_DATE)
            ${branchId ? 'AND (branch_id = :branchId OR branch_id IS NULL)' : ''}
        `;
        const [promotions] = await sequelize.query(promotionsQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Price lists
        const priceListsQuery = `
            SELECT COUNT(*) as count FROM wms_price_lists
            WHERE company_id = :companyId AND is_active = true
            ${branchId ? 'AND (branch_id = :branchId OR branch_id IS NULL)' : ''}
        `;
        const [priceLists] = await sequelize.query(priceListsQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        return {
            products: parseInt(products.count),
            warehouses: parseInt(warehouses.count),
            stock_value: parseFloat(stockValue.total_value),
            low_stock_alerts: parseInt(alerts.count),
            active_promotions: parseInt(promotions.count),
            price_lists: parseInt(priceLists.count)
        };
    }
}

module.exports = WarehouseService;
