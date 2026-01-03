/**
 * ═══════════════════════════════════════════════════════════
 * E2E TESTING CONTROL - Panel de Control de Tests Avanzados
 * ═══════════════════════════════════════════════════════════
 *
 * Panel para configurar y ejecutar tests E2E con:
 * - Chaos Testing
 * - Brain Integration
 * - Dependency Mapping
 * - SSOT Analysis
 *
 * Incluye:
 * - Checklist jer

árquico con prioridades
 * - Visualización de dependencias
 * - Ejecución configurable
 * - Resultados con sugerencias del Brain
 */

const E2ETestingControl = {
    // JERARQUÍA DE TESTS (con dependencias y prioridades)
    testHierarchy: [
        {
            id: 'setup',
            name: '🔧 SETUP - Configuración Inicial',
            priority: 'CRITICAL',
            level: 1,
            depends_on: [],
            description: 'Crear datos de prueba, conectar BD, autenticar',
            estimated_time: '5s',
            tests: [
                { id: 'db-connect', name: 'Conectar a PostgreSQL', required: true },
                { id: 'create-test-user', name: 'Crear usuario de prueba', required: true },
                { id: 'login', name: 'Autenticar en sistema', required: true }
            ]
        },
        {
            id: 'basic-navigation',
            name: '🧭 NAVEGACIÓN BÁSICA',
            priority: 'HIGH',
            level: 2,
            depends_on: ['setup'],
            description: 'Tests de navegación esencial del modal',
            estimated_time: '30s',
            tests: [
                { id: 'open-modal', name: 'Abrir modal Ver Usuario', required: true },
                { id: 'navigate-tabs', name: 'Navegar 10 solapas', required: true },
                { id: 'close-modal', name: 'Cerrar modal sin errores', required: false }
            ]
        },
        {
            id: 'ssot-analysis',
            name: '🗺️  SSOT ANALYSIS - Fuente Única de Verdad',
            priority: 'HIGH',
            level: 3,
            depends_on: ['basic-navigation'],
            description: 'Analizar de dónde viene cada dato, detectar conflictos',
            estimated_time: '45s',
            tests: [
                { id: 'ssot-map-fields', name: 'Mapear fuentes de datos', required: true },
                { id: 'ssot-verify-db', name: 'Verificar vs PostgreSQL', required: true },
                { id: 'ssot-detect-conflicts', name: 'Detectar conflictos UI vs BD', required: true },
                { id: 'ssot-cross-tab', name: 'Detectar inconsistencias entre tabs', required: false },
                { id: 'ssot-register-kb', name: 'Registrar en Knowledge Base', required: false }
            ]
        },
        {
            id: 'dependency-mapping',
            name: '🔗 DEPENDENCY MAPPING - Relaciones entre Campos',
            priority: 'MEDIUM',
            level: 3,
            depends_on: ['basic-navigation'],
            description: 'Detectar qué campos dependen de otros, validaciones cruzadas',
            estimated_time: '60s',
            tests: [
                { id: 'dep-static-analysis', name: 'Análisis estático (código)', required: true },
                { id: 'dep-dynamic-detection', name: 'Detectar dependencias dinámicas', required: true },
                { id: 'dep-cross-validations', name: 'Validaciones cruzadas', required: false },
                { id: 'dep-circular', name: 'Detectar dependencias circulares', required: true },
                { id: 'dep-generate-graph', name: 'Generar grafo visual (Mermaid)', required: false }
            ]
        },
        {
            id: 'chaos-testing',
            name: '🌪️  CHAOS TESTING - Ejército de Testers Caóticos',
            priority: 'MEDIUM',
            level: 4,
            depends_on: ['basic-navigation'],
            description: 'Acciones aleatorias para encontrar bugs escondidos',
            estimated_time: '90s',
            tests: [
                { id: 'chaos-monkey', name: 'Monkey Testing (clicks aleatorios)', required: false },
                { id: 'chaos-fuzzing', name: 'Fuzzing (valores maliciosos)', required: true },
                { id: 'chaos-xss', name: 'XSS Attack Tests', required: true },
                { id: 'chaos-sql', name: 'SQL Injection Tests', required: true },
                { id: 'chaos-overflow', name: 'Buffer Overflow Tests', required: true },
                { id: 'chaos-race', name: 'Race Conditions (clicks simultáneos)', required: false },
                { id: 'chaos-stress', name: 'Stress Testing (100+ iteraciones)', required: false },
                { id: 'chaos-memory-leak', name: 'Memory Leak Detection', required: true }
            ]
        },
        {
            id: 'brain-feedback',
            name: '🧠 BRAIN INTEGRATION - Feedback Loop Automático',
            priority: 'LOW',
            level: 5,
            depends_on: ['ssot-analysis', 'dependency-mapping', 'chaos-testing'],
            description: 'Enviar resultados al Brain, obtener sugerencias, auto-reparación',
            estimated_time: '30s',
            tests: [
                { id: 'brain-send-results', name: 'Enviar resultados al Brain', required: true },
                { id: 'brain-request-analysis', name: 'Solicitar análisis de patterns', required: false },
                { id: 'brain-get-suggestions', name: 'Obtener sugerencias de fixes', required: true },
                { id: 'brain-auto-fix', name: 'Intentar auto-reparación', required: false },
                { id: 'brain-feed-kb', name: 'Alimentar Knowledge Base IA', required: true }
            ]
        },
        {
            id: 'cleanup',
            name: '🧹 CLEANUP - Limpieza de Datos de Prueba',
            priority: 'CRITICAL',
            level: 6,
            depends_on: ['brain-feedback'],
            description: 'Eliminar datos de prueba, cerrar conexiones',
            estimated_time: '5s',
            tests: [
                { id: 'delete-test-user', name: 'Eliminar usuario de prueba', required: true },
                { id: 'db-disconnect', name: 'Cerrar conexión PostgreSQL', required: true }
            ]
        }
    ],

    // Estado de selección (qué tests ejecutar)
    selectedTests: new Set(),

    // Resultados de ejecución
    results: {},

    /**
     * Inicializar el módulo
     */
    init() {
        console.log('🧪 [E2E-CONTROL] Inicializando panel de control...');
        this.render();
        this.attachEventListeners();
    },

    /**
     * Renderizar interfaz completa
     */
    render() {
        const html = `
            <div class="e2e-control-container" style="padding: 20px; background: #f8f9fa;">
                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 32px;">
                        🧪 E2E Testing Control Center
                    </h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px;">
                        Sistema Avanzado de Testing: Chaos + Brain + Dependencies + SSOT
                    </p>
                </div>

                <!-- STATS SUMMARY -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #3498db;">
                        <div style="font-size: 32px; font-weight: bold; color: #3498db;">0</div>
                        <div style="color: #666;">Tests Seleccionados</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #2ecc71;">
                        <div style="font-size: 32px; font-weight: bold; color: #2ecc71;">0</div>
                        <div style="color: #666;">Tests Pasados</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #e74c3c;">
                        <div style="font-size: 32px; font-weight: bold; color: #e74c3c;">0</div>
                        <div style="color: #666;">Tests Fallados</div>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #f39c12;">
                        <div style="font-size: 32px; font-weight: bold; color: #f39c12;">~0s</div>
                        <div style="color: #666;">Tiempo Estimado</div>
                    </div>
                </div>

                <!-- TEST HIERARCHY CHECKLIST -->
                <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
                        ✅ Checklist de Tests (Jerarquía y Dependencias)
                    </h3>

                    <div id="test-hierarchy-tree">
                        ${this.renderTestHierarchy()}
                    </div>
                </div>

                <!-- ACTIONS -->
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <button id="select-all-btn" class="btn btn-secondary">
                        ☑️ Seleccionar Todos
                    </button>
                    <button id="select-required-btn" class="btn btn-secondary">
                        ⭐ Solo Requeridos
                    </button>
                    <button id="select-none-btn" class="btn btn-secondary">
                        ⬜ Deseleccionar Todos
                    </button>
                    <button id="run-tests-btn" class="btn btn-primary" style="margin-left: auto; font-size: 18px; padding: 15px 40px;">
                        🚀 Ejecutar Tests Seleccionados
                    </button>
                </div>

                <!-- RESULTS PANEL (oculto hasta que se ejecuten tests) -->
                <div id="results-panel" style="display: none;">
                    <div style="background: white; padding: 25px; border-radius: 10px;">
                        <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
                            📊 Resultados y Sugerencias del Brain
                        </h3>
                        <div id="results-content"></div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('mainContent');
        if (container) {
            container.innerHTML = html;
        }
    },

    /**
     * Renderizar jerarquía de tests
     */
    renderTestHierarchy() {
        let html = '';

        this.testHierarchy.forEach(group => {
            const priorityColors = {
                CRITICAL: '#e74c3c',
                HIGH: '#f39c12',
                MEDIUM: '#3498db',
                LOW: '#95a5a6'
            };

            const color = priorityColors[group.priority];
            const indent = (group.level - 1) * 20;

            html += `
                <div class="test-group" style="margin-left: ${indent}px; margin-bottom: 20px;
                                                border-left: 4px solid ${color}; padding-left: 15px;">
                    <!-- GROUP HEADER -->
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="group-checkbox" data-group-id="${group.id}"
                                   style="width: 20px; height: 20px; cursor: pointer;">
                            <span>${group.name}</span>
                            <span style="background: ${color}; color: white; padding: 3px 8px; border-radius: 5px; font-size: 11px;">
                                ${group.priority}
                            </span>
                            <span style="color: #7f8c8d; font-size: 14px; font-weight: normal;">
                                ~${group.estimated_time}
                            </span>
                        </label>
                        <div style="color: #7f8c8d; font-size: 14px; margin-top: 5px; margin-left: 30px;">
                            ${group.description}
                        </div>
                        ${group.depends_on.length > 0 ? `
                            <div style="color: #95a5a6; font-size: 12px; margin-top: 5px; margin-left: 30px;">
                                ⚠️ Depende de: ${group.depends_on.join(', ')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- SUB-TESTS -->
                    <div style="margin-left: 30px; display: grid; gap: 8px;">
                        ${group.tests.map(test => `
                            <label style="display: flex; align-items: center; gap: 10px; padding: 8px;
                                          background: #f8f9fa; border-radius: 5px; cursor: pointer;
                                          ${!test.required ? 'opacity: 0.7;' : ''}">
                                <input type="checkbox" class="test-checkbox"
                                       data-group-id="${group.id}"
                                       data-test-id="${test.id}"
                                       ${test.required ? 'data-required="true"' : ''}
                                       style="width: 16px; height: 16px; cursor: pointer;">
                                <span style="flex: 1;">${test.name}</span>
                                ${test.required ? '<span style="color: #e74c3c; font-weight: bold;">*</span>' : ''}
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        return html;
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Group checkboxes (seleccionar/deseleccionar grupo completo)
        document.querySelectorAll('.group-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const groupId = e.target.dataset.groupId;
                const checked = e.target.checked;

                // Seleccionar/deseleccionar todos los tests del grupo
                document.querySelectorAll(`.test-checkbox[data-group-id="${groupId}"]`).forEach(testCb => {
                    testCb.checked = checked;
                });

                this.updateStats();
            });
        });

        // Test checkboxes individuales
        document.querySelectorAll('.test-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateStats();
            });
        });

        // Botones de acción
        document.getElementById('select-all-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.test-checkbox, .group-checkbox').forEach(cb => {
                cb.checked = true;
            });
            this.updateStats();
        });

        document.getElementById('select-required-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.test-checkbox').forEach(cb => {
                cb.checked = cb.dataset.required === 'true';
            });
            // Actualizar group checkboxes
            document.querySelectorAll('.group-checkbox').forEach(gcb => {
                const groupId = gcb.dataset.groupId;
                const groupTests = document.querySelectorAll(`.test-checkbox[data-group-id="${groupId}"]`);
                const allChecked = Array.from(groupTests).every(t => t.checked);
                gcb.checked = allChecked;
            });
            this.updateStats();
        });

        document.getElementById('select-none-btn')?.addEventListener('click', () => {
            document.querySelectorAll('.test-checkbox, .group-checkbox').forEach(cb => {
                cb.checked = false;
            });
            this.updateStats();
        });

        document.getElementById('run-tests-btn')?.addEventListener('click', () => {
            this.runSelectedTests();
        });
    },

    /**
     * Actualizar estadísticas
     */
    updateStats() {
        const selected = document.querySelectorAll('.test-checkbox:checked').length;
        const stats = document.querySelectorAll('.e2e-control-container > div:nth-child(2) > div');

        if (stats[0]) {
            stats[0].querySelector('div').textContent = selected;
        }

        // Calcular tiempo estimado
        let estimatedTime = 0;
        document.querySelectorAll('.group-checkbox:checked').forEach(gcb => {
            const group = this.testHierarchy.find(g => g.id === gcb.dataset.groupId);
            if (group) {
                const seconds = parseInt(group.estimated_time);
                estimatedTime += seconds || 0;
            }
        });

        if (stats[3]) {
            stats[3].querySelector('div').textContent = `~${estimatedTime}s`;
        }
    },

    /**
     * Ejecutar tests seleccionados
     */
    async runSelectedTests() {
        const selectedTests = Array.from(document.querySelectorAll('.test-checkbox:checked')).map(cb => ({
            groupId: cb.dataset.groupId,
            testId: cb.dataset.testId
        }));

        if (selectedTests.length === 0) {
            alert('⚠️ Debes seleccionar al menos un test');
            return;
        }

        // Deshabilitar botón
        const btn = document.getElementById('run-tests-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Ejecutando...';

        // Mostrar panel de resultados
        const resultsPanel = document.getElementById('results-panel');
        resultsPanel.style.display = 'block';

        const resultsContent = document.getElementById('results-content');
        resultsContent.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Ejecutando tests...</div>';

        try {
            // Llamar al backend para ejecutar tests
            const response = await fetch('/api/testing/run-e2e-advanced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ selectedTests })
            });

            const results = await response.json();

            // Renderizar resultados
            this.renderResults(results);

        } catch (err) {
            resultsContent.innerHTML = `
                <div style="color: #e74c3c; padding: 20px;">
                    ❌ Error ejecutando tests: ${err.message}
                </div>
            `;
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 Ejecutar Tests Seleccionados';
        }
    },

    /**
     * Renderizar resultados
     */
    renderResults(results) {
        const resultsContent = document.getElementById('results-content');

        if (!results.success) {
            resultsContent.innerHTML = `
                <div style="background: #ffe6e6; border: 2px solid #e74c3c; border-radius: 10px; padding: 20px;">
                    <h4 style="color: #e74c3c; margin: 0 0 10px 0;">❌ Error en la Ejecución</h4>
                    <p style="margin: 0; color: #333;">${results.error || 'Error desconocido'}</p>
                </div>
            `;
            return;
        }

        // Actualizar stats en el header
        const stats = document.querySelectorAll('.e2e-control-container > div:nth-child(2) > div');
        if (stats[1]) stats[1].querySelector('div').textContent = results.summary.passed;
        if (stats[2]) stats[2].querySelector('div').textContent = results.summary.failed;

        // Renderizar resultados completos
        let html = '';

        // 1. SUMMARY CARDS
        html += `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 48px; font-weight: bold;">${results.summary.total}</div>
                    <div style="opacity: 0.9;">Tests Ejecutados</div>
                </div>
                <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 48px; font-weight: bold;">${results.summary.passed}</div>
                    <div style="opacity: 0.9;">✅ Pasados</div>
                </div>
                <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 48px; font-weight: bold;">${results.summary.failed}</div>
                    <div style="opacity: 0.9;">❌ Fallados</div>
                </div>
                <div style="background: linear-gradient(135deg, #f39c12 0%, #d68910 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 48px; font-weight: bold;">${results.summary.warnings || 0}</div>
                    <div style="opacity: 0.9;">⚠️ Warnings</div>
                </div>
            </div>
        `;

        // 2. BRAIN SUGGESTIONS (si hay failures)
        if (results.brainSuggestions && results.brainSuggestions.length > 0) {
            html += `
                <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #856404; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 32px;">🧠</span>
                        Sugerencias del Brain Orquestador
                    </h3>
                    <div style="display: grid; gap: 15px;">
            `;

            results.brainSuggestions.forEach((suggestion, index) => {
                const severityColors = {
                    CRITICAL: '#e74c3c',
                    HIGH: '#f39c12',
                    MEDIUM: '#3498db',
                    LOW: '#95a5a6'
                };

                html += `
                    <div style="background: white; border-left: 6px solid ${severityColors[suggestion.severity]}; padding: 20px; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                            <div>
                                <span style="background: ${severityColors[suggestion.severity]}; color: white; padding: 4px 12px; border-radius: 5px; font-weight: bold; font-size: 12px;">
                                    ${suggestion.severity}
                                </span>
                                <span style="margin-left: 10px; color: #7f8c8d; font-size: 14px;">
                                    ${suggestion.occurrences} ocurrencia${suggestion.occurrences > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div style="color: #7f8c8d; font-size: 14px;">
                                ${suggestion.type}
                            </div>
                        </div>

                        <div style="color: #2c3e50; font-weight: bold; margin-bottom: 10px;">
                            📋 ${suggestion.pattern}
                        </div>

                        <div style="color: #34495e; margin-bottom: 15px;">
                            💡 <strong>Recomendación:</strong> ${suggestion.recommendation}
                        </div>

                        ${suggestion.fixes && suggestion.fixes.length > 0 ? `
                            <div style="background: #ecf0f1; padding: 15px; border-radius: 5px; margin-top: 10px;">
                                <div style="font-weight: bold; margin-bottom: 10px; color: #2c3e50;">
                                    🔧 Fixes Sugeridos:
                                </div>
                                ${suggestion.fixes.map(fix => `
                                    <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                                        <div style="color: #7f8c8d; font-size: 12px;">
                                            Estrategia: <strong>${fix.strategy}</strong>
                                            ${fix.confidence ? `(Confianza: ${Math.round(fix.confidence * 100)}%)` : ''}
                                        </div>
                                        ${fix.code ? `
                                            <pre style="background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 5px; margin-top: 5px; overflow-x: auto; font-size: 12px;">${fix.code}</pre>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${suggestion.examples && suggestion.examples.length > 0 ? `
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #7f8c8d; font-size: 14px;">
                                    Ver ejemplos (${suggestion.examples.length})
                                </summary>
                                <div style="margin-top: 10px; padding-left: 20px;">
                                    ${suggestion.examples.map(ex => `
                                        <div style="margin-bottom: 5px; padding: 8px; background: #f8f9fa; border-radius: 5px;">
                                            <div style="font-size: 12px; color: #666;">Test: ${ex.test}</div>
                                            <div style="font-size: 12px; color: #e74c3c; margin-top: 3px;">${ex.message}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        ` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // 3. DETAILED TEST RESULTS
        if (results.results && results.results.details && results.results.details.length > 0) {
            html += `
                <div style="background: white; border-radius: 10px; padding: 25px;">
                    <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
                        📊 Resultados Detallados de Tests
                    </h3>
                    <div style="display: grid; gap: 10px;">
            `;

            results.results.details.forEach(test => {
                const statusIcon = test.status === 'passed' ? '✅' : '❌';
                const statusColor = test.status === 'passed' ? '#2ecc71' : '#e74c3c';
                const bgColor = test.status === 'passed' ? '#eafaf1' : '#fadbd8';

                html += `
                    <div style="background: ${bgColor}; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                                <span style="font-size: 20px;">${statusIcon}</span>
                                <span style="font-weight: bold; color: #2c3e50;">${test.name}</span>
                            </div>
                            <div style="color: #7f8c8d; font-size: 14px;">
                                ${test.duration ? `${test.duration}ms` : ''}
                            </div>
                        </div>
                        ${test.error ? `
                            <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 5px;">
                                <div style="font-family: monospace; font-size: 12px; color: #721c24;">
                                    ${test.error}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // 4. AUDIT LOGS (si hay)
        if (results.auditLogs && results.auditLogs.length > 0) {
            html += `
                <details style="margin-top: 20px;">
                    <summary style="cursor: pointer; background: white; padding: 15px; border-radius: 10px; font-weight: bold; color: #2c3e50;">
                        📜 Audit Logs del Brain (${results.auditLogs.length})
                    </summary>
                    <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 10px;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #ecf0f1; text-align: left;">
                                        <th style="padding: 10px; border: 1px solid #ddd;">Test</th>
                                        <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
                                        <th style="padding: 10px; border: 1px solid #ddd;">Duration</th>
                                        <th style="padding: 10px; border: 1px solid #ddd;">Error</th>
                                        <th style="padding: 10px; border: 1px solid #ddd;">Fix Strategy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.auditLogs.map(log => `
                                        <tr>
                                            <td style="padding: 10px; border: 1px solid #ddd;">${log.test_name || 'N/A'}</td>
                                            <td style="padding: 10px; border: 1px solid #ddd;">
                                                <span style="background: ${log.status === 'passed' ? '#2ecc71' : '#e74c3c'}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">
                                                    ${log.status}
                                                </span>
                                            </td>
                                            <td style="padding: 10px; border: 1px solid #ddd;">${log.duration_ms || 0}ms</td>
                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px; color: #666;">
                                                ${log.error_message || '-'}
                                            </td>
                                            <td style="padding: 10px; border: 1px solid #ddd; font-size: 12px; color: #666;">
                                                ${log.fix_strategy || '-'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>
            `;
        }

        // 5. EXECUTION INFO
        html += `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; color: #7f8c8d; font-size: 14px;">
                Execution ID: <code>${results.execution_id}</code> |
                Duración total: <strong>${results.duration_ms}ms</strong> |
                Completado: ${new Date().toLocaleString('es-AR')}
            </div>
        `;

        resultsContent.innerHTML = html;
    }
};

// Exportar para uso en panel-empresa.html
if (typeof module !== 'undefined' && module.exports) {
    module.exports = E2ETestingControl;
}
