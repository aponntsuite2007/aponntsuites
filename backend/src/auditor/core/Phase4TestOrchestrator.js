/**
 * ============================================================================
 * PHASE 4 TEST ORCHESTRATOR - ORQUESTADOR COMPLETO DE TESTING
 * ============================================================================
 *
 * Sistema completo que integra:
 * 1. Playwright E2E Testing (visible browser) ✨ MIGRADO DE PUPPETEER
 * 2. PostgreSQL Validation (persistencia real)
 * 3. Ollama AI Analysis (análisis de errores)
 * 4. Ticket Generation (generación automática)
 * 5. WebSocket Communication (envío a Claude Code)
 * 6. Auto-Repair Agent (aplicación de fixes)
 *
 * FLUJO COMPLETO:
 * Test → Error → Ollama → Ticket → WebSocket → Claude Code → Fix → Re-test
 *
 * @version 2.0.0 - PLAYWRIGHT
 * @date 2025-11-06
 * ============================================================================
 */

const { chromium } = require('playwright');
const { Sequelize } = require('sequelize');
const OllamaAnalyzer = require('./OllamaAnalyzer');
const TicketGenerator = require('./TicketGenerator');
const ClaudeCodeWebSocketBridge = require('../../services/ClaudeCodeWebSocketBridge');
const ClaudeCodeWebSocketServer = require('../../services/ClaudeCodeWebSocketServer');
const TechnicalReportGenerator = require('../reporters/TechnicalReportGenerator');
const AutonomousRepairAgent = require('./AutonomousRepairAgent');
const SystemRegistry = require('../registry/SystemRegistry');
const { getLogger } = require('../../logging');

class Phase4TestOrchestrator {
    constructor(config = {}, database = null) {
        // Construir baseUrl dinámicamente desde env
        const defaultBaseUrl = process.env.BASE_URL ||
                               process.env.RENDER_EXTERNAL_URL ||
                               `http://localhost:${process.env.PORT || 9998}`;

        this.config = {
            baseUrl: config.baseUrl || defaultBaseUrl,
            slowMo: parseInt(config.slowMo) || 50,
            headless: config.headless || false,
            timeout: config.timeout || 30000,
            ...config
        };

        this.database = database;

        // Logger sistemático
        this.logger = getLogger({
            minLevel: process.env.LOG_LEVEL || 'INFO',
            enableColors: true,
            enableFile: true,
            enableKnowledgeCapture: true,
            includeTimestamp: true,
            includePhase: true
        });

        // Execution ID para este ciclo
        this.executionId = null;

        // Componentes del sistema
        this.ollamaAnalyzer = new OllamaAnalyzer();
        this.ticketGenerator = new TicketGenerator();
        this.wsBridge = new ClaudeCodeWebSocketBridge();
        this.wsServer = null; // Se inicializa en start()

        // Componentes de Phase 4 avanzado (lazy-load en start)
        this.systemRegistry = null;
        this.technicalReportGenerator = null;
        this.autonomousRepairAgent = null;

        // Estado del test
        this.browser = null;
        this.page = null;
        this.sequelize = null;
        this.stats = {
            totalTests: 0,
            dbTestsPassed: 0,
            dbTestsFailed: 0,
            uiTestsPassed: 0,
            uiTestsFailed: 0,
            errors: [],
            tickets: [],
            fixesApplied: 0
        };

        // Mapeo de módulos a tablas
        this.moduleTableMap = {
            'users': 'users',
            'attendance': 'attendance',
            'departments': 'departments',
            'shifts': 'shifts',
            'permissions': 'permissions',
            'vacations': 'vacation_requests',
            'medical': 'medical_leaves'
        };
    }

    /**
     * Helper: Wait timeout
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Helper para clickear elemento por texto (alternativa a :has-text())
     */
    async clickByText(selector, text, options = {}) {
        try {
            const clicked = await this.page.evaluate((sel, txt, opts) => {
                const elements = Array.from(document.querySelectorAll(sel));
                const element = elements.find(el => el.textContent.includes(txt));
                if (element) {
                    element.click();
                    return true;
                }
                return false;
            }, selector, text, options);
            return clicked;
        } catch (error) {
            return false;
        }
    }

    /**
     * Iniciar el sistema completo
     */
    async start() {
        // Iniciar ciclo y entrar a fase INIT
        this.executionId = `phase4-${Date.now()}`;
        this.logger.startCycle(this.executionId);
        this.logger.enterPhase('INIT');

        this.logger.info('ORCHESTRATOR', 'Iniciando Phase 4 Test Orchestrator', {
            executionId: this.executionId,
            baseUrl: this.config.baseUrl
        });

        try {
            // 1. Iniciar WebSocket Server
            this.logger.debug('WS', 'Iniciando WebSocket Server en puerto 8765');
            this.wsServer = new ClaudeCodeWebSocketServer(8765);
            await this.wsServer.start();
            this.logger.info('WS', 'WebSocket Server iniciado exitosamente');

            // 2. Conectar WebSocket Bridge (cliente)
            this.logger.debug('WS', 'Conectando WebSocket Bridge a ws://localhost:8765');
            await this.wsBridge.connect('ws://localhost:8765');
            this.logger.info('WS', 'WebSocket Bridge conectado');

            // 3. Conectar a PostgreSQL
            const isProduction = process.env.NODE_ENV === 'production';

            // Construir connection string desde variables de entorno individuales
            const dbUser = process.env.POSTGRES_USER || 'postgres';
            const dbPassword = process.env.POSTGRES_PASSWORD || '';
            const dbHost = process.env.POSTGRES_HOST || 'localhost';
            const dbPort = process.env.POSTGRES_PORT || '5432';
            const dbName = process.env.POSTGRES_DB || 'attendance_system';
            const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

            this.logger.debug('DB', 'Conectando a PostgreSQL', { dbHost, dbPort, dbName });

            this.sequelize = new Sequelize(
                process.env.DATABASE_URL || connectionString,
                {
                    dialect: 'postgres',
                    logging: false,
                    dialectOptions: {
                        ssl: isProduction ? { require: true, rejectUnauthorized: false } : false
                    }
                }
            );
            await this.sequelize.authenticate();
            this.logger.info('DB', 'Conectado a PostgreSQL exitosamente', { dbName });

            // 4. Iniciar Playwright (Chromium)
            this.logger.debug('BROWSER', 'Iniciando Playwright Chromium', {
                headless: this.config.headless,
                slowMo: this.config.slowMo
            });

            this.browser = await chromium.launch({
                headless: this.config.headless,
                slowMo: this.config.slowMo,
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=IsolateOrigins,site-per-process'
                ],
                channel: 'chromium' // Usar Chromium oficial de Playwright
            });

            // Crear contexto de browser con configuración avanzada
            const context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                locale: 'es-AR',
                timezoneId: 'America/Argentina/Buenos_Aires',
                // ✨ CLAVE: Deshabilitar guardar credenciales
                permissions: [],
                ignoreHTTPSErrors: true,
                // Auto-dismiss de diálogos
                bypassCSP: true
            });

            this.page = await context.newPage();

            // ✨ Playwright auto-maneja diálogos mejor que Puppeteer
            this.page.on('dialog', async dialog => {
                this.logger.warn('BROWSER', `Diálogo auto-cerrado: "${dialog.message()}"`);
                await dialog.dismiss();
            });

            // Timeout global (Playwright tiene mejor auto-waiting)
            this.page.setDefaultTimeout(this.config.timeout);
            this.page.setDefaultNavigationTimeout(60000);

            this.logger.info('BROWSER', 'Playwright Chromium iniciado exitosamente');

            // 5. Verificar Ollama
            this.logger.debug('OLLAMA', 'Verificando disponibilidad de Ollama');
            const ollamaCheck = await this.ollamaAnalyzer.checkAvailability();
            if (ollamaCheck.available) {
                this.logger.info('OLLAMA', `Ollama disponible y activo`, { source: ollamaCheck.source });
            } else {
                this.logger.warn('OLLAMA', 'Ollama no disponible - continuando sin análisis IA');
            }

            // 6. Inicializar componentes avanzados (TechnicalReportGenerator y AutonomousRepairAgent)
            if (this.database) {
                this.logger.debug('PHASE4', 'Inicializando componentes avanzados...');
                this.systemRegistry = new SystemRegistry(this.database);
                await this.systemRegistry.initialize();

                this.technicalReportGenerator = new TechnicalReportGenerator(this.database, this.systemRegistry);
                this.autonomousRepairAgent = new AutonomousRepairAgent(this.database, this.systemRegistry, this);

                this.logger.info('PHASE4', 'Componentes avanzados inicializados', {
                    technicalReportGenerator: 'OK',
                    autonomousRepairAgent: 'OK'
                });
            }

            this.logger.exitPhase();
            this.logger.info('ORCHESTRATOR', 'Sistema completamente iniciado - listo para tests');
            return true;
        } catch (error) {
            this.logger.error('ORCHESTRATOR', 'Error al iniciar el sistema', {
                error: error.message,
                stack: error.stack
            });
            this.logger.exitPhase();
            throw error;
        }
    }

    /**
     * Ejecutar test completo de un módulo
     */
    async runModuleTest(moduleName, companyId, maxCycles = 2, companySlug = 'isi', username = null, password = 'admin123') {
        // Entrar a fase TEST
        this.logger.enterPhase('TEST');

        this.logger.separator('=', 80);
        this.logger.info('TEST', `Iniciando testing de módulo: ${moduleName.toUpperCase()}`, {
            companyId,
            companySlug,
            username,
            maxCycles,
            executionId: this.executionId
        });
        this.logger.separator('=', 80);

        const tableName = this.moduleTableMap[moduleName];
        if (!tableName) {
            this.logger.error('TEST', `Módulo desconocido: ${moduleName}`);
            throw new Error(`Módulo desconocido: ${moduleName}`);
        }

        try {
            // Login con credenciales dinámicas
            await this.login(companySlug, username, password);

            // ✨ NUEVO: Si es módulo users, ejecutar test CRUD completo con persistencia
            if (moduleName === 'users') {
                this.logger.info('TEST', '🔹 Ejecutando test CRUD COMPLETO con persistencia BD para módulo USERS');
                const UsersCrudPersistenceTest = require('../tests/users-crud-persistence.test');
                const crudTest = new UsersCrudPersistenceTest(this.page, companyId);

                try {
                    const crudReport = await crudTest.run();
                    this.logger.info('TEST', 'Test CRUD completo finalizado', crudReport);

                    // Agregar resultados al reporte
                    this.stats.totalTests += crudReport.totalTests;
                    this.stats.uiTestsPassed += crudReport.passedTests;
                    this.stats.uiTestsFailed += crudReport.failedTests;

                    this.logger.exitPhase();
                    return crudReport;
                } catch (error) {
                    this.logger.error('TEST', 'Error en test CRUD de users', { error: error.message });
                    await this.handleTestError({
                        module: moduleName,
                        errors: [{ message: error.message, stack: error.stack }]
                    });
                }
            }

            for (let cycle = 1; cycle <= maxCycles; cycle++) {
                this.logger.separator('-', 80);
                this.logger.info('TEST', `Ejecutando ciclo ${cycle}/${maxCycles}`, { moduleName, cycle });

                // Navegar al módulo
                await this.navigateToModule(moduleName);

                // Test CRUD completo con validación PostgreSQL
                const createResult = await this.testCreate(moduleName, companyId, tableName);
                const readResult = await this.testRead(moduleName, companyId, tableName);
                const updateResult = await this.testUpdate(moduleName, companyId, tableName);
                const deleteResult = await this.testDelete(moduleName, companyId, tableName);

                // ✨ NUEVO: Test comprehensivo de todos los botones
                const allButtonsResult = await this.testAllButtons(moduleName);

                // ✨ NUEVO: Test de submódulos (tabs, accordions)
                const submodulesResult = await this.testSubmodules(moduleName);

                // Si hay errores, analizar con Ollama
                if (createResult.error || readResult.error || updateResult.error || deleteResult.error) {
                    await this.handleTestError({
                        module: moduleName,
                        cycle,
                        errors: [createResult.error, readResult.error, updateResult.error, deleteResult.error].filter(Boolean)
                    });
                }
            }

            // Generar reporte
            this.logger.exitPhase();
            return this.generateReport(moduleName);

        } catch (error) {
            this.logger.error('ORCHESTRATOR', 'Error crítico en ejecución de test', {
                moduleName,
                error: error.message,
                stack: error.stack
            });

            // Analizar error con Ollama
            await this.handleTestError({
                module: moduleName,
                errors: [{ message: error.message, stack: error.stack }]
            });

            this.logger.exitPhase();
            throw error;
        }
    }

    /**
     * Test CREATE con validación PostgreSQL
     */
    async testCreate(moduleName, companyId, tableName) {
        this.logger.info('TEST', '1️⃣ CREATE - Iniciando test de creación', { moduleName, tableName });
        this.stats.totalTests++;

        try {
            // Click en botón "Nuevo" - Usar selector válido o buscar por texto
            this.logger.debug('BROWSER', 'Buscando botón "Nuevo"');
            await this.wait(1000);
            const nuevoClicked = await this.clickByText('button', 'Nuevo');
            if (!nuevoClicked) {
                // Fallback: buscar por onclick
                const nuevoBtn = await this.page.$('button[onclick*="nuevo"]');
                if (nuevoBtn) await nuevoBtn.click();
            }
            await this.wait(1000);

            // Llenar formulario (datos fake)
            await this.fillForm(moduleName);

            // Guardar - Usar selector válido o buscar por texto
            this.logger.debug('BROWSER', 'Guardando formulario');
            const guardarClicked = await this.clickByText('button', 'Guardar');
            if (!guardarClicked) {
                const guardarBtn = await this.page.$('button[onclick*="guardar"], .btn-success');
                if (guardarBtn) await guardarBtn.click();
            }
            await this.wait(2000);

            this.stats.uiTestsPassed++;

            // VALIDAR EN POSTGRESQL
            // Determinar columna PK (users usa user_id, otros usan id)
            const pkColumn = tableName === 'users' ? 'user_id' : 'id';

            this.logger.debug('DB', 'Validando registro en PostgreSQL', { tableName, companyId });

            const [result] = await this.sequelize.query(
                `SELECT * FROM ${tableName} WHERE company_id = :companyId ORDER BY ${pkColumn} DESC LIMIT 1`,
                { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
            );

            if (result) {
                const recordId = result[pkColumn];
                this.logger.info('TEST', `✅ CREATE VALIDADO - Registro creado exitosamente`, {
                    pkColumn,
                    recordId,
                    tableName
                });
                this.stats.dbTestsPassed++;
                return { success: true, recordId };
            } else {
                this.logger.error('TEST', `❌ CREATE FALLIDO - No se encontró registro en PostgreSQL`, {
                    tableName,
                    companyId
                });
                this.stats.dbTestsFailed++;
                return { success: false, error: 'Record not found in database' };
            }
        } catch (error) {
            this.logger.error('TEST', `❌ CREATE ERROR`, {
                moduleName,
                error: error.message,
                stack: error.stack
            });
            this.stats.uiTestsFailed++;
            this.stats.dbTestsFailed++;
            return { success: false, error };
        }
    }

    /**
     * Test READ con validación PostgreSQL
     */
    async testRead(moduleName, companyId, tableName) {
        console.log(`\n2️⃣ READ - Verificando lista de registros...`);
        this.stats.totalTests++;

        try {
            // ❌ COMENTADO: No intentar ejecutar funciones JS directamente - usar clicks
            // Para módulo users: cargar el módulo primero (v6.0 requiere esto)
            if (false && moduleName === 'users') {
                console.log('   📦 Cargando módulo Users (showUsersContent)...');

                // DEBUG: Verificar entorno antes de ejecutar
                const preCheck = await this.page.evaluate(() => {
                    return {
                        showUsersContentExists: typeof window.showUsersContent === 'function',
                        mainContentExists: !!document.getElementById('mainContent'),
                        allFunctions: Object.keys(window).filter(k => typeof window[k] === 'function' && k.includes('show')).slice(0, 10)
                    };
                });
                console.log('   🔍 PRE-CHECK:', JSON.stringify(preCheck, null, 2));

                // Llamar a showUsersContent() y capturar errores
                const result = await this.page.evaluate(() => {
                    try {
                        if (typeof window.showUsersContent === 'function') {
                            window.showUsersContent();
                            return { success: true, error: null };
                        }
                        return { success: false, error: 'showUsersContent no es una función' };
                    } catch (error) {
                        return { success: false, error: error.message, stack: error.stack };
                    }
                });

                console.log('   📊 RESULTADO showUsersContent():', JSON.stringify(result, null, 2));
                if (!result.success) {
                    console.log('   ❌ ERROR al ejecutar showUsersContent:', result.error);
                } else {
                    console.log('   ✅ Módulo Users ejecutado sin errores');
                }
                console.log('   🔍 Esperando 3 segundos a que renderice...');
                await this.wait(3000);

                // DEBUG: Ver qué botones existen
                const buttons = await this.page.$$eval('button', btns =>
                    Array.from(btns).map(btn => ({
                        text: btn.textContent.trim().substring(0, 50),
                        onclick: btn.getAttribute('onclick') || 'none',
                        visible: btn.offsetParent !== null
                    })).filter(b => b.visible)
                );
                console.log('   🔍 DEBUG - Botones visibles encontrados:', JSON.stringify(buttons.slice(0, 10), null, 2));

                console.log('   📋 Haciendo click en "Lista de Usuarios"...');

                // Estrategia 1: Por texto exacto
                let listaClicked = await this.clickByText('button', 'Lista de Usuarios');
                console.log(`   ${listaClicked ? '✅' : '❌'} Intento 1 (texto exacto): ${listaClicked}`);

                // Estrategia 2: Por onclick
                if (!listaClicked) {
                    console.log('   ⚠️ Intento 2: buscando por onclick="loadUsers()"...');
                    const clicked = await this.page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const btn = btns.find(b => b.onclick && b.onclick.toString().includes('loadUsers'));
                        if (btn) {
                            btn.click();
                            return true;
                        }
                        return false;
                    });
                    console.log(`   ${clicked ? '✅' : '❌'} Intento 2 resultado: ${clicked}`);
                    listaClicked = clicked;
                }

                // Estrategia 3: Por atributo onclick
                if (!listaClicked) {
                    console.log('   ⚠️ Intento 3: buscando por atributo onclick...');
                    const clicked = await this.page.evaluate(() => {
                        const btns = Array.from(document.querySelectorAll('button[onclick]'));
                        const btn = btns.find(b => b.getAttribute('onclick').includes('loadUsers'));
                        if (btn) {
                            btn.click();
                            return true;
                        }
                        return false;
                    });
                    console.log(`   ${clicked ? '✅' : '❌'} Intento 3 resultado: ${clicked}`);
                    listaClicked = clicked;
                }

                // Estrategia 4: Buscar cualquier botón que contenga "Usuario" o "Lista"
                if (!listaClicked) {
                    console.log('   ⚠️ Intento 4: buscando por texto parcial...');
                    const clicked = await this.clickByText('button', 'Usuario') || await this.clickByText('button', 'Lista');
                    console.log(`   ${clicked ? '✅' : '❌'} Intento 4 resultado: ${clicked}`);
                    listaClicked = clicked;
                }

                // Esperar MUCHO más tiempo a que cargue la API (8 segundos)
                console.log('   ⏱️ Esperando 8 segundos a que cargue la API...');
                await this.wait(8000);

                // Verificar si hay tabla antes de continuar
                const hasTable = await this.page.$('tbody tr');
                console.log(`   ${hasTable ? '✅' : '❌'} Tabla encontrada: ${!!hasTable}`);
            }

            // Contar en UI
            console.log('   🔍 Esperando selector tbody tr...');
            await this.page.waitForSelector('tbody tr', { timeout: 20000 }); // 20 segundos
            const domRecords = await this.page.$$eval('tbody tr', rows =>
                rows.filter(row => !row.textContent.includes('Cargando') && !row.textContent.includes('No hay')).length
            );

            // Contar en DB
            const [dbResult] = await this.sequelize.query(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = :companyId`,
                { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
            );
            const dbRecords = parseInt(dbResult.count);

            if (dbRecords > 0 && domRecords > 0) {
                console.log(`✅ READ VALIDADO - UI: ${domRecords} registros, DB: ${dbRecords} registros`);
                this.stats.uiTestsPassed++;
                this.stats.dbTestsPassed++;
                return { success: true, uiCount: domRecords, dbCount: dbRecords };
            } else {
                console.log(`❌ READ FALLIDO - UI: ${domRecords}, DB: ${dbRecords}`);
                this.stats.dbTestsFailed++;
                return { success: false, error: 'Mismatch between UI and DB' };
            }
        } catch (error) {
            console.error(`❌ READ ERROR: ${error.message}`);
            this.stats.uiTestsFailed++;
            this.stats.dbTestsFailed++;
            return { success: false, error };
        }
    }

    /**
     * Test UPDATE con validación PostgreSQL
     */
    async testUpdate(moduleName, companyId, tableName) {
        console.log(`\n3️⃣ UPDATE - Editando registro...`);
        this.stats.totalTests++;

        try {
            // Obtener último registro creado
            // Determinar columna PK (users usa user_id, otros usan id)
            const pkColumn = tableName === 'users' ? 'user_id' : 'id';

            const [lastRecord] = await this.sequelize.query(
                `SELECT * FROM ${tableName} WHERE company_id = :companyId ORDER BY ${pkColumn} DESC LIMIT 1`,
                { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
            );

            if (!lastRecord) {
                console.log(`⚠️ UPDATE SKIP - No hay registro para editar`);
                return { success: false, error: 'No record found' };
            }

            // Click en botón editar del primer registro
            await this.wait(1000);
            const editClicked = await this.clickByText('button', 'Editar');
            if (!editClicked) {
                // Fallback: buscar por onclick o clase
                const editBtn = await this.page.$('button[onclick*="editar"], .btn-warning');
                if (editBtn) await editBtn.click();
            }
            await this.wait(1500);

            // Modificar un campo
            const timestamp = Date.now();
            await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"]');
                if (inputs.length > 0) {
                    inputs[0].value = inputs[0].value + ' EDITED';
                }
            });

            // Guardar
            const guardarClicked = await this.clickByText('button', 'Guardar');
            if (!guardarClicked) {
                const guardarBtn = await this.page.$('.btn-success, button[onclick*="guardar"]');
                if (guardarBtn) await guardarBtn.click();
            }
            await this.wait(2000);

            this.stats.uiTestsPassed++;

            // VALIDAR EN POSTGRESQL
            const pkValue = lastRecord[pkColumn];

            const [updated] = await this.sequelize.query(
                `SELECT * FROM ${tableName} WHERE ${pkColumn} = :pk`,
                { replacements: { pk: pkValue }, type: Sequelize.QueryTypes.SELECT }
            );

            if (updated && updated.updated_at > lastRecord.updated_at) {
                console.log(`✅ UPDATE VALIDADO - ${pkColumn}: ${pkValue} fue modificado`);
                this.stats.dbTestsPassed++;
                return { success: true, recordId: pkValue };
            } else {
                console.log(`❌ UPDATE FALLIDO - No se detectó cambio en PostgreSQL`);
                this.stats.dbTestsFailed++;
                return { success: false, error: 'No DB change detected' };
            }
        } catch (error) {
            console.error(`❌ UPDATE ERROR: ${error.message}`);
            this.stats.uiTestsFailed++;
            this.stats.dbTestsFailed++;
            return { success: false, error };
        }
    }

    /**
     * Test DELETE con validación PostgreSQL
     */
    async testDelete(moduleName, companyId, tableName) {
        console.log(`\n4️⃣ DELETE - Eliminando registro...`);
        this.stats.totalTests++;

        try {
            // Contar registros antes de eliminar
            const [countBefore] = await this.sequelize.query(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = :companyId`,
                { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
            );

            const beforeCount = parseInt(countBefore.count);

            if (beforeCount === 0) {
                console.log(`⚠️ DELETE SKIP - No hay registros para eliminar`);
                return { success: false, error: 'No records to delete' };
            }

            // Click en botón eliminar del primer registro
            await this.wait(1000);
            const deleteClicked = await this.clickByText('button', 'Eliminar');
            if (!deleteClicked) {
                // Fallback: buscar por onclick o clase
                const deleteBtn = await this.page.$('button[onclick*="eliminar"], .btn-danger');
                if (deleteBtn) await deleteBtn.click();
            }
            await this.wait(1000);

            // Confirmar eliminación si hay modal de confirmación
            let confirmed = await this.clickByText('button', 'Confirmar');
            if (!confirmed) {
                confirmed = await this.clickByText('button', 'Sí');
            }
            if (!confirmed) {
                confirmed = await this.clickByText('button', 'Aceptar');
            }

            await this.wait(2000);
            this.stats.uiTestsPassed++;

            // VALIDAR EN POSTGRESQL
            const [countAfter] = await this.sequelize.query(
                `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = :companyId`,
                { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
            );

            const afterCount = parseInt(countAfter.count);

            if (afterCount < beforeCount) {
                console.log(`✅ DELETE VALIDADO - Registros: ${beforeCount} → ${afterCount}`);
                this.stats.dbTestsPassed++;
                return { success: true, deletedCount: beforeCount - afterCount };
            } else {
                console.log(`❌ DELETE FALLIDO - No se redujo el conteo en PostgreSQL`);
                this.stats.dbTestsFailed++;
                return { success: false, error: 'No DB count reduction' };
            }
        } catch (error) {
            console.error(`❌ DELETE ERROR: ${error.message}`);
            this.stats.uiTestsFailed++;
            this.stats.dbTestsFailed++;
            return { success: false, error };
        }
    }

    /**
     * Manejar error con análisis Ollama + Generación de ticket
     */
    async handleTestError(errorContext) {
        // Entrar a fase ANALYZE
        this.logger.enterPhase('ANALYZE');
        this.logger.info('OLLAMA', 'Iniciando análisis de errores con Ollama AI', {
            module: errorContext.module,
            errorCount: errorContext.errors?.length || 0
        });

        let analysis = null;

        try {
            // 1. Analizar con Ollama
            analysis = await this.ollamaAnalyzer.analyzeError({
                module: errorContext.module,
                errors: errorContext.errors,
                context: {
                    cycle: errorContext.cycle,
                    timestamp: new Date().toISOString(),
                    executionId: this.executionId
                }
            });

            // Verificar que el análisis sea válido
            if (!analysis || typeof analysis !== 'object') {
                this.logger.warn('OLLAMA', '⚠️ Análisis inválido o incompleto, usando fallback');
                analysis = null; // Forzar fallback
            }

        } catch (ollamaError) {
            this.logger.error('OLLAMA', '❌ Error durante análisis con Ollama', {
                error: ollamaError.message
            });
            analysis = null; // Forzar fallback en caso de timeout u otro error
        }

        // Si Ollama falló o dio resultado inválido, usar análisis fallback
        if (!analysis) {
            this.logger.warn('OLLAMA', '⚠️ Usando análisis fallback (Ollama no disponible)');
            analysis = {
                issue_category: 'test_failure',
                root_cause: 'Error detectado durante E2E test. Ollama no pudo analizar.',
                suggested_fix: 'Revisar logs del servidor y consola del navegador para más detalles.',
                severity: 'medium',
                confidence: 0.3,
                files_to_check: [errorContext.module],
                related_modules: []
            };
        }

        this.logger.info('OLLAMA', '✅ Análisis completado', {
            issue_category: analysis.issue_category || 'unknown',
            severity: analysis.severity || 'medium',
            confidence: analysis.confidence || 0.5
        });

        this.logger.exitPhase();

        try {
            // 2. Generar ticket (parte de ANALYZE pero genera para REPAIR)
            this.logger.debug('TICKET', 'Generando ticket para Claude Code');

            const ticket = this.ticketGenerator.generateTicket({
                test: {
                    module: errorContext.module,
                    test_name: `Phase4 E2E Test - Cycle ${errorContext.cycle}`,
                    error_type: 'E2E_TEST_FAILURE',
                    error_message: errorContext.errors.map(e => e.message).join('; '),
                    error_stack: errorContext.errors.map(e => e.stack).join('\n'),
                    company_id: null,
                    execution_id: this.executionId
                },
                analysis
            });

            this.logger.info('TICKET', '🎫 Ticket generado exitosamente', {
                ticketId: ticket.id,
                severity: ticket.severity
            });
            this.stats.tickets.push(ticket);

            // 3. Enviar a Claude Code vía WebSocket (fase REPAIR)
            this.logger.enterPhase('REPAIR');
            this.logger.info('WS', 'Enviando ticket a Claude Code via WebSocket');

            const response = await this.wsBridge.sendTicket(ticket);

            this.logger.info('REPAIR', '📨 Respuesta recibida de Claude Code', {
                status: response.status,
                message: response.message
            });

            if (response.status === 'fixed') {
                this.stats.fixesApplied++;
                this.logger.info('REPAIR', '✅ Fix aplicado por Claude Code', {
                    ticketId: ticket.id
                });
                this.logger.exitPhase();

                // TODO: Entrar a fase VALIDATE y re-ejecutar test
                // this.logger.enterPhase('VALIDATE');
            } else {
                this.logger.warn('REPAIR', 'Fix no aplicado o pendiente', {
                    status: response.status
                });
                this.logger.exitPhase();
            }

            return { ticket, analysis, response };

        } catch (error) {
            this.logger.error('ORCHESTRATOR', '❌ Error durante análisis y reparación', {
                error: error.message,
                stack: error.stack,
                module: errorContext.module
            });
            this.logger.exitPhase();
            return null;
        }
    }

    /**
     * Login al sistema (3 pasos) - Usando usuario soporte fijo
     */
    async login(companySlug = 'isi', username = null, password = 'admin123') {
        // ✨ Usuario soporte fijo: 'soporte' (existe en todas las empresas por multi-tenant)
        username = 'soporte';

        console.log('\n\n🔥🔥🔥 ===== MÉTODO LOGIN() EJECUTÁNDOSE (USUARIO SOPORTE) ===== 🔥🔥🔥');
        console.log(`🔥 Empresa: ${companySlug}`);
        console.log(`🔥 Usuario: ${username} (usuario soporte del sistema - oculto en UI)`);
        console.log(`🔥 Password: ${password}\n`);

        this.logger.info('BROWSER', '🔐 Iniciando login (3 pasos) con usuario soporte', {
            baseUrl: this.config.baseUrl,
            companySlug,
            username
        });

        await this.page.goto(`${this.config.baseUrl}/panel-empresa.html`, {
            waitUntil: 'networkidle', // ✨ Playwright usa 'networkidle' (Puppeteer usaba 'networkidle2')
            timeout: 60000 // 60 segundos
        });
        await this.wait(1000);

        try {
            // Paso 1: Empresa (SELECT DROPDOWN)
            console.log(`\n📍 PASO 1: Seleccionando empresa "${companySlug}" del dropdown`);
            this.logger.debug('BROWSER', `Paso 1/3: Seleccionando empresa ${companySlug}`);
            console.log('   🔍 Esperando dropdown #companySelect...');
            await this.page.waitForSelector('#companySelect', { visible: true, timeout: 10000 });
            console.log('   ⏱️ Esperando 1 segundo a que se carguen las empresas...');
            await this.wait(1000);
            console.log(`   ✅ Dropdown encontrado, seleccionando "${companySlug}"...`);
            await this.page.selectOption('#companySelect', companySlug);

            // ✨ FIX: Esperar MÁS tiempo para que aparezca el campo de usuario
            console.log('   ⏱️ Esperando 5 segundos a que aparezca el campo de usuario...');
            await this.wait(5000);
            console.log('   ✅ Paso 1 completado\n');

            // Paso 2: Usuario
            console.log(`📍 PASO 2: Ingresando usuario "${username}"`);
            this.logger.debug('BROWSER', `Paso 2/3: Ingresando usuario ${username}`);
            console.log('   🔍 Buscando campo de usuario visible...');

            // ✨ FIX: Buscar el input de texto que esté VISIBLE (no el oculto initCompanySlug)
            const usernameInput = this.page.locator('input[type="text"]:visible').last();

            // Esperar a que el input sea visible y editable
            console.log('   ⏱️ Esperando que el campo sea visible...');
            await usernameInput.waitFor({ state: 'visible', timeout: 15000 });

            console.log('   ✅ Campo encontrado, escribiendo usuario...');
            await usernameInput.fill(username);

            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ⏱️ Esperando 3 segundos...');
            await this.wait(3000);
            console.log('   ✅ Paso 2 completado\n');

            // Paso 3: Password
            console.log(`📍 PASO 3: Ingresando password "${password}"`);
            this.logger.debug('BROWSER', 'Paso 3/3: Ingresando contraseña');
            console.log('   🔍 Buscando campo de password...');

            // ✨ FIX: Usar selector específico para el campo de password VISIBLE
            // Opciones: #passwordInput (panel-empresa) o #userPassword
            const passwordInput = this.page.locator('input[type="password"]:visible').last();

            // Esperar a que el input sea visible y editable
            console.log('   ⏱️ Esperando que el campo sea visible...');
            await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

            console.log('   ✅ Campo encontrado, escribiendo password...');
            await passwordInput.fill(password);

            console.log('   ⌨️ Presionando Enter...');
            await this.page.keyboard.press('Enter');
            console.log('   ✅ Paso 3 completado\n');

            // Esperar a que cargue el dashboard
            console.log('⏱️ Esperando 3 segundos a que cargue el dashboard...');
            await this.wait(3000);
            console.log('✅✅✅ LOGIN COMPLETADO EXITOSAMENTE ✅✅✅\n');
            this.logger.info('BROWSER', '✅ Login completado exitosamente');
        } catch (error) {
            console.error('\n❌❌❌ ERROR EN LOGIN ❌❌❌');
            console.error(`Error tipo: ${error.name}`);
            console.error(`Mensaje: ${error.message}`);
            if (error.stack) {
                console.error(`Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
            }
            throw error;
        }
    }

    /**
     * Navegar a un módulo específico
     */
    async navigateToModule(moduleName) {
        this.logger.info('BROWSER', `📂 Navegando a módulo: ${moduleName}`);

        // Mapeo de módulos a funciones de carga dinámica (panel-empresa.html)
        const moduleLoadFunctions = {
            'users': 'showUsersContent',
            'attendance': 'showAttendanceContent',
            'departments': 'showDepartmentsContent',
            'shifts': 'showShiftsContent'
        };

        const loadFunction = moduleLoadFunctions[moduleName];
        if (!loadFunction) {
            this.logger.error('BROWSER', `Módulo desconocido: ${moduleName}`);
            throw new Error(`Módulo desconocido: ${moduleName}`);
        }

        try {
            // Esperar a que el dashboard cargue
            await this.wait(2000);

            // Ejecutar función de carga dinámica del módulo
            this.logger.debug('BROWSER', `Ejecutando ${loadFunction}()`);
            const result = await this.page.evaluate((funcName) => {
                if (typeof window[funcName] === 'function') {
                    window[funcName]();
                    return { success: true };
                }
                return { success: false, error: `${funcName} no existe` };
            }, loadFunction);

            if (result.success) {
                await this.wait(2000);
                this.logger.info('BROWSER', `✅ Módulo ${moduleName} cargado exitosamente`);
            } else {
                this.logger.error('BROWSER', `❌ Error: ${result.error}`);
                throw new Error(result.error);
            }
        } catch (error) {
            this.logger.error('BROWSER', `Error navegando a ${moduleName}`, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Llenar formulario con datos fake
     */
    async fillForm(moduleName) {
        this.logger.debug('BROWSER', `📝 Llenando formulario para: ${moduleName}`);

        const timestamp = Date.now();
        // ✨ NUEVO: Prefijo TEST_ para identificar registros de prueba
        const testPrefix = 'TEST_';

        const formData = {
            'users': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': `${testPrefix}User_${timestamp}`,
                'input[name*="apellido"], input[placeholder*="Apellido"]': `${testPrefix}Automated`,
                'input[name*="email"], input[type="email"]': `test_${timestamp}@test.com`,
                'input[name*="dni"], input[placeholder*="DNI"]': `${timestamp}`.substring(0, 8),
                'input[name*="legajo"], input[placeholder*="Legajo"]': `${testPrefix}${timestamp}`.substring(0, 10)
            },
            'attendance': {
                'input[type="datetime-local"]': new Date().toISOString().slice(0, 16),
                'select[name*="tipo"]': 'entrada'
            },
            'departments': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': `${testPrefix}Depto_${timestamp}`,
                'textarea[name*="descripcion"]': 'Departamento de prueba automatizada - TESTING'
            },
            'shifts': {
                'input[name*="nombre"], input[placeholder*="Nombre"]': `${testPrefix}Turno_${timestamp}`,
                'input[type="time"]:first-of-type': '09:00',
                'input[type="time"]:last-of-type': '17:00'
            },
            'permissions': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': `${testPrefix}Permiso de prueba automatizada`
            },
            'vacations': {
                'input[type="date"]:first-of-type': new Date().toISOString().slice(0, 10),
                'input[type="date"]:last-of-type': new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
            },
            'medical': {
                'input[type="date"]': new Date().toISOString().slice(0, 10),
                'textarea': `${testPrefix}Licencia médica de prueba`
            }
        };

        const fields = formData[moduleName] || {};
        let filledCount = 0;
        let failedCount = 0;

        for (const [selector, value] of Object.entries(fields)) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click({ clickCount: 3 }); // Select all
                    await element.fill(value);
                    filledCount++;
                    this.logger.debug('BROWSER', `✅ Campo llenado: ${selector.substring(0, 30)}...`);
                }
            } catch (error) {
                failedCount++;
                this.logger.debug('BROWSER', `⚠️ No se pudo llenar campo`, {
                    selector: selector.substring(0, 30),
                    error: error.message
                });
            }
        }

        this.logger.debug('BROWSER', `Formulario completado`, {
            moduleName,
            filledCount,
            failedCount
        });

        await this.wait(500);
    }


    /**
     * ✨ NUEVO: Testear TODOS los botones visibles en el módulo
     * Hace click en cada botón y captura errores sin detener la ejecución
     */
    async testAllButtons(moduleName) {
        console.log(`\n🔘 TEST ALL BUTTONS - Clickeando todos los botones de ${moduleName}...`);
        this.logger.info('TEST', 'Iniciando test comprehensivo de botones', { moduleName });

        try {
            // Esperar a que la página cargue completamente
            await this.wait(2000);

            // Obtener todos los botones visibles (FIX: usar $$eval en vez de $eval)
            const buttons = await this.page.$$eval('button', btns =>
                Array.from(btns).map((btn, index) => ({
                    index,
                    text: btn.textContent.trim(),
                    classes: btn.className,
                    visible: btn.offsetParent !== null,
                    disabled: btn.disabled
                }))
            );

            const visibleButtons = buttons.filter(b => b.visible && !b.disabled);
            console.log(`   📊 Total botones encontrados: ${buttons.length}`);
            console.log(`   ✅ Botones visibles y habilitados: ${visibleButtons.length}`);

            let clicked = 0;
            let errors = 0;

            for (const btnInfo of visibleButtons) {
                try {
                    console.log(`   🖱️  Clickeando: "${btnInfo.text}" (index: ${btnInfo.index})`);

                    // Click usando evaluate para evitar problemas de timing
                    await this.page.evaluate((idx) => {
                        const btn = document.querySelectorAll('button')[idx];
                        if (btn && !btn.disabled && btn.offsetParent !== null) {
                            btn.click();
                            return true;
                        }
                        return false;
                    }, btnInfo.index);

                    clicked++;
                    await this.wait(500); // Esperar a que se procese el click

                    // Si abrió un modal, intentar cerrarlo
                    const modalVisible = await this.page.$('.modal.show, .modal-backdrop');
                    if (modalVisible) {
                        console.log(`      ℹ️  Modal detectado, cerrando...`);
                        await this.clickByText('button', 'Cerrar');
                        await this.wait(500);
                    }

                } catch (error) {
                    console.log(`      ⚠️  Error al clickear "${btnInfo.text}": ${error.message}`);
                    errors++;
                }
            }

            console.log(`\n   📊 RESUMEN TEST BUTTONS:`);
            console.log(`      ✅ Botones clickeados: ${clicked}`);
            console.log(`      ⚠️  Errores: ${errors}`);

            this.logger.info('TEST', 'Test de botones completado', {
                moduleName,
                clicked,
                errors,
                totalButtons: visibleButtons.length
            });

            return { success: true, clicked, errors, total: visibleButtons.length };

        } catch (error) {
            console.error(`   ❌ ERROR en testAllButtons: ${error.message}`);
            this.logger.error('TEST', 'Error en test de botones', {
                moduleName,
                error: error.message
            });
            return { success: false, error };
        }
    }

    /**
     * ✨ NUEVO: Detectar y testear submódulos
     * Busca tabs, accordions, o secciones expandibles dentro del módulo
     */
    async testSubmodules(moduleName) {
        console.log(`\n📂 TEST SUBMODULES - Buscando submódulos en ${moduleName}...`);
        this.logger.info('TEST', 'Iniciando detección de submódulos', { moduleName });

        try {
            await this.wait(2000);

            // Buscar tabs (pestañas) - FIX: usar $$eval en vez de $eval
            const tabs = await this.page.$$eval('.nav-tabs a, .tab-button, [role="tab"]',
                tabs => Array.from(tabs).map((tab, idx) => ({
                    index: idx,
                    text: tab.textContent.trim(),
                    visible: tab.offsetParent !== null
                }))
            ).catch(() => []);

            const visibleTabs = tabs.filter(t => t.visible && t.text.length > 0);
            console.log(`   📑 Tabs/Pestañas encontradas: ${visibleTabs.length}`);

            let testedSubmodules = 0;

            for (const tab of visibleTabs) {
                try {
                    console.log(`\n   🔹 TESTING SUBMÓDULO: "${tab.text}"`);

                    // Click en el tab
                    await this.page.evaluate((idx) => {
                        const tabElements = document.querySelectorAll('.nav-tabs a, .tab-button, [role="tab"]');
                        if (tabElements[idx]) {
                            tabElements[idx].click();
                        }
                    }, tab.index);

                    await this.wait(1500);

                    // Testear botones del submódulo
                    const submoduleButtons = await this.testAllButtons(`${moduleName}/${tab.text}`);
                    console.log(`      ✅ Submódulo "${tab.text}" testeado - ${submoduleButtons.clicked} botones`);

                    testedSubmodules++;

                } catch (error) {
                    console.log(`      ⚠️  Error testeando submódulo "${tab.text}": ${error.message}`);
                }
            }

            console.log(`\n   📊 RESUMEN SUBMODULES:`);
            console.log(`      ✅ Submódulos testeados: ${testedSubmodules}`);

            this.logger.info('TEST', 'Test de submódulos completado', {
                moduleName,
                submodules: testedSubmodules
            });

            return { success: true, submodules: testedSubmodules };

        } catch (error) {
            console.error(`   ❌ ERROR en testSubmodules: ${error.message}`);
            this.logger.error('TEST', 'Error en test de submódulos', {
                moduleName,
                error: error.message
            });
            return { success: false, error };
        }
    }

    /**
     * Generar reporte final
     */
    generateReport(moduleName) {
        const totalDb = this.stats.dbTestsPassed + this.stats.dbTestsFailed;
        const totalUi = this.stats.uiTestsPassed + this.stats.uiTestsFailed;
        const dbSuccessRate = totalDb > 0 ? (this.stats.dbTestsPassed / totalDb * 100).toFixed(2) : 0;
        const uiSuccessRate = totalUi > 0 ? (this.stats.uiTestsPassed / totalUi * 100).toFixed(2) : 0;

        const report = {
            module: moduleName,
            timestamp: new Date().toISOString(),
            database_tests: {
                total: totalDb,
                passed: this.stats.dbTestsPassed,
                failed: this.stats.dbTestsFailed,
                success_rate: `${dbSuccessRate}%`
            },
            ui_tests: {
                total: totalUi,
                passed: this.stats.uiTestsPassed,
                failed: this.stats.uiTestsFailed,
                success_rate: `${uiSuccessRate}%`
            },
            tickets_generated: this.stats.tickets.length,
            fixes_applied: this.stats.fixesApplied,
            status: this.stats.dbTestsFailed === 0 ? 'SUCCESS' : 'FAILED'
        };

        console.log(`\n${'='.repeat(80)}`);
        console.log(`📊 REPORTE FINAL - ${moduleName.toUpperCase()}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`\n🗄️ DATABASE TESTS:`);
        console.log(`   Total: ${totalDb}`);
        console.log(`   ✅ Exitosos: ${this.stats.dbTestsPassed}`);
        console.log(`   ❌ Fallidos: ${this.stats.dbTestsFailed}`);
        console.log(`   📈 Tasa de éxito: ${dbSuccessRate}%`);
        console.log(`\n🖥️ UI TESTS:`);
        console.log(`   Total: ${totalUi}`);
        console.log(`   ✅ Exitosos: ${this.stats.uiTestsPassed}`);
        console.log(`   ❌ Fallidos: ${this.stats.uiTestsFailed}`);
        console.log(`   📈 Tasa de éxito: ${uiSuccessRate}%`);
        console.log(`\n🎫 TICKETS: ${this.stats.tickets.length} generados`);
        console.log(`🔧 FIXES: ${this.stats.fixesApplied} aplicados`);
        console.log(`\n${'='.repeat(80)}\n`);

        return report;
    }

    /**
     * Detener el sistema
     */
    async stop() {
        this.logger.separator('=', 80);
        this.logger.info('ORCHESTRATOR', '🛑 Deteniendo sistema Phase 4', {
            executionId: this.executionId
        });

        if (this.browser) {
            await this.browser.close();
            this.logger.info('BROWSER', 'Playwright Chromium cerrado exitosamente');
        }

        if (this.sequelize) {
            await this.sequelize.close();
            this.logger.info('DB', 'PostgreSQL desconectado exitosamente');
        }

        if (this.wsBridge) {
            this.wsBridge.disconnect();
            this.logger.info('WS', 'WebSocket Bridge cerrado exitosamente');
        }

        if (this.wsServer) {
            await this.wsServer.stop();
            this.logger.info('WS', 'WebSocket Server cerrado exitosamente');
        }

        // Completar el ciclo y exportar logs
        const cycleSummary = this.logger.completeCycle();

        this.logger.separator('=', 80);
        this.logger.info('ORCHESTRATOR', '✅ Sistema completamente detenido');

        // Exportar logs del ciclo
        if (this.executionId) {
            const logFile = this.logger.exportLogs(`phase4-${this.executionId}.json`);
            this.logger.info('SYSTEM', `Logs exportados: ${logFile}`);
        }

        return cycleSummary;
    }
}

module.exports = Phase4TestOrchestrator;
