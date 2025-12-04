/**
 * positions-management.js
 * CRUD completo para Cargos/Posiciones Organizacionales
 *
 * FUENTES ÚNICAS DE VERDAD (NO DUPLICAR):
 * - Departamentos: GET /api/v1/departments
 * - Sucursales: GET /api/payroll/branches
 * - Categorías Salariales: GET /api/payroll/categories
 * - Templates de Liquidación: GET /api/payroll/templates
 * - Templates de Recibo: GET /api/payroll/payslip-templates
 * - Cargos (jerarquía): GET /api/payroll/positions
 */

window.PositionsManagement = {
    // Estado del módulo
    state: {
        positions: [],
        departments: [],
        branches: [],
        salaryCategories: [],
        payrollTemplates: [],
        payslipTemplates: [],
        currentPosition: null,
        isEditing: false
    },

    // Inicializar módulo
    async init(containerId = 'positions-container') {
        console.log('🏢 [PositionsManagement] Inicializando...');

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Container no encontrado:', containerId);
            return;
        }

        // Renderizar estructura base
        container.innerHTML = this.renderLayout();

        // Cargar datos iniciales en paralelo
        await this.loadAllData();

        // Configurar eventos
        this.setupEventListeners();

        console.log('✅ [PositionsManagement] Inicializado');
    },

    // Cargar todos los datos necesarios
    async loadAllData() {
        try {
            this.showLoading(true);

            // Cargar en paralelo desde las FUENTES ÚNICAS
            const [positions, departments, branches, categories, payrollTpls, payslipTpls] = await Promise.all([
                this.fetchAPI('/api/payroll/positions'),
                this.fetchAPI('/api/v1/departments'),
                this.fetchAPI('/api/payroll/branches'),
                this.fetchAPI('/api/payroll/categories'),
                this.fetchAPI('/api/payroll/templates'),
                this.fetchAPI('/api/payroll/payslip-templates')
            ]);

            this.state.positions = positions || [];
            this.state.departments = departments || [];
            this.state.branches = branches || [];
            this.state.salaryCategories = categories || [];
            this.state.payrollTemplates = payrollTpls || [];
            this.state.payslipTemplates = payslipTpls || [];

            console.log('📊 Datos cargados:', {
                positions: this.state.positions.length,
                departments: this.state.departments.length,
                branches: this.state.branches.length,
                salaryCategories: this.state.salaryCategories.length,
                payrollTemplates: this.state.payrollTemplates.length,
                payslipTemplates: this.state.payslipTemplates.length
            });

            // Renderizar tabla
            this.renderPositionsTable();

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showError('Error al cargar los datos');
        } finally {
            this.showLoading(false);
        }
    },

    // Fetch genérico con manejo de errores
    async fetchAPI(endpoint) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ API ${endpoint} respondió ${response.status}`);
                return [];
            }

            const data = await response.json();

            // Manejar errores de la API graciosamente
            if (data.success === false) {
                console.warn(`⚠️ API ${endpoint}: ${data.error}`);
                return [];
            }

            return data.data || data || [];
        } catch (error) {
            console.error(`❌ Error en ${endpoint}:`, error);
            return [];
        }
    },

    // Renderizar layout principal
    renderLayout() {
        return `
            <div class="positions-management">
                <!-- Header -->
                <div class="pm-header">
                    <div class="pm-title">
                        <i class="bi bi-diagram-3"></i>
                        <h2>Gestión de Cargos</h2>
                        <span class="pm-badge" id="pm-total-count">0 cargos</span>
                    </div>
                    <div class="pm-actions">
                        <button class="pm-btn pm-btn-secondary" onclick="PositionsManagement.loadAllData()">
                            <i class="bi bi-arrow-clockwise"></i> Actualizar
                        </button>
                        <button class="pm-btn pm-btn-primary" onclick="PositionsManagement.openModal()">
                            <i class="bi bi-plus-lg"></i> Nuevo Cargo
                        </button>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="pm-filters">
                    <div class="pm-search">
                        <i class="bi bi-search"></i>
                        <input type="text" id="pm-search-input" placeholder="Buscar por nombre o código..."
                               onkeyup="PositionsManagement.filterPositions()">
                    </div>
                    <select id="pm-filter-department" onchange="PositionsManagement.filterPositions()">
                        <option value="">Todos los departamentos</option>
                    </select>
                    <select id="pm-filter-level" onchange="PositionsManagement.filterPositions()">
                        <option value="">Todos los niveles</option>
                        <option value="1">Nivel 1 - Operativo</option>
                        <option value="2">Nivel 2 - Técnico</option>
                        <option value="3">Nivel 3 - Supervisor</option>
                        <option value="4">Nivel 4 - Gerente</option>
                        <option value="5">Nivel 5 - Director</option>
                    </select>
                </div>

                <!-- Loading -->
                <div class="pm-loading" id="pm-loading" style="display:none;">
                    <div class="pm-spinner"></div>
                    <span>Cargando...</span>
                </div>

                <!-- Tabla -->
                <div class="pm-table-container">
                    <table class="pm-table" id="pm-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre del Cargo</th>
                                <th>Nivel</th>
                                <th>Departamento</th>
                                <th>Template Liquidación</th>
                                <th>Template Recibo</th>
                                <th>Empleados</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="pm-table-body">
                        </tbody>
                    </table>
                </div>

                <!-- Empty state -->
                <div class="pm-empty" id="pm-empty" style="display:none;">
                    <i class="bi bi-inbox"></i>
                    <h3>No hay cargos configurados</h3>
                    <p>Crea tu primer cargo para empezar a organizar la estructura</p>
                    <button class="pm-btn pm-btn-primary" onclick="PositionsManagement.openModal()">
                        <i class="bi bi-plus-lg"></i> Crear Cargo
                    </button>
                </div>
            </div>

            <!-- Modal -->
            <div class="pm-modal-overlay" id="pm-modal" style="display:none;">
                <div class="pm-modal">
                    <div class="pm-modal-header">
                        <h3 id="pm-modal-title">Nuevo Cargo</h3>
                        <button class="pm-modal-close" onclick="PositionsManagement.closeModal()">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="pm-modal-body">
                        <form id="pm-form">
                            <input type="hidden" id="pm-id">

                            <!-- Información Básica -->
                            <div class="pm-form-section">
                                <h4><i class="bi bi-info-circle"></i> Información Básica</h4>
                                <div class="pm-form-row">
                                    <div class="pm-form-group">
                                        <label for="pm-code">Código <span class="required">*</span></label>
                                        <input type="text" id="pm-code" required placeholder="Ej: GER-001" maxlength="30">
                                        <small>Identificador único del cargo</small>
                                    </div>
                                    <div class="pm-form-group">
                                        <label for="pm-name">Nombre del Cargo <span class="required">*</span></label>
                                        <input type="text" id="pm-name" required placeholder="Ej: Gerente de Operaciones" maxlength="100">
                                    </div>
                                </div>
                                <div class="pm-form-group">
                                    <label for="pm-description">Descripción</label>
                                    <textarea id="pm-description" rows="2" placeholder="Descripción de las responsabilidades..."></textarea>
                                </div>
                            </div>

                            <!-- Jerarquía -->
                            <div class="pm-form-section">
                                <h4><i class="bi bi-diagram-2"></i> Jerarquía Organizacional</h4>
                                <div class="pm-form-row">
                                    <div class="pm-form-group">
                                        <label for="pm-level">Nivel Jerárquico</label>
                                        <select id="pm-level">
                                            <option value="1">1 - Operativo</option>
                                            <option value="2">2 - Técnico/Analista</option>
                                            <option value="3">3 - Supervisor/Jefe</option>
                                            <option value="4">4 - Gerente</option>
                                            <option value="5">5 - Director/Ejecutivo</option>
                                        </select>
                                    </div>
                                    <div class="pm-form-group">
                                        <label for="pm-parent">Cargo Superior (Reporta a)</label>
                                        <select id="pm-parent">
                                            <option value="">-- Sin cargo superior --</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Asignaciones Organizacionales -->
                            <div class="pm-form-section">
                                <h4><i class="bi bi-building"></i> Asignaciones Organizacionales</h4>
                                <div class="pm-form-row">
                                    <div class="pm-form-group">
                                        <label for="pm-department">Departamento</label>
                                        <select id="pm-department">
                                            <option value="">-- Seleccionar --</option>
                                        </select>
                                        <small>Fuente: /api/v1/departments</small>
                                    </div>
                                    <div class="pm-form-group">
                                        <label for="pm-salary-category">Categoría Salarial</label>
                                        <select id="pm-salary-category">
                                            <option value="">-- Seleccionar --</option>
                                        </select>
                                        <small>Fuente: /api/payroll/categories</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Templates de Nómina -->
                            <div class="pm-form-section">
                                <h4><i class="bi bi-file-earmark-text"></i> Templates de Nómina</h4>
                                <div class="pm-info-box">
                                    <i class="bi bi-info-circle"></i>
                                    <span>Estos templates determinan cómo se calculan y visualizan los recibos de sueldo para empleados con este cargo.</span>
                                </div>
                                <div class="pm-form-row">
                                    <div class="pm-form-group">
                                        <label for="pm-payroll-template">
                                            Template de Liquidación
                                            <span class="pm-tooltip" title="Define los conceptos y fórmulas de cálculo">?</span>
                                        </label>
                                        <select id="pm-payroll-template">
                                            <option value="">-- Seleccionar --</option>
                                        </select>
                                        <small>Fuente: /api/payroll/templates</small>
                                    </div>
                                    <div class="pm-form-group">
                                        <label for="pm-payslip-template">
                                            Template de Recibo
                                            <span class="pm-tooltip" title="Define el diseño visual del PDF">?</span>
                                        </label>
                                        <select id="pm-payslip-template">
                                            <option value="">-- Seleccionar --</option>
                                        </select>
                                        <small>Fuente: /api/payroll/payslip-templates</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Estado -->
                            <div class="pm-form-section">
                                <div class="pm-form-row">
                                    <div class="pm-form-group pm-checkbox-group">
                                        <label class="pm-checkbox">
                                            <input type="checkbox" id="pm-active" checked>
                                            <span class="pm-checkmark"></span>
                                            Cargo Activo
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="pm-modal-footer">
                        <button class="pm-btn pm-btn-secondary" onclick="PositionsManagement.closeModal()">
                            Cancelar
                        </button>
                        <button class="pm-btn pm-btn-primary" onclick="PositionsManagement.savePosition()">
                            <i class="bi bi-check-lg"></i> <span id="pm-save-text">Guardar</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Confirmación Eliminar -->
            <div class="pm-modal-overlay" id="pm-delete-modal" style="display:none;">
                <div class="pm-modal pm-modal-sm">
                    <div class="pm-modal-header pm-modal-header-danger">
                        <h3><i class="bi bi-exclamation-triangle"></i> Confirmar Eliminación</h3>
                        <button class="pm-modal-close" onclick="PositionsManagement.closeDeleteModal()">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div class="pm-modal-body">
                        <p>¿Estás seguro de que deseas eliminar el cargo <strong id="pm-delete-name"></strong>?</p>
                        <p class="pm-warning" id="pm-delete-warning" style="display:none;">
                            <i class="bi bi-exclamation-circle"></i>
                            Este cargo tiene <span id="pm-delete-employee-count">0</span> empleados asignados.
                            Deberás reasignarlos antes de eliminar.
                        </p>
                    </div>
                    <div class="pm-modal-footer">
                        <button class="pm-btn pm-btn-secondary" onclick="PositionsManagement.closeDeleteModal()">
                            Cancelar
                        </button>
                        <button class="pm-btn pm-btn-danger" id="pm-confirm-delete-btn" onclick="PositionsManagement.confirmDelete()">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>

            <style>
                /* === Variables === */
                .positions-management {
                    --pm-primary: #3b82f6;
                    --pm-primary-dark: #2563eb;
                    --pm-success: #10b981;
                    --pm-warning: #f59e0b;
                    --pm-danger: #ef4444;
                    --pm-gray-50: #f9fafb;
                    --pm-gray-100: #f3f4f6;
                    --pm-gray-200: #e5e7eb;
                    --pm-gray-300: #d1d5db;
                    --pm-gray-400: #9ca3af;
                    --pm-gray-500: #6b7280;
                    --pm-gray-600: #4b5563;
                    --pm-gray-700: #374151;
                    --pm-gray-800: #1f2937;
                    --pm-gray-900: #111827;
                    --pm-radius: 8px;
                    --pm-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    --pm-shadow-lg: 0 10px 25px rgba(0,0,0,0.15);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                /* === Header === */
                .pm-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--pm-gray-200);
                }
                .pm-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .pm-title i {
                    font-size: 28px;
                    color: var(--pm-primary);
                }
                .pm-title h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--pm-gray-900);
                }
                .pm-badge {
                    background: var(--pm-gray-100);
                    color: var(--pm-gray-600);
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 500;
                }
                .pm-actions {
                    display: flex;
                    gap: 12px;
                }

                /* === Buttons === */
                .pm-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border: none;
                    border-radius: var(--pm-radius);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .pm-btn-primary {
                    background: var(--pm-primary);
                    color: white;
                }
                .pm-btn-primary:hover {
                    background: var(--pm-primary-dark);
                }
                .pm-btn-secondary {
                    background: var(--pm-gray-100);
                    color: var(--pm-gray-700);
                }
                .pm-btn-secondary:hover {
                    background: var(--pm-gray-200);
                }
                .pm-btn-danger {
                    background: var(--pm-danger);
                    color: white;
                }
                .pm-btn-danger:hover {
                    background: #dc2626;
                }
                .pm-btn-sm {
                    padding: 6px 12px;
                    font-size: 13px;
                }
                .pm-btn-icon {
                    padding: 8px;
                    min-width: 36px;
                    justify-content: center;
                }

                /* === Filters === */
                .pm-filters {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .pm-search {
                    position: relative;
                    flex: 1;
                    min-width: 250px;
                }
                .pm-search i {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--pm-gray-400);
                }
                .pm-search input {
                    width: 100%;
                    padding: 10px 12px 10px 40px;
                    border: 1px solid var(--pm-gray-300);
                    border-radius: var(--pm-radius);
                    font-size: 14px;
                }
                .pm-search input:focus {
                    outline: none;
                    border-color: var(--pm-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .pm-filters select {
                    padding: 10px 36px 10px 12px;
                    border: 1px solid var(--pm-gray-300);
                    border-radius: var(--pm-radius);
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                    min-width: 180px;
                }
                .pm-filters select:focus {
                    outline: none;
                    border-color: var(--pm-primary);
                }

                /* === Loading === */
                .pm-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 40px;
                    color: var(--pm-gray-500);
                }
                .pm-spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid var(--pm-gray-200);
                    border-top-color: var(--pm-primary);
                    border-radius: 50%;
                    animation: pm-spin 0.8s linear infinite;
                }
                @keyframes pm-spin {
                    to { transform: rotate(360deg); }
                }

                /* === Table === */
                .pm-table-container {
                    overflow-x: auto;
                    border-radius: var(--pm-radius);
                    border: 1px solid var(--pm-gray-200);
                }
                .pm-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 14px;
                }
                .pm-table th {
                    background: var(--pm-gray-50);
                    padding: 12px 16px;
                    text-align: left;
                    font-weight: 600;
                    color: var(--pm-gray-700);
                    border-bottom: 1px solid var(--pm-gray-200);
                    white-space: nowrap;
                }
                .pm-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--pm-gray-100);
                    color: var(--pm-gray-600);
                }
                .pm-table tbody tr:hover {
                    background: var(--pm-gray-50);
                }
                .pm-table tbody tr:last-child td {
                    border-bottom: none;
                }
                .pm-code {
                    font-family: 'Monaco', 'Consolas', monospace;
                    background: var(--pm-gray-100);
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    color: var(--pm-gray-700);
                }
                .pm-name {
                    font-weight: 500;
                    color: var(--pm-gray-900);
                }
                .pm-level-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .pm-level-1 { background: #dbeafe; color: #1e40af; }
                .pm-level-2 { background: #d1fae5; color: #065f46; }
                .pm-level-3 { background: #fef3c7; color: #92400e; }
                .pm-level-4 { background: #fce7f3; color: #9d174d; }
                .pm-level-5 { background: #ede9fe; color: #5b21b6; }
                .pm-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .pm-status-active { background: #d1fae5; color: #065f46; }
                .pm-status-inactive { background: var(--pm-gray-100); color: var(--pm-gray-500); }
                .pm-employee-count {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    color: var(--pm-gray-600);
                }
                .pm-employee-count i {
                    color: var(--pm-gray-400);
                }
                .pm-template-name {
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .pm-template-none {
                    color: var(--pm-gray-400);
                    font-style: italic;
                }
                .pm-actions-cell {
                    display: flex;
                    gap: 8px;
                }

                /* === Empty State === */
                .pm-empty {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--pm-gray-500);
                }
                .pm-empty i {
                    font-size: 48px;
                    color: var(--pm-gray-300);
                    margin-bottom: 16px;
                }
                .pm-empty h3 {
                    margin: 0 0 8px;
                    color: var(--pm-gray-700);
                }
                .pm-empty p {
                    margin: 0 0 20px;
                }

                /* === Modal === */
                .pm-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                }
                .pm-modal {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--pm-shadow-lg);
                }
                .pm-modal-sm {
                    max-width: 450px;
                }
                .pm-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--pm-gray-200);
                }
                .pm-modal-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--pm-gray-900);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pm-modal-header-danger h3 {
                    color: var(--pm-danger);
                }
                .pm-modal-close {
                    background: none;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    color: var(--pm-gray-400);
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                .pm-modal-close:hover {
                    background: var(--pm-gray-100);
                    color: var(--pm-gray-600);
                }
                .pm-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }
                .pm-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    padding: 16px 24px;
                    border-top: 1px solid var(--pm-gray-200);
                    background: var(--pm-gray-50);
                    border-radius: 0 0 12px 12px;
                }

                /* === Form === */
                .pm-form-section {
                    margin-bottom: 24px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid var(--pm-gray-100);
                }
                .pm-form-section:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }
                .pm-form-section h4 {
                    margin: 0 0 16px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--pm-gray-700);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pm-form-section h4 i {
                    color: var(--pm-primary);
                }
                .pm-form-row {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                @media (max-width: 600px) {
                    .pm-form-row {
                        grid-template-columns: 1fr;
                    }
                }
                .pm-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .pm-form-group label {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--pm-gray-700);
                }
                .pm-form-group .required {
                    color: var(--pm-danger);
                }
                .pm-form-group input,
                .pm-form-group select,
                .pm-form-group textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--pm-gray-300);
                    border-radius: var(--pm-radius);
                    font-size: 14px;
                    transition: all 0.2s;
                }
                .pm-form-group input:focus,
                .pm-form-group select:focus,
                .pm-form-group textarea:focus {
                    outline: none;
                    border-color: var(--pm-primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .pm-form-group small {
                    font-size: 11px;
                    color: var(--pm-gray-400);
                }
                .pm-info-box {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 12px;
                    background: #eff6ff;
                    border-radius: var(--pm-radius);
                    margin-bottom: 16px;
                    font-size: 13px;
                    color: #1e40af;
                }
                .pm-info-box i {
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .pm-checkbox-group {
                    flex-direction: row;
                    align-items: center;
                }
                .pm-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--pm-gray-700);
                }
                .pm-checkbox input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                .pm-tooltip {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    background: var(--pm-gray-200);
                    color: var(--pm-gray-600);
                    border-radius: 50%;
                    font-size: 11px;
                    cursor: help;
                    margin-left: 4px;
                }
                .pm-warning {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 12px;
                    background: #fef3c7;
                    border-radius: var(--pm-radius);
                    color: #92400e;
                    font-size: 13px;
                    margin-top: 16px;
                }
                .pm-warning i {
                    flex-shrink: 0;
                    margin-top: 2px;
                }
            </style>
        `;
    },

    // Renderizar tabla de posiciones
    renderPositionsTable() {
        const tbody = document.getElementById('pm-table-body');
        const empty = document.getElementById('pm-empty');
        const tableContainer = document.querySelector('.pm-table-container');
        const totalCount = document.getElementById('pm-total-count');

        // Actualizar contador
        totalCount.textContent = `${this.state.positions.length} cargos`;

        // Poblar filtro de departamentos
        this.populateDepartmentFilter();

        if (this.state.positions.length === 0) {
            tableContainer.style.display = 'none';
            empty.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        empty.style.display = 'none';

        tbody.innerHTML = this.state.positions.map(pos => this.renderPositionRow(pos)).join('');
    },

    // Renderizar fila de posición
    renderPositionRow(pos) {
        const levelLabels = {
            1: 'Operativo',
            2: 'Técnico',
            3: 'Supervisor',
            4: 'Gerente',
            5: 'Director'
        };

        const department = this.state.departments.find(d => d.id === pos.department_id);
        const payrollTpl = pos.payrollTemplate || this.state.payrollTemplates.find(t => t.id === pos.payroll_template_id);
        const payslipTpl = pos.payslipTemplate || this.state.payslipTemplates.find(t => t.id === pos.payslip_template_id);

        return `
            <tr data-id="${pos.id}">
                <td><span class="pm-code">${pos.position_code}</span></td>
                <td>
                    <span class="pm-name">${pos.position_name}</span>
                    ${pos.description ? `<br><small style="color:var(--pm-gray-400)">${pos.description.substring(0, 50)}${pos.description.length > 50 ? '...' : ''}</small>` : ''}
                </td>
                <td>
                    <span class="pm-level-badge pm-level-${pos.level_order || 1}">
                        ${pos.level_order || 1} - ${levelLabels[pos.level_order] || 'Operativo'}
                    </span>
                </td>
                <td>${department ? department.name : '<span class="pm-template-none">--</span>'}</td>
                <td>
                    <span class="pm-template-name" title="${payrollTpl ? payrollTpl.template_name : ''}">
                        ${payrollTpl ? payrollTpl.template_name : '<span class="pm-template-none">Sin asignar</span>'}
                    </span>
                </td>
                <td>
                    <span class="pm-template-name" title="${payslipTpl ? payslipTpl.template_name : ''}">
                        ${payslipTpl ? payslipTpl.template_name : '<span class="pm-template-none">Sin asignar</span>'}
                    </span>
                </td>
                <td>
                    <span class="pm-employee-count">
                        <i class="bi bi-people"></i>
                        ${pos.employee_count || 0}
                    </span>
                </td>
                <td>
                    <span class="pm-status ${pos.is_active !== false ? 'pm-status-active' : 'pm-status-inactive'}">
                        <i class="bi bi-circle-fill" style="font-size:6px;"></i>
                        ${pos.is_active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="pm-actions-cell">
                        <button class="pm-btn pm-btn-secondary pm-btn-sm pm-btn-icon"
                                onclick="PositionsManagement.openModal(${pos.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="pm-btn pm-btn-secondary pm-btn-sm pm-btn-icon"
                                onclick="PositionsManagement.openDeleteModal(${pos.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // Poblar filtro de departamentos
    populateDepartmentFilter() {
        const select = document.getElementById('pm-filter-department');
        select.innerHTML = '<option value="">Todos los departamentos</option>' +
            this.state.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    },

    // Filtrar posiciones
    filterPositions() {
        const search = document.getElementById('pm-search-input').value.toLowerCase();
        const deptId = document.getElementById('pm-filter-department').value;
        const level = document.getElementById('pm-filter-level').value;

        let filtered = this.state.positions;

        if (search) {
            filtered = filtered.filter(p =>
                p.position_name.toLowerCase().includes(search) ||
                p.position_code.toLowerCase().includes(search) ||
                (p.description && p.description.toLowerCase().includes(search))
            );
        }

        if (deptId) {
            filtered = filtered.filter(p => p.department_id == deptId);
        }

        if (level) {
            filtered = filtered.filter(p => p.level_order == level);
        }

        const tbody = document.getElementById('pm-table-body');
        tbody.innerHTML = filtered.map(pos => this.renderPositionRow(pos)).join('');

        document.getElementById('pm-total-count').textContent = `${filtered.length} cargos`;
    },

    // Abrir modal (crear/editar)
    openModal(positionId = null) {
        const modal = document.getElementById('pm-modal');
        const title = document.getElementById('pm-modal-title');
        const saveText = document.getElementById('pm-save-text');

        // Poblar selectores con FUENTES ÚNICAS
        this.populateSelects();

        if (positionId) {
            this.state.isEditing = true;
            this.state.currentPosition = this.state.positions.find(p => p.id === positionId);
            title.textContent = 'Editar Cargo';
            saveText.textContent = 'Actualizar';
            this.populateForm(this.state.currentPosition);
        } else {
            this.state.isEditing = false;
            this.state.currentPosition = null;
            title.textContent = 'Nuevo Cargo';
            saveText.textContent = 'Guardar';
            this.clearForm();
        }

        modal.style.display = 'flex';
    },

    // Poblar selectores desde FUENTES ÚNICAS
    populateSelects() {
        // Departamentos
        const deptSelect = document.getElementById('pm-department');
        deptSelect.innerHTML = '<option value="">-- Seleccionar --</option>' +
            this.state.departments
                .filter(d => d.is_active !== false)
                .map(d => `<option value="${d.id}">${d.name}</option>`).join('');

        // Categorías Salariales
        const catSelect = document.getElementById('pm-salary-category');
        catSelect.innerHTML = '<option value="">-- Seleccionar --</option>' +
            this.state.salaryCategories
                .filter(c => c.is_active !== false)
                .map(c => `<option value="${c.category_id || c.id}">${c.category_name || c.name}</option>`).join('');

        // Templates de Liquidación
        const payrollSelect = document.getElementById('pm-payroll-template');
        payrollSelect.innerHTML = '<option value="">-- Seleccionar --</option>' +
            this.state.payrollTemplates
                .filter(t => t.is_active !== false)
                .map(t => `<option value="${t.id}">${t.template_name} (${t.template_code})</option>`).join('');

        // Templates de Recibo
        const payslipSelect = document.getElementById('pm-payslip-template');
        payslipSelect.innerHTML = '<option value="">-- Seleccionar --</option>' +
            this.state.payslipTemplates
                .filter(t => t.is_active !== false)
                .map(t => `<option value="${t.id}">${t.template_name} ${t.template_code ? `(${t.template_code})` : ''}</option>`).join('');

        // Cargos padres (para jerarquía)
        const parentSelect = document.getElementById('pm-parent');
        const currentId = this.state.currentPosition?.id;
        parentSelect.innerHTML = '<option value="">-- Sin cargo superior --</option>' +
            this.state.positions
                .filter(p => p.id !== currentId && p.is_active !== false)
                .map(p => `<option value="${p.id}">${p.position_name} (${p.position_code})</option>`).join('');
    },

    // Poblar formulario con datos
    populateForm(position) {
        document.getElementById('pm-id').value = position.id;
        document.getElementById('pm-code').value = position.position_code || '';
        document.getElementById('pm-name').value = position.position_name || '';
        document.getElementById('pm-description').value = position.description || '';
        document.getElementById('pm-level').value = position.level_order || 1;
        document.getElementById('pm-parent').value = position.parent_position_id || '';
        document.getElementById('pm-department').value = position.department_id || '';
        document.getElementById('pm-salary-category').value = position.salary_category_id || '';
        document.getElementById('pm-payroll-template').value = position.payroll_template_id || '';
        document.getElementById('pm-payslip-template').value = position.payslip_template_id || '';
        document.getElementById('pm-active').checked = position.is_active !== false;
    },

    // Limpiar formulario
    clearForm() {
        document.getElementById('pm-form').reset();
        document.getElementById('pm-id').value = '';
        document.getElementById('pm-active').checked = true;
        document.getElementById('pm-level').value = '1';
    },

    // Cerrar modal
    closeModal() {
        document.getElementById('pm-modal').style.display = 'none';
        this.state.currentPosition = null;
        this.state.isEditing = false;
    },

    // Guardar posición
    async savePosition() {
        const form = document.getElementById('pm-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = {
            position_code: document.getElementById('pm-code').value.trim(),
            position_name: document.getElementById('pm-name').value.trim(),
            description: document.getElementById('pm-description').value.trim() || null,
            level_order: parseInt(document.getElementById('pm-level').value),
            parent_position_id: document.getElementById('pm-parent').value || null,
            department_id: document.getElementById('pm-department').value || null,
            salary_category_id: document.getElementById('pm-salary-category').value || null,
            payroll_template_id: document.getElementById('pm-payroll-template').value || null,
            payslip_template_id: document.getElementById('pm-payslip-template').value || null,
            is_active: document.getElementById('pm-active').checked
        };

        try {
            const token = localStorage.getItem('token');
            const id = document.getElementById('pm-id').value;
            const url = id ? `/api/payroll/positions/${id}` : '/api/payroll/positions';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showToast(id ? 'Cargo actualizado correctamente' : 'Cargo creado correctamente', 'success');
                this.closeModal();
                await this.loadAllData();
            } else {
                this.showToast(result.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            console.error('Error guardando:', error);
            this.showToast('Error al guardar el cargo', 'error');
        }
    },

    // Abrir modal de eliminación - Ahora consulta impacto primero
    async openDeleteModal(positionId) {
        const position = this.state.positions.find(p => p.id === positionId);
        if (!position) return;

        this.state.currentPosition = position;
        this.state.deleteImpact = null;

        // Consultar impacto antes de mostrar modal
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/positions/${positionId}/impact`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                this.state.deleteImpact = result.data;
            }
        } catch (error) {
            console.error('Error consultando impacto:', error);
        }

        this.renderDeleteModal();
        document.getElementById('pm-delete-modal').style.display = 'flex';
    },

    // Renderizar modal de eliminación con opciones
    renderDeleteModal() {
        const modal = document.getElementById('pm-delete-modal');
        const position = this.state.currentPosition;
        const impact = this.state.deleteImpact?.impact || {};
        const alternatives = this.state.deleteImpact?.alternatives || [];

        const hasEmployees = impact.employees_count > 0;
        const hasChildren = impact.child_positions_count > 0;
        const hasDependencies = hasEmployees || hasChildren;

        let employeesList = '';
        if (hasEmployees) {
            employeesList = impact.employees.slice(0, 5).map(e =>
                `<li><i class="bi bi-person"></i> ${e.name} (${e.email})</li>`
            ).join('');
            if (impact.employees_count > 5) {
                employeesList += `<li class="pm-more">... y ${impact.employees_count - 5} más</li>`;
            }
        }

        let childrenList = '';
        if (hasChildren) {
            childrenList = impact.child_positions.map(p =>
                `<li><i class="bi bi-diagram-3"></i> ${p.name} (${p.code})</li>`
            ).join('');
        }

        let alternativesOptions = alternatives.map(p =>
            `<option value="${p.id}">${p.name} (${p.code}) - Nivel ${p.level}</option>`
        ).join('');

        modal.innerHTML = `
            <div class="pm-modal pm-modal-md">
                <div class="pm-modal-header ${hasDependencies ? 'pm-modal-header-warning' : 'pm-modal-header-danger'}">
                    <h3>
                        <i class="bi bi-${hasDependencies ? 'exclamation-triangle' : 'trash'}"></i>
                        ${hasDependencies ? 'Cargo con Dependencias' : 'Confirmar Eliminación'}
                    </h3>
                    <button class="pm-modal-close" onclick="PositionsManagement.closeDeleteModal()">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="pm-modal-body">
                    <p>Cargo: <strong>${position.position_name}</strong> (${position.position_code})</p>

                    ${hasDependencies ? `
                        <div class="pm-impact-section">
                            ${hasEmployees ? `
                                <div class="pm-impact-box pm-impact-employees">
                                    <h5><i class="bi bi-people"></i> ${impact.employees_count} Empleados Asignados</h5>
                                    <ul class="pm-impact-list">${employeesList}</ul>
                                </div>
                            ` : ''}

                            ${hasChildren ? `
                                <div class="pm-impact-box pm-impact-children">
                                    <h5><i class="bi bi-diagram-3"></i> ${impact.child_positions_count} Cargos Subordinados</h5>
                                    <ul class="pm-impact-list">${childrenList}</ul>
                                </div>
                            ` : ''}

                            <div class="pm-action-options">
                                <h5><i class="bi bi-arrow-right-circle"></i> ¿Qué desea hacer?</h5>

                                <div class="pm-option">
                                    <input type="radio" name="delete-action" id="action-reassign" value="reassign" checked>
                                    <label for="action-reassign">
                                        <strong>Reasignar a otro cargo</strong>
                                        <span>Los empleados y subordinados serán transferidos</span>
                                    </label>
                                </div>
                                <div class="pm-reassign-target" id="pm-reassign-target">
                                    <label>Cargo destino:</label>
                                    <select id="pm-target-position">
                                        <option value="">-- Seleccionar cargo destino --</option>
                                        ${alternativesOptions}
                                    </select>
                                    <label class="pm-checkbox-inline">
                                        <input type="checkbox" id="pm-include-subordinates" checked>
                                        Incluir cargos subordinados
                                    </label>
                                </div>

                                <div class="pm-option">
                                    <input type="radio" name="delete-action" id="action-force" value="force">
                                    <label for="action-force">
                                        <strong>Desvincular y eliminar</strong>
                                        <span>Empleados quedarán sin cargo asignado</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <p class="pm-delete-confirm-msg">
                            Este cargo no tiene empleados ni subordinados asignados.
                            ¿Está seguro de que desea eliminarlo?
                        </p>
                    `}
                </div>
                <div class="pm-modal-footer">
                    <button class="pm-btn pm-btn-secondary" onclick="PositionsManagement.closeDeleteModal()">
                        Cancelar
                    </button>
                    <button class="pm-btn pm-btn-danger" onclick="PositionsManagement.confirmDelete()">
                        <i class="bi bi-trash"></i> ${hasDependencies ? 'Proceder' : 'Eliminar'}
                    </button>
                </div>
            </div>

            <style>
                .pm-modal-md { max-width: 550px; }
                .pm-modal-header-warning h3 { color: #d97706; }
                .pm-impact-section { margin-top: 16px; }
                .pm-impact-box {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                }
                .pm-impact-box h5 {
                    margin: 0 0 8px;
                    font-size: 13px;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pm-impact-employees { border-left: 3px solid #3b82f6; }
                .pm-impact-children { border-left: 3px solid #8b5cf6; }
                .pm-impact-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    font-size: 13px;
                    color: #6b7280;
                }
                .pm-impact-list li {
                    padding: 4px 0;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .pm-impact-list .pm-more { font-style: italic; color: #9ca3af; }
                .pm-action-options {
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                }
                .pm-action-options h5 {
                    margin: 0 0 12px;
                    font-size: 14px;
                    color: #92400e;
                }
                .pm-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 10px;
                    border-radius: 6px;
                    margin-bottom: 8px;
                    cursor: pointer;
                }
                .pm-option:hover { background: rgba(255,255,255,0.5); }
                .pm-option input[type="radio"] { margin-top: 4px; }
                .pm-option label {
                    cursor: pointer;
                    flex: 1;
                }
                .pm-option label strong { display: block; color: #1f2937; }
                .pm-option label span { font-size: 12px; color: #6b7280; }
                .pm-reassign-target {
                    margin-left: 26px;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    margin-bottom: 8px;
                }
                .pm-reassign-target label {
                    display: block;
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 4px;
                }
                .pm-reassign-target select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    margin-bottom: 8px;
                }
                .pm-checkbox-inline {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    color: #4b5563;
                }
                .pm-delete-confirm-msg {
                    padding: 20px;
                    text-align: center;
                    color: #6b7280;
                }
            </style>
        `;

        // Configurar eventos de radio buttons
        setTimeout(() => {
            const radios = modal.querySelectorAll('input[name="delete-action"]');
            const targetDiv = document.getElementById('pm-reassign-target');
            radios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (targetDiv) {
                        targetDiv.style.display = radio.value === 'reassign' ? 'block' : 'none';
                    }
                });
            });
        }, 0);
    },

    // Cerrar modal de eliminación
    closeDeleteModal() {
        document.getElementById('pm-delete-modal').style.display = 'none';
        this.state.currentPosition = null;
        this.state.deleteImpact = null;
    },

    // Confirmar eliminación con opciones
    async confirmDelete() {
        if (!this.state.currentPosition) return;

        const token = localStorage.getItem('token');
        const positionId = this.state.currentPosition.id;
        const impact = this.state.deleteImpact?.impact || {};
        const hasDependencies = (impact.employees_count > 0) || (impact.child_positions_count > 0);

        try {
            if (hasDependencies) {
                const actionRadio = document.querySelector('input[name="delete-action"]:checked');
                const action = actionRadio ? actionRadio.value : 'reassign';

                if (action === 'reassign') {
                    // Reasignar primero
                    const targetId = document.getElementById('pm-target-position')?.value;
                    const includeSubordinates = document.getElementById('pm-include-subordinates')?.checked;

                    if (!targetId) {
                        this.showToast('Seleccione un cargo destino', 'error');
                        return;
                    }

                    const reassignResponse = await fetch(`/api/payroll/positions/${positionId}/reassign-all`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            target_position_id: parseInt(targetId),
                            include_subordinates: includeSubordinates
                        })
                    });

                    const reassignResult = await reassignResponse.json();

                    if (!reassignResult.success) {
                        this.showToast(reassignResult.error || 'Error en reasignación', 'error');
                        return;
                    }

                    this.showToast(`${reassignResult.data.employees_reassigned} empleados reasignados`, 'success');
                }

                // Ahora eliminar (con force si no reasignamos)
                const deleteUrl = action === 'force'
                    ? `/api/payroll/positions/${positionId}?force=true`
                    : `/api/payroll/positions/${positionId}`;

                const deleteResponse = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const deleteResult = await deleteResponse.json();

                if (deleteResult.success) {
                    this.showToast('Cargo eliminado correctamente', 'success');
                    this.closeDeleteModal();
                    await this.loadAllData();
                } else {
                    this.showToast(deleteResult.error || 'Error al eliminar', 'error');
                }
            } else {
                // Sin dependencias, eliminar directo
                const response = await fetch(`/api/payroll/positions/${positionId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const result = await response.json();

                if (result.success) {
                    this.showToast('Cargo eliminado correctamente', 'success');
                    this.closeDeleteModal();
                    await this.loadAllData();
                } else {
                    this.showToast(result.error || 'Error al eliminar', 'error');
                }
            }
        } catch (error) {
            console.error('Error en proceso de eliminación:', error);
            this.showToast('Error al procesar la solicitud', 'error');
        }
    },

    // Configurar eventos
    setupEventListeners() {
        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDeleteModal();
            }
        });

        // Cerrar modal clickeando fuera
        document.getElementById('pm-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('pm-modal-overlay')) {
                this.closeModal();
            }
        });

        document.getElementById('pm-delete-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('pm-modal-overlay')) {
                this.closeDeleteModal();
            }
        });
    },

    // Mostrar/ocultar loading
    showLoading(show) {
        const loading = document.getElementById('pm-loading');
        const tableContainer = document.querySelector('.pm-table-container');

        if (loading) loading.style.display = show ? 'flex' : 'none';
        if (tableContainer && show) tableContainer.style.display = 'none';
    },

    // Mostrar error
    showError(message) {
        const container = document.querySelector('.pm-table-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:var(--pm-danger);">
                    <i class="bi bi-exclamation-triangle" style="font-size:32px;"></i>
                    <p>${message}</p>
                    <button class="pm-btn pm-btn-primary" onclick="PositionsManagement.loadAllData()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    // Mostrar toast
    showToast(message, type = 'info') {
        // Crear toast si no existe
        let toast = document.getElementById('pm-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pm-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(toast);
        }

        // Estilo según tipo
        const styles = {
            success: { bg: '#10b981', icon: 'check-circle' },
            error: { bg: '#ef4444', icon: 'x-circle' },
            info: { bg: '#3b82f6', icon: 'info-circle' }
        };
        const style = styles[type] || styles.info;

        toast.style.background = style.bg;
        toast.style.color = 'white';
        toast.innerHTML = `<i class="bi bi-${style.icon}"></i> ${message}`;

        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);

        // Ocultar después de 3s
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
        }, 3000);
    }
};

// Auto-inicializar si hay contenedor
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('positions-container');
    if (container) {
        PositionsManagement.init('positions-container');
    }
});

console.log('📦 [PositionsManagement] Módulo cargado');
