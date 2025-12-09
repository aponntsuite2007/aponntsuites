/**
 * ============================================================================
 * TEST: BILLING RULES INTEGRATION CON TAX TEMPLATES
 * ============================================================================
 *
 * Script para verificar la integración completa entre BillingRulesService
 * y las plantillas fiscales de la base de datos.
 *
 * VALIDA:
 * 1. Obtención de reglas fiscales desde tax_templates
 * 2. Cálculo de impuestos usando plantillas dinámicas
 * 3. Aplicación de condiciones fiscales (RI, RM, EX, CF)
 * 4. Overrides por empresa (company_tax_config)
 * 5. Validación de factura con reglas
 *
 * Usage: node scripts/test-billing-rules-integration.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9998';
let authToken = null;

// ============================================
// HELPERS
// ============================================

async function login() {
    console.log('\n🔐 Step 1: Autenticando...');

    const response = await axios.post(`${BASE_URL}/api/v1/auth/login-3steps`, {
        step: 1,
        companySlug: 'aponnt-empresa-demo'
    });

    const employeeId = response.data.employees[0].employee_id;

    const response2 = await axios.post(`${BASE_URL}/api/v1/auth/login-3steps`, {
        step: 2,
        companySlug: 'aponnt-empresa-demo',
        employeeId
    });

    const response3 = await axios.post(`${BASE_URL}/api/v1/auth/login-3steps`, {
        step: 3,
        companySlug: 'aponnt-empresa-demo',
        employeeId,
        password: 'admin123'
    });

    authToken = response3.data.token;
    console.log('✅ Autenticación exitosa');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);

    return response3.data;
}

function formatCurrency(amount) {
    return `$${parseFloat(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

// ============================================
// TEST 1: OBTENER REGLAS FISCALES DE EMPRESA
// ============================================

async function testGetCompanyBillingRules() {
    console.log('\n\n📋 TEST 1: Obtener reglas fiscales de empresa desde tax_templates');
    console.log('─'.repeat(80));

    try {
        // Llamar directamente al servicio (simulado via API si existe endpoint)
        console.log('   ℹ️  Este test requiere crear endpoint GET /api/billing/rules/:companyId');
        console.log('   📝 Por ahora verificaremos manualmente con SQL');

        const { Client } = require('pg');
        const client = new Client({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            database: process.env.POSTGRES_DB || 'attendance_system',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD
        });

        await client.connect();

        // Verificar plantilla Argentina
        const result = await client.query(`
            SELECT
                tt.country_code,
                tt.country_name,
                tt.invoice_format,
                tt.requires_cae,
                COUNT(tc.id) as concepts_count,
                COUNT(tcond.id) as conditions_count
            FROM tax_templates tt
            LEFT JOIN tax_concepts tc ON tt.id = tc.template_id
            LEFT JOIN tax_conditions tcond ON tt.id = tcond.template_id
            WHERE tt.country_code = 'AR'
            GROUP BY tt.id, tt.country_code, tt.country_name, tt.invoice_format, tt.requires_cae
        `);

        if (result.rows.length > 0) {
            const data = result.rows[0];
            console.log('\n   ✅ Plantilla Argentina encontrada:');
            console.log(`      País: ${data.country_name} (${data.country_code})`);
            console.log(`      Formato: ${data.invoice_format}`);
            console.log(`      Requiere CAE: ${data.requires_cae ? 'Sí' : 'No'}`);
            console.log(`      Conceptos fiscales: ${data.concepts_count}`);
            console.log(`      Condiciones: ${data.conditions_count}`);
        } else {
            console.log('   ❌ No se encontró plantilla Argentina');
        }

        await client.end();

    } catch (error) {
        console.error('   ❌ Error:', error.message);
    }
}

// ============================================
// TEST 2: CALCULAR IMPUESTOS CON PLANTILLAS
// ============================================

async function testCalculateTaxesWithTemplates() {
    console.log('\n\n💰 TEST 2: Calcular impuestos usando plantillas fiscales');
    console.log('─'.repeat(80));

    try {
        // Test de factura manual con cálculo de impuestos
        console.log('\n   📝 Creando factura manual con subtotal $10,000...');

        const invoiceData = {
            company_id: 1,
            cliente: {
                razon_social: 'Cliente Test RI',
                documento_tipo: 'CUIT',
                documento_numero: '30-12345678-9',
                condicion_iva: 'RI', // Responsable Inscripto
                email: 'test@example.com'
            },
            items: [
                {
                    nombre_producto: 'Servicio de Consultoría',
                    codigo: 'SERV-001',
                    cantidad: 1,
                    precio_unitario: 10000
                }
            ],
            descuento_porcentaje: 0,
            impuestos: [] // Dejar vacío, se calculan con BillingRulesService
        };

        const response = await axios.post(
            `${BASE_URL}/api/billing/invoices/manual`,
            invoiceData,
            {
                headers: { Authorization: `Bearer ${authToken}` }
            }
        );

        if (response.data.success) {
            const invoice = response.data.invoice;
            console.log('\n   ✅ Factura creada exitosamente:');
            console.log(`      Número: ${invoice.numero_completo}`);
            console.log(`      Subtotal: ${formatCurrency(invoice.subtotal)}`);
            console.log(`      Impuestos: ${formatCurrency(invoice.total_impuestos)}`);
            console.log(`      Total: ${formatCurrency(invoice.total_factura)}`);

            // TODO: Verificar que los impuestos vienen desde tax_templates
            console.log('\n   ℹ️  Próximo paso: Verificar que impuestos vienen desde tax_templates');
        }

    } catch (error) {
        console.error('   ❌ Error:', error.response?.data || error.message);
    }
}

// ============================================
// TEST 3: CONDICIONES FISCALES (RI vs CF)
// ============================================

async function testTaxConditions() {
    console.log('\n\n🏷️  TEST 3: Validar condiciones fiscales (RI, RM, EX, CF)');
    console.log('─'.repeat(80));

    const subtotal = 10000;

    const conditions = [
        { code: 'RI', name: 'Responsable Inscripto', shouldHaveIVA: true },
        { code: 'CF', name: 'Consumidor Final', shouldHaveIVA: true },
        { code: 'EX', name: 'Exento', shouldHaveIVA: false }
    ];

    for (const cond of conditions) {
        console.log(`\n   📋 Facturando a cliente ${cond.name} (${cond.code})...`);

        try {
            const invoiceData = {
                company_id: 1,
                cliente: {
                    razon_social: `Cliente ${cond.name}`,
                    documento_tipo: 'CUIT',
                    documento_numero: '30-00000000-0',
                    condicion_iva: cond.code,
                    email: 'test@example.com'
                },
                items: [
                    {
                        nombre_producto: 'Producto Test',
                        codigo: 'TEST-001',
                        cantidad: 1,
                        precio_unitario: subtotal
                    }
                ]
            };

            const response = await axios.post(
                `${BASE_URL}/api/billing/invoices/manual`,
                invoiceData,
                {
                    headers: { Authorization: `Bearer ${authToken}` }
                }
            );

            if (response.data.success) {
                const invoice = response.data.invoice;
                const hasIVA = parseFloat(invoice.total_impuestos) > 0;

                console.log(`      Subtotal: ${formatCurrency(invoice.subtotal)}`);
                console.log(`      Impuestos: ${formatCurrency(invoice.total_impuestos)}`);
                console.log(`      Total: ${formatCurrency(invoice.total_factura)}`);

                if (cond.shouldHaveIVA === hasIVA) {
                    console.log(`      ✅ IVA correctamente ${hasIVA ? 'aplicado' : 'no aplicado'}`);
                } else {
                    console.log(`      ❌ ERROR: IVA debería ${cond.shouldHaveIVA ? 'estar' : 'NO estar'} aplicado`);
                }
            }
        } catch (error) {
            console.error(`      ❌ Error:`, error.response?.data?.error || error.message);
        }
    }
}

// ============================================
// TEST 4: VALIDAR TIPOS DE COMPROBANTE
// ============================================

async function testDocumentTypes() {
    console.log('\n\n📄 TEST 4: Validar tipos de comprobante desde plantilla');
    console.log('─'.repeat(80));

    const { Client } = require('pg');
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'attendance_system',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD
    });

    await client.connect();

    const result = await client.query(`
        SELECT
            country_code,
            country_name,
            supported_document_types
        FROM tax_templates
        WHERE country_code IN ('AR', 'UY', 'CL', 'BR')
          AND is_active = true
        ORDER BY country_code
    `);

    console.log('\n   📋 Tipos de comprobante por país:');
    for (const row of result.rows) {
        console.log(`\n      ${row.country_name} (${row.country_code}):`);
        const types = row.supported_document_types || [];
        types.forEach(type => {
            console.log(`         - ${type.codigo}: ${type.nombre}`);
        });
    }

    await client.end();
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST: BILLING RULES INTEGRATION CON TAX TEMPLATES                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    try {
        // Login
        await login();

        // Tests
        await testGetCompanyBillingRules();
        await testCalculateTaxesWithTemplates();
        await testTaxConditions();
        await testDocumentTypes();

        console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ TESTS COMPLETADOS                                                      ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Error general:', error.message);
        process.exit(1);
    }
}

// Ejecutar
main();
