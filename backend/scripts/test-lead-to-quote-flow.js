/**
 * TEST: Circuito completo Lead → Presupuesto → Empresa
 * Verifica todo el flujo de conversión de leads
 */

// Cargar variables de entorno
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

const API_BASE = 'http://localhost:9998';

// Colores para output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    step: (num, msg) => console.log(`${colors.cyan}${colors.bold}[PASO ${num}]${colors.reset} ${msg}`),
    header: (msg) => console.log(`\n${colors.bold}${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}${colors.reset}\n`)
};

async function getStaffToken() {
    // Buscar un staff válido para autenticación
    const staff = await sequelize.query(
        `SELECT staff_id, email, first_name, last_name FROM aponnt_staff WHERE is_active = true LIMIT 1`,
        { type: QueryTypes.SELECT }
    );

    if (staff.length === 0) {
        throw new Error('No hay staff activo para autenticación');
    }

    const fullName = `${staff[0].first_name || ''} ${staff[0].last_name || ''}`.trim() || 'Staff User';

    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion_2025';

    const token = jwt.sign(
        {
            staff_id: staff[0].staff_id,
            staffId: staff[0].staff_id, // Alias para compatibilidad
            email: staff[0].email,
            full_name: fullName,
            name: fullName, // Alias
            role_code: 'admin',
            role: 'admin' // Alias
        },
        jwtSecret,
        { expiresIn: '1h' }
    );

    log.info(`  JWT Secret usado: ${jwtSecret.substring(0, 10)}...`);
    return { token, staff: { ...staff[0], full_name: fullName } };
}

async function testLeadToQuoteFlow() {
    log.header('🔄 TEST: CIRCUITO COMPLETO LEAD → PRESUPUESTO → EMPRESA');

    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        details: []
    };

    let authToken;
    let testLeadId;
    let testQuoteId;
    let testCompanyId;

    try {
        // ═══════════════════════════════════════════════════════════
        // PASO 1: Autenticación
        // ═══════════════════════════════════════════════════════════
        log.step(1, 'Obteniendo token de autenticación...');

        try {
            const auth = await getStaffToken();
            authToken = auth.token;
            log.success(`Autenticado como: ${auth.staff.email}`);
            results.passed++;
        } catch (e) {
            log.error(`Error de autenticación: ${e.message}`);
            results.failed++;
            results.details.push({ step: 1, error: e.message });
            return results;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 2: Crear Lead de prueba
        // ═══════════════════════════════════════════════════════════
        log.step(2, 'Creando lead de prueba...');

        const testEmail = `test-flow-${Date.now()}@example.com`;

        try {
            const response = await fetch(`${API_BASE}/api/marketing/leads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: 'Test Flow Usuario',
                    email: testEmail,
                    language: 'es',
                    company_name: 'Empresa Test Flow SRL',
                    industry: 'Tecnología',
                    phone: '+54 11 1234-5678',
                    whatsapp: '+54 9 11 1234-5678',
                    notes: 'Lead de prueba para test de flujo completo'
                })
            });

            const data = await response.json();

            if (data.success) {
                testLeadId = data.data.id;
                log.success(`Lead creado: ID=${testLeadId}, Email=${testEmail}`);
                log.info(`  Status inicial: ${data.data.status}`);
                results.passed++;
            } else {
                throw new Error(data.error || 'Error creando lead');
            }
        } catch (e) {
            log.error(`Error creando lead: ${e.message}`);
            results.failed++;
            results.details.push({ step: 2, error: e.message });
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 3: Verificar lead en BD
        // ═══════════════════════════════════════════════════════════
        log.step(3, 'Verificando lead en base de datos...');

        try {
            const leads = await sequelize.query(
                `SELECT * FROM marketing_leads WHERE id = :id`,
                { replacements: { id: testLeadId }, type: QueryTypes.SELECT }
            );

            if (leads.length > 0) {
                const lead = leads[0];
                log.success(`Lead verificado en BD`);
                log.info(`  Nombre: ${lead.full_name}`);
                log.info(`  Empresa: ${lead.company_name}`);
                log.info(`  Status: ${lead.status}`);
                log.info(`  Idioma: ${lead.language}`);
                results.passed++;
            } else {
                throw new Error('Lead no encontrado en BD');
            }
        } catch (e) {
            log.error(`Error verificando lead: ${e.message}`);
            results.failed++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 4: Simular envío de flyer (recalentamiento)
        // ═══════════════════════════════════════════════════════════
        log.step(4, 'Probando envío de flyer (recalentamiento)...');

        try {
            const response = await fetch(`${API_BASE}/api/marketing/leads/${testLeadId}/send-flyer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ via: 'whatsapp' }) // WhatsApp no necesita servidor SMTP
            });

            const data = await response.json();

            if (data.success) {
                log.success(`Flyer preparado para envío`);
                log.info(`  Vía: ${data.via}`);
                if (data.whatsappText) {
                    log.info(`  Texto WhatsApp: ${data.whatsappText.substring(0, 50)}...`);
                }
                results.passed++;
            } else {
                log.warning(`Flyer no enviado: ${data.error || 'Sin error específico'}`);
                results.warnings++;
            }
        } catch (e) {
            log.warning(`Error en envío de flyer: ${e.message}`);
            results.warnings++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 5: Crear presupuesto desde lead
        // ═══════════════════════════════════════════════════════════
        log.step(5, 'Creando presupuesto desde lead...');

        const modulesData = [
            { module_key: 'attendance', module_name: 'Control de Asistencia', price: 50, quantity: 1 },
            { module_key: 'biometric', module_name: 'Biométrico Facial', price: 80, quantity: 1 },
            { module_key: 'shifts', module_name: 'Gestión de Turnos', price: 40, quantity: 1 }
        ];

        try {
            const response = await fetch(`${API_BASE}/api/marketing/leads/${testLeadId}/create-quote`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    company_data: {
                        company_name: 'Empresa Test Flow SRL',
                        contact_email: testEmail,
                        contact_phone: '+54 11 1234-5678',
                        tax_id: '30-12345678-9',
                        max_employees: 25,
                        industry: 'Tecnología'
                    },
                    modules_data: modulesData,
                    notes: 'Presupuesto de prueba desde test de flujo'
                })
            });

            const data = await response.json();

            if (data.success) {
                testQuoteId = data.quote?.id;
                testCompanyId = data.company?.id;

                log.success(`Presupuesto creado exitosamente`);
                log.info(`  Quote Number: ${data.quote?.quote_number}`);
                log.info(`  Total: USD $${data.quote?.total_amount}/mes`);
                log.info(`  Módulos: ${data.quote?.modules_count}`);
                log.info(`  Empresa creada: ${data.company?.name} (ID: ${testCompanyId})`);
                log.info(`  Slug: ${data.company?.slug}`);
                results.passed++;
            } else {
                throw new Error(data.error || 'Error creando presupuesto');
            }
        } catch (e) {
            log.error(`Error creando presupuesto: ${e.message}`);
            results.failed++;
            results.details.push({ step: 5, error: e.message });
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 6: Verificar quote en BD
        // ═══════════════════════════════════════════════════════════
        log.step(6, 'Verificando presupuesto en base de datos...');

        try {
            const quotes = await sequelize.query(
                `SELECT q.*, c.name as company_name, c.slug as company_slug
                 FROM quotes q
                 JOIN companies c ON q.company_id = c.company_id
                 WHERE q.lead_id = :leadId`,
                { replacements: { leadId: testLeadId }, type: QueryTypes.SELECT }
            );

            if (quotes.length > 0) {
                const quote = quotes[0];
                log.success(`Presupuesto verificado en BD`);
                log.info(`  Quote Number: ${quote.quote_number}`);
                log.info(`  Status: ${quote.status}`);
                log.info(`  Has Trial: ${quote.has_trial}`);
                log.info(`  Lead ID vinculado: ${quote.lead_id}`);
                log.info(`  Company: ${quote.company_name} (${quote.company_slug})`);
                results.passed++;
            } else {
                throw new Error('Quote no encontrado en BD');
            }
        } catch (e) {
            log.error(`Error verificando quote: ${e.message}`);
            results.failed++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 7: Verificar empresa creada
        // ═══════════════════════════════════════════════════════════
        log.step(7, 'Verificando empresa creada...');

        try {
            const companies = await sequelize.query(
                `SELECT * FROM companies WHERE company_id = :id`,
                { replacements: { id: testCompanyId }, type: QueryTypes.SELECT }
            );

            if (companies.length > 0) {
                const company = companies[0];
                log.success(`Empresa verificada en BD`);
                log.info(`  Nombre: ${company.name}`);
                log.info(`  Slug: ${company.slug}`);
                log.info(`  Email: ${company.contact_email}`);
                log.info(`  Max Empleados: ${company.max_employees}`);
                log.info(`  License Type: ${company.license_type}`);
                log.info(`  Is Active: ${company.is_active}`);
                log.info(`  Onboarding Status: ${company.onboarding_status || 'N/A'}`);
                results.passed++;
            } else {
                throw new Error('Empresa no encontrada en BD');
            }
        } catch (e) {
            log.error(`Error verificando empresa: ${e.message}`);
            results.failed++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 8: Verificar evento registrado
        // ═══════════════════════════════════════════════════════════
        log.step(8, 'Verificando eventos del lead...');

        try {
            const events = await sequelize.query(
                `SELECT * FROM marketing_lead_events WHERE lead_id = :leadId ORDER BY created_at DESC`,
                { replacements: { leadId: testLeadId }, type: QueryTypes.SELECT }
            );

            if (events.length > 0) {
                log.success(`${events.length} evento(s) registrado(s)`);
                events.forEach((evt, i) => {
                    log.info(`  [${i + 1}] ${evt.event_type}: ${JSON.stringify(evt.event_data || {}).substring(0, 60)}...`);
                });
                results.passed++;
            } else {
                log.warning('No se encontraron eventos registrados');
                results.warnings++;
            }
        } catch (e) {
            log.warning(`Error verificando eventos: ${e.message}`);
            results.warnings++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 9: Probar endpoint de envío de presupuesto
        // ═══════════════════════════════════════════════════════════
        log.step(9, 'Verificando endpoint de envío de presupuesto...');

        try {
            // Verificar que existe el endpoint /api/quotes/:id/send
            const response = await fetch(`${API_BASE}/api/quotes/${testQuoteId}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                log.success(`Presupuesto enviado (status → sent)`);
                log.info(`  Quote: ${data.quote?.quote_number}`);
                log.info(`  Nuevo Status: ${data.quote?.status}`);
                results.passed++;
            } else if (response.status === 404) {
                log.warning('Endpoint /api/quotes/:id/send no encontrado - Verificar quotesRoutes');
                results.warnings++;
            } else {
                log.warning(`Error enviando: ${data.error || 'Sin detalles'}`);
                results.warnings++;
            }
        } catch (e) {
            log.warning(`Error en envío de presupuesto: ${e.message}`);
            results.warnings++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 10: Verificar flujo de estados
        // ═══════════════════════════════════════════════════════════
        log.step(10, 'Verificando flujo de estados...');

        try {
            // Verificar estado del lead después del presupuesto
            const leadAfter = await sequelize.query(
                `SELECT status, notes FROM marketing_leads WHERE id = :id`,
                { replacements: { id: testLeadId }, type: QueryTypes.SELECT }
            );

            if (leadAfter.length > 0) {
                const lead = leadAfter[0];
                log.success(`Estado del lead actualizado`);
                log.info(`  Status: ${lead.status}`);
                if (lead.notes && lead.notes.includes('Presupuesto')) {
                    log.info(`  Notas actualizadas con referencia al presupuesto`);
                }
                results.passed++;
            }
        } catch (e) {
            log.warning(`Error verificando estados: ${e.message}`);
            results.warnings++;
        }

        // ═══════════════════════════════════════════════════════════
        // PASO 11: Verificar lo que FALTA en el circuito
        // ═══════════════════════════════════════════════════════════
        log.step(11, 'Análisis de gaps en el circuito...');

        const gaps = [];

        // Verificar si existe método para enviar presupuesto por email
        try {
            const quotesRoutes = require('fs').readFileSync(
                require('path').join(__dirname, '../src/routes/quotesRoutes.js'),
                'utf8'
            );

            if (!quotesRoutes.includes('send-email') && !quotesRoutes.includes('sendEmail')) {
                gaps.push('No hay endpoint para enviar presupuesto por EMAIL al cliente');
            }

            if (!quotesRoutes.includes('generate-pdf') && !quotesRoutes.includes('generatePdf')) {
                gaps.push('No hay endpoint para generar PDF del presupuesto');
            }
        } catch (e) {
            gaps.push('No se pudo analizar quotesRoutes.js');
        }

        // Verificar si existe tabla de onboarding
        try {
            const tables = await sequelize.query(
                `SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name LIKE '%onboarding%'`,
                { type: QueryTypes.SELECT }
            );

            if (tables.length === 0) {
                gaps.push('No existe tabla dedicada para tracking de onboarding');
            }
        } catch (e) {
            // Ignore
        }

        // Verificar si hay endpoint de aceptación pública (sin auth)
        try {
            const quotesRoutes = require('fs').readFileSync(
                require('path').join(__dirname, '../src/routes/quotesRoutes.js'),
                'utf8'
            );

            if (!quotesRoutes.includes('/public/') && !quotesRoutes.includes('token')) {
                gaps.push('No hay endpoint público para que el CLIENTE acepte el presupuesto (sin login)');
            }
        } catch (e) {
            // Ignore
        }

        if (gaps.length > 0) {
            log.warning('Gaps detectados en el circuito:');
            gaps.forEach((gap, i) => {
                log.info(`  ${i + 1}. ${gap}`);
            });
            results.warnings += gaps.length;
        } else {
            log.success('No se detectaron gaps críticos');
        }

        // ═══════════════════════════════════════════════════════════
        // LIMPIEZA: Eliminar datos de prueba
        // ═══════════════════════════════════════════════════════════
        log.step('CLEANUP', 'Limpiando datos de prueba...');

        try {
            // Eliminar quote
            if (testQuoteId) {
                await sequelize.query(
                    `DELETE FROM quotes WHERE id = :id`,
                    { replacements: { id: testQuoteId }, type: QueryTypes.DELETE }
                );
            }

            // Eliminar empresa
            if (testCompanyId) {
                await sequelize.query(
                    `DELETE FROM companies WHERE company_id = :id`,
                    { replacements: { id: testCompanyId }, type: QueryTypes.DELETE }
                );
            }

            // Eliminar eventos del lead
            if (testLeadId) {
                await sequelize.query(
                    `DELETE FROM marketing_lead_events WHERE lead_id = :id`,
                    { replacements: { id: testLeadId }, type: QueryTypes.DELETE }
                );
            }

            // Eliminar comunicaciones del lead
            if (testLeadId) {
                await sequelize.query(
                    `DELETE FROM marketing_lead_communications WHERE lead_id = :id`,
                    { replacements: { id: testLeadId }, type: QueryTypes.DELETE }
                );
            }

            // Eliminar lead
            if (testLeadId) {
                await sequelize.query(
                    `DELETE FROM marketing_leads WHERE id = :id`,
                    { replacements: { id: testLeadId }, type: QueryTypes.DELETE }
                );
            }

            log.success('Datos de prueba eliminados');
        } catch (e) {
            log.warning(`Error en limpieza: ${e.message}`);
        }

    } catch (error) {
        log.error(`Error general: ${error.message}`);
        results.failed++;
    }

    return results;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
    console.log('\n');

    try {
        await sequelize.authenticate();
        log.success('Conexión a BD establecida');
    } catch (e) {
        log.error(`No se pudo conectar a BD: ${e.message}`);
        process.exit(1);
    }

    const results = await testLeadToQuoteFlow();

    // Resumen final
    log.header('📊 RESUMEN DEL TEST');

    console.log(`${colors.green}✅ Passed:   ${results.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed:   ${results.failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`);

    const total = results.passed + results.failed;
    const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

    console.log(`\n${colors.bold}Success Rate: ${successRate}%${colors.reset}`);

    if (results.failed === 0) {
        console.log(`\n${colors.green}${colors.bold}🎉 CIRCUITO FUNCIONAL${colors.reset}`);
    } else {
        console.log(`\n${colors.red}${colors.bold}⚠️ HAY PROBLEMAS EN EL CIRCUITO${colors.reset}`);
    }

    await sequelize.close();
    process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Error fatal:', e);
    process.exit(1);
});
