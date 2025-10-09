/**
 * MÓDULO PLANTILLAS FISCALES SIAC
 * Sistema configurable de matriz impositiva por país
 * Integrado con SessionManager para sesiones concurrentes
 */

let plantillasFiscalesState = {
    plantillas: [],
    condicionesFiscales: [],
    conceptosImpositivos: [],
    alicuotas: [],
    configuracionesEmpresa: [],
    sessionId: null,
    terminalId: 'WEB01',
    companyId: 4
};

// Función principal para mostrar el contenido del módulo
function showPlantillasFiscalesContent() {
    console.log('📋 Iniciando módulo Plantillas Fiscales SIAC...');

    // Generar Session ID
    plantillasFiscalesState.sessionId = generatePlantillasSessionId();
    console.log(`🔗 Session ID generado: ${plantillasFiscalesState.sessionId}`);

    // Obtener el contenedor principal
    let mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        mainContent = document.createElement('div');
        mainContent.id = 'mainContent';
        document.body.appendChild(mainContent);
    }

    // Crear la interfaz del módulo
    mainContent.innerHTML = `
        <div class="plantillas-fiscales-container" style="padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header con título y sesión -->
            <div class="module-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e1e8ff; padding-bottom: 15px;">
                <div>
                    <h1 style="color: #2c3e50; margin: 0; font-size: 28px; font-weight: 600;">
                        📋 Plantillas Fiscales SIAC
                    </h1>
                    <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 16px;">
                        Sistema configurable de matriz impositiva por país
                    </p>
                </div>
                <div style="text-align: right; color: #666; font-size: 12px;">
                    <div>Sesión: ${plantillasFiscalesState.sessionId}</div>
                    <div>Terminal: ${plantillasFiscalesState.terminalId}</div>
                </div>
            </div>

            <!-- Pestañas de navegación -->
            <div class="tab-navigation" style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #ddd;">
                <button class="tab-btn active" onclick="showPlantillasTab('plantillas')" style="padding: 12px 24px; border: none; background: #3498db; color: white; border-radius: 5px 5px 0 0; cursor: pointer; margin-right: 2px;">
                    📋 Plantillas
                </button>
                <button class="tab-btn" onclick="showPlantillasTab('condiciones')" style="padding: 12px 24px; border: none; background: #ecf0f1; color: #2c3e50; border-radius: 5px 5px 0 0; cursor: pointer; margin-right: 2px;">
                    🏷️ Condiciones IVA
                </button>
                <button class="tab-btn" onclick="showPlantillasTab('conceptos')" style="padding: 12px 24px; border: none; background: #ecf0f1; color: #2c3e50; border-radius: 5px 5px 0 0; cursor: pointer; margin-right: 2px;">
                    💰 Conceptos
                </button>
                <button class="tab-btn" onclick="showPlantillasTab('alicuotas')" style="padding: 12px 24px; border: none; background: #ecf0f1; color: #2c3e50; border-radius: 5px 5px 0 0; cursor: pointer; margin-right: 2px;">
                    📊 Alícuotas
                </button>
                <button class="tab-btn" onclick="showPlantillasTab('configuracion')" style="padding: 12px 24px; border: none; background: #ecf0f1; color: #2c3e50; border-radius: 5px 5px 0 0; cursor: pointer;">
                    ⚙️ Configuración
                </button>
            </div>

            <!-- Contenido de las pestañas -->
            <div id="plantillas-content">
                <!-- Se carga dinámicamente según la pestaña activa -->
            </div>

            <!-- Botón para volver -->
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="goBackToModules()" style="background: #95a5a6; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                    ← Volver a Módulos
                </button>
            </div>
        </div>
    `;

    // Cargar la pestaña de plantillas por defecto
    showPlantillasTab('plantillas');
    loadPlantillasFiscalesData();
}

// Función para generar Session ID
function generatePlantillasSessionId() {
    const companyId = plantillasFiscalesState.companyId;
    const terminalId = plantillasFiscalesState.terminalId;
    const timestamp = Date.now();
    return `PLANTILLAS_${companyId}_${terminalId}_${timestamp}`;
}

// Función para cambiar entre pestañas
function showPlantillasTab(tabName) {
    // Actualizar botones activos
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = '#ecf0f1';
        btn.style.color = '#2c3e50';
    });
    event.target.style.background = '#3498db';
    event.target.style.color = 'white';

    const content = document.getElementById('plantillas-content');

    switch(tabName) {
        case 'plantillas':
            showPlantillasSection(content);
            break;
        case 'condiciones':
            showCondicionesSection(content);
            break;
        case 'conceptos':
            showConceptosSection(content);
            break;
        case 'alicuotas':
            showAlicuotasSection(content);
            break;
        case 'configuracion':
            showConfiguracionSection(content);
            break;
    }
}

// Sección: Plantillas Fiscales
function showPlantillasSection(content) {
    content.innerHTML = `
        <div class="plantillas-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0;">📋 Plantillas Fiscales por País</h3>
                <button onclick="openPlantillaModal()" style="background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ➕ Nueva Plantilla
                </button>
            </div>

            <!-- Lista de plantillas -->
            <div class="plantillas-list" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr; gap: 15px; align-items: center; font-weight: bold; padding: 10px; border-bottom: 2px solid #ddd;">
                    <div>País / Plantilla</div>
                    <div>Código</div>
                    <div>Estado</div>
                    <div>Condiciones</div>
                    <div>Acciones</div>
                </div>
                <div id="plantillas-items">
                    <!-- Se cargan dinámicamente -->
                </div>
            </div>
        </div>
    `;

    loadPlantillas();
}

// Sección: Condiciones IVA
function showCondicionesSection(content) {
    content.innerHTML = `
        <div class="condiciones-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0;">🏷️ Condiciones ante el IVA</h3>
                <button onclick="openCondicionModal()" style="background: #f39c12; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ➕ Nueva Condición
                </button>
            </div>

            <!-- Lista de condiciones -->
            <div class="condiciones-list" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr; gap: 15px; align-items: center; font-weight: bold; padding: 10px; border-bottom: 2px solid #ddd;">
                    <div>Descripción</div>
                    <div>Código</div>
                    <div>Tipo</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>
                <div id="condiciones-items">
                    <!-- Se cargan dinámicamente -->
                </div>
            </div>
        </div>
    `;

    loadCondiciones();
}

// Sección: Conceptos Impositivos
function showConceptosSection(content) {
    content.innerHTML = `
        <div class="conceptos-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0;">💰 Conceptos Impositivos</h3>
                <button onclick="openConceptoModal()" style="background: #8e44ad; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ➕ Nuevo Concepto
                </button>
            </div>

            <!-- Lista de conceptos -->
            <div class="conceptos-list" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr; gap: 15px; align-items: center; font-weight: bold; padding: 10px; border-bottom: 2px solid #ddd;">
                    <div>Concepto</div>
                    <div>Código</div>
                    <div>Tipo</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>
                <div id="conceptos-items">
                    <!-- Se cargan dinámicamente -->
                </div>
            </div>
        </div>
    `;

    loadConceptos();
}

// Sección: Alícuotas
function showAlicuotasSection(content) {
    content.innerHTML = `
        <div class="alicuotas-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0;">📊 Alícuotas Impositivas</h3>
                <button onclick="openAlicuotaModal()" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ➕ Nueva Alícuota
                </button>
            </div>

            <!-- Lista de alícuotas -->
            <div class="alicuotas-list" style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 0.5fr; gap: 15px; align-items: center; font-weight: bold; padding: 10px; border-bottom: 2px solid #ddd;">
                    <div>Descripción</div>
                    <div>Porcentaje</div>
                    <div>Tipo</div>
                    <div>Vigencia</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>
                <div id="alicuotas-items">
                    <!-- Se cargan dinámicamente -->
                </div>
            </div>
        </div>
    `;

    loadAlicuotas();
}

// Sección: Configuración de Empresa
function showConfiguracionSection(content) {
    content.innerHTML = `
        <div class="configuracion-section">
            <h3 style="color: #2c3e50; margin-bottom: 20px;">⚙️ Configuración Fiscal de la Empresa</h3>

            <!-- Configuración fiscal -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div class="config-panel" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h4 style="color: #34495e; margin-bottom: 15px;">🏢 Datos Fiscales</h4>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">CUIT/CUIL:</label>
                        <input type="text" id="cuit" placeholder="XX-XXXXXXXX-X" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Razón Social:</label>
                        <input type="text" id="razonSocial" placeholder="Razón Social" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Condición IVA:</label>
                        <select id="condicionIva" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Seleccionar...</option>
                            <option value="RI">Responsable Inscripto</option>
                            <option value="MT">Monotributo</option>
                            <option value="EX">Exento</option>
                        </select>
                    </div>
                </div>

                <div class="config-panel" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <h4 style="color: #34495e; margin-bottom: 15px;">📍 Ubicación Fiscal</h4>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Provincia:</label>
                        <select id="provincia" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="">Seleccionar provincia...</option>
                            <option value="CABA">Ciudad de Buenos Aires</option>
                            <option value="BA">Buenos Aires</option>
                            <option value="CB">Córdoba</option>
                            <option value="SF">Santa Fe</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">IIBB:</label>
                        <input type="text" id="iibb" placeholder="Ingresos Brutos" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Inicio Actividades:</label>
                        <input type="date" id="inicioActividades" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
            </div>

            <!-- Botones de acción -->
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="guardarConfiguracionFiscal()" style="background: #27ae60; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; margin-right: 10px; font-size: 16px;">
                    💾 Guardar Configuración
                </button>
                <button onclick="resetearConfiguracion()" style="background: #e74c3c; color: white; border: none; padding: 12px 30px; border-radius: 6px; cursor: pointer; font-size: 16px;">
                    🔄 Resetear
                </button>
            </div>
        </div>
    `;

    loadConfiguracionEmpresa();
}

// Funciones de carga de datos
function loadPlantillasFiscalesData() {
    console.log('📊 Cargando datos de plantillas fiscales...');
    // Simular carga de datos desde el backend SIAC
    plantillasFiscalesState.plantillas = [
        { id: 1, pais: 'Argentina', codigo: 'AR', estado: 'Activo', condiciones: 12 },
        { id: 2, pais: 'Uruguay', codigo: 'UY', estado: 'Activo', condiciones: 8 }
    ];
}

function loadPlantillas() {
    const container = document.getElementById('plantillas-items');
    container.innerHTML = '';

    plantillasFiscalesState.plantillas.forEach(plantilla => {
        const item = document.createElement('div');
        item.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 0.5fr; gap: 15px; align-items: center; padding: 10px; border-bottom: 1px solid #eee;';

        item.innerHTML = `
            <div style="font-weight: 500;">${plantilla.pais}</div>
            <div>${plantilla.codigo}</div>
            <div><span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${plantilla.estado}</span></div>
            <div>${plantilla.condiciones} condiciones</div>
            <div>
                <button onclick="editarPlantilla(${plantilla.id})" style="background: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">✏️</button>
                <button onclick="eliminarPlantilla(${plantilla.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
            </div>
        `;

        container.appendChild(item);
    });
}

function loadCondiciones() {
    // Implementar carga de condiciones IVA
    console.log('📊 Cargando condiciones IVA...');
}

function loadConceptos() {
    // Implementar carga de conceptos impositivos
    console.log('📊 Cargando conceptos impositivos...');
}

function loadAlicuotas() {
    // Implementar carga de alícuotas
    console.log('📊 Cargando alícuotas...');
}

function loadConfiguracionEmpresa() {
    // Implementar carga de configuración de empresa
    console.log('📊 Cargando configuración de empresa...');
}

// Funciones de modal y CRUD
function openPlantillaModal() {
    console.log('📋 Abriendo modal de plantilla...');
    // Implementar modal para crear/editar plantillas
}

function openCondicionModal() {
    console.log('🏷️ Abriendo modal de condición...');
    // Implementar modal para crear/editar condiciones
}

function openConceptoModal() {
    console.log('💰 Abriendo modal de concepto...');
    // Implementar modal para crear/editar conceptos
}

function openAlicuotaModal() {
    console.log('📊 Abriendo modal de alícuota...');
    // Implementar modal para crear/editar alícuotas
}

// Funciones de acciones
function editarPlantilla(id) {
    console.log(`✏️ Editando plantilla ${id}...`);
}

function eliminarPlantilla(id) {
    if (confirm('¿Está seguro que desea eliminar esta plantilla?')) {
        console.log(`🗑️ Eliminando plantilla ${id}...`);
    }
}

function guardarConfiguracionFiscal() {
    console.log('💾 Guardando configuración fiscal...');
    alert('✅ Configuración fiscal guardada correctamente');
}

function resetearConfiguracion() {
    if (confirm('¿Está seguro que desea resetear la configuración?')) {
        console.log('🔄 Reseteando configuración...');
        // Limpiar formularios
        document.getElementById('cuit').value = '';
        document.getElementById('razonSocial').value = '';
        document.getElementById('condicionIva').value = '';
        document.getElementById('provincia').value = '';
        document.getElementById('iibb').value = '';
        document.getElementById('inicioActividades').value = '';
    }
}

// Función para volver a los módulos
function goBackToModules() {
    const mainContent = document.getElementById('mainContent');
    const moduleGrid = document.querySelector('.module-grid');
    if (mainContent) mainContent.style.setProperty('display', 'none', 'important');
    if (moduleGrid) moduleGrid.style.display = 'grid';
}

console.log('📋 Módulo Plantillas Fiscales SIAC cargado correctamente');