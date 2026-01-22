/**
 * ============================================================================
 * LOTE 5: EPP, SUPPLIERS, PURCHASE ORDERS, PARTNERS, AUDIT
 * CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCION
 * ============================================================================
 *
 * @version 1.0.0
 * @date 2026-01-21
 * ============================================================================
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(type, message) {
    const prefix = {
        pass: `${colors.green}✓ PASS${colors.reset}`,
        fail: `${colors.red}✗ FAIL${colors.reset}`,
        info: `${colors.blue}ℹ INFO${colors.reset}`,
        section: `${colors.cyan}${colors.bold}▶${colors.reset}`,
        crud: `${colors.bold}🔄 CRUD${colors.reset}`
    };
    console.log(`${prefix[type] || '•'} ${message}`);
}

const stats = { total: 0, passed: 0, failed: 0 };

function recordTest(name, passed, details = '') {
    stats.total++;
    if (passed) {
        stats.passed++;
        log('pass', `${name}${details ? ` - ${details}` : ''}`);
    } else {
        stats.failed++;
        log('fail', `${name}${details ? ` - ${details}` : ''}`);
    }
    return passed;
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}LOTE 5: EPP, SUPPLIERS, PURCHASE ORDERS, PARTNERS, AUDIT${colors.reset}`);
    console.log(`${colors.bold}CRUD PROFUNDO + PERSISTENCIA - NIVEL PRODUCCIÓN${colors.reset}`);
    console.log('='.repeat(70) + '\n');

    let testData = {};

    try {
        await sequelize.authenticate();
        log('info', 'Conexión establecida');

        // Obtener empresa con usuarios activos
        const [company] = await sequelize.query(`
            SELECT c.company_id, c.name
            FROM companies c
            INNER JOIN users u ON c.company_id = u.company_id AND u."isActive" = true
            WHERE c.is_active = true
            GROUP BY c.company_id, c.name
            ORDER BY COUNT(u.user_id) DESC
            LIMIT 1
        `, { type: QueryTypes.SELECT });

        if (!company) {
            log('fail', 'No hay empresa con usuarios para testing');
            return stats;
        }

        const [user] = await sequelize.query(`
            SELECT user_id, "firstName", "lastName" FROM users
            WHERE company_id = :companyId AND "isActive" = true LIMIT 1
        `, { replacements: { companyId: company.company_id }, type: QueryTypes.SELECT });

        if (!user) {
            log('fail', 'No hay usuario para testing');
            return stats;
        }

        log('info', `Testing con empresa: ${company.name} (ID: ${company.company_id})`);
        testData.companyId = company.company_id;
        testData.userId = user.user_id;

        // ================================================================
        // 1. EPP_CATALOG - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '1. EPP_CATALOG - CRUD');
        console.log('-'.repeat(50));

        // CREATE - EPP Catalog (requiere category_id válido)
        log('crud', 'CREATE epp_catalog');
        const eppCode = `EPP_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO epp_catalog (
                company_id, category_id, code, name, description,
                brand, model, default_lifespan_days, unit_cost,
                min_stock_alert, is_active,
                created_at, updated_at
            ) VALUES (
                :companyId, 1, :code, 'Test EPP Item CRUD', 'Test EPP description',
                'Test Brand', 'Test Model', 365, 100.00,
                5, true,
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, code: eppCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ epp_catalog');
        const [eppItem] = await sequelize.query(`
            SELECT * FROM epp_catalog WHERE code = :code AND company_id = :companyId
        `, { replacements: { code: eppCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('EPP Catalog CREATE + READ', eppItem && eppItem.brand === 'Test Brand',
            `ID: ${eppItem?.id}`);
        testData.eppCatalogId = eppItem?.id;

        // UPDATE
        log('crud', 'UPDATE epp_catalog');
        await sequelize.query(`
            UPDATE epp_catalog SET name = 'Test EPP UPDATED', unit_cost = 150.00, updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.eppCatalogId }, type: QueryTypes.UPDATE });

        const [updatedEpp] = await sequelize.query(`SELECT * FROM epp_catalog WHERE id = :id`,
            { replacements: { id: testData.eppCatalogId }, type: QueryTypes.SELECT });

        recordTest('EPP Catalog UPDATE',
            updatedEpp.name === 'Test EPP UPDATED' && parseFloat(updatedEpp.unit_cost) === 150.00,
            `name=${updatedEpp.name}`);

        // ================================================================
        // 2. WMS_SUPPLIERS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '2. WMS_SUPPLIERS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - wms_suppliers no tiene updated_at, code max 20 chars
        log('crud', 'CREATE wms_suppliers');
        const supplierCode = `SUP${Date.now().toString().slice(-8)}`;
        await sequelize.query(`
            INSERT INTO wms_suppliers (
                company_id, code, name, legal_name, tax_id,
                address, city, phone, email, contact_name,
                payment_terms, credit_limit, is_active,
                created_at
            ) VALUES (
                :companyId, :code, 'Test Supplier CRUD', 'Test Supplier Legal Name', '30-12345678-9',
                'Test Address 123', 'Test City', '+541234567890', 'test@supplier.com', 'Test Contact',
                30, 50000.00, true,
                NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, code: supplierCode },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ wms_suppliers');
        const [supplier] = await sequelize.query(`
            SELECT * FROM wms_suppliers WHERE code = :code AND company_id = :companyId
        `, { replacements: { code: supplierCode, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Supplier CREATE + READ', supplier && supplier.name === 'Test Supplier CRUD',
            `ID: ${supplier?.id}`);
        testData.supplierId = supplier?.id;

        // UPDATE - no updated_at column
        log('crud', 'UPDATE wms_suppliers');
        await sequelize.query(`
            UPDATE wms_suppliers SET name = 'Test Supplier UPDATED', credit_limit = 75000.00
            WHERE id = :id
        `, { replacements: { id: testData.supplierId }, type: QueryTypes.UPDATE });

        const [updatedSupplier] = await sequelize.query(`SELECT * FROM wms_suppliers WHERE id = :id`,
            { replacements: { id: testData.supplierId }, type: QueryTypes.SELECT });

        recordTest('Supplier UPDATE',
            updatedSupplier.name === 'Test Supplier UPDATED' && parseFloat(updatedSupplier.credit_limit) === 75000.00,
            `name=${updatedSupplier.name}`);

        // ================================================================
        // 3. PURCHASE_ORDERS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '3. PURCHASE_ORDERS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - order_type: 'product', 'service', 'mixed'
        log('crud', 'CREATE purchase_orders');
        const poNumber = `PO_TEST_${Date.now()}`;
        await sequelize.query(`
            INSERT INTO purchase_orders (
                company_id, po_number, supplier_id, order_date,
                expected_delivery_date, delivery_address, currency,
                subtotal, tax_amount, total_amount, payment_terms,
                status, order_type, notes,
                created_at, updated_at
            ) VALUES (
                :companyId, :poNumber, :supplierId, CURRENT_DATE,
                CURRENT_DATE + INTERVAL '15 days', 'Test Delivery Address', 'ARS',
                10000.00, 2100.00, 12100.00, 'Net 30',
                'draft', 'product', 'Test purchase order CRUD',
                NOW(), NOW()
            )
        `, {
            replacements: { companyId: testData.companyId, poNumber, supplierId: testData.supplierId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ purchase_orders');
        const [purchaseOrder] = await sequelize.query(`
            SELECT * FROM purchase_orders WHERE po_number = :poNumber AND company_id = :companyId
        `, { replacements: { poNumber, companyId: testData.companyId }, type: QueryTypes.SELECT });

        recordTest('Purchase Order CREATE + READ', purchaseOrder && purchaseOrder.status === 'draft',
            `ID: ${purchaseOrder?.id}`);
        testData.purchaseOrderId = purchaseOrder?.id;

        // UPDATE
        log('crud', 'UPDATE purchase_orders');
        await sequelize.query(`
            UPDATE purchase_orders SET status = 'approved', notes = 'Test PO UPDATED', updated_at = NOW()
            WHERE id = :id
        `, { replacements: { id: testData.purchaseOrderId }, type: QueryTypes.UPDATE });

        const [updatedPO] = await sequelize.query(`SELECT * FROM purchase_orders WHERE id = :id`,
            { replacements: { id: testData.purchaseOrderId }, type: QueryTypes.SELECT });

        recordTest('Purchase Order UPDATE',
            updatedPO.status === 'approved' && updatedPO.notes === 'Test PO UPDATED',
            `status=${updatedPO.status}`);

        // ================================================================
        // 4. PARTNERS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '4. PARTNERS - CRUD');
        console.log('-'.repeat(50));

        // CREATE - approval_status: 'pending', 'approved', 'denied'
        log('crud', 'CREATE partners');
        const partnerId = crypto.randomUUID();
        const partnerDni = `${Date.now()}`.slice(-8);
        await sequelize.query(`
            INSERT INTO partners (
                id, first_name, last_name, dni, email, phone,
                approval_status, is_active,
                created_at, updated_at
            ) VALUES (
                :id, 'Test', 'Partner CRUD', :dni, 'test.partner@crud.com', '+5491234567890',
                'pending', true,
                NOW(), NOW()
            )
        `, {
            replacements: { id: partnerId, dni: partnerDni },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ partners');
        const [partner] = await sequelize.query(`
            SELECT * FROM partners WHERE id = :id::uuid
        `, { replacements: { id: partnerId }, type: QueryTypes.SELECT });

        recordTest('Partner CREATE + READ', partner && partner.approval_status === 'pending',
            `ID: ${partner?.id?.slice(0, 8)}`);
        testData.partnerId = partnerId;

        // UPDATE
        log('crud', 'UPDATE partners');
        await sequelize.query(`
            UPDATE partners SET approval_status = 'approved', first_name = 'Test UPDATED', updated_at = NOW()
            WHERE id = :id::uuid
        `, { replacements: { id: testData.partnerId }, type: QueryTypes.UPDATE });

        const [updatedPartner] = await sequelize.query(`SELECT * FROM partners WHERE id = :id::uuid`,
            { replacements: { id: testData.partnerId }, type: QueryTypes.SELECT });

        recordTest('Partner UPDATE',
            updatedPartner.approval_status === 'approved' && updatedPartner.first_name === 'Test UPDATED',
            `status=${updatedPartner.approval_status}`);

        // ================================================================
        // 5. AUDIT_LOGS - CRUD
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '5. AUDIT_LOGS - CRUD');
        console.log('-'.repeat(50));

        // CREATE
        log('crud', 'CREATE audit_logs');
        const auditId = crypto.randomUUID();
        await sequelize.query(`
            INSERT INTO audit_logs (
                id, user_id, company_id, action, module_id,
                entity_type, entity_id, old_values, new_values,
                ip_address, success, test_description,
                created_at
            ) VALUES (
                :id, :userId, :companyId, 'TEST_CRUD', 'testing',
                'test_entity', 'test-123', '{"test": "old"}', '{"test": "new"}',
                '127.0.0.1', true, 'Test CRUD audit log',
                NOW()
            )
        `, {
            replacements: { id: auditId, userId: testData.userId, companyId: testData.companyId },
            type: QueryTypes.INSERT
        });

        // READ
        log('crud', 'READ audit_logs');
        const [auditLog] = await sequelize.query(`
            SELECT * FROM audit_logs WHERE id = :id::uuid
        `, { replacements: { id: auditId }, type: QueryTypes.SELECT });

        recordTest('Audit Log CREATE + READ', auditLog && auditLog.action === 'TEST_CRUD',
            `ID: ${auditLog?.id?.slice(0, 8)}`);
        testData.auditId = auditId;

        // UPDATE
        log('crud', 'UPDATE audit_logs');
        await sequelize.query(`
            UPDATE audit_logs SET test_description = 'Test UPDATED audit log', action = 'TEST_UPDATED'
            WHERE id = :id::uuid
        `, { replacements: { id: testData.auditId }, type: QueryTypes.UPDATE });

        const [updatedAudit] = await sequelize.query(`SELECT * FROM audit_logs WHERE id = :id::uuid`,
            { replacements: { id: testData.auditId }, type: QueryTypes.SELECT });

        recordTest('Audit Log UPDATE',
            updatedAudit.action === 'TEST_UPDATED' && updatedAudit.test_description === 'Test UPDATED audit log',
            `action=${updatedAudit.action}`);

        // ================================================================
        // 6. PERSISTENCIA - Verificación
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '6. PERSISTENCIA - Verificación');
        console.log('-'.repeat(50));

        const savedIds = {
            eppCatalogId: testData.eppCatalogId,
            supplierId: testData.supplierId,
            purchaseOrderId: testData.purchaseOrderId,
            partnerId: testData.partnerId,
            auditId: testData.auditId
        };

        log('info', 'Esperando commit...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        log('crud', 'Verificando persistencia...');

        const [pEpp] = await sequelize.query(`SELECT * FROM epp_catalog WHERE id = :id`,
            { replacements: { id: savedIds.eppCatalogId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: EPP Catalog', pEpp && pEpp.name === 'Test EPP UPDATED');

        const [pSup] = await sequelize.query(`SELECT * FROM wms_suppliers WHERE id = :id`,
            { replacements: { id: savedIds.supplierId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Supplier', pSup && pSup.name === 'Test Supplier UPDATED');

        const [pPO] = await sequelize.query(`SELECT * FROM purchase_orders WHERE id = :id`,
            { replacements: { id: savedIds.purchaseOrderId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Purchase Order', pPO && pPO.status === 'approved');

        const [pPartner] = await sequelize.query(`SELECT * FROM partners WHERE id = :id::uuid`,
            { replacements: { id: savedIds.partnerId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Partner', pPartner && pPartner.approval_status === 'approved');

        const [pAudit] = await sequelize.query(`SELECT * FROM audit_logs WHERE id = :id::uuid`,
            { replacements: { id: savedIds.auditId }, type: QueryTypes.SELECT });
        recordTest('PERSIST: Audit Log', pAudit && pAudit.action === 'TEST_UPDATED');

        // ================================================================
        // 7. DELETE - Limpieza (orden correcto por FK)
        // ================================================================
        console.log('\n' + '-'.repeat(50));
        log('section', '7. DELETE - Limpieza');
        console.log('-'.repeat(50));

        // DELETE Audit Log
        log('crud', 'DELETE audit_logs');
        await sequelize.query(`DELETE FROM audit_logs WHERE id = :id::uuid`,
            { replacements: { id: savedIds.auditId }, type: QueryTypes.DELETE });
        const [delAudit] = await sequelize.query(`SELECT * FROM audit_logs WHERE id = :id::uuid`,
            { replacements: { id: savedIds.auditId }, type: QueryTypes.SELECT });
        recordTest('Audit Log DELETE', !delAudit, 'Eliminado');

        // DELETE Partner
        log('crud', 'DELETE partners');
        await sequelize.query(`DELETE FROM partners WHERE id = :id::uuid`,
            { replacements: { id: savedIds.partnerId }, type: QueryTypes.DELETE });
        const [delPartner] = await sequelize.query(`SELECT * FROM partners WHERE id = :id::uuid`,
            { replacements: { id: savedIds.partnerId }, type: QueryTypes.SELECT });
        recordTest('Partner DELETE', !delPartner, 'Eliminado');

        // DELETE Purchase Order (antes de supplier por FK)
        log('crud', 'DELETE purchase_orders');
        await sequelize.query(`DELETE FROM purchase_orders WHERE id = :id`,
            { replacements: { id: savedIds.purchaseOrderId }, type: QueryTypes.DELETE });
        const [delPO] = await sequelize.query(`SELECT * FROM purchase_orders WHERE id = :id`,
            { replacements: { id: savedIds.purchaseOrderId }, type: QueryTypes.SELECT });
        recordTest('Purchase Order DELETE', !delPO, 'Eliminado');

        // DELETE Supplier
        log('crud', 'DELETE wms_suppliers');
        await sequelize.query(`DELETE FROM wms_suppliers WHERE id = :id`,
            { replacements: { id: savedIds.supplierId }, type: QueryTypes.DELETE });
        const [delSup] = await sequelize.query(`SELECT * FROM wms_suppliers WHERE id = :id`,
            { replacements: { id: savedIds.supplierId }, type: QueryTypes.SELECT });
        recordTest('Supplier DELETE', !delSup, 'Eliminado');

        // DELETE EPP Catalog
        log('crud', 'DELETE epp_catalog');
        await sequelize.query(`DELETE FROM epp_catalog WHERE id = :id`,
            { replacements: { id: savedIds.eppCatalogId }, type: QueryTypes.DELETE });
        const [delEpp] = await sequelize.query(`SELECT * FROM epp_catalog WHERE id = :id`,
            { replacements: { id: savedIds.eppCatalogId }, type: QueryTypes.SELECT });
        recordTest('EPP Catalog DELETE', !delEpp, 'Eliminado');

        // Verificar persistencia DELETE
        log('info', 'Verificando persistencia DELETE...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const [checkEpp] = await sequelize.query(`SELECT * FROM epp_catalog WHERE id = :id`,
            { replacements: { id: savedIds.eppCatalogId }, type: QueryTypes.SELECT });
        recordTest('PERSIST DELETE: All cleared', !checkEpp, 'Datos eliminados permanentemente');

    } catch (error) {
        console.error(`${colors.red}ERROR:${colors.reset}`, error.message);
        console.error(error.stack);
        stats.failed++;
    } finally {
        await sequelize.close();
    }

    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bold}RESUMEN LOTE 5${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`Total: ${stats.total}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);
    console.log(`Success Rate: ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(70) + '\n');

    return stats;
}

runTests().then(stats => {
    process.exit(stats.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
