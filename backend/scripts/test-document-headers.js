/**
 * TEST: DocumentHeaderService + Integraciones
 * Verifica que todos los documentos tengan encabezados correctos
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Colores para output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
    if (condition) {
        passed++;
        log.success(`${name}`);
    } else {
        failed++;
        log.error(`${name}${details ? ` - ${details}` : ''}`);
    }
}

async function runTests() {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}  TEST: DocumentHeaderService + Integraciones${colors.reset}`);
    console.log('═'.repeat(60) + '\n');

    // ============================================
    // TEST 1: DocumentHeaderService carga correctamente
    // ============================================
    log.header('TEST 1: DocumentHeaderService - Carga del módulo');

    let DocumentHeaderService;
    try {
        DocumentHeaderService = require('../src/services/DocumentHeaderService');
        test('DocumentHeaderService se importa correctamente', true);
    } catch (error) {
        test('DocumentHeaderService se importa correctamente', false, error.message);
        console.log('\n❌ No se puede continuar sin DocumentHeaderService\n');
        process.exit(1);
    }

    // Verificar métodos estáticos
    test('getCompanyData es función', typeof DocumentHeaderService.getCompanyData === 'function');
    test('generateHTMLHeader es función', typeof DocumentHeaderService.generateHTMLHeader === 'function');
    test('addPDFHeader es función', typeof DocumentHeaderService.addPDFHeader === 'function');
    test('generateTextHeader es función', typeof DocumentHeaderService.generateTextHeader === 'function');
    test('wrapHTMLDocument es función', typeof DocumentHeaderService.wrapHTMLDocument === 'function');
    test('addPDFFooter es función', typeof DocumentHeaderService.addPDFFooter === 'function');
    test('formatDate es función', typeof DocumentHeaderService.formatDate === 'function');

    // ============================================
    // TEST 2: Configuración de países
    // ============================================
    log.header('TEST 2: Configuración Multi-País');

    test('TAX_ID_LABELS definido', !!DocumentHeaderService.TAX_ID_LABELS);
    test('Argentina (AR) = CUIT', DocumentHeaderService.TAX_ID_LABELS?.AR === 'CUIT');
    test('Chile (CL) = RUT', DocumentHeaderService.TAX_ID_LABELS?.CL === 'RUT');
    test('Brasil (BR) = CNPJ', DocumentHeaderService.TAX_ID_LABELS?.BR === 'CNPJ');
    test('México (MX) = RFC', DocumentHeaderService.TAX_ID_LABELS?.MX === 'RFC');
    test('Uruguay (UY) = RUT', DocumentHeaderService.TAX_ID_LABELS?.UY === 'RUT');
    test('Colombia (CO) = NIT', DocumentHeaderService.TAX_ID_LABELS?.CO === 'NIT');

    // Test formateo de CUIT argentino
    const arFormatter = DocumentHeaderService.TAX_ID_FORMATS?.AR;
    if (arFormatter) {
        const formattedCuit = arFormatter('20123456789');
        test('Formato CUIT AR: 20-12345678-9', formattedCuit === '20-12345678-9');
    } else {
        test('Formato CUIT AR existe', false);
    }

    // ============================================
    // TEST 3: getDefaultCompanyData
    // ============================================
    log.header('TEST 3: Datos por defecto');

    const defaultData = DocumentHeaderService.getDefaultCompanyData();
    test('getDefaultCompanyData retorna objeto', typeof defaultData === 'object');
    test('Tiene campo name', !!defaultData.name);
    test('Tiene campo taxIdLabel', !!defaultData.taxIdLabel);
    test('Tiene campo country', !!defaultData.country);
    test('hasLogo es false por defecto', defaultData.hasLogo === false);

    // ============================================
    // TEST 4: formatDate
    // ============================================
    log.header('TEST 4: Formateo de fechas');

    const testDate = new Date('2026-01-25');
    const formatted = DocumentHeaderService.formatDate(testDate);
    test('formatDate retorna string', typeof formatted === 'string');
    test('Fecha contiene año', formatted.includes('2026'));
    test('Fecha contiene "enero" o "January"', formatted.toLowerCase().includes('enero') || formatted.toLowerCase().includes('january'));

    const shortDate = DocumentHeaderService.formatDateShort(testDate);
    test('formatDateShort retorna string', typeof shortDate === 'string');
    test('Fecha corta tiene formato fecha', shortDate.length >= 8); // Ej: 25/01/2026 o 01/25/2026

    // ============================================
    // TEST 5: Conexión a BD y getCompanyData
    // ============================================
    log.header('TEST 5: Conexión a BD');

    let db;
    try {
        db = require('../src/config/database');
        await db.sequelize.authenticate();
        test('Conexión a PostgreSQL', true);
    } catch (error) {
        test('Conexión a PostgreSQL', false, error.message);
        log.warn('Continuando tests sin BD...');
    }

    if (db) {
        // Buscar una empresa de prueba
        try {
            const [companies] = await db.sequelize.query(
                'SELECT company_id, name, legal_name, tax_id, address FROM companies WHERE is_active = true LIMIT 1'
            );

            if (companies.length > 0) {
                const testCompanyId = companies[0].company_id;
                log.info(`Empresa de prueba: ID ${testCompanyId} - ${companies[0].name}`);

                const companyData = await DocumentHeaderService.getCompanyData(testCompanyId);
                test('getCompanyData retorna datos', !!companyData);
                test('Tiene nombre de empresa', !!companyData.name);
                test('Tiene taxIdLabel', !!companyData.taxIdLabel);
                test('Tiene campo hasLogo', typeof companyData.hasLogo === 'boolean');

                // ============================================
                // TEST 6: Generación de HTML Header
                // ============================================
                log.header('TEST 6: Generación HTML Header');

                const htmlHeader = await DocumentHeaderService.generateHTMLHeader({
                    companyId: testCompanyId,
                    documentType: 'FACTURA TEST',
                    documentNumber: 'TEST-001',
                    documentDate: new Date()
                });

                test('generateHTMLHeader retorna string', typeof htmlHeader === 'string');
                test('HTML contiene document-header', htmlHeader.includes('document-header'));
                test('HTML contiene company-info', htmlHeader.includes('company-info'));
                test('HTML contiene el tipo de documento', htmlHeader.includes('FACTURA TEST'));
                test('HTML contiene número de documento', htmlHeader.includes('TEST-001'));

                // Con destinatario
                const htmlWithRecipient = await DocumentHeaderService.generateHTMLHeader({
                    companyId: testCompanyId,
                    documentType: 'ORDEN DE COMPRA',
                    documentNumber: 'OC-002',
                    recipient: {
                        name: 'Proveedor Test S.A.',
                        taxId: '30-12345678-9',
                        address: 'Av. Test 123'
                    }
                });
                test('HTML con destinatario contiene datos', htmlWithRecipient.includes('Proveedor Test S.A.'));

                // ============================================
                // TEST 7: Generación de Texto
                // ============================================
                log.header('TEST 7: Generación Texto Plano');

                const textHeader = await DocumentHeaderService.generateTextHeader({
                    companyId: testCompanyId,
                    documentType: 'REMITO',
                    documentNumber: 'REM-003'
                });

                test('generateTextHeader retorna string', typeof textHeader === 'string');
                test('Texto contiene líneas decorativas', textHeader.includes('═'));
                test('Texto contiene tipo documento', textHeader.includes('REMITO'));

                // ============================================
                // TEST 8: wrapHTMLDocument
                // ============================================
                log.header('TEST 8: Documento HTML Completo');

                const fullDoc = await DocumentHeaderService.wrapHTMLDocument({
                    companyId: testCompanyId,
                    documentType: 'PRESUPUESTO',
                    documentNumber: 'PRES-004',
                    content: '<p>Contenido de prueba</p>',
                    showFooter: true
                });

                test('wrapHTMLDocument retorna HTML completo', fullDoc.includes('<!DOCTYPE html>'));
                test('HTML tiene head', fullDoc.includes('<head>'));
                test('HTML tiene body', fullDoc.includes('<body>'));
                test('HTML tiene header', fullDoc.includes('document-header'));
                test('HTML tiene contenido', fullDoc.includes('Contenido de prueba'));
                test('HTML tiene footer', fullDoc.includes('document-footer'));
                test('HTML tiene estilos print', fullDoc.includes('@media print'));

                // ============================================
                // TEST 9: generateHTMLFooter
                // ============================================
                log.header('TEST 9: Footer HTML');

                const footer = await DocumentHeaderService.generateHTMLFooter({
                    companyId: testCompanyId,
                    pageNumber: 1,
                    totalPages: 3,
                    showLegal: true
                });

                test('Footer retorna HTML', typeof footer === 'string');
                test('Footer contiene clase', footer.includes('document-footer'));
                test('Footer tiene paginación', footer.includes('Página 1 de 3'));

            } else {
                log.warn('No hay empresas activas para probar');
            }
        } catch (error) {
            test('Query de empresas', false, error.message);
        }
    }

    // ============================================
    // TEST 10: InvoicingService
    // ============================================
    log.header('TEST 10: InvoicingService');

    try {
        const InvoicingService = require('../src/services/InvoicingService');
        test('InvoicingService se importa', true);
        test('generatePDF es función', typeof InvoicingService.generatePDF === 'function');
        test('formatCurrency es función', typeof InvoicingService.formatCurrency === 'function');
        test('getMonthName es función', typeof InvoicingService.getMonthName === 'function');

        // Test formatCurrency
        const formatted = InvoicingService.formatCurrency(1234.56, 'ARS');
        test('formatCurrency formatea correctamente', formatted.includes('1.234,56') || formatted.includes('1,234.56'));

        // Test getMonthName
        test('getMonthName(1) = Enero', InvoicingService.getMonthName(1) === 'Enero');
        test('getMonthName(12) = Diciembre', InvoicingService.getMonthName(12) === 'Diciembre');

    } catch (error) {
        test('InvoicingService se importa', false, error.message);
    }

    // ============================================
    // TEST 11: AuditReportService
    // ============================================
    log.header('TEST 11: AuditReportService');

    try {
        const auditReportService = require('../src/services/auditReportService');
        test('AuditReportService se importa', true);

        // Verificar que tiene el método addPDFHeader actualizado (exporta instancia, no clase)
        test('addPDFHeader es función', typeof auditReportService.addPDFHeader === 'function');
        test('generateReport es función', typeof auditReportService.generateReport === 'function');

    } catch (error) {
        test('AuditReportService se importa', false, error.message);
    }

    // ============================================
    // TEST 12: RiskReportService
    // ============================================
    log.header('TEST 12: RiskReportService');

    try {
        const RiskReportService = require('../src/services/RiskReportService');
        test('RiskReportService se importa', true);
        test('addPDFHeader es función estática', typeof RiskReportService.addPDFHeader === 'function');
        test('generateDashboardPDF es función', typeof RiskReportService.generateDashboardPDF === 'function');

    } catch (error) {
        test('RiskReportService se importa', false, error.message);
    }

    // ============================================
    // RESUMEN FINAL
    // ============================================
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}  RESUMEN DE TESTS${colors.reset}`);
    console.log('═'.repeat(60));

    const total = passed + failed;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`\n  Total:    ${total} tests`);
    console.log(`  ${colors.green}Pasaron:  ${passed}${colors.reset}`);
    console.log(`  ${colors.red}Fallaron: ${failed}${colors.reset}`);
    console.log(`  Éxito:    ${percentage}%\n`);

    if (failed === 0) {
        console.log(`${colors.green}${colors.bold}  ✅ TODOS LOS TESTS PASARON${colors.reset}\n`);
    } else {
        console.log(`${colors.red}${colors.bold}  ❌ HAY TESTS FALLIDOS${colors.reset}\n`);
    }

    // Cerrar conexión
    if (db) {
        await db.sequelize.close();
    }

    process.exit(failed > 0 ? 1 : 0);
}

// Ejecutar
runTests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
