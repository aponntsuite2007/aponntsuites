// Módulo de Liquidación de Sueldos y Jornales - Legislación Argentina
console.log('💰 [PAYROLL] Módulo de Liquidación v1.0 inicializado');

// Variables globales del módulo de liquidación
let payrollPeriods = [];
let employeePayrolls = [];
let salaryScales = [];
let collectiveAgreements = [];
let currentLegislation = {};
let taxRates = {};

// Función principal para mostrar el contenido del módulo
function showPayrollLiquidationContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="payroll-liquidation">
            <div class="card">
                <h2>💰 Liquidación de Sueldos y Jornales</h2>
                <p>Sistema completo de liquidación según legislación laboral argentina vigente.</p>
                
                <!-- Tabs de navegación Liquidación -->
                <div class="payroll-tabs" style="display: flex; gap: 10px; margin: 20px 0; border-bottom: 2px solid #e0e7ff; overflow-x: auto;">
                    <button class="payroll-tab-btn active" onclick="showPayrollTab('liquidation')" data-tab="liquidation">
                        💰 Liquidación
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('concepts')" data-tab="concepts">
                        📋 Conceptos
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('scales')" data-tab="scales">
                        📊 Escalas Salariales
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('agreements')" data-tab="agreements">
                        📄 Convenios
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('taxes')" data-tab="taxes">
                        🏛️ Cargas Sociales
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('reports')" data-tab="reports">
                        📊 Reportes
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('legislation')" data-tab="legislation">
                        ⚖️ Legislación
                    </button>
                    <button class="payroll-tab-btn" onclick="showPayrollTab('templates')" data-tab="templates">
                        📋 Plantillas RRHH
                    </button>
                </div>

                <!-- Contenido dinámico de liquidación -->
                <div id="payroll-content">
                    <!-- El contenido se cargará dinámicamente según la pestaña seleccionada -->
                </div>
            </div>
        </div>
    `;
    
    // Inicializar con la pestaña de liquidación
    setTimeout(() => {
        loadPayrollData();
        showPayrollTab('liquidation');
    }, 300);
}

// Función para cambiar entre pestañas
function showPayrollTab(tabName) {
    console.log(`💰 [PAYROLL] Cambiando a pestaña: ${tabName}`);
    
    // Actualizar botones de pestaña
    document.querySelectorAll('.payroll-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Cargar contenido de la pestaña
    const payrollContent = document.getElementById('payroll-content');
    if (!payrollContent) return;
    
    switch (tabName) {
        case 'liquidation':
            showLiquidationTab();
            break;
        case 'concepts':
            showConceptsTab();
            break;
        case 'scales':
            showScalesTab();
            break;
        case 'agreements':
            showAgreementsTab();
            break;
        case 'taxes':
            showTaxesTab();
            break;
        case 'reports':
            showPayrollReportsTab();
            break;
        case 'legislation':
            showPayrollLegislationTab();
            break;
        case 'templates':
            showPayrollTemplatesTab();
            break;
        default:
            payrollContent.innerHTML = '<div class="error">Pestaña no encontrada</div>';
    }
}

// Pestaña: Liquidación Principal
function showLiquidationTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="liquidation-section">
            <div class="section-header">
                <h3>💰 Proceso de Liquidación</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="startNewLiquidation()">🆕 Nueva Liquidación</button>
                    <button class="btn btn-success" onclick="calculateAllPayrolls()">⚡ Calcular Todo</button>
                    <button class="btn btn-warning" onclick="previewLiquidation()">👁️ Vista Previa</button>
                    <button class="btn btn-info" onclick="exportPayrollData()">📤 Exportar</button>
                </div>
            </div>
            
            <!-- Selector de período -->
            <div class="period-selection" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>📅 Período de Liquidación</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Mes:</label>
                        <select id="liquidation-month" style="width: 100%; padding: 8px; border-radius: 5px; border: none;">
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9" selected>Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Año:</label>
                        <select id="liquidation-year" style="width: 100%; padding: 8px; border-radius: 5px; border: none;">
                            <option value="2024" selected>2024</option>
                            <option value="2023">2023</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tipo:</label>
                        <select id="liquidation-type" style="width: 100%; padding: 8px; border-radius: 5px; border: none;">
                            <option value="monthly">Mensual</option>
                            <option value="biweekly">Quincenal</option>
                            <option value="annual-bonus">Aguinaldo</option>
                            <option value="vacation">Vacaciones</option>
                        </select>
                    </div>
                    <div>
                        <button class="btn btn-light" onclick="loadLiquidationPeriod()">🔄 Cargar Período</button>
                    </div>
                </div>
            </div>
            
            <!-- Estados de liquidación -->
            <div class="liquidation-status-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="status-card" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div class="status-icon" style="font-size: 2rem;">✅</div>
                    <div class="status-value" id="processed-count">--</div>
                    <div class="status-label">Procesados</div>
                </div>
                <div class="status-card" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div class="status-icon" style="font-size: 2rem;">⏳</div>
                    <div class="status-value" id="pending-count">--</div>
                    <div class="status-label">Pendientes</div>
                </div>
                <div class="status-card" style="background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div class="status-icon" style="font-size: 2rem;">❌</div>
                    <div class="status-value" id="errors-count">--</div>
                    <div class="status-label">Con Errores</div>
                </div>
                <div class="status-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                    <div class="status-icon" style="font-size: 2rem;">💰</div>
                    <div class="status-value" id="total-amount">--</div>
                    <div class="status-label">Importe Total</div>
                </div>
            </div>
            
            <!-- Lista de empleados para liquidar -->
            <div id="employees-liquidation-list">
                <!-- Se cargará dinámicamente -->
            </div>
            
        </div>
    `;
    
    loadEmployeesForLiquidation();
}

// Pestaña: Conceptos de Liquidación
function showConceptsTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="concepts-section">
            <div class="section-header">
                <h3>📋 Conceptos de Liquidación</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="addNewConcept()">➕ Nuevo Concepto</button>
                    <button class="btn btn-info" onclick="importStandardConcepts()">📥 Importar Estándar</button>
                    <button class="btn btn-warning" onclick="validateConcepts()">✅ Validar</button>
                </div>
            </div>
            
            <!-- Categorías de conceptos -->
            <div class="concepts-categories" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
                
                <!-- Haberes -->
                <div class="concept-category-card" style="background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>💰 Haberes (Remunerativos)</h4>
                    <div class="concept-list">
                        <div class="concept-item">✓ Sueldo Básico</div>
                        <div class="concept-item">✓ Antigüedad</div>
                        <div class="concept-item">✓ Horas Extras 50%</div>
                        <div class="concept-item">✓ Horas Extras 100%</div>
                        <div class="concept-item">✓ Plus por Turno</div>
                        <div class="concept-item">✓ Comisiones</div>
                        <div class="concept-item">✓ Presentismo</div>
                    </div>
                    <button class="btn btn-light btn-sm" onclick="manageConcepts('haberes')">⚙️ Gestionar</button>
                </div>
                
                <!-- No Remunerativos -->
                <div class="concept-category-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>🎯 No Remunerativos</h4>
                    <div class="concept-list">
                        <div class="concept-item">✓ Viáticos</div>
                        <div class="concept-item">✓ Reintegro Gastos</div>
                        <div class="concept-item">✓ Beneficios Sociales</div>
                        <div class="concept-item">✓ Capacitación</div>
                        <div class="concept-item">✓ Guardería</div>
                    </div>
                    <button class="btn btn-light btn-sm" onclick="manageConcepts('no-remunerativos')">⚙️ Gestionar</button>
                </div>
                
                <!-- Descuentos Legales -->
                <div class="concept-category-card" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>🏛️ Descuentos Legales</h4>
                    <div class="concept-list">
                        <div class="concept-item">✓ Aportes Jubilatorios (11%)</div>
                        <div class="concept-item">✓ Obra Social (3%)</div>
                        <div class="concept-item">✓ INSSJP (3%)</div>
                        <div class="concept-item">✓ Sindicato</div>
                        <div class="concept-item">✓ Ganancias</div>
                    </div>
                    <button class="btn btn-light btn-sm" onclick="manageConcepts('descuentos-legales')">⚙️ Gestionar</button>
                </div>
                
                <!-- Otros Descuentos -->
                <div class="concept-category-card" style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; border-radius: 15px; padding: 20px;">
                    <h4>📉 Otros Descuentos</h4>
                    <div class="concept-list">
                        <div class="concept-item">✓ Préstamos</div>
                        <div class="concept-item">✓ Adelantos</div>
                        <div class="concept-item">✓ Embargos</div>
                        <div class="concept-item">✓ Cuota Sindical</div>
                        <div class="concept-item">✓ Seguro de Vida</div>
                    </div>
                    <button class="btn btn-light btn-sm" onclick="manageConcepts('otros-descuentos')">⚙️ Gestionar</button>
                </div>
                
            </div>
            
            <!-- Calculadora de conceptos -->
            <div class="concept-calculator" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>🧮 Calculadora de Conceptos</h4>
                <div class="calculator-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <label>💰 Sueldo Básico:</label>
                        <input type="number" id="basic-salary" placeholder="0.00" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label>📅 Años Antigüedad:</label>
                        <input type="number" id="years-seniority" placeholder="0" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label>⏰ Horas Extras 50%:</label>
                        <input type="number" id="overtime-50" placeholder="0" style="width: 100%; padding: 8px;">
                    </div>
                    <div>
                        <label>⏰ Horas Extras 100%:</label>
                        <input type="number" id="overtime-100" placeholder="0" style="width: 100%; padding: 8px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <button class="btn btn-primary" onclick="calculateConcepts()">🧮 Calcular</button>
                        <button class="btn btn-info" onclick="showCalculationDetail()">📋 Ver Detalle</button>
                    </div>
                </div>
                <div id="calculation-result" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; display: none;">
                    <!-- Resultado del cálculo -->
                </div>
            </div>
            
        </div>
    `;
}

// Pestaña: Escalas Salariales
function showScalesTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="scales-section">
            <div class="section-header">
                <h3>📊 Escalas Salariales</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="createNewScale()">📊 Nueva Escala</button>
                    <button class="btn btn-success" onclick="importScaleFromAgreement()">📥 Importar de Convenio</button>
                    <button class="btn btn-warning" onclick="adjustScaleByInflation()">📈 Ajustar por Inflación</button>
                </div>
            </div>
            
            <!-- Escalas activas -->
            <div class="active-scales" style="margin: 20px 0;">
                <h4>📋 Escalas Activas</h4>
                <div class="scales-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                    
                    <!-- Escala Básica -->
                    <div class="scale-card" style="background: white; border: 2px solid #4CAF50; border-radius: 15px; padding: 20px;">
                        <h5>💼 Escala Básica - Personal Administrativo</h5>
                        <div class="scale-info">
                            <div><strong>Vigencia:</strong> 01/09/2024 - 31/08/2025</div>
                            <div><strong>Base:</strong> Convenio UOM - Personal Administrativo</div>
                            <div><strong>Última actualización:</strong> Septiembre 2024</div>
                        </div>
                        <div class="scale-categories" style="margin: 15px 0;">
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f8f0; margin: 5px 0; border-radius: 5px;">
                                <span>Junior (0-2 años)</span>
                                <span><strong>$850,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f8f0; margin: 5px 0; border-radius: 5px;">
                                <span>Semi-Senior (2-5 años)</span>
                                <span><strong>$1,200,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f8f0; margin: 5px 0; border-radius: 5px;">
                                <span>Senior (5+ años)</span>
                                <span><strong>$1,650,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f8f0; margin: 5px 0; border-radius: 5px;">
                                <span>Supervisor</span>
                                <span><strong>$2,100,000</strong></span>
                            </div>
                        </div>
                        <div class="scale-actions">
                            <button class="btn btn-sm btn-primary" onclick="editScale(1)">✏️ Editar</button>
                            <button class="btn btn-sm btn-info" onclick="viewScaleHistory(1)">📋 Historial</button>
                            <button class="btn btn-sm btn-warning" onclick="adjustScale(1)">📈 Ajustar</button>
                        </div>
                    </div>
                    
                    <!-- Escala Operarios -->
                    <div class="scale-card" style="background: white; border: 2px solid #2196F3; border-radius: 15px; padding: 20px;">
                        <h5>🔧 Escala Operarios - Personal de Producción</h5>
                        <div class="scale-info">
                            <div><strong>Vigencia:</strong> 01/09/2024 - 31/08/2025</div>
                            <div><strong>Base:</strong> Convenio UOM - Personal de Fábrica</div>
                            <div><strong>Última actualización:</strong> Septiembre 2024</div>
                        </div>
                        <div class="scale-categories" style="margin: 15px 0;">
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f4ff; margin: 5px 0; border-radius: 5px;">
                                <span>Operario A</span>
                                <span><strong>$920,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f4ff; margin: 5px 0; border-radius: 5px;">
                                <span>Operario B</span>
                                <span><strong>$1,050,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f4ff; margin: 5px 0; border-radius: 5px;">
                                <span>Especialista</span>
                                <span><strong>$1,380,000</strong></span>
                            </div>
                            <div class="category-item" style="display: flex; justify-content: space-between; padding: 8px; background: #f0f4ff; margin: 5px 0; border-radius: 5px;">
                                <span>Encargado</span>
                                <span><strong>$1,750,000</strong></span>
                            </div>
                        </div>
                        <div class="scale-actions">
                            <button class="btn btn-sm btn-primary" onclick="editScale(2)">✏️ Editar</button>
                            <button class="btn btn-sm btn-info" onclick="viewScaleHistory(2)">📋 Historial</button>
                            <button class="btn btn-sm btn-warning" onclick="adjustScale(2)">📈 Ajustar</button>
                        </div>
                    </div>
                    
                </div>
            </div>
            
            <!-- Herramientas de escala -->
            <div class="scale-tools" style="background: #f8f9fa; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>🛠️ Herramientas de Escalas</h4>
                <div class="tools-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div class="tool-card" style="background: white; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h5>📊 Comparador de Escalas</h5>
                        <p>Compare escalas entre diferentes períodos y convenios.</p>
                        <button class="btn btn-info btn-sm" onclick="openScaleComparator()">🔍 Comparar</button>
                    </div>
                    <div class="tool-card" style="background: white; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h5>📈 Proyector de Aumentos</h5>
                        <p>Proyecte aumentos salariales según paritarias.</p>
                        <button class="btn btn-warning btn-sm" onclick="openIncreaseProjector()">📊 Proyectar</button>
                    </div>
                    <div class="tool-card" style="background: white; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h5>🎯 Impacto Presupuestario</h5>
                        <p>Calcule el impacto de cambios en escalas.</p>
                        <button class="btn btn-success btn-sm" onclick="calculateBudgetImpact()">💰 Calcular</button>
                    </div>
                </div>
            </div>
            
        </div>
    `;
}

// Pestaña: Convenios Colectivos
function showAgreementsTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="agreements-section">
            <div class="section-header">
                <h3>📄 Convenios Colectivos de Trabajo (CCT)</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="registerNewAgreement()">📝 Registrar CCT</button>
                    <button class="btn btn-info" onclick="searchAgreementDatabase()">🔍 Buscar en Base</button>
                    <button class="btn btn-success" onclick="updateFromMinistry()">🔄 Actualizar desde MTEySS</button>
                </div>
            </div>
            
            <!-- CCT Aplicados -->
            <div class="applied-agreements" style="margin: 20px 0;">
                <h4>📋 Convenios Aplicados en la Empresa</h4>
                <div class="agreements-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                    
                    <!-- UOM -->
                    <div class="agreement-card" style="background: white; border: 2px solid #1976D2; border-radius: 15px; padding: 20px;">
                        <div class="agreement-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h5>⚙️ CCT 260/75 - UOM</h5>
                            <span class="status-badge active">VIGENTE</span>
                        </div>
                        <div class="agreement-details">
                            <div><strong>Sindicato:</strong> Unión Obrera Metalúrgica</div>
                            <div><strong>Actividad:</strong> Industria Metalúrgica</div>
                            <div><strong>Vigencia:</strong> Indefinida</div>
                            <div><strong>Última actualización:</strong> Abril 2024</div>
                            <div><strong>Empleados aplicados:</strong> 85</div>
                        </div>
                        <div class="agreement-provisions" style="margin: 15px 0;">
                            <h6>📋 Principales Disposiciones:</h6>
                            <ul style="margin-left: 20px;">
                                <li>Jornada laboral: 48 horas semanales</li>
                                <li>Horas extras: 50% y 100%</li>
                                <li>Vacaciones: Según antigüedad (14-35 días)</li>
                                <li>Aguinaldo: 2 cuotas (Junio y Diciembre)</li>
                                <li>Plus por antigüedad: 1% anual</li>
                            </ul>
                        </div>
                        <div class="agreement-actions">
                            <button class="btn btn-sm btn-primary" onclick="viewAgreementDetail(260)">👁️ Ver Completo</button>
                            <button class="btn btn-sm btn-info" onclick="downloadAgreementPDF(260)">📥 Descargar</button>
                            <button class="btn btn-sm btn-warning" onclick="checkAgreementUpdates(260)">🔄 Verificar Actualizaciones</button>
                        </div>
                    </div>
                    
                    <!-- UPCN -->
                    <div class="agreement-card" style="background: white; border: 2px solid #4CAF50; border-radius: 15px; padding: 20px;">
                        <div class="agreement-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <h5>👔 CCT 130/75 - UPCN</h5>
                            <span class="status-badge active">VIGENTE</span>
                        </div>
                        <div class="agreement-details">
                            <div><strong>Sindicato:</strong> Unión Personal Civil de la Nación</div>
                            <div><strong>Actividad:</strong> Personal Administrativo</div>
                            <div><strong>Vigencia:</strong> Indefinida</div>
                            <div><strong>Última actualización:</strong> Mayo 2024</div>
                            <div><strong>Empleados aplicados:</strong> 25</div>
                        </div>
                        <div class="agreement-provisions" style="margin: 15px 0;">
                            <h6>📋 Principales Disposiciones:</h6>
                            <ul style="margin-left: 20px;">
                                <li>Jornada laboral: 40 horas semanales</li>
                                <li>Horario flexible permitido</li>
                                <li>Capacitación obligatoria anual</li>
                                <li>Plus por título profesional</li>
                                <li>Licencias especiales</li>
                            </ul>
                        </div>
                        <div class="agreement-actions">
                            <button class="btn btn-sm btn-primary" onclick="viewAgreementDetail(130)">👁️ Ver Completo</button>
                            <button class="btn btn-sm btn-info" onclick="downloadAgreementPDF(130)">📥 Descargar</button>
                            <button class="btn btn-sm btn-warning" onclick="checkAgreementUpdates(130)">🔄 Verificar Actualizaciones</button>
                        </div>
                    </div>
                    
                </div>
            </div>
            
            <!-- Buscador de Convenios -->
            <div class="agreement-search" style="background: #e3f2fd; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>🔍 Buscador de Convenios Colectivos</h4>
                <div class="search-form" style="display: grid; grid-template-columns: 1fr 200px auto; gap: 15px; align-items: end;">
                    <div>
                        <label>Buscar por actividad, sindicato o número de CCT:</label>
                        <input type="text" id="agreement-search-input" placeholder="Ej: metalúrgica, UOM, 260/75..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    <div>
                        <label>Categoría:</label>
                        <select id="agreement-category" style="width: 100%; padding: 10px;">
                            <option value="all">Todas</option>
                            <option value="industry">Industria</option>
                            <option value="commerce">Comercio</option>
                            <option value="services">Servicios</option>
                            <option value="construction">Construcción</option>
                        </select>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="searchAgreements()">🔍 Buscar</button>
                    </div>
                </div>
                <div id="agreement-search-results" style="margin-top: 15px;">
                    <!-- Resultados de búsqueda -->
                </div>
            </div>
            
        </div>
    `;
}

// Pestaña: Cargas Sociales y Tributos
function showTaxesTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="taxes-section">
            <div class="section-header">
                <h3>🏛️ Cargas Sociales y Tributos Laborales</h3>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="updateTaxRates()">🔄 Actualizar Alícuotas</button>
                    <button class="btn btn-success" onclick="calculateTaxImpact()">🧮 Calcular Impacto</button>
                    <button class="btn btn-info" onclick="generateTaxReport()">📊 Reporte Tributario</button>
                </div>
            </div>
            
            <!-- Cargas del Empleador -->
            <div class="employer-taxes" style="margin: 20px 0;">
                <h4>🏢 Contribuciones Patronales</h4>
                <div class="taxes-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    
                    <!-- Seguridad Social -->
                    <div class="tax-category-card" style="background: white; border: 2px solid #1976D2; border-radius: 15px; padding: 20px;">
                        <h5>🛡️ Seguridad Social</h5>
                        <div class="tax-items">
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>Jubilación</span>
                                <span><strong>10.17%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>Obra Social</span>
                                <span><strong>6.00%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>INSSJP</span>
                                <span><strong>1.50%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>Asignaciones Familiares</span>
                                <span><strong>4.44%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; background: #e3f2fd; font-weight: bold;">
                                <span>TOTAL SEGURIDAD SOCIAL</span>
                                <span>22.11%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Riesgos del Trabajo -->
                    <div class="tax-category-card" style="background: white; border: 2px solid #FF9800; border-radius: 15px; padding: 20px;">
                        <h5>🏥 Riesgos del Trabajo</h5>
                        <div class="tax-items">
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>ART (Actividad 1)</span>
                                <span><strong>0.72%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>ART (Actividad 2)</span>
                                <span><strong>1.95%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>ART (Actividad 3)</span>
                                <span><strong>3.24%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; background: #fff3e0; font-weight: bold;">
                                <span>PROMEDIO APLICADO</span>
                                <span>1.95%</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Otros Tributos -->
                    <div class="tax-category-card" style="background: white; border: 2px solid #4CAF50; border-radius: 15px; padding: 20px;">
                        <h5>📊 Otros Tributos</h5>
                        <div class="tax-items">
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>Fondo Nacional Empleo</span>
                                <span><strong>0.89%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>INCUCAI</span>
                                <span><strong>0.21%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>Cuota Sindical Solidaria</span>
                                <span><strong>2.00%</strong></span>
                            </div>
                            <div class="tax-item" style="display: flex; justify-content: space-between; padding: 8px; background: #e8f5e8; font-weight: bold;">
                                <span>TOTAL OTROS</span>
                                <span>3.10%</span>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
            
            <!-- Resumen Total Cargas -->
            <div class="total-charges-summary" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; padding: 20px; margin: 20px 0;">
                <h4>💰 Resumen Total de Cargas Patronales</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div class="charge-summary-item">
                        <div style="font-size: 2rem; font-weight: bold;">22.11%</div>
                        <div>Seguridad Social</div>
                    </div>
                    <div class="charge-summary-item">
                        <div style="font-size: 2rem; font-weight: bold;">1.95%</div>
                        <div>ART Promedio</div>
                    </div>
                    <div class="charge-summary-item">
                        <div style="font-size: 2rem; font-weight: bold;">3.10%</div>
                        <div>Otros Tributos</div>
                    </div>
                    <div class="charge-summary-item" style="border: 2px solid white; border-radius: 10px; padding: 15px;">
                        <div style="font-size: 2.5rem; font-weight: bold;">27.16%</div>
                        <div>TOTAL CARGAS</div>
                    </div>
                </div>
            </div>
            
            <!-- Descuentos del Empleado -->
            <div class="employee-deductions" style="margin: 20px 0;">
                <h4>👤 Aportes y Descuentos del Empleado</h4>
                <div class="deductions-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    <div class="deduction-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h6>Jubilación</h6>
                        <div style="font-size: 1.5rem; color: #f44336; font-weight: bold;">11%</div>
                    </div>
                    <div class="deduction-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h6>Obra Social</h6>
                        <div style="font-size: 1.5rem; color: #f44336; font-weight: bold;">3%</div>
                    </div>
                    <div class="deduction-item" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 10px; padding: 15px;">
                        <h6>INSSJP (PAMI)</h6>
                        <div style="font-size: 1.5rem; color: #f44336; font-weight: bold;">3%</div>
                    </div>
                    <div class="deduction-item" style="background: #fff3e0; border: 2px solid #ff9800; border-radius: 10px; padding: 15px;">
                        <h6>TOTAL APORTES</h6>
                        <div style="font-size: 1.8rem; color: #ff9800; font-weight: bold;">17%</div>
                    </div>
                </div>
            </div>
            
        </div>
    `;
}

// Cargar datos del módulo
async function loadPayrollData() {
    console.log('💰 [PAYROLL] Cargando datos de liquidación...');
    
    try {
        // Datos de demostración
        currentLegislation = {
            minSalary: 230000, // Salario mínimo vital y móvil
            maxSalary: 2000000, // Tope para aportes
            vacationDays: [14, 21, 28, 35], // Días según antigüedad
            aguinaldoMonths: ['06', '12'], // Meses de pago del aguinaldo
            overtimeRates: {
                normal: 1.5, // 50%
                holidays: 2.0 // 100%
            }
        };
        
        taxRates = {
            employer: {
                retirement: 10.17,
                healthcare: 6.00,
                pami: 1.50,
                familyAllowances: 4.44,
                art: 1.95,
                employment: 0.89,
                incucai: 0.21,
                union: 2.00
            },
            employee: {
                retirement: 11.00,
                healthcare: 3.00,
                pami: 3.00
            }
        };
        
        console.log('✅ [PAYROLL] Datos cargados exitosamente');
        
    } catch (error) {
        console.error('❌ [PAYROLL] Error cargando datos:', error);
    }
}

function loadEmployeesForLiquidation() {
    const employeesList = document.getElementById('employees-liquidation-list');
    if (!employeesList) return;
    
    employeesList.innerHTML = `
        <div class="employees-liquidation-section" style="background: white; border: 2px solid #e0e7ff; border-radius: 15px; padding: 20px; margin-top: 20px;">
            <h4>👥 Empleados para Liquidar - Septiembre 2024</h4>
            <div class="employees-table-container" style="overflow-x: auto;">
                <table class="liquidation-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">✅</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Empleado</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Legajo</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Categoría</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Básico</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">H. Extras</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Bruto</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Descuentos</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Neto</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Estado</th>
                            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateEmployeeLiquidationRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Actualizar contadores de estado
    updateLiquidationStatus();
}

function generateEmployeeLiquidationRows() {
    const employees = [
        { id: 1, name: 'Juan Pérez', legajo: 'EMP001', category: 'Senior', basic: 1650000, overtime: 8.5, status: 'processed' },
        { id: 2, name: 'María García', legajo: 'EMP002', category: 'Semi-Senior', basic: 1200000, overtime: 4.0, status: 'pending' },
        { id: 3, name: 'Carlos López', legajo: 'EMP003', category: 'Operario B', basic: 1050000, overtime: 12.0, status: 'error' },
        { id: 4, name: 'Ana Rodríguez', legajo: 'EMP004', category: 'Junior', basic: 850000, overtime: 0, status: 'processed' },
        { id: 5, name: 'Luis Martínez', legajo: 'EMP005', category: 'Supervisor', basic: 2100000, overtime: 6.0, status: 'pending' }
    ];
    
    return employees.map(emp => {
        const overtimeAmount = (emp.basic / 200) * emp.overtime * 1.5; // Cálculo aproximado
        const grossSalary = emp.basic + overtimeAmount;
        const deductions = grossSalary * 0.17; // 17% de aportes
        const netSalary = grossSalary - deductions;
        
        const statusColors = {
            'processed': { bg: '#e8f5e8', color: '#4caf50', text: 'PROCESADO' },
            'pending': { bg: '#fff3e0', color: '#ff9800', text: 'PENDIENTE' },
            'error': { bg: '#ffebee', color: '#f44336', text: 'ERROR' }
        };
        
        const status = statusColors[emp.status];
        
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    <input type="checkbox" ${emp.status === 'processed' ? 'checked disabled' : ''}>
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">${emp.name}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${emp.legajo}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${emp.category}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">$${emp.basic.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${emp.overtime}h</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">$${grossSalary.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #f44336;">$${deductions.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #4caf50;">$${netSalary.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    <span style="background: ${status.bg}; color: ${status.color}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${status.text}
                    </span>
                </td>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-xs btn-primary" onclick="editEmployeeLiquidation(${emp.id})">✏️</button>
                        <button class="btn btn-xs btn-info" onclick="viewLiquidationDetail(${emp.id})">👁️</button>
                        ${emp.status === 'processed' ? 
                            '<button class="btn btn-xs btn-success" onclick="downloadPayslip(' + emp.id + ')">📥</button>' : 
                            '<button class="btn btn-xs btn-warning" onclick="processLiquidation(' + emp.id + ')">▶️</button>'
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateLiquidationStatus() {
    document.getElementById('processed-count').textContent = '2';
    document.getElementById('pending-count').textContent = '2';
    document.getElementById('errors-count').textContent = '1';
    document.getElementById('total-amount').textContent = '$8,450,000';
}

// Funciones de acciones
function startNewLiquidation() {
    alert('💰 Iniciando nueva liquidación...\n\n📅 Período: Septiembre 2024\n👥 Empleados: 5\n⏰ Tiempo estimado: 10 minutos\n\n✅ Verificando:\n- Asistencias del período\n- Horas extras registradas\n- Novedades pendientes\n- Escalas salariales vigentes');
}

function calculateAllPayrolls() {
    alert('⚡ Calculando todas las liquidaciones...\n\n🔄 Procesando:\n- Conceptos remunerativos\n- Horas extras al 50% y 100%\n- Descuentos legales (17%)\n- Cargas patronales (27.16%)\n- Aguinaldo proporcional\n\n✅ Cálculos completados\n📊 Listo para revisión');
}

function calculateConcepts() {
    const basicSalary = parseFloat(document.getElementById('basic-salary').value) || 0;
    const yearsSeniority = parseInt(document.getElementById('years-seniority').value) || 0;
    const overtime50 = parseFloat(document.getElementById('overtime-50').value) || 0;
    const overtime100 = parseFloat(document.getElementById('overtime-100').value) || 0;
    
    if (basicSalary === 0) {
        alert('❌ Ingrese un sueldo básico válido');
        return;
    }
    
    // Cálculos
    const seniorityAmount = basicSalary * (yearsSeniority * 0.01); // 1% por año
    const hourlyRate = basicSalary / 200; // Valor hora
    const overtime50Amount = hourlyRate * overtime50 * 1.5;
    const overtime100Amount = hourlyRate * overtime100 * 2.0;
    
    const totalRemunerative = basicSalary + seniorityAmount + overtime50Amount + overtime100Amount;
    const employeeDeductions = totalRemunerative * 0.17; // 17%
    const netSalary = totalRemunerative - employeeDeductions;
    const employerCharges = totalRemunerative * 0.2716; // 27.16%
    
    const resultDiv = document.getElementById('calculation-result');
    resultDiv.innerHTML = `
        <h5>🧮 Resultado del Cálculo</h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h6>💰 Conceptos Remunerativos</h6>
                <div>Sueldo Básico: $${basicSalary.toLocaleString()}</div>
                <div>Antigüedad (${yearsSeniority} años): $${seniorityAmount.toLocaleString()}</div>
                <div>H. Extras 50% (${overtime50}h): $${overtime50Amount.toLocaleString()}</div>
                <div>H. Extras 100% (${overtime100}h): $${overtime100Amount.toLocaleString()}</div>
                <div style="border-top: 1px solid #ddd; padding-top: 8px; font-weight: bold;">
                    Total Bruto: $${totalRemunerative.toLocaleString()}
                </div>
            </div>
            <div>
                <h6>📉 Descuentos y Cargas</h6>
                <div>Aportes Empleado (17%): -$${employeeDeductions.toLocaleString()}</div>
                <div style="color: #4caf50; font-weight: bold;">Neto a Cobrar: $${netSalary.toLocaleString()}</div>
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #ddd;">
                    <strong>Cargas Patronales (27.16%): $${employerCharges.toLocaleString()}</strong>
                </div>
                <div style="color: #f44336; font-weight: bold;">
                    Costo Total Empresa: $${(totalRemunerative + employerCharges).toLocaleString()}
                </div>
            </div>
        </div>
    `;
    resultDiv.style.display = 'block';
}

// Añadir estilos específicos para liquidación
const payrollStyles = document.createElement('style');
payrollStyles.textContent = `
    .payroll-tab-btn {
        padding: 10px 15px;
        border: none;
        background: #f8f9fa;
        color: #666;
        border-radius: 8px 8px 0 0;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 13px;
        white-space: nowrap;
    }
    
    .payroll-tab-btn.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
    }
    
    .payroll-tab-btn:hover:not(.active) {
        background: #e9ecef;
        color: #333;
    }
    
    .liquidation-table th {
        font-size: 13px;
        white-space: nowrap;
    }
    
    .liquidation-table td {
        font-size: 12px;
    }
    
    .status-badge.active {
        background: #4CAF50;
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
    }
    
    /* Estilos para plantillas */
    .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .template-card {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .template-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    
    .template-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 15px;
    }
    
    .template-header h4 {
        margin: 0;
        color: #2c3e50;
        font-size: 16px;
    }
    
    .template-badges {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }
    
    .badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
    }
    
    .badge-primary {
        background: #007bff;
        color: white;
    }
    
    .badge-success {
        background: #28a745;
        color: white;
    }
    
    .badge-secondary {
        background: #6c757d;
        color: white;
    }
    
    .template-description {
        color: #666;
        font-size: 14px;
        margin: 10px 0;
        line-height: 1.4;
    }
    
    .template-stats {
        display: flex;
        gap: 15px;
        margin: 15px 0;
        font-size: 13px;
    }
    
    .template-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }
    
    .btn-sm {
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 3px;
    }
    
    .btn-info {
        background: #17a2b8;
        color: white;
        border: 1px solid #17a2b8;
    }
    
    .btn-success {
        background: #28a745;
        color: white;
        border: 1px solid #28a745;
    }
    
    .modal {
        position: fixed;
        z-index: 9997;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
    }
    
    .modal-content {
        background-color: #fefefe;
        margin: 5% auto;
        padding: 20px;
        border: none;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        line-height: 1;
    }
    
    .close:hover {
        color: black;
    }
    
    .form-section {
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
    }
    
    .form-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }
    
    .form-section h4 {
        margin: 0 0 15px 0;
        color: #2c3e50;
        font-size: 16px;
    }
`;
document.head.appendChild(payrollStyles);

// ===== PESTAÑA: PLANTILLAS DE LIQUIDACIÓN PARA RRHH =====
function showPayrollTemplatesTab() {
    const payrollContent = document.getElementById('payroll-content');
    payrollContent.innerHTML = `
        <div class="templates-section">
            <div class="section-header">
                <h3>📋 Plantillas de Liquidación para RRHH</h3>
                <div class="quick-actions">
                    <button onclick="createNewTemplate()" class="btn btn-primary">
                        ➕ Nueva Plantilla
                    </button>
                    <button onclick="refreshTemplates()" class="btn btn-secondary">
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            <!-- Filtros y Búsqueda -->
            <div class="templates-filters" style="display: flex; gap: 15px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div>
                    <label>🔍 Buscar:</label>
                    <input type="text" id="template-search" placeholder="Nombre de plantilla..." onkeyup="filterTemplates()" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>📋 Tipo:</label>
                    <select id="template-type-filter" onchange="filterTemplates()" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Todos</option>
                        <option value="all_employees">Todos los empleados</option>
                        <option value="by_position">Por cargo</option>
                        <option value="by_sector">Por sector</option>
                        <option value="by_branch">Por sucursal</option>
                        <option value="individual">Individual</option>
                    </select>
                </div>
                <div>
                    <label>✅ Estado:</label>
                    <select id="template-status-filter" onchange="filterTemplates()" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Todos</option>
                        <option value="active">Activas</option>
                        <option value="inactive">Inactivas</option>
                    </select>
                </div>
            </div>

            <!-- Lista de Plantillas -->
            <div id="templates-container" class="templates-grid">
                <div class="loading-spinner">Cargando plantillas...</div>
            </div>

            <!-- Modal para Nueva/Editar Plantilla -->
            <div id="template-modal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                    <span class="close" onclick="closeTemplateModal()">&times;</span>
                    <h3 id="template-modal-title">📋 Nueva Plantilla de Liquidación</h3>
                    
                    <form id="template-form" onsubmit="saveTemplate(event)">
                        <!-- Información Básica -->
                        <div class="form-section">
                            <h4>📄 Información Básica</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div>
                                    <label>Nombre de la plantilla *:</label>
                                    <input type="text" id="template-name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div>
                                    <label>Aplicar a *:</label>
                                    <select id="template-applies-to" required onchange="updateApplyFilters()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                        <option value="">Seleccionar...</option>
                                        <option value="all_employees">Todos los empleados</option>
                                        <option value="by_position">Por cargo específico</option>
                                        <option value="by_sector">Por sector</option>
                                        <option value="by_branch">Por sucursal</option>
                                        <option value="individual">Empleados específicos</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin-top: 15px;">
                                <label>Descripción:</label>
                                <textarea id="template-description" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Descripción de la plantilla..."></textarea>
                            </div>
                            
                            <!-- Filtros Dinámicos -->
                            <div id="apply-filters" style="margin-top: 15px;"></div>
                            
                            <div style="display: flex; gap: 15px; margin-top: 15px;">
                                <label>
                                    <input type="checkbox" id="template-default"> Es plantilla por defecto
                                </label>
                                <label>
                                    <input type="checkbox" id="template-auto-apply" checked> Aplicar automáticamente a nuevos empleados
                                </label>
                            </div>
                        </div>

                        <!-- Conceptos de Liquidación -->
                        <div class="form-section">
                            <h4>💰 Conceptos de Liquidación</h4>
                            <div style="margin-bottom: 15px;">
                                <button type="button" onclick="addTemplateItem()" class="btn btn-sm btn-success">
                                    ➕ Agregar Concepto
                                </button>
                            </div>
                            
                            <div id="template-items-container">
                                <!-- Los items se agregarán dinámicamente -->
                            </div>
                        </div>

                        <div class="form-actions" style="text-align: right; padding-top: 20px; border-top: 1px solid #ddd;">
                            <button type="button" onclick="closeTemplateModal()" class="btn btn-secondary">Cancelar</button>
                            <button type="submit" class="btn btn-primary">💾 Guardar Plantilla</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal para Aplicación Masiva -->
            <div id="massive-apply-modal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 700px;">
                    <span class="close" onclick="closeMassiveApplyModal()">&times;</span>
                    <h3>⚡ Aplicación Masiva de Plantilla</h3>
                    
                    <div id="massive-apply-content">
                        <!-- Contenido dinámico -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cargar plantillas
    loadPayrollTemplates();
}

// Variables globales para plantillas
let payrollTemplates = [];
let currentTemplate = null;

// Cargar plantillas de liquidación
async function loadPayrollTemplates() {
    try {
        const response = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/payroll-templates?active_only=false'), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            payrollTemplates = data.data || [];
            displayTemplates(payrollTemplates);
        } else {
            throw new Error('Error cargando plantillas');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('templates-container').innerHTML = `
            <div class="error-message">
                ❌ Error cargando plantillas: ${error.message}
            </div>
        `;
    }
}

// Mostrar plantillas
function displayTemplates(templates) {
    const container = document.getElementById('templates-container');
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                <p>No hay plantillas creadas aún</p>
                <button onclick="createNewTemplate()" class="btn btn-primary">➕ Crear Primera Plantilla</button>
            </div>
        `;
        return;
    }

    const templatesHtml = templates.map(template => `
        <div class="template-card">
            <div class="template-header">
                <h4>${template.template_name}</h4>
                <div class="template-badges">
                    ${template.is_default ? '<span class="badge badge-primary">Por defecto</span>' : ''}
                    <span class="badge badge-${template.is_active ? 'success' : 'secondary'}">
                        ${template.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>
            
            <div class="template-info">
                <p class="template-description">${template.description || 'Sin descripción'}</p>
                <div class="template-stats">
                    <div>📊 <strong>${template.items_count || 0}</strong> conceptos</div>
                    <div>👥 <strong>${template.employees_count || 0}</strong> empleados</div>
                    <div>📋 <strong>${getAppliesText(template.applies_to)}</strong></div>
                </div>
            </div>
            
            <div class="template-actions">
                <button onclick="viewTemplate('${template.id}')" class="btn btn-sm btn-info">👁️ Ver</button>
                <button onclick="editTemplate('${template.id}')" class="btn btn-sm btn-primary">✏️ Editar</button>
                <button onclick="cloneTemplate('${template.id}')" class="btn btn-sm btn-secondary">📄 Clonar</button>
                <button onclick="applyMassive('${template.id}')" class="btn btn-sm btn-success">⚡ Aplicar Masivo</button>
                <button onclick="deleteTemplate('${template.id}')" class="btn btn-sm btn-danger">🗑️</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = templatesHtml;
}

// Funciones auxiliares
function getAppliesText(appliesTo) {
    const texts = {
        'all_employees': 'Todos',
        'by_position': 'Por cargo',
        'by_sector': 'Por sector',
        'by_branch': 'Por sucursal',
        'individual': 'Individual'
    };
    return texts[appliesTo] || appliesTo;
}

// Filtrar plantillas
function filterTemplates() {
    const search = document.getElementById('template-search')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('template-type-filter')?.value || '';
    const statusFilter = document.getElementById('template-status-filter')?.value || '';

    const filtered = payrollTemplates.filter(template => {
        const matchesSearch = !search || template.template_name.toLowerCase().includes(search);
        const matchesType = !typeFilter || template.applies_to === typeFilter;
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && template.is_active) ||
            (statusFilter === 'inactive' && !template.is_active);

        return matchesSearch && matchesType && matchesStatus;
    });

    displayTemplates(filtered);
}

// Crear nueva plantilla
function createNewTemplate() {
    currentTemplate = null;
    document.getElementById('template-modal-title').textContent = '📋 Nueva Plantilla de Liquidación';
    document.getElementById('template-form').reset();
    document.getElementById('template-items-container').innerHTML = '';
    document.getElementById('apply-filters').innerHTML = '';
    document.getElementById('template-modal').style.display = 'block';
}

// Agregar concepto a plantilla
function addTemplateItem() {
    const container = document.getElementById('template-items-container');
    const itemId = Date.now();
    
    const itemHtml = `
        <div class="template-item" id="item-${itemId}">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 10px;">
                <div>
                    <input type="text" placeholder="Nombre del concepto..." required style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <input type="text" placeholder="Código (ej: SUELDO_BASICO)" required style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px; margin-top: 5px;">
                </div>
                <select required style="padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option value="">Tipo...</option>
                    <option value="remuneration">Haberes</option>
                    <option value="deduction">Descuentos</option>
                    <option value="contribution">Aportes</option>
                    <option value="bonus">Adicionales</option>
                    <option value="allowance">Asignaciones</option>
                </select>
                <select required onchange="updateCalculationFields(this, ${itemId})" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    <option value="">Cálculo...</option>
                    <option value="fixed_amount">Importe fijo</option>
                    <option value="percentage_basic">% sueldo básico</option>
                    <option value="percentage_gross">% bruto</option>
                    <option value="hours_worked">Por horas</option>
                    <option value="formula">Fórmula</option>
                </select>
                <div id="calc-fields-${itemId}" style="display: flex; flex-direction: column; gap: 5px;">
                    <!-- Campos dinámicos según tipo de cálculo -->
                </div>
                <button type="button" onclick="removeTemplateItem(${itemId})" class="btn btn-sm btn-danger">🗑️</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
}

// Funciones placeholder para las acciones
function viewTemplate(id) { alert('Ver plantilla: ' + id); }
function editTemplate(id) { alert('Editar plantilla: ' + id); }
function cloneTemplate(id) { alert('Clonar plantilla: ' + id); }
function applyMassive(id) { alert('Aplicación masiva de plantilla: ' + id); }
function deleteTemplate(id) { if(confirm('¿Eliminar plantilla?')) alert('Eliminado: ' + id); }
function closeTemplateModal() { document.getElementById('template-modal').style.display = 'none'; }
function closeMassiveApplyModal() { document.getElementById('massive-apply-modal').style.display = 'none'; }
function refreshTemplates() { loadPayrollTemplates(); }
function removeTemplateItem(id) { document.getElementById(`item-${id}`).remove(); }
function saveTemplate(event) { event.preventDefault(); alert('Funcionalidad en desarrollo'); }
function updateApplyFilters() { /* Actualizar filtros según tipo */ }
function updateCalculationFields(select, itemId) { /* Actualizar campos de cálculo */ }

// Exportar funciones al scope global
if (typeof window !== 'undefined') {
    window.showPayrollLiquidationContent = showPayrollLiquidationContent;
    window.showPayrollTab = showPayrollTab;
    window.startNewLiquidation = startNewLiquidation;
    window.calculateAllPayrolls = calculateAllPayrolls;
    window.calculateConcepts = calculateConcepts;
    
    // Funciones de plantillas
    window.showPayrollTemplatesTab = showPayrollTemplatesTab;
    window.createNewTemplate = createNewTemplate;
    window.addTemplateItem = addTemplateItem;
    window.filterTemplates = filterTemplates;
    window.viewTemplate = viewTemplate;
    window.editTemplate = editTemplate;
    window.cloneTemplate = cloneTemplate;
    window.applyMassive = applyMassive;
    window.deleteTemplate = deleteTemplate;
    window.closeTemplateModal = closeTemplateModal;
    window.closeMassiveApplyModal = closeMassiveApplyModal;
    window.refreshTemplates = refreshTemplates;
    window.removeTemplateItem = removeTemplateItem;
    window.saveTemplate = saveTemplate;
    window.updateApplyFilters = updateApplyFilters;
    window.updateCalculationFields = updateCalculationFields;
}

console.log('✅ [PAYROLL] Módulo de Liquidación completo y listo');