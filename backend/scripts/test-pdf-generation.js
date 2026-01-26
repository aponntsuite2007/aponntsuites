/**
 * TEST: Generación real de PDFs
 * Verifica que los PDFs se generan correctamente con encabezados
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

async function testPDFGeneration() {
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.bold}  TEST: Generación Real de PDFs${colors.reset}`);
    console.log('═'.repeat(60) + '\n');

    const db = require('../src/config/database');
    const PDFDocument = require('pdfkit');
    const DocumentHeaderService = require('../src/services/DocumentHeaderService');

    try {
        await db.sequelize.authenticate();
        console.log(`${colors.green}✅ Conexión a BD OK${colors.reset}\n`);

        // Buscar empresa de prueba
        const [companies] = await db.sequelize.query(
            'SELECT company_id, name, legal_name, tax_id, address, city, province, phone, contact_email FROM companies WHERE is_active = true LIMIT 1'
        );

        if (companies.length === 0) {
            console.log(`${colors.yellow}⚠️  No hay empresas activas para probar${colors.reset}`);
            process.exit(0);
        }

        const company = companies[0];
        console.log(`${colors.blue}ℹ️  Empresa: ${company.name} (ID: ${company.company_id})${colors.reset}`);
        console.log(`${colors.blue}ℹ️  CUIT: ${company.tax_id}${colors.reset}`);
        console.log(`${colors.blue}ℹ️  Dirección: ${company.address}, ${company.city}${colors.reset}\n`);

        // ============================================
        // TEST 1: Generar PDF con PDFKit + DocumentHeaderService
        // ============================================
        console.log(`${colors.bold}TEST 1: PDF con DocumentHeaderService${colors.reset}`);

        const outputDir = path.join(__dirname, '../storage/test-pdfs');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const testPdfPath = path.join(outputDir, 'test-header.pdf');

        await new Promise(async (resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const stream = fs.createWriteStream(testPdfPath);
            doc.pipe(stream);

            // Agregar header con DocumentHeaderService
            const currentY = await DocumentHeaderService.addPDFHeader(doc, {
                companyId: company.company_id,
                documentType: 'DOCUMENTO DE PRUEBA',
                documentNumber: 'TEST-001',
                documentDate: new Date(),
                recipient: {
                    name: 'Cliente Ejemplo S.A.',
                    taxId: '30-12345678-9',
                    address: 'Av. Test 123, Buenos Aires'
                }
            });

            // Agregar contenido de prueba
            doc.y = currentY + 20;
            doc.fontSize(12).fillColor('#333');
            doc.text('Este es un documento de prueba generado automáticamente.');
            doc.moveDown();
            doc.text('El encabezado incluye:');
            doc.list([
                'Logo de empresa (si existe)',
                'Razón Social',
                'CUIT formateado',
                'Dirección completa',
                'Teléfono y email',
                'Tipo y número de documento',
                'Fecha',
                'Datos del destinatario'
            ]);

            // Agregar footer
            await DocumentHeaderService.addPDFFooter(doc, {
                companyId: company.company_id,
                pageNumber: 1,
                totalPages: 1
            });

            doc.end();

            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        const stats = fs.statSync(testPdfPath);
        if (stats.size > 1000) {
            console.log(`${colors.green}✅ PDF generado: ${testPdfPath}${colors.reset}`);
            console.log(`${colors.green}   Tamaño: ${(stats.size / 1024).toFixed(2)} KB${colors.reset}\n`);
        } else {
            console.log(`${colors.red}❌ PDF muy pequeño (${stats.size} bytes)${colors.reset}\n`);
        }

        // ============================================
        // TEST 2: Generar HTML completo
        // ============================================
        console.log(`${colors.bold}TEST 2: HTML completo con wrapHTMLDocument${colors.reset}`);

        const htmlContent = await DocumentHeaderService.wrapHTMLDocument({
            companyId: company.company_id,
            documentType: 'ORDEN DE COMPRA',
            documentNumber: 'OC-2026-001',
            documentDate: new Date(),
            recipient: {
                name: 'Proveedor Test S.R.L.',
                taxId: '30-98765432-1',
                address: 'Calle Falsa 123'
            },
            content: `
                <h3>Detalle de la Orden</h3>
                <table>
                    <thead>
                        <tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Producto A</td><td>10</td><td>$100.00</td><td>$1,000.00</td></tr>
                        <tr><td>Producto B</td><td>5</td><td>$200.00</td><td>$1,000.00</td></tr>
                    </tbody>
                    <tfoot>
                        <tr class="total-row"><td colspan="3">TOTAL</td><td>$2,000.00</td></tr>
                    </tfoot>
                </table>
            `,
            showFooter: true
        });

        const htmlPath = path.join(outputDir, 'test-order.html');
        fs.writeFileSync(htmlPath, htmlContent);

        const htmlStats = fs.statSync(htmlPath);
        if (htmlStats.size > 500) {
            console.log(`${colors.green}✅ HTML generado: ${htmlPath}${colors.reset}`);
            console.log(`${colors.green}   Tamaño: ${(htmlStats.size / 1024).toFixed(2)} KB${colors.reset}\n`);
        } else {
            console.log(`${colors.red}❌ HTML muy pequeño${colors.reset}\n`);
        }

        // Verificar contenido del HTML
        const hasDoctype = htmlContent.includes('<!DOCTYPE html>');
        const hasHeader = htmlContent.includes('document-header');
        const hasCompanyName = htmlContent.includes(company.legal_name || company.name);
        const hasTaxId = company.tax_id ? htmlContent.includes(company.tax_id.substring(0, 5)) : true;
        const hasFooter = htmlContent.includes('document-footer');
        const hasPrintStyles = htmlContent.includes('@media print');

        console.log(`  ${hasDoctype ? '✅' : '❌'} DOCTYPE HTML`);
        console.log(`  ${hasHeader ? '✅' : '❌'} Encabezado`);
        console.log(`  ${hasCompanyName ? '✅' : '❌'} Nombre empresa`);
        console.log(`  ${hasTaxId ? '✅' : '❌'} CUIT/Tax ID`);
        console.log(`  ${hasFooter ? '✅' : '❌'} Pie de página`);
        console.log(`  ${hasPrintStyles ? '✅' : '❌'} Estilos de impresión\n`);

        // ============================================
        // TEST 3: Texto plano
        // ============================================
        console.log(`${colors.bold}TEST 3: Encabezado texto plano${colors.reset}`);

        const textHeader = await DocumentHeaderService.generateTextHeader({
            companyId: company.company_id,
            documentType: 'REMITO',
            documentNumber: 'REM-001'
        });

        console.log(`${colors.blue}--- Encabezado generado ---${colors.reset}`);
        console.log(textHeader);
        console.log(`${colors.blue}--- Fin encabezado ---${colors.reset}\n`);

        // ============================================
        // RESUMEN
        // ============================================
        console.log('═'.repeat(60));
        console.log(`${colors.bold}${colors.green}  ✅ TODOS LOS TESTS DE PDF COMPLETADOS${colors.reset}`);
        console.log('═'.repeat(60));
        console.log(`\n  📁 Archivos generados en: ${outputDir}`);
        console.log(`     - test-header.pdf`);
        console.log(`     - test-order.html\n`);

        await db.sequelize.close();

    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
        console.error(error.stack);
        process.exit(1);
    }
}

testPDFGeneration();
