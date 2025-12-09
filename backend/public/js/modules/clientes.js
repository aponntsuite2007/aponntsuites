// SIAC - Módulo de Gestión de Clientes (DARK THEME + AFIP + MULTI-PAÍS)
console.log('🏢 [CLIENTES] Módulo de Gestión de Clientes SIAC v2.0 cargado (Dark Theme + AFIP)');

// ============================================
// DARK THEME PALETTE
// ============================================
const DARK_COLORS = {
    background: '#0f1419',
    cardBg: '#1a1f2e',
    cardBgHover: '#242938',
    headerBg: 'linear-gradient(135deg, #1e3a5f 0%, #2c5f8d 100%)',
    primary: '#4a9eff',
    primaryHover: '#6bb3ff',
    success: '#3dd56d',
    warning: '#ffb84d',
    danger: '#ff6b6b',
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    border: '#2d3748',
    inputBg: '#151a23',
    inputBorder: '#3a4556'
};

// ============================================
// ESTADO GLOBAL DEL MÓDULO
// ============================================
let clientesState = {
    clientes: [],
    categorias: ['A', 'B', 'C'],
    paises: [],
    taxTemplates: {},
    condicionesFiscales: {},
    currentFilter: 'all',
    sessionId: null,
    companyId: parseInt(localStorage.getItem('company_id') || '4'),
    token: localStorage.getItem('token')
};

// ============================================
// SISTEMA DE AYUDA CONTEXTUAL
// ============================================
const ClientesHelpSystem = {
    moduleName: 'Gestión de Clientes SIAC',
    contexts: {
        lista: {
            title: 'Lista de Clientes',
            tips: [
                '💡 Los clientes se gestionan por empresa. Cada empresa ve solo sus clientes.',
                '🌎 Sistema multi-país: Los campos fiscales se adaptan automáticamente (CUIT, RUT, RUC, RFC, CNPJ, NIT).',
                '💳 Condiciones comerciales: Habilita cuenta corriente, plazo de pago y crédito máximo por cliente.'
            ],
            warnings: [
                '⚠️ Los cambios en condiciones fiscales pueden afectar la facturación electrónica.',
                '⚠️ El bloqueo por crédito impide la facturación automática.'
            ]
        },
        crear: {
            title: 'Crear Cliente',
            tips: [
                '✅ Campos obligatorios: Razón social, país, identificación fiscal (CUIT/RUT/RUC/etc.)',
                '🌎 El campo de identificación fiscal cambia según el país seleccionado.',
                '📍 La dirección completa es necesaria para facturación electrónica en Argentina (AFIP).',
                '💰 Crédito disponible = Crédito máximo - Crédito utilizado (se calcula automáticamente).'
            ]
        },
        editar: {
            title: 'Editar Cliente',
            tips: [
                '⚠️ Cambiar la condición fiscal puede afectar facturas futuras.',
                '🔒 Si el cliente tiene facturas emitidas, algunos campos no se pueden modificar.',
                '💳 Al cambiar crédito máximo, verifica que no quede bloqueado por exceso.'
            ]
        }
    },

    renderBanner(context) {
        const ctx = this.contexts[context];
        if (!ctx) return '';

        return `
            <div style="background: ${DARK_COLORS.cardBg}; border: 1px solid ${DARK_COLORS.primary}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px; flex-shrink: 0;">💡</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: ${DARK_COLORS.text}; margin-bottom: 8px;">${ctx.title}</div>
                        ${ctx.tips.map(tip => `<div style="color: ${DARK_COLORS.textSecondary}; font-size: 13px; margin-bottom: 4px;">${tip}</div>`).join('')}
                        ${ctx.warnings && ctx.warnings.length > 0 ? ctx.warnings.map(warn => `<div style="color: ${DARK_COLORS.warning}; font-size: 13px; margin-top: 8px;">${warn}</div>`).join('') : ''}
                    </div>
                </div>
            </div>
        `;
    }
};

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================
function showClientesContent() {
    console.log('🏢 [CLIENTES] Iniciando módulo de gestión de clientes v2.0');

    // Buscar contenedor
    let content = document.getElementById('mainContent');
    if (!content) {
        content = document.querySelector('.content');
        if (!content) {
            content = document.createElement('div');
            content.id = 'clientesContainer';
            content.style.cssText = `padding: 20px; width: 100%; min-height: 500px; background: ${DARK_COLORS.background};`;
            document.body.appendChild(content);
        }
    }

    content.style.setProperty('display', 'block', 'important');
    content.style.setProperty('background', DARK_COLORS.background, 'important');
    content.style.visibility = 'visible';
    content.style.opacity = '1';

    content.innerHTML = `
        <div class="tab-content active">
            <div class="clientes-container" style="padding: 20px;">
                <!-- Back Button -->
                <div style="margin-bottom: 20px;">
                    <button onclick="goBackToModules()" style="background: ${DARK_COLORS.cardBg}; color: ${DARK_COLORS.text}; padding: 10px 20px; border: 1px solid ${DARK_COLORS.border}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s;">
                        ← Volver a Módulos
                    </button>
                </div>

                <!-- Header -->
                <div class="clientes-header" style="background: ${DARK_COLORS.headerBg}; color: ${DARK_COLORS.text}; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 28px; color: ${DARK_COLORS.text};">🏢 Gestión de Clientes</h2>
                            <p style="margin: 10px 0 0 0; opacity: 0.9; color: ${DARK_COLORS.textSecondary};">Sistema Integrado de Administración Comercial - SIAC v2.0</p>
                            <div style="font-size: 12px; opacity: 0.7; margin-top: 5px; color: ${DARK_COLORS.textSecondary};">
                                Multi-país • AFIP Ready • Condiciones Comerciales
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 32px; font-weight: bold; color: ${DARK_COLORS.primary};" id="totalClientesCount">0</div>
                            <div style="font-size: 12px; opacity: 0.9; color: ${DARK_COLORS.textSecondary};">Clientes Activos</div>
                        </div>
                    </div>
                </div>

                <!-- Help Banner -->
                ${ClientesHelpSystem.renderBanner('lista')}

                <!-- Quick Actions -->
                <div class="quick-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <button onclick="crearCliente()" class="action-btn" style="background: ${DARK_COLORS.success}; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(61,213,109,0.3);">
                        <span style="font-size: 20px;">👤</span> Nuevo Cliente
                    </button>
                    <button onclick="importarClientes()" class="action-btn" style="background: ${DARK_COLORS.primary}; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(74,158,255,0.3);">
                        <span style="font-size: 20px;">📤</span> Importar
                    </button>
                    <button onclick="exportarClientes()" class="action-btn" style="background: ${DARK_COLORS.warning}; color: #1a1f2e; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(255,184,77,0.3);">
                        <span style="font-size: 20px;">📊</span> Exportar
                    </button>
                    <button onclick="mostrarReportes()" class="action-btn" style="background: #6f42c1; color: white; padding: 15px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 8px rgba(111,66,193,0.3);">
                        <span style="font-size: 20px;">📈</span> Reportes
                    </button>
                </div>

                <!-- Search and Filters -->
                <div class="search-filters" style="background: ${DARK_COLORS.cardBg}; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: center;">
                        <input type="text" id="searchClientes" placeholder="🔍 Buscar clientes por nombre, CUIT/RUT/RUC, email..." style="padding: 12px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.inputBg}; color: ${DARK_COLORS.text}; border-radius: 6px; font-size: 14px;">
                        <select id="categoriaFilter" style="padding: 12px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.inputBg}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            <option value="">Todas las categorías</option>
                            <option value="A">Categoría A</option>
                            <option value="B">Categoría B</option>
                            <option value="C">Categoría C</option>
                        </select>
                        <select id="estadoFilter" style="padding: 12px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.inputBg}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            <option value="">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="inactivo">Inactivos</option>
                        </select>
                    </div>
                </div>

                <!-- Clientes Table -->
                <div class="clientes-table" style="background: ${DARK_COLORS.cardBg}; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: ${DARK_COLORS.text};">📋 Lista de Clientes</h3>
                        <span id="clientesCount" style="color: ${DARK_COLORS.textSecondary}; font-size: 14px;">0 clientes encontrados</span>
                    </div>

                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: ${DARK_COLORS.inputBg}; border-bottom: 2px solid ${DARK_COLORS.border};">
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Código</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Razón Social</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Fiscal ID</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS.textSecondary};">País</th>
                                    <th style="padding: 12px; text-align: left; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Categoría</th>
                                    <th style="padding: 12px; text-align: center; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Estado</th>
                                    <th style="padding: 12px; text-align: center; font-weight: 600; color: ${DARK_COLORS.textSecondary};">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="clientesTableBody">
                                <!-- Se llenará dinámicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Statistics -->
                <div class="statistics" style="background: ${DARK_COLORS.cardBg}; border-radius: 12px; padding: 20px; margin-top: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    <h3 style="margin: 0 0 20px 0; color: ${DARK_COLORS.text};">📊 Estadísticas</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="stat-card" style="background: linear-gradient(135deg, ${DARK_COLORS.success} 0%, #2ba857 100%); padding: 15px; border-radius: 8px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(61,213,109,0.3);">
                            <div style="font-size: 32px; font-weight: bold;" id="clientesActivos">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Clientes Activos</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, ${DARK_COLORS.warning} 0%, #e69a3a 100%); padding: 15px; border-radius: 8px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(255,184,77,0.3);">
                            <div style="font-size: 32px; font-weight: bold;" id="clientesCategoriaA">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Categoría A</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, ${DARK_COLORS.primary} 0%, #3a86d9 100%); padding: 15px; border-radius: 8px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(74,158,255,0.3);">
                            <div style="font-size: 32px; font-weight: bold;" id="facturacionMes">$0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Facturación del Mes</div>
                        </div>
                        <div class="stat-card" style="background: linear-gradient(135deg, #6f42c1 0%, #5a3499 100%); padding: 15px; border-radius: 8px; color: white; text-align: center; box-shadow: 0 2px 8px rgba(111,66,193,0.3);">
                            <div style="font-size: 32px; font-weight: bold;" id="nuevosEsteMes">0</div>
                            <div style="font-size: 12px; opacity: 0.9;">Nuevos este mes</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL CREAR/EDITAR CLIENTE -->
        <div id="modalCliente" style="display: none !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; padding: 20px;" onclick="if(event.target.id === 'modalCliente') cerrarModalCliente()">
            <div style="background: ${DARK_COLORS.cardBg}; max-width: 900px; width: 100%; border-radius: 12px; padding: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto;" onclick="event.stopPropagation();">
                <h3 id="modalClienteTitulo" style="margin: 0 0 20px 0; color: ${DARK_COLORS.text};">👤 Nuevo Cliente</h3>

                <!-- Help Banner en Modal -->
                ${ClientesHelpSystem.renderBanner('crear')}

                <form id="formCliente" onsubmit="guardarCliente(event)">
                    <!-- Sección 1: Datos Básicos -->
                    <div style="background: ${DARK_COLORS.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS.primary}; font-size: 16px;">📋 Datos Básicos</h4>

                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Razón Social / Nombre *</label>
                                <input type="text" id="clienteRazonSocial" required style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Categoría</label>
                                <select id="clienteCategoria" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                    <option value="A">A - Premium</option>
                                    <option value="B" selected>B - Estándar</option>
                                    <option value="C">C - Básico</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Email</label>
                                <input type="email" id="clienteEmail" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Teléfono</label>
                                <input type="text" id="clienteTelefono" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                        </div>
                    </div>

                    <!-- Sección 2: Datos Fiscales (Multi-País) -->
                    <div style="background: ${DARK_COLORS.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS.primary}; font-size: 16px;">🌎 Datos Fiscales (Multi-País)</h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">País *</label>
                                <select id="clientePais" onchange="cambiarPais()" required style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                    <option value="Argentina">🇦🇷 Argentina</option>
                                    <option value="Chile">🇨🇱 Chile</option>
                                    <option value="Perú">🇵🇪 Perú</option>
                                    <option value="México">🇲🇽 México</option>
                                    <option value="Brasil">🇧🇷 Brasil</option>
                                    <option value="Colombia">🇨🇴 Colombia</option>
                                </select>
                            </div>
                            <div>
                                <label id="labelFiscalId" style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">CUIT *</label>
                                <input type="text" id="clienteFiscalId" required placeholder="XX-XXXXXXXX-X" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                <small id="helpFiscalId" style="color: ${DARK_COLORS.textSecondary}; font-size: 11px;">Formato: XX-XXXXXXXX-X</small>
                            </div>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Condición Fiscal</label>
                            <select id="clienteCondicionFiscal" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                <!-- Se llenará dinámicamente según país -->
                            </select>
                        </div>
                    </div>

                    <!-- Sección 3: Dirección Completa -->
                    <div style="background: ${DARK_COLORS.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS.primary}; font-size: 16px;">📍 Dirección Completa</h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Provincia / Estado</label>
                                <input type="text" id="clienteProvincia" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Localidad / Ciudad</label>
                                <input type="text" id="clienteLocalidad" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 3fr 1fr 1fr 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Calle</label>
                                <input type="text" id="clienteCalle" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Número</label>
                                <input type="text" id="clienteNumero" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Piso</label>
                                <input type="text" id="clientePiso" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Dto.</label>
                                <input type="text" id="clienteDepartamento" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">CP</label>
                                <input type="text" id="clienteCodigoPostal" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                        </div>
                    </div>

                    <!-- Sección 4: Condiciones Comerciales -->
                    <div style="background: ${DARK_COLORS.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS.primary}; font-size: 16px;">💳 Condiciones Comerciales</h4>

                        <div style="margin-bottom: 15px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" id="clienteCuentaCorriente" onchange="toggleCuentaCorriente()">
                                <span style="color: ${DARK_COLORS.text};">Habilitar Cuenta Corriente</span>
                            </label>
                        </div>

                        <div id="ccFields" style="display: none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Plazo de Pago (días)</label>
                                    <input type="number" id="clientePlazoPago" value="30" min="0" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Crédito Máximo ($)</label>
                                    <input type="number" id="clienteCreditoMaximo" value="0" min="0" step="0.01" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Bloquear por vencimiento</label>
                                    <input type="checkbox" id="clienteBloqueoPorVencimiento" style="margin-top: 10px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sección 5: Datos Bancarios (Opcional) -->
                    <div style="background: ${DARK_COLORS.inputBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: ${DARK_COLORS.primary}; font-size: 16px;">🏦 Datos Bancarios (Opcional)</h4>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Banco</label>
                                <input type="text" id="clienteBanco" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">CBU (Argentina)</label>
                                <input type="text" id="clienteCBU" placeholder="22 dígitos" maxlength="22" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                            </div>
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 5px; color: ${DARK_COLORS.textSecondary}; font-weight: 500;">Alias CBU</label>
                            <input type="text" id="clienteAliasCBU" style="width: 100%; padding: 10px; border: 1px solid ${DARK_COLORS.inputBorder}; background: ${DARK_COLORS.background}; color: ${DARK_COLORS.text}; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Botones -->
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="cerrarModalCliente()" style="background: ${DARK_COLORS.cardBg}; color: ${DARK_COLORS.text}; padding: 12px 24px; border: 1px solid ${DARK_COLORS.border}; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            Cancelar
                        </button>
                        <button type="submit" style="background: ${DARK_COLORS.success}; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                            ✅ Guardar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Inicializar el sistema
    initializeClientesSystem();
    loadClientes();
    updateStatistics();
    cargarTaxTemplates();

    // Asegurar que el modal esté cerrado al iniciar
    const modal = document.getElementById('modalCliente');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
}

// ============================================
// INICIALIZAR SISTEMA
// ============================================
function initializeClientesSystem() {
    clientesState.sessionId = generateSessionId();
    console.log('✅ [CLIENTES] Sistema inicializado con sessionId:', clientesState.sessionId);
}

function generateSessionId() {
    const timestamp = Date.now();
    return `CLIENTES_${clientesState.companyId}_WEB01_${timestamp}`;
}

// ============================================
// CAMBIO DE PAÍS - PARAMETRIZACIÓN DINÁMICA
// ============================================
async function cambiarPais() {
    const pais = document.getElementById('clientePais').value;
    const labelFiscalId = document.getElementById('labelFiscalId');
    const inputFiscalId = document.getElementById('clienteFiscalId');
    const helpFiscalId = document.getElementById('helpFiscalId');
    const selectCondicionFiscal = document.getElementById('clienteCondicionFiscal');

    // Mapeo de países a códigos ISO
    const paisCodes = {
        'Argentina': 'AR',
        'Chile': 'CL',
        'Perú': 'PE',
        'México': 'MX',
        'Brasil': 'BR',
        'Colombia': 'CO'
    };

    const countryCode = paisCodes[pais] || 'AR';

    // Obtener tax template del país
    try {
        const response = await fetch(`/api/siac/tax-templates?country=${countryCode}`, {
            headers: { 'Authorization': `Bearer ${clientesState.token}` }
        });

        const result = await response.json();

        if (result.success && result.template) {
            const template = result.template;

            // Actualizar label del campo fiscal
            labelFiscalId.textContent = `${template.tax_id_field_name} *`;
            inputFiscalId.placeholder = template.tax_id_format_mask;
            helpFiscalId.textContent = `Formato: ${template.tax_id_format_mask}`;

            // Cargar condiciones fiscales del país
            const condResponse = await fetch(`/api/siac/tax-conditions?country=${countryCode}`, {
                headers: { 'Authorization': `Bearer ${clientesState.token}` }
            });

            const condResult = await condResponse.json();

            if (condResult.success && condResult.conditions) {
                selectCondicionFiscal.innerHTML = condResult.conditions.map(c =>
                    `<option value="${c.code}">${c.name} - ${c.description}</option>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error al cambiar país:', error);
    }
}

// ============================================
// CARGAR TAX TEMPLATES
// ============================================
async function cargarTaxTemplates() {
    try {
        const response = await fetch('/api/siac/tax-templates', {
            headers: { 'Authorization': `Bearer ${clientesState.token}` }
        });

        const result = await response.json();

        if (result.success) {
            clientesState.taxTemplates = result.templates.reduce((acc, t) => {
                acc[t.country_code] = t;
                return acc;
            }, {});
        }
    } catch (error) {
        console.error('Error al cargar tax templates:', error);
    }
}

// ============================================
// TOGGLE CUENTA CORRIENTE
// ============================================
function toggleCuentaCorriente() {
    const checked = document.getElementById('clienteCuentaCorriente').checked;
    const fields = document.getElementById('ccFields');
    fields.style.display = checked ? 'block' : 'none';
}

// ============================================
// CREAR CLIENTE
// ============================================
function crearCliente() {
    document.getElementById('modalClienteTitulo').textContent = '👤 Nuevo Cliente';
    document.getElementById('formCliente').reset();
    document.getElementById('modalCliente').style.setProperty('display', 'flex', 'important');

    // Trigger cambiarPais para cargar datos de Argentina por defecto
    setTimeout(() => cambiarPais(), 100);
}

// ============================================
// CERRAR MODAL
// ============================================
function cerrarModalCliente() {
    document.getElementById('modalCliente').style.setProperty('display', 'none', 'important');
}

// ============================================
// GUARDAR CLIENTE
// ============================================
async function guardarCliente(event) {
    event.preventDefault();

    const clienteData = {
        company_id: clientesState.companyId,
        razon_social: document.getElementById('clienteRazonSocial').value,
        categoria_cliente: document.getElementById('clienteCategoria').value,
        email: document.getElementById('clienteEmail').value,
        telefono: document.getElementById('clienteTelefono').value,
        pais: document.getElementById('clientePais').value,
        cuit: document.getElementById('clienteFiscalId').value, // Campo genérico CUIT/RUT/RUC/etc
        condicion_fiscal_code: document.getElementById('clienteCondicionFiscal').value,
        provincia: document.getElementById('clienteProvincia').value,
        localidad: document.getElementById('clienteLocalidad').value,
        calle: document.getElementById('clienteCalle').value,
        numero: document.getElementById('clienteNumero').value,
        piso: document.getElementById('clientePiso').value,
        departamento: document.getElementById('clienteDepartamento').value,
        codigo_postal: document.getElementById('clienteCodigoPostal').value,
        cuenta_corriente_habilitada: document.getElementById('clienteCuentaCorriente').checked,
        plazo_pago_dias: parseInt(document.getElementById('clientePlazoPago').value) || 0,
        credito_maximo: parseFloat(document.getElementById('clienteCreditoMaximo').value) || 0,
        bloqueo_por_vencimiento: document.getElementById('clienteBloqueoPorVencimiento').checked,
        banco: document.getElementById('clienteBanco').value,
        cbu: document.getElementById('clienteCBU').value,
        alias_cbu: document.getElementById('clienteAliasCBU').value
    };

    try {
        const response = await fetch('/api/siac/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clientesState.token}`
            },
            body: JSON.stringify(clienteData)
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ Cliente creado exitosamente\n\nCódigo: ${result.cliente.codigo || result.cliente.id}`);
            cerrarModalCliente();
            loadClientes();
        } else {
            alert(`❌ Error al crear cliente:\n${result.error}`);
        }
    } catch (error) {
        console.error('Error al crear cliente:', error);
        alert('❌ Error de conexión al crear cliente');
    }
}

// ============================================
// CARGAR CLIENTES
// ============================================
async function loadClientes() {
    const tbody = document.getElementById('clientesTableBody');
    if (!tbody) return;

    try {
        const response = await fetch(`/api/siac/clientes?company_id=${clientesState.companyId}`, {
            headers: { 'Authorization': `Bearer ${clientesState.token}` }
        });

        const result = await response.json();

        if (result.success) {
            clientesState.clientes = result.clientes;
            renderClientesTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: ${DARK_COLORS.textSecondary};">Error al cargar clientes</td></tr>`;
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: ${DARK_COLORS.textSecondary};">Error de conexión</td></tr>`;
    }
}

function renderClientesTable() {
    const tbody = document.getElementById('clientesTableBody');

    if (clientesState.clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px; color: ${DARK_COLORS.textSecondary};">
                    <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                    <div>No hay clientes registrados</div>
                    <div style="font-size: 13px; margin-top: 5px;">Haz clic en "Nuevo Cliente" para comenzar</div>
                </td>
            </tr>
        `;
        updateClientesCount();
        return;
    }

    tbody.innerHTML = clientesState.clientes.map(cliente => `
        <tr style="border-bottom: 1px solid ${DARK_COLORS.border}; transition: background-color 0.2s;" onmouseover="this.style.background='${DARK_COLORS.cardBgHover}'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px; font-weight: 500; color: ${DARK_COLORS.text};">${cliente.codigo || cliente.id}</td>
            <td style="padding: 12px; color: ${DARK_COLORS.text};">${cliente.razon_social}</td>
            <td style="padding: 12px; font-family: monospace; color: ${DARK_COLORS.primary};">${cliente.cuit || 'N/A'}</td>
            <td style="padding: 12px; color: ${DARK_COLORS.textSecondary};">${cliente.pais || 'Argentina'}</td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${getCategoriaColor(cliente.categoria_cliente)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                    ${cliente.categoria_cliente || 'B'}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${cliente.estado === 'activo' ? DARK_COLORS.success : DARK_COLORS.danger}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${cliente.estado === 'activo' ? '✓ Activo' : '✗ Inactivo'}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="editarCliente(${cliente.id})" style="background: ${DARK_COLORS.primary}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">
                    ✏️ Editar
                </button>
                <button onclick="verDetalleCliente(${cliente.id})" style="background: ${DARK_COLORS.success}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `).join('');

    updateClientesCount();
}

function getCategoriaColor(categoria) {
    const colors = {
        'A': DARK_COLORS.danger,
        'B': DARK_COLORS.warning,
        'C': DARK_COLORS.success
    };
    return colors[categoria] || DARK_COLORS.textSecondary;
}

function updateClientesCount() {
    const count = clientesState.clientes.length;
    document.getElementById('totalClientesCount').textContent = count;
    document.getElementById('clientesCount').textContent = `${count} clientes encontrados`;
}

function updateStatistics() {
    const activos = clientesState.clientes.filter(c => c.estado === 'activo').length;
    const categoriaA = clientesState.clientes.filter(c => c.categoria_cliente === 'A').length;

    document.getElementById('clientesActivos').textContent = activos;
    document.getElementById('clientesCategoriaA').textContent = categoriaA;
    document.getElementById('facturacionMes').textContent = '$45.230';
    document.getElementById('nuevosEsteMes').textContent = '12';
}

// ============================================
// FUNCIONES DE ACCIONES
// ============================================
function editarCliente(id) {
    alert(`✏️ Editar cliente ID: ${id}\n\n(Próximamente - Cargar datos en modal)`);
}

function verDetalleCliente(id) {
    const cliente = clientesState.clientes.find(c => c.id === id);
    if (cliente) {
        alert(`👁️ Detalle del cliente:\n\n${cliente.razon_social}\nPaís: ${cliente.pais || 'Argentina'}\nFiscal ID: ${cliente.cuit}\nCategoría: ${cliente.categoria_cliente}\nCondiciones comerciales: ${cliente.cuenta_corriente_habilitada ? 'CC habilitada' : 'Sin CC'}`);
    }
}

function importarClientes() {
    alert('📤 Importar clientes desde Excel/CSV\n\n• Validación de CUIT/RUT/RUC según país\n• Verificación de duplicados\n• Mapeo de campos\n• Integración SIAC');
}

function exportarClientes() {
    alert('📊 Exportar clientes:\n\n• Excel\n• PDF\n• CSV\n• Reportes personalizados');
}

function mostrarReportes() {
    alert('📈 Reportes de clientes:\n\n• Por categoría\n• Por país\n• Facturación\n• Saldos\n• Análisis de ventas');
}

// ============================================
// VOLVER AL GRID DE MÓDULOS
// ============================================
function goBackToModules() {
    const mainContent = document.getElementById('mainContent');
    const moduleGrid = document.querySelector('.module-grid');

    if (mainContent) {
        mainContent.style.setProperty('display', 'none', 'important');
    }

    if (moduleGrid) {
        moduleGrid.style.display = 'grid';
    }
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.showClientesContent = showClientesContent;
window.goBackToModules = goBackToModules;
window.crearCliente = crearCliente;
window.cerrarModalCliente = cerrarModalCliente;
window.guardarCliente = guardarCliente;
window.editarCliente = editarCliente;
window.verDetalleCliente = verDetalleCliente;
window.importarClientes = importarClientes;
window.exportarClientes = exportarClientes;
window.mostrarReportes = mostrarReportes;
window.cambiarPais = cambiarPais;
window.toggleCuentaCorriente = toggleCuentaCorriente;

console.log('✅ [CLIENTES] Sistema de Gestión de Clientes SIAC v2.0 cargado (Dark Theme + AFIP + Multi-País)');
