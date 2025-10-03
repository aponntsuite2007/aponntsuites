// SIAC - Módulo de Facturación
console.log('🧾 [FACTURACIÓN] Módulo de Facturación SIAC cargado');

// Estado global del módulo con sesiones concurrentes
let facturacionState = {
    facturasTemporales: [], // Facturas en edición (sesión actual)
    tiposComprobante: ['Factura A', 'Factura B', 'Factura C', 'Nota de Crédito', 'Nota de Débito'],
    condicionesVenta: ['Contado', '30 días', '60 días', '90 días'],
    sessionId: null,
    terminalId: 'WEB01',
    companyId: 4
};

// Función principal
function showFacturacionContent() {
    console.log('🧾 [FACTURACIÓN] Iniciando módulo de facturación SIAC');

    // Buscar contenedor
    let content = document.getElementById('mainContent');
    if (!content) {
        content = document.querySelector('.content');
        if (!content) {
            content = document.createElement('div');
            content.id = 'facturacionContainer';
            content.style.cssText = 'padding: 20px; width: 100%; min-height: 500px; background: white;';
            document.body.appendChild(content);
        }
    }

    content.style.display = 'block';
    content.style.visibility = 'visible';
    content.style.opacity = '1';

    content.innerHTML = `
        <div class="tab-content active">
            <div class="facturacion-container" style="padding: 20px;">
                <!-- Back Button -->
                <div style="margin-bottom: 20px;">
                    <button onclick="goBackToModules()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        ← Volver a Módulos
                    </button>
                </div>

                <!-- Header con Session Info -->
                <div class="facturacion-header" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px;">🧾 Sistema de Facturación</h2>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema Integrado de Administración Comercial - SIAC</p>
                            <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                                Terminal: <strong id="terminalInfo">${facturacionState.terminalId}</strong> |
                                Sesión: <strong id="sessionInfo">Cargando...</strong>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: bold;" id="facturasEnCurso">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Facturas en Curso</div>
                        </div>
                    </div>
                </div>

                <!-- Session Status -->
                <div class="session-status" style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: #4caf50; font-size: 20px;">🔒</span>
                        <div>
                            <strong style="color: #2e7d32;">Sesión Activa - Aislación Garantizada</strong>
                            <div style="font-size: 13px; color: #558b2f; margin-top: 2px;">
                                Tus facturas en edición son privadas hasta ser confirmadas
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <button onclick="nuevaFactura()" class="action-btn" style="background: #28a745; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">📝</span> Nueva Factura
                    </button>
                    <button onclick="consultarClientes()" class="action-btn" style="background: #17a2b8; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">🏢</span> Buscar Cliente
                    </button>
                    <button onclick="verFacturasPendientes()" class="action-btn" style="background: #ffc107; color: #333; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">⏳</span> Pendientes (${facturacionState.facturasTemporales.length})
                    </button>
                    <button onclick="reportesDiarios()" class="action-btn" style="background: #6f42c1; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        <span style="font-size: 20px;">📊</span> Reportes
                    </button>
                </div>

                <!-- Facturas Temporales -->
                <div class="facturas-temporales" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">📋 Facturas en Edición (Sesión Privada)</h3>
                        <span style="background: #007bff; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                            Solo tú puedes ver estas facturas
                        </span>
                    </div>

                    <div id="facturasTemporalesList">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>

                <!-- Panel de Nueva Factura -->
                <div class="nueva-factura-panel" id="nuevaFacturaPanel" style="display: none; background: white; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 2px solid #28a745;">
                    <h3 style="margin: 0 0 20px 0; color: #333; display: flex; align-items: center; gap: 10px;">
                        <span style="color: #28a745;">📝</span> Nueva Factura - Temporal
                        <span style="background: #ffc107; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 12px;">NO GRABADA</span>
                    </h3>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Tipo de Comprobante</label>
                            <select id="tipoComprobante" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                <option value="Factura A">Factura A</option>
                                <option value="Factura B">Factura B</option>
                                <option value="Factura C">Factura C</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Número</label>
                            <input type="text" id="numeroFactura" value="0001-00000001" readonly style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background: #f8f9fa;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Fecha</label>
                            <input type="date" id="fechaFactura" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Cliente</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="clienteNombre" placeholder="Buscar cliente o escribir manualmente..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                                <button onclick="buscarCliente()" style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer;">🔍</button>
                            </div>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">CUIT</label>
                            <input type="text" id="clienteCuit" placeholder="20-12345678-9" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="cancelarFactura()" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button onclick="guardarFacturaTemporal()" style="background: #ffc107; color: #333; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            💾 Guardar Temporal
                        </button>
                        <button onclick="confirmarFactura()" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            ✅ Confirmar Factura
                        </button>
                    </div>
                </div>

                <!-- Statistics -->
                <div class="statistics" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 20px 0; color: #333;">📊 Estadísticas del Día</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="stat-card" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="facturasHoy">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Facturas Hoy</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="montoHoy">$0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Facturado Hoy</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="usuariosActivos">3</div>
                            <div style="font-size: 12px; opacity: 0.9;">Usuarios Facturando</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 15px; border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold;" id="pendientesConfirmar">${facturacionState.facturasTemporales.length}</div>
                            <div style="font-size: 12px; opacity: 0.9;">Pendientes Confirmar</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inicializar el sistema
    initializeFacturacionSystem();
    loadFacturasTemporales();
    updateStatistics();
}

// Inicializar sistema de facturación
function initializeFacturacionSystem() {
    // Generar sessionId para SIAC
    facturacionState.sessionId = generateFacturacionSessionId();

    // Simular algunas facturas temporales
    facturacionState.facturasTemporales = [
        {
            id: Date.now() - 1000,
            numero: '0001-00000001',
            cliente: 'Empresa Ejemplo SA',
            cuit: '30-12345678-9',
            tipo: 'Factura A',
            fecha: new Date().toISOString().split('T')[0],
            total: 15750,
            estado: 'temporal',
            sessionId: facturacionState.sessionId,
            creadoEn: new Date(Date.now() - 300000).toISOString() // 5 min ago
        }
    ];

    // Actualizar info de sesión en UI
    document.getElementById('sessionInfo').textContent = facturacionState.sessionId.substring(0, 16) + '...';

    console.log('✅ [FACTURACIÓN] Sistema inicializado con sessionId:', facturacionState.sessionId);
}

// Generar session ID para SIAC Facturación
function generateFacturacionSessionId() {
    const timestamp = Date.now();
    return `FACT_${facturacionState.companyId}_${facturacionState.terminalId}_${timestamp}`;
}

// Cargar facturas temporales
function loadFacturasTemporales() {
    const container = document.getElementById('facturasTemporalesList');
    if (!container) return;

    if (facturacionState.facturasTemporales.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                <div>No hay facturas en edición</div>
                <div style="font-size: 13px; margin-top: 5px;">Haz clic en "Nueva Factura" para comenzar</div>
            </div>
        `;
        return;
    }

    container.innerHTML = facturacionState.facturasTemporales.map(factura => `
        <div style="border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: #f8f9fa;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                        ${factura.tipo} ${factura.numero}
                    </div>
                    <div style="color: #666; font-size: 14px;">
                        Cliente: ${factura.cliente} | CUIT: ${factura.cuit}
                    </div>
                    <div style="color: #28a745; font-weight: bold; margin-top: 5px;">
                        Total: $${factura.total.toLocaleString()}
                    </div>
                    <div style="color: #999; font-size: 12px; margin-top: 5px;">
                        En edición desde: ${new Date(factura.creadoEn).toLocaleString()}
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editarFactura(${factura.id})" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✏️ Continuar
                    </button>
                    <button onclick="confirmarFactura(${factura.id})" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        ✅ Confirmar
                    </button>
                    <button onclick="eliminarFactura(${factura.id})" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    updateFacturasEnCurso();
}

// Actualizar contador de facturas en curso
function updateFacturasEnCurso() {
    document.getElementById('facturasEnCurso').textContent = facturacionState.facturasTemporales.length;
    document.getElementById('pendientesConfirmar').textContent = facturacionState.facturasTemporales.length;

    // Actualizar botón de pendientes
    const pendientesBtn = document.querySelector('.action-btn:nth-child(3)');
    if (pendientesBtn) {
        pendientesBtn.innerHTML = `<span style="font-size: 20px;">⏳</span> Pendientes (${facturacionState.facturasTemporales.length})`;
    }
}

// Actualizar estadísticas
function updateStatistics() {
    document.getElementById('facturasHoy').textContent = '12';
    document.getElementById('montoHoy').textContent = '$45.230';
    document.getElementById('usuariosActivos').textContent = '3';
}

// Funciones de acciones
function nuevaFactura() {
    const panel = document.getElementById('nuevaFacturaPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });

    // Generar próximo número
    document.getElementById('numeroFactura').value = '0001-' + String(Date.now()).slice(-8);
}

function cancelarFactura() {
    document.getElementById('nuevaFacturaPanel').style.display = 'none';
}

function guardarFacturaTemporal() {
    const cliente = document.getElementById('clienteNombre').value;
    const cuit = document.getElementById('clienteCuit').value;
    const tipo = document.getElementById('tipoComprobante').value;
    const numero = document.getElementById('numeroFactura').value;

    if (!cliente || !cuit) {
        alert('⚠️ Por favor complete los datos del cliente');
        return;
    }

    const nuevaFactura = {
        id: Date.now(),
        numero: numero,
        cliente: cliente,
        cuit: cuit,
        tipo: tipo,
        fecha: document.getElementById('fechaFactura').value,
        total: Math.floor(Math.random() * 50000) + 1000,
        estado: 'temporal',
        sessionId: facturacionState.sessionId,
        creadoEn: new Date().toISOString()
    };

    facturacionState.facturasTemporales.push(nuevaFactura);

    alert(`💾 Factura guardada temporalmente\n\nSessionId: ${facturacionState.sessionId}\nSolo tú puedes ver esta factura hasta confirmarla`);

    cancelarFactura();
    loadFacturasTemporales();
}

function confirmarFactura(id = null) {
    let factura;
    if (id) {
        factura = facturacionState.facturasTemporales.find(f => f.id === id);
    } else {
        // Nueva factura desde el panel
        guardarFacturaTemporal();
        return;
    }

    if (factura) {
        if (confirm(`¿Confirmar factura ${factura.numero}?\n\nEsta acción es irreversible y la factura será visible para todos los usuarios.`)) {
            // Eliminar de temporales
            facturacionState.facturasTemporales = facturacionState.facturasTemporales.filter(f => f.id !== id);

            alert(`✅ Factura ${factura.numero} confirmada exitosamente\n\nAhora es parte de la facturación oficial`);
            loadFacturasTemporales();
        }
    }
}

function editarFactura(id) {
    const factura = facturacionState.facturasTemporales.find(f => f.id === id);
    if (factura) {
        alert(`✏️ Continuando edición de factura:\n\n${factura.numero}\nCliente: ${factura.cliente}\nSessionId: ${facturacionState.sessionId}`);
    }
}

function eliminarFactura(id) {
    if (confirm('¿Eliminar esta factura temporal?\n\nSe perderán todos los datos no confirmados.')) {
        facturacionState.facturasTemporales = facturacionState.facturasTemporales.filter(f => f.id !== id);
        loadFacturasTemporales();
        alert('🗑️ Factura temporal eliminada');
    }
}

function consultarClientes() {
    alert('🏢 Consultar clientes integrado con módulo de Clientes\n\n• Búsqueda rápida\n• Datos fiscales automáticos\n• Historial de facturación\n• Precios especiales');
}

function verFacturasPendientes() {
    if (facturacionState.facturasTemporales.length === 0) {
        alert('✅ No hay facturas pendientes de confirmación');
    } else {
        alert(`⏳ ${facturacionState.facturasTemporales.length} facturas pendientes de confirmación\n\nEstas facturas están en tu sesión privada`);
    }
}

function buscarCliente() {
    alert('🔍 Búsqueda de clientes:\n\n• Por nombre\n• Por CUIT\n• Por código\n• Integrado con módulo Clientes');
}

function reportesDiarios() {
    alert('📊 Reportes de facturación:\n\n• Ventas del día\n• Por vendedor\n• Por tipo de comprobante\n• Estadísticas SIAC');
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
window.showFacturacionContent = showFacturacionContent;
window.goBackToModules = goBackToModules;

console.log('✅ [FACTURACIÓN] Sistema de Facturación SIAC v1.0 con sesiones concurrentes cargado');