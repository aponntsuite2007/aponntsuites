// SIAC - Módulo de Gestión de Clientes
console.log('🏢 [CLIENTES] Módulo de Gestión de Clientes SIAC cargado');

// Estado global del módulo
let clientesState = {
    clientes: [],
    categorias: ['A', 'B', 'C'],
    condicionesIVA: ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'],
    currentFilter: 'all',
    sessionId: null
};

// Función principal
function showClientesContent() {
    console.log('🏢 [CLIENTES] Iniciando módulo de gestión de clientes');

    // Buscar contenedor
    let content = document.getElementById('mainContent');
    if (!content) {
        content = document.querySelector('.content');
        if (!content) {
            content = document.createElement('div');
            content.id = 'clientesContainer';
            content.style.cssText = 'padding: 20px; width: 100%; min-height: 500px; background: white;';
            document.body.appendChild(content);
        }
    }

    content.style.display = 'block';
    content.style.visibility = 'visible';
    content.style.opacity = '1';

    content.innerHTML = `
        <div class="tab-content active">
            <div class="clientes-container" style="padding: 20px;">
                <!-- Back Button -->
                <div style="margin-bottom: 20px;">
                    <button onclick="goBackToModules()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        ← Volver a Módulos
                    </button>
                </div>

                <!-- Header -->
                <div class="clientes-header" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">🏢 Gestión de Clientes</h2>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema Integrado de Administración Comercial - SIAC</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: bold;" id="totalClientesCount">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Clientes Activos</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <button onclick="crearCliente()" class="action-btn" style="background: #28a745; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">👤</span> Nuevo Cliente
                    </button>
                    <button onclick="importarClientes()" class="action-btn" style="background: #17a2b8; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">📤</span> Importar
                    </button>
                    <button onclick="exportarClientes()" class="action-btn" style="background: #ffc107; color: #333; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">📊</span> Exportar
                    </button>
                    <button onclick="mostrarReportes()" class="action-btn" style="background: #6f42c1; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">📈</span> Reportes
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="search-filters" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: center;">
                        <input type="text" id="searchClientes" placeholder="🔍 Buscar clientes por nombre, CUIT, email..." style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <select id="categoriaFilter" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Todas las categorías</option>
                            <option value="A">Categoría A</option>
                            <option value="B">Categoría B</option>
                            <option value="C">Categoría C</option>
                        </select>
                        <select id="estadoFilter" style="padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
                            <option value="">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="inactivo">Inactivos</option>
                        </select>
                    </div>
                </div>

                <!-- Clientes Table -->
                <div class="clientes-table" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">📋 Lista de Clientes</h3>
                        <span id="clientesCount" style="color: #666; font-size: 14px;">0 clientes encontrados</span>
                    </div>

                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa; border-bottom: 2px solid #e9ecef;">
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Código</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Razón Social</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">CUIT</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Email</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #495057;">Categoría</th>
                                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #495057;">Estado</th>
                                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #495057;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="clientesTableBody">
                                <!-- Se llenará dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Statistics -->
                <div class="statistics" style="background: white; border-radius: 12px; padding: 20px; margin-top: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333;">📊 Estadísticas</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="stat-card" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="clientesActivos">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Clientes Activos</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="clientesCategoriaA">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Categoría A</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="facturacionMes">$0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Facturación del Mes</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="nuevosEsteMes">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Nuevos este mes</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicializar el sistema
    initializeClientesSystem();
    loadClientes();
    updateStatistics();
}

// Inicializar sistema de clientes
function initializeClientesSystem() {
    // Obtener sessionId para SIAC
    clientesState.sessionId = generateSessionId();

    // Cargar clientes de ejemplo
    clientesState.clientes = [
        {
            id: 1,
            codigo: 'CLI001',
            razonSocial: 'Empresa Ejemplo SA',
            cuit: '30-12345678-9',
            email: 'contacto@empresa.com',
            telefono: '011-4444-5555',
            categoria: 'A',
            condicionIVA: 'Responsable Inscripto',
            estado: 'activo',
            saldo: 15000,
            fechaAlta: '2025-01-15',
            direccion: 'Av. Corrientes 1234, CABA'
        },
        {
            id: 2,
            codigo: 'CLI002',
            razonSocial: 'Juan Pérez',
            cuit: '20-87654321-5',
            email: 'juan.perez@email.com',
            telefono: '011-5555-6666',
            categoria: 'B',
            condicionIVA: 'Monotributista',
            estado: 'activo',
            saldo: 0,
            fechaAlta: '2025-02-20',
            direccion: 'San Martín 567, CABA'
        }
    ];

    console.log('✅ [CLIENTES] Sistema inicializado con sessionId:', clientesState.sessionId);
}

// Generar session ID para SIAC
function generateSessionId() {
    const companyId = 4; // Empresa actual
    const terminalId = 'WEB01';
    const timestamp = Date.now();
    return `SIAC_${companyId}_${terminalId}_${timestamp}`;
}

// Cargar clientes en la tabla
function loadClientes() {
    const tbody = document.getElementById('clientesTableBody');
    if (!tbody) return;

    const filteredClientes = clientesState.clientes;

    tbody.innerHTML = filteredClientes.map(cliente => `
        <tr style="border-bottom: 1px solid #e9ecef; transition: background-color 0.2s;">
            <td style="padding: 12px; font-weight: 500;">${cliente.codigo}</td>
            <td style="padding: 12px;">${cliente.razonSocial}</td>
            <td style="padding: 12px; font-family: monospace;">${cliente.cuit}</td>
            <td style="padding: 12px; color: #007bff;">${cliente.email}</td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${getCategoriaColor(cliente.categoria)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${cliente.categoria}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${cliente.estado === 'activo' ? '#28a745' : '#dc3545'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${cliente.estado === 'activo' ? '✓ Activo' : '✗ Inactivo'}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="editarCliente(${cliente.id})" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">
                    ✏️ Editar
                </button>
                <button onclick="verDetalleCliente(${cliente.id})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `).join('');

    updateClientesCount();
}

// Obtener color por categoría
function getCategoriaColor(categoria) {
    const colors = {
        'A': '#e74c3c', // Rojo
        'B': '#f39c12', // Naranja
        'C': '#2ecc71'  // Verde
    };
    return colors[categoria] || '#6c757d';
}

// Actualizar contador
function updateClientesCount() {
    const count = clientesState.clientes.length;
    document.getElementById('totalClientesCount').textContent = count;
    document.getElementById('clientesCount').textContent = `${count} clientes encontrados`;
}

// Actualizar estadísticas
function updateStatistics() {
    const activos = clientesState.clientes.filter(c => c.estado === 'activo').length;
    const categoriaA = clientesState.clientes.filter(c => c.categoria === 'A').length;

    document.getElementById('clientesActivos').textContent = activos;
    document.getElementById('clientesCategoriaA').textContent = categoriaA;
    document.getElementById('facturacionMes').textContent = '$45.230';
    document.getElementById('nuevosEsteMes').textContent = '12';
}

// Funciones de acciones
function crearCliente() {
    alert('🏢 Abrir modal de creación de cliente\n\n• Datos fiscales\n• Información de contacto\n• Condiciones comerciales\n• Integración con sistema SIAC');
}

function editarCliente(id) {
    const cliente = clientesState.clientes.find(c => c.id === id);
    if (cliente) {
        alert(`✏️ Editar cliente: ${cliente.razonSocial}\n\nSessionId: ${clientesState.sessionId}`);
    }
}

function verDetalleCliente(id) {
    const cliente = clientesState.clientes.find(c => c.id === id);
    if (cliente) {
        alert(`👁️ Detalle del cliente:\n\n${cliente.razonSocial}\nCUIT: ${cliente.cuit}\nCategoría: ${cliente.categoria}\nSaldo: $${cliente.saldo}`);
    }
}

function importarClientes() {
    alert('📤 Importar clientes desde Excel/CSV\n\n• Validación de CUIT\n• Verificación de duplicados\n• Mapeo de campos\n• Integración SIAC');
}

function exportarClientes() {
    alert('📊 Exportar clientes:\n\n• Excel\n• PDF\n• CSV\n• Reportes personalizados');
}

function mostrarReportes() {
    alert('📈 Reportes de clientes:\n\n• Por categoría\n• Facturación\n• Saldos\n• Análisis de ventas');
}

// Función para volver al grid de módulos
function goBackToModules() {
    const mainContent = document.getElementById('mainContent');
    const moduleGrid = document.querySelector('.module-grid');

    if (mainContent) {
        mainContent.style.display = 'none';
    }

    if (moduleGrid) {
        moduleGrid.style.display = 'grid';
    }
}

// Exportar funciones
window.showClientesContent = showClientesContent;
window.goBackToModules = goBackToModules;

console.log('✅ [CLIENTES] Sistema de Gestión de Clientes SIAC v1.0 cargado');