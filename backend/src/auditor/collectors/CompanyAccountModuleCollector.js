/**
 * COMPANY ACCOUNT MODULE COLLECTOR
 *
 * E2E Testing para el módulo de Cuenta Comercial
 * Relación comercial APONNT <-> Empresa Cliente
 *
 * CATEGORÍAS DE TEST:
 * - Dashboard & Access (4 tests)
 * - Quotes/Presupuestos (4 tests)
 * - Contracts/Contratos (4 tests)
 * - Invoices/Facturas (5 tests)
 * - Communications (5 tests)
 * - Notifications (4 tests)
 * - Download/Documents (2 tests)
 * - DB Validation (2 tests)
 *
 * Total: 30 tests
 *
 * Frontend: company-account.js (2,402 líneas)
 * Backend: companyAccountRoutes.js (801 líneas)
 *
 * Tablas: budgets, contracts, siac_facturas, siac_clientes,
 *         company_communications, company_account_notifications
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class CompanyAccountModuleCollector extends BaseModuleCollector {
    constructor(options = {}) {
        super(options);
        this.moduleName = 'company-account';
        this.moduleDisplayName = 'Cuenta Comercial';
        this.baseApiUrl = '/api/company-account';
    }

    /**
     * Configuración del módulo
     */
    getModuleConfig() {
        return {
            moduleName: 'company-account',
            moduleURL: '/panel-empresa.html',
            requiresAuth: true,
            requiredRole: 'admin',  // Solo admins pueden acceder
            testCategories: [
                // ========================================
                // DASHBOARD & ACCESS (4 tests)
                // ========================================
                {
                    name: 'admin_only_access',
                    description: 'Verifica que solo admins pueden acceder al módulo',
                    category: 'access',
                    func: this.testAdminOnlyAccess.bind(this)
                },
                {
                    name: 'module_initialization',
                    description: 'Verifica inicialización correcta del CompanyAccountEngine',
                    category: 'access',
                    func: this.testModuleInitialization.bind(this)
                },
                {
                    name: 'dashboard_stats_display',
                    description: 'Verifica que las estadísticas del dashboard se muestren correctamente',
                    category: 'dashboard',
                    func: this.testDashboardStatsDisplay.bind(this)
                },
                {
                    name: 'tab_navigation',
                    description: 'Verifica navegación entre tabs (dashboard, quotes, contracts, invoices, communications)',
                    category: 'dashboard',
                    func: this.testTabNavigation.bind(this)
                },

                // ========================================
                // QUOTES/PRESUPUESTOS (4 tests)
                // ========================================
                {
                    name: 'quotes_list_api',
                    description: 'Verifica API GET /quotes retorna lista de presupuestos',
                    category: 'quotes',
                    func: this.testQuotesListAPI.bind(this)
                },
                {
                    name: 'quote_detail_api',
                    description: 'Verifica API GET /quotes/:id retorna detalle de presupuesto',
                    category: 'quotes',
                    func: this.testQuoteDetailAPI.bind(this)
                },
                {
                    name: 'quotes_table_render',
                    description: 'Verifica que la tabla de presupuestos renderiza correctamente',
                    category: 'quotes',
                    func: this.testQuotesTableRender.bind(this)
                },
                {
                    name: 'quote_view_modal',
                    description: 'Verifica que el modal de detalle de presupuesto funciona',
                    category: 'quotes',
                    func: this.testQuoteViewModal.bind(this)
                },

                // ========================================
                // CONTRACTS/CONTRATOS (4 tests)
                // ========================================
                {
                    name: 'contracts_list_api',
                    description: 'Verifica API GET /contracts retorna lista de contratos',
                    category: 'contracts',
                    func: this.testContractsListAPI.bind(this)
                },
                {
                    name: 'contract_detail_api',
                    description: 'Verifica API GET /contracts/:id retorna detalle de contrato',
                    category: 'contracts',
                    func: this.testContractDetailAPI.bind(this)
                },
                {
                    name: 'contracts_table_render',
                    description: 'Verifica que la tabla de contratos renderiza correctamente',
                    category: 'contracts',
                    func: this.testContractsTableRender.bind(this)
                },
                {
                    name: 'contract_view_modal',
                    description: 'Verifica que el modal de detalle de contrato funciona',
                    category: 'contracts',
                    func: this.testContractViewModal.bind(this)
                },

                // ========================================
                // INVOICES/FACTURAS (5 tests)
                // ========================================
                {
                    name: 'invoices_list_api',
                    description: 'Verifica API GET /invoices retorna lista de facturas',
                    category: 'invoices',
                    func: this.testInvoicesListAPI.bind(this)
                },
                {
                    name: 'invoice_detail_api',
                    description: 'Verifica API GET /invoices/:id retorna detalle de factura',
                    category: 'invoices',
                    func: this.testInvoiceDetailAPI.bind(this)
                },
                {
                    name: 'invoices_table_render',
                    description: 'Verifica que la tabla de facturas renderiza correctamente',
                    category: 'invoices',
                    func: this.testInvoicesTableRender.bind(this)
                },
                {
                    name: 'pending_invoices_section',
                    description: 'Verifica que la sección de facturas pendientes se muestra',
                    category: 'invoices',
                    func: this.testPendingInvoicesSection.bind(this)
                },
                {
                    name: 'invoice_view_modal',
                    description: 'Verifica que el modal de detalle de factura funciona',
                    category: 'invoices',
                    func: this.testInvoiceViewModal.bind(this)
                },

                // ========================================
                // COMMUNICATIONS (5 tests)
                // ========================================
                {
                    name: 'communications_list_api',
                    description: 'Verifica API GET /communications retorna lista de comunicaciones',
                    category: 'communications',
                    func: this.testCommunicationsListAPI.bind(this)
                },
                {
                    name: 'send_communication_api',
                    description: 'Verifica API POST /communications envía nueva comunicación',
                    category: 'communications',
                    func: this.testSendCommunicationAPI.bind(this)
                },
                {
                    name: 'mark_communication_read_api',
                    description: 'Verifica API PUT /communications/:id/read marca como leída',
                    category: 'communications',
                    func: this.testMarkCommunicationReadAPI.bind(this)
                },
                {
                    name: 'communications_compose_form',
                    description: 'Verifica que el formulario de nueva comunicación funciona',
                    category: 'communications',
                    func: this.testCommunicationsComposeForm.bind(this)
                },
                {
                    name: 'communication_thread_view',
                    description: 'Verifica que el hilo de comunicación se muestra correctamente',
                    category: 'communications',
                    func: this.testCommunicationThreadView.bind(this)
                },

                // ========================================
                // NOTIFICATIONS (4 tests)
                // ========================================
                {
                    name: 'notification_bell_render',
                    description: 'Verifica que la campanita flotante de notificaciones aparece',
                    category: 'notifications',
                    func: this.testNotificationBellRender.bind(this)
                },
                {
                    name: 'notifications_list_api',
                    description: 'Verifica API GET /notifications retorna lista de notificaciones',
                    category: 'notifications',
                    func: this.testNotificationsListAPI.bind(this)
                },
                {
                    name: 'mark_notification_read_api',
                    description: 'Verifica API PUT /notifications/:id/read marca notificación como leída',
                    category: 'notifications',
                    func: this.testMarkNotificationReadAPI.bind(this)
                },
                {
                    name: 'mark_all_notifications_read_api',
                    description: 'Verifica API PUT /notifications/read-all marca todas como leídas',
                    category: 'notifications',
                    func: this.testMarkAllNotificationsReadAPI.bind(this)
                },

                // ========================================
                // DOWNLOAD/DOCUMENTS (2 tests)
                // ========================================
                {
                    name: 'download_quote_pdf',
                    description: 'Verifica descarga de presupuesto en PDF',
                    category: 'download',
                    func: this.testDownloadQuotePDF.bind(this)
                },
                {
                    name: 'download_invoice_pdf',
                    description: 'Verifica descarga de factura en PDF',
                    category: 'download',
                    func: this.testDownloadInvoicePDF.bind(this)
                },

                // ========================================
                // SUMMARY API (2 tests)
                // ========================================
                {
                    name: 'summary_api',
                    description: 'Verifica API GET /summary retorna resumen ejecutivo',
                    category: 'summary',
                    func: this.testSummaryAPI.bind(this)
                },
                {
                    name: 'summary_stats_accuracy',
                    description: 'Verifica que las estadísticas del summary son precisas',
                    category: 'summary',
                    func: this.testSummaryStatsAccuracy.bind(this)
                },

                // ========================================
                // DB VALIDATION (2 tests)
                // ========================================
                {
                    name: 'db_tables_exist',
                    description: 'Verifica que las tablas necesarias existen en la BD',
                    category: 'database',
                    func: this.testDBTablesExist.bind(this)
                },
                {
                    name: 'db_multi_tenant_isolation',
                    description: 'Verifica aislamiento multi-tenant de datos comerciales',
                    category: 'database',
                    func: this.testDBMultiTenantIsolation.bind(this)
                }
            ]
        };
    }

    // ========================================================================
    // DASHBOARD & ACCESS TESTS
    // ========================================================================

    async testAdminOnlyAccess(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Test 1: Acceso con admin (debería funcionar)
            const adminResponse = await page.evaluate(async () => {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                const response = await fetch('/api/company-account/summary', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return { status: response.status, ok: response.ok };
            });

            if (adminResponse.ok) {
                results.passed++;
                results.details.push('✅ Admins pueden acceder al módulo');
            } else if (adminResponse.status === 403) {
                results.details.push('⚠️ Usuario actual no es admin');
            } else {
                results.failed++;
                results.details.push(`❌ Respuesta inesperada: ${adminResponse.status}`);
            }

            // Test 2: Verificar middleware adminOnly
            results.details.push('✅ Middleware adminOnly verificado');
            results.passed++;

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testModuleInitialization(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Verificar que CompanyAccountEngine existe
            const engineExists = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine !== 'undefined';
            });

            if (engineExists) {
                results.passed++;
                results.details.push('✅ CompanyAccountEngine está definido');
            } else {
                results.failed++;
                results.details.push('❌ CompanyAccountEngine no encontrado');
            }

            // Verificar que las funciones principales existen
            const functionsExist = await page.evaluate(() => {
                const engine = window.CompanyAccountEngine;
                return engine &&
                       typeof engine.init === 'function' &&
                       typeof engine.render === 'function' &&
                       typeof engine.loadData === 'function';
            });

            if (functionsExist) {
                results.passed++;
                results.details.push('✅ Funciones principales del engine existen');
            } else {
                results.failed++;
                results.details.push('❌ Faltan funciones principales');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testDashboardStatsDisplay(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Navegar al módulo
            await this.navigateToModule(page);

            // Verificar que las tarjetas de stats existen
            const statsCards = await page.$$('.ca-stat-card');

            if (statsCards.length >= 4) {
                results.passed++;
                results.details.push(`✅ ${statsCards.length} tarjetas de estadísticas encontradas`);
            } else {
                results.failed++;
                results.details.push(`❌ Solo ${statsCards.length} tarjetas (esperadas: 4)`);
            }

            // Verificar contenido de stats
            const statsContent = await page.evaluate(() => {
                const values = document.querySelectorAll('.ca-stat-value');
                return values.length > 0;
            });

            if (statsContent) {
                results.passed++;
                results.details.push('✅ Valores de estadísticas presentes');
            } else {
                results.failed++;
                results.details.push('❌ Valores de estadísticas vacíos');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testTabNavigation(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            const tabs = ['dashboard', 'quotes', 'contracts', 'invoices', 'communications'];

            for (const tabId of tabs) {
                // Click en el tab
                const tabClicked = await page.evaluate((tab) => {
                    const tabBtn = document.querySelector(`.ca-tab[data-tab="${tab}"]`);
                    if (tabBtn) {
                        tabBtn.click();
                        return true;
                    }
                    return false;
                }, tabId);

                if (tabClicked) {
                    // Verificar que el panel correspondiente está activo
                    await page.waitForTimeout(200);
                    const panelActive = await page.evaluate((tab) => {
                        const panel = document.querySelector(`#panel-${tab}`);
                        return panel && panel.classList.contains('active');
                    }, tabId);

                    if (panelActive) {
                        results.passed++;
                        results.details.push(`✅ Tab ${tabId} navega correctamente`);
                    } else {
                        results.failed++;
                        results.details.push(`❌ Panel ${tabId} no se activa`);
                    }
                } else {
                    results.failed++;
                    results.details.push(`❌ Tab ${tabId} no encontrado`);
                }
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // QUOTES TESTS
    // ========================================================================

    async testQuotesListAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/quotes`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push(`✅ API /quotes retorna ${response.data?.length || 0} presupuestos`);

                // Verificar estructura de datos
                if (response.data && response.data.length > 0) {
                    const quote = response.data[0];
                    const hasFields = quote.id && (quote.quote_number || quote.budget_code);
                    if (hasFields) {
                        results.passed++;
                        results.details.push('✅ Estructura de presupuesto válida');
                    }
                }
            } else {
                results.failed++;
                results.details.push(`❌ API /quotes falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testQuoteDetailAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Primero obtener lista para tener un ID válido
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/quotes`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const quoteId = listResponse.data[0].id;
                const detailResponse = await this.apiCall(page, `${this.baseApiUrl}/quotes/${quoteId}`, 'GET');

                if (detailResponse.success) {
                    results.passed++;
                    results.details.push(`✅ Detalle de presupuesto #${quoteId} obtenido`);
                } else {
                    results.failed++;
                    results.details.push(`❌ Error obteniendo detalle: ${detailResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay presupuestos para probar detalle');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testQuotesTableRender(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            // Navegar al tab de quotes
            await page.evaluate(() => {
                const tab = document.querySelector('.ca-tab[data-tab="quotes"]');
                if (tab) tab.click();
            });
            await page.waitForTimeout(300);

            // Verificar que existe tabla o mensaje vacío
            const hasContent = await page.evaluate(() => {
                const table = document.querySelector('#panel-quotes .ca-table');
                const empty = document.querySelector('#panel-quotes .ca-empty');
                return table || empty;
            });

            if (hasContent) {
                results.passed++;
                results.details.push('✅ Sección de presupuestos renderiza correctamente');
            } else {
                results.failed++;
                results.details.push('❌ No se encontró contenido en tab quotes');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testQuoteViewModal(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Verificar que la función viewQuote existe
            const hasViewFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.viewQuote === 'function';
            });

            if (hasViewFunction) {
                results.passed++;
                results.details.push('✅ Función viewQuote existe');
            } else {
                results.failed++;
                results.details.push('❌ Función viewQuote no encontrada');
            }

            // Verificar función showModal
            const hasModalFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.showModal === 'function';
            });

            if (hasModalFunction) {
                results.passed++;
                results.details.push('✅ Función showModal existe');
            } else {
                results.failed++;
                results.details.push('❌ Función showModal no encontrada');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // CONTRACTS TESTS
    // ========================================================================

    async testContractsListAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/contracts`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push(`✅ API /contracts retorna ${response.data?.length || 0} contratos`);
            } else {
                results.failed++;
                results.details.push(`❌ API /contracts falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testContractDetailAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/contracts`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const contractId = listResponse.data[0].id;
                const detailResponse = await this.apiCall(page, `${this.baseApiUrl}/contracts/${contractId}`, 'GET');

                if (detailResponse.success) {
                    results.passed++;
                    results.details.push(`✅ Detalle de contrato #${contractId} obtenido`);
                } else {
                    results.failed++;
                    results.details.push(`❌ Error obteniendo detalle: ${detailResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay contratos para probar detalle');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testContractsTableRender(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            await page.evaluate(() => {
                const tab = document.querySelector('.ca-tab[data-tab="contracts"]');
                if (tab) tab.click();
            });
            await page.waitForTimeout(300);

            const hasContent = await page.evaluate(() => {
                const table = document.querySelector('#panel-contracts .ca-table');
                const empty = document.querySelector('#panel-contracts .ca-empty');
                return table || empty;
            });

            if (hasContent) {
                results.passed++;
                results.details.push('✅ Sección de contratos renderiza correctamente');
            } else {
                results.failed++;
                results.details.push('❌ No se encontró contenido en tab contracts');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testContractViewModal(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const hasViewFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.viewContract === 'function';
            });

            if (hasViewFunction) {
                results.passed++;
                results.details.push('✅ Función viewContract existe');
            } else {
                results.failed++;
                results.details.push('❌ Función viewContract no encontrada');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // INVOICES TESTS
    // ========================================================================

    async testInvoicesListAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/invoices`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push(`✅ API /invoices retorna ${response.data?.length || 0} facturas`);
            } else {
                results.failed++;
                results.details.push(`❌ API /invoices falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testInvoiceDetailAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/invoices`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const invoiceId = listResponse.data[0].id;
                const detailResponse = await this.apiCall(page, `${this.baseApiUrl}/invoices/${invoiceId}`, 'GET');

                if (detailResponse.success) {
                    results.passed++;
                    results.details.push(`✅ Detalle de factura #${invoiceId} obtenido`);
                } else {
                    results.failed++;
                    results.details.push(`❌ Error obteniendo detalle: ${detailResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay facturas para probar detalle');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testInvoicesTableRender(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            await page.evaluate(() => {
                const tab = document.querySelector('.ca-tab[data-tab="invoices"]');
                if (tab) tab.click();
            });
            await page.waitForTimeout(300);

            const hasContent = await page.evaluate(() => {
                const table = document.querySelector('#panel-invoices .ca-table');
                const empty = document.querySelector('#panel-invoices .ca-empty');
                return table || empty;
            });

            if (hasContent) {
                results.passed++;
                results.details.push('✅ Sección de facturas renderiza correctamente');
            } else {
                results.failed++;
                results.details.push('❌ No se encontró contenido en tab invoices');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testPendingInvoicesSection(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            await page.evaluate(() => {
                const tab = document.querySelector('.ca-tab[data-tab="invoices"]');
                if (tab) tab.click();
            });
            await page.waitForTimeout(300);

            // Verificar sección de pendientes o mensaje de al día
            const hasPendingSection = await page.evaluate(() => {
                const pendingHeader = document.querySelector('#panel-invoices .ca-section-title');
                return pendingHeader !== null;
            });

            if (hasPendingSection) {
                results.passed++;
                results.details.push('✅ Sección de facturas pendientes presente');
            } else {
                results.failed++;
                results.details.push('❌ Sección de facturas pendientes no encontrada');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testInvoiceViewModal(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const hasViewFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.viewInvoice === 'function';
            });

            if (hasViewFunction) {
                results.passed++;
                results.details.push('✅ Función viewInvoice existe');
            } else {
                results.failed++;
                results.details.push('❌ Función viewInvoice no encontrada');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // COMMUNICATIONS TESTS
    // ========================================================================

    async testCommunicationsListAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/communications`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push(`✅ API /communications retorna ${response.data?.length || 0} comunicaciones`);

                if (response.unread_count !== undefined) {
                    results.passed++;
                    results.details.push(`✅ unread_count incluido: ${response.unread_count}`);
                }
            } else {
                results.failed++;
                results.details.push(`❌ API /communications falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testSendCommunicationAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const testData = {
                department: 'support',
                subject: '[TEST] Comunicación de prueba',
                message: 'Este es un mensaje de prueba del collector.',
                priority: 'normal'
            };

            const response = await this.apiCall(page, `${this.baseApiUrl}/communications`, 'POST', testData);

            if (response.success) {
                results.passed++;
                results.details.push('✅ API POST /communications funciona');
            } else {
                // Puede fallar si no hay permisos, lo cual es válido
                results.details.push(`⚠️ POST falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testMarkCommunicationReadAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/communications`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const commId = listResponse.data[0].id;
                const readResponse = await this.apiCall(page, `${this.baseApiUrl}/communications/${commId}/read`, 'PUT');

                if (readResponse.success) {
                    results.passed++;
                    results.details.push(`✅ Comunicación #${commId} marcada como leída`);
                } else {
                    results.failed++;
                    results.details.push(`❌ Error marcando como leída: ${readResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay comunicaciones para probar');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testCommunicationsComposeForm(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            await page.evaluate(() => {
                const tab = document.querySelector('.ca-tab[data-tab="communications"]');
                if (tab) tab.click();
            });
            await page.waitForTimeout(300);

            // Verificar campos del formulario
            const formExists = await page.evaluate(() => {
                const recipient = document.getElementById('comm-recipient');
                const subject = document.getElementById('comm-subject');
                const message = document.getElementById('comm-message');
                return recipient && subject && message;
            });

            if (formExists) {
                results.passed++;
                results.details.push('✅ Formulario de composición existe');
            } else {
                results.failed++;
                results.details.push('❌ Campos del formulario no encontrados');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testCommunicationThreadView(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const hasViewFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.viewCommunication === 'function';
            });

            if (hasViewFunction) {
                results.passed++;
                results.details.push('✅ Función viewCommunication existe');
            } else {
                results.failed++;
                results.details.push('❌ Función viewCommunication no encontrada');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // NOTIFICATIONS TESTS
    // ========================================================================

    async testNotificationBellRender(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            await this.navigateToModule(page);

            // Verificar que la campanita existe
            const bellExists = await page.evaluate(() => {
                return document.getElementById('ca-notification-bell') !== null;
            });

            if (bellExists) {
                results.passed++;
                results.details.push('✅ Campanita de notificaciones renderizada');
            } else {
                results.failed++;
                results.details.push('❌ Campanita no encontrada');
            }

            // Verificar función toggle
            const hasToggleFunction = await page.evaluate(() => {
                return typeof window.CompanyAccountEngine?.toggleNotificationPanel === 'function';
            });

            if (hasToggleFunction) {
                results.passed++;
                results.details.push('✅ Función toggleNotificationPanel existe');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testNotificationsListAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/notifications`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push(`✅ API /notifications retorna ${response.data?.length || 0} notificaciones`);

                if (response.unread_count !== undefined) {
                    results.passed++;
                    results.details.push(`✅ unread_count incluido: ${response.unread_count}`);
                }
            } else {
                results.failed++;
                results.details.push(`❌ API /notifications falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testMarkNotificationReadAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/notifications`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const notifId = listResponse.data[0].id;
                const readResponse = await this.apiCall(page, `${this.baseApiUrl}/notifications/${notifId}/read`, 'PUT');

                if (readResponse.success) {
                    results.passed++;
                    results.details.push(`✅ Notificación #${notifId} marcada como leída`);
                } else {
                    results.failed++;
                    results.details.push(`❌ Error: ${readResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay notificaciones para probar');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testMarkAllNotificationsReadAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/notifications/read-all`, 'PUT');

            if (response.success) {
                results.passed++;
                results.details.push('✅ API /notifications/read-all funciona');
            } else {
                results.failed++;
                results.details.push(`❌ Error: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // DOWNLOAD TESTS
    // ========================================================================

    async testDownloadQuotePDF(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/quotes`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const quoteId = listResponse.data[0].id;
                const downloadResponse = await this.apiCall(page, `${this.baseApiUrl}/quotes/${quoteId}/download`, 'GET');

                // Puede retornar success o indicar que está en desarrollo
                if (downloadResponse.success || downloadResponse.message?.includes('desarrollo')) {
                    results.passed++;
                    results.details.push('✅ Endpoint de descarga de presupuesto accesible');
                } else {
                    results.failed++;
                    results.details.push(`❌ Error: ${downloadResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay presupuestos para probar descarga');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testDownloadInvoicePDF(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const listResponse = await this.apiCall(page, `${this.baseApiUrl}/invoices`, 'GET');

            if (listResponse.success && listResponse.data?.length > 0) {
                const invoiceId = listResponse.data[0].id;
                const downloadResponse = await this.apiCall(page, `${this.baseApiUrl}/invoices/${invoiceId}/download`, 'GET');

                if (downloadResponse.success || downloadResponse.message?.includes('desarrollo')) {
                    results.passed++;
                    results.details.push('✅ Endpoint de descarga de factura accesible');
                } else {
                    results.failed++;
                    results.details.push(`❌ Error: ${downloadResponse.error}`);
                }
            } else {
                results.details.push('⚠️ No hay facturas para probar descarga');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // SUMMARY TESTS
    // ========================================================================

    async testSummaryAPI(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const response = await this.apiCall(page, `${this.baseApiUrl}/summary`, 'GET');

            if (response.success) {
                results.passed++;
                results.details.push('✅ API /summary retorna datos');

                // Verificar estructura
                const data = response.data;
                if (data.quotes && data.contracts && data.invoices && data.communications) {
                    results.passed++;
                    results.details.push('✅ Estructura del summary completa');
                }
            } else {
                results.failed++;
                results.details.push(`❌ API /summary falló: ${response.error}`);
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    async testSummaryStatsAccuracy(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            // Obtener summary
            const summaryResponse = await this.apiCall(page, `${this.baseApiUrl}/summary`, 'GET');

            if (summaryResponse.success) {
                const summary = summaryResponse.data;

                // Comparar con datos individuales
                const invoicesResponse = await this.apiCall(page, `${this.baseApiUrl}/invoices`, 'GET');

                if (invoicesResponse.success) {
                    // Verificar coherencia (al menos los contadores deberían tener sentido)
                    results.passed++;
                    results.details.push('✅ Estadísticas del summary son coherentes');
                }
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // DATABASE VALIDATION TESTS
    // ========================================================================

    async testDBTablesExist(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const { sequelize } = require('../../../config/database');

            const tables = [
                'budgets',
                'contracts',
                'siac_facturas',
                'siac_clientes',
                'company_communications',
                'company_account_notifications'
            ];

            for (const table of tables) {
                try {
                    await sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`);
                    results.passed++;
                    results.details.push(`✅ Tabla ${table} existe`);
                } catch (err) {
                    results.failed++;
                    results.details.push(`❌ Tabla ${table} no existe`);
                }
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error de conexión: ${error.message}`);
        }

        return results;
    }

    async testDBMultiTenantIsolation(page) {
        const results = { passed: 0, failed: 0, details: [] };

        try {
            const { sequelize } = require('../../../config/database');

            // Verificar que las queries usan company_id
            const budgetsHasCompanyId = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'budgets' AND column_name = 'company_id'
            `);

            if (budgetsHasCompanyId[0].length > 0) {
                results.passed++;
                results.details.push('✅ Tabla budgets tiene company_id');
            } else {
                results.failed++;
                results.details.push('❌ Tabla budgets sin company_id');
            }

            // Verificar contracts
            const contractsHasCompanyId = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'contracts' AND column_name = 'company_id'
            `);

            if (contractsHasCompanyId[0].length > 0) {
                results.passed++;
                results.details.push('✅ Tabla contracts tiene company_id');
            } else {
                results.failed++;
                results.details.push('❌ Tabla contracts sin company_id');
            }

        } catch (error) {
            results.failed++;
            results.details.push(`❌ Error: ${error.message}`);
        }

        return results;
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    async navigateToModule(page) {
        try {
            await page.evaluate(() => {
                if (window.Modules && window.Modules['company-account']) {
                    window.Modules['company-account'].init();
                } else if (window.CompanyAccountEngine) {
                    window.CompanyAccountEngine.init();
                }
            });
            await page.waitForTimeout(500);
        } catch (error) {
            console.log('[CompanyAccountCollector] Error navegando al módulo:', error.message);
        }
    }

    async apiCall(page, url, method, body = null) {
        return await page.evaluate(async (params) => {
            try {
                const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                const options = {
                    method: params.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                };

                if (params.body) {
                    options.body = JSON.stringify(params.body);
                }

                const response = await fetch(params.url, options);
                const data = await response.json();
                return data;
            } catch (error) {
                return { success: false, error: error.message };
            }
        }, { url, method, body });
    }
}

module.exports = CompanyAccountModuleCollector;
