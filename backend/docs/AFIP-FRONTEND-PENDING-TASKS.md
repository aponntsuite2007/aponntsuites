# AFIP - Tareas Pendientes Frontend

## 📊 ESTADO GENERAL DEL PROYECTO

### ✅ COMPLETADO (100%)

#### 1. Base de Datos
- ✅ `siac_clientes` mejorado (dirección, condiciones fiscales, condiciones comerciales)
- ✅ `tax_templates` parametrizado (CUIT/RUT/RUC/RFC/CNPJ/NIT)
- ✅ `siac_facturas` con campos AFIP completos
- ✅ Tablas AFIP: `company_fiscal_config`, `branch_offices_fiscal`, `afip_cae_log`, `afip_auth_log`
- ✅ Funciones helper SQL:
  - `calculate_credito_disponible()` - Trigger automático
  - `puede_facturar_cliente(id, monto)` - Validación pre-facturación
  - `get_company_fiscal_config(company_id)`
  - `get_next_comprobante_number(...)`

#### 2. Backend Services
- ✅ `AfipAuthService.js` - Autenticación WSAA (384 líneas)
- ✅ `AfipBillingService.js` - Solicitud CAE (635 líneas)
- ✅ `AfipCertificateManager.js` - Gestión certificados (288 líneas)
- ✅ `afip-constants.js` - Códigos oficiales (393 líneas)

#### 3. API REST
- ✅ `afipRoutes.js` - 15 endpoints implementados:
  - POST `/api/afip/certificates/upload`
  - GET `/api/afip/certificates/validate`
  - DELETE `/api/afip/certificates`
  - POST `/api/afip/auth/token`
  - POST `/api/afip/auth/invalidate`
  - POST `/api/afip/cae/solicitar/:invoiceId`
  - GET `/api/afip/cae/consultar`
  - GET `/api/afip/cae/log`
  - GET/PUT `/api/afip/config`
  - GET/POST `/api/afip/puntos-venta`

#### 4. Documentación
- ✅ `AFIP-INTEGRACION-CAE.md` - Guía técnica completa (40+ páginas)
- ✅ `AFIP-IMPLEMENTACION-RESUMEN.md` - Resumen ejecutivo

---

## 🔴 PENDIENTE - Modificaciones Frontend

### ARCHIVO 1: `clientes.js` (312 líneas)

**Ubicación**: `backend/public/js/modules/clientes.js`

#### Modificaciones Necesarias:

##### 1. **Cambiar a Dark Theme**

**Líneas a modificar**: 44-55 (Header)

**BUSCAR**:
```javascript
<div class="clientes-header" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
```

**REEMPLAZAR CON**:
```javascript
<div class="clientes-header" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e0e0e0; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #2a2a3e;">
```

**Líneas a modificar**: 74-89 (Search and Filters)

**BUSCAR**:
```javascript
<div class="search-filters" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
```

**REEMPLAZAR CON**:
```javascript
<div class="search-filters" style="background: #1e1e2f; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid #2a2a3e;">
```

**Input fields dark**:
```javascript
<input type="text" id="searchClientes" placeholder="🔍 Buscar clientes..." style="padding: 12px; border: 1px solid #2a2a3e; border-radius: 6px; font-size: 14px; background: #16213e; color: #e0e0e0;">

<select id="categoriaFilter" style="padding: 12px; border: 1px solid #2a2a3e; border-radius: 6px; background: #16213e; color: #e0e0e0;">
```

**Líneas a modificar**: 92-97 (Table Container)

**BUSCAR**:
```javascript
<div class="clientes-table" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
```

**REEMPLAZAR CON**:
```javascript
<div class="clientes-table" style="background: #1e1e2f; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); border: 1px solid #2a2a3e;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #e0e0e0;">📋 Lista de Clientes</h3>
        <span id="clientesCount" style="color: #a0a0a0; font-size: 14px;">0 clientes encontrados</span>
    </div>
```

**Table headers dark**:
```javascript
<thead style="background: #16213e; color: #e0e0e0;">
```

**Table rows dark** (agregar alternating rows):
```javascript
<tr style="border-bottom: 1px solid #2a2a3e; background: ${index % 2 === 0 ? '#1a1a2e' : '#16213e'}; color: #e0e0e0;">
```

##### 2. **Agregar Ayuda Contextual Unificada**

**Al inicio del archivo (después de línea 11)**:

```javascript
// ============================================
// SISTEMA DE AYUDA CONTEXTUAL UNIFICADA
// ============================================
const ClientesHelpSystem = {
    moduleName: 'Gestión de Clientes SIAC',
    contexts: {
        lista: {
            title: 'Lista de Clientes',
            description: 'Vista principal de todos los clientes registrados en el sistema',
            tips: [
                'Usa los filtros para buscar clientes por categoría o estado',
                'Los clientes con cuenta corriente tienen límite de crédito asignado',
                'El indicador 🔴 significa cliente bloqueado, 🟢 cliente activo'
            ],
            warnings: [
                'Verifica la condición fiscal del cliente antes de facturar',
                'Los clientes bloqueados no pueden recibir facturas hasta resolver deuda'
            ],
            fieldHelp: {
                categoria: 'Categoría A=VIP, B=Regular, C=Ocasional según volumen de compra',
                credito_disponible: 'Crédito máximo menos crédito ya utilizado',
                bloqueo: 'Cliente bloqueado automáticamente por vencimiento o exceso de crédito'
            }
        },
        crear: {
            title: 'Crear Cliente',
            description: 'Registrar un nuevo cliente en el sistema',
            tips: [
                'El campo de identificación fiscal cambia según el país (CUIT en Argentina, RUT en Chile, etc.)',
                'Si habilitas cuenta corriente, debes definir plazo y crédito máximo',
                'La dirección completa es importante para facturación electrónica'
            ],
            warnings: [
                'El CUIT/RUT/RUC debe ser válido con dígito verificador correcto',
                'La condición fiscal determina qué tipo de factura se puede emitir'
            ],
            fieldHelp: {
                cuit: 'Identificación fiscal del cliente (CUIT en Argentina, RUT en Chile, etc.)',
                condicion_fiscal: 'Condición ante impuestos: RI=Responsable Inscripto, RM=Monotributo, CF=Consumidor Final',
                cuenta_corriente: 'Si está habilitada, el cliente puede comprar a crédito',
                plazo_dias: 'Días de plazo para pagar (ej: 30, 60, 90 días)',
                credito_maximo: 'Monto máximo que puede deber el cliente'
            }
        }
    },

    renderBanner(contextKey) {
        const ctx = this.contexts[contextKey];
        if (!ctx) return '';

        return `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; font-size: 16px;">💡 ${ctx.title}</h4>
                        <p style="margin: 0; opacity: 0.9; font-size: 13px;">${ctx.description}</p>
                    </div>
                    <button onclick="ClientesHelpSystem.toggleTips('${contextKey}')"
                            style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                        Ver Tips
                    </button>
                </div>
                <div id="tips-${contextKey}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div style="margin-bottom: 10px;"><strong>📌 Tips:</strong></div>
                    ${ctx.tips.map(tip => `<div style="margin: 5px 0; padding-left: 15px;">• ${tip}</div>`).join('')}
                    ${ctx.warnings && ctx.warnings.length > 0 ? `
                        <div style="margin: 15px 0 5px 0;"><strong>⚠️ Advertencias:</strong></div>
                        ${ctx.warnings.map(w => `<div style="margin: 5px 0; padding-left: 15px; color: #ffeb3b;">⚠ ${w}</div>`).join('')}
                    ` : ''}
                </div>
            </div>
        `;
    },

    toggleTips(contextKey) {
        const el = document.getElementById(`tips-${contextKey}`);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    },

    getFieldHelp(contextKey, fieldName) {
        const ctx = this.contexts[contextKey];
        if (!ctx || !ctx.fieldHelp) return null;
        return ctx.fieldHelp[fieldName];
    }
};

// Hacer global
window.ClientesHelpSystem = ClientesHelpSystem;
```

**Agregar banner en showClientesContent() (después de línea 40)**:

```javascript
${ClientesHelpSystem.renderBanner('lista')}
```

##### 3. **Agregar Nuevos Campos al Formulario**

**Buscar la función `crearCliente()` y modificar el formulario modal**:

**Agregar en el formulario (después de los campos existentes)**:

```javascript
<!-- Dirección Completa -->
<div class="form-section" style="background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
    <h4 style="color: #e0e0e0; margin-top: 0;">📍 Dirección Completa</h4>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">País</label>
            <select id="cliente_pais" onchange="loadCondicionesFiscalesPorPais(this.value)" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
                <option value="Argentina">Argentina</option>
                <option value="Chile">Chile</option>
                <option value="Perú">Perú</option>
                <option value="México">México</option>
                <option value="Brasil">Brasil</option>
                <option value="Colombia">Colombia</option>
            </select>
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Provincia/Estado</label>
            <input type="text" id="cliente_provincia" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Localidad</label>
            <input type="text" id="cliente_localidad" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Código Postal</label>
            <input type="text" id="cliente_codigo_postal" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 10px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Calle</label>
            <input type="text" id="cliente_calle" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Número</label>
            <input type="text" id="cliente_numero" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Piso (opcional)</label>
            <input type="text" id="cliente_piso" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Depto (opcional)</label>
            <input type="text" id="cliente_departamento" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
    </div>
</div>

<!-- Condición Fiscal Parametrizable -->
<div class="form-section" style="background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
    <h4 style="color: #e0e0e0; margin-top: 0;">📄 Información Fiscal</h4>

    <div style="margin-bottom: 10px;">
        <label style="color: #a0a0a0; display: block; margin-bottom: 5px;" id="label_tax_id">CUIT</label>
        <input type="text" id="cliente_tax_id" placeholder="XX-XXXXXXXX-X" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        <small id="help_tax_id" style="color: #888; display: block; margin-top: 5px;">Formato: XX-XXXXXXXX-X</small>
    </div>

    <div>
        <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Condición Fiscal</label>
        <select id="cliente_condicion_fiscal" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
            <option value="">Seleccionar...</option>
            <!-- Se llenará dinámicamente según país -->
        </select>
    </div>
</div>

<!-- Condiciones Comerciales -->
<div class="form-section" style="background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
    <h4 style="color: #e0e0e0; margin-top: 0;">💳 Condiciones Comerciales</h4>

    <div style="margin-bottom: 15px;">
        <label style="color: #a0a0a0; display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="cliente_cuenta_corriente" onchange="toggleCuentaCorriente()" style="width: 18px; height: 18px;">
            <span>Habilitar Cuenta Corriente</span>
        </label>
    </div>

    <div id="cuentaCorrienteFields" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
            <div>
                <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Plazo de Pago (días)</label>
                <input type="number" id="cliente_plazo_dias" value="30" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
            </div>
            <div>
                <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Crédito Máximo ($)</label>
                <input type="number" id="cliente_credito_maximo" value="0" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
            </div>
        </div>

        <div>
            <label style="color: #a0a0a0; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="cliente_bloqueo_vencimiento" style="width: 18px; height: 18px;">
                <span>Bloquear facturación por vencimiento de plazo</span>
            </label>
        </div>
    </div>
</div>

<!-- Datos Bancarios (opcional) -->
<div class="form-section" style="background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
    <h4 style="color: #e0e0e0; margin-top: 0;">🏦 Datos Bancarios (Opcional)</h4>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Banco</label>
            <input type="text" id="cliente_banco" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Tipo de Cuenta</label>
            <select id="cliente_tipo_cuenta" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
                <option value="">Seleccionar...</option>
                <option value="Cuenta Corriente">Cuenta Corriente</option>
                <option value="Caja de Ahorro">Caja de Ahorro</option>
            </select>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">CBU/IBAN</label>
            <input type="text" id="cliente_cbu" placeholder="22 dígitos" maxlength="22" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
        <div>
            <label style="color: #a0a0a0; display: block; margin-bottom: 5px;">Alias CBU</label>
            <input type="text" id="cliente_alias_cbu" style="width: 100%; padding: 10px; border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e; color: #e0e0e0;">
        </div>
    </div>
</div>
```

**Agregar funciones helper**:

```javascript
// Función para cambiar label y formato según país
async function loadCondicionesFiscalesPorPais(paisCode) {
    try {
        // Obtener template fiscal del país
        const response = await fetch('/api/billing/tax-templates');
        const templates = await response.json();
        const template = templates.find(t => t.country === paisCode);

        if (!template) return;

        // Actualizar label del campo fiscal
        document.getElementById('label_tax_id').textContent = template.tax_id_field_name;
        document.getElementById('help_tax_id').textContent = `Formato: ${template.tax_id_format_mask}`;
        document.getElementById('cliente_tax_id').placeholder = template.tax_id_format_mask;

        // Cargar condiciones fiscales del país
        const condSelect = document.getElementById('cliente_condicion_fiscal');
        condSelect.innerHTML = '<option value="">Seleccionar...</option>';

        // Obtener condiciones fiscales parametrizables
        const condResponse = await fetch(`/api/billing/tax-conditions?country=${paisCode}`);
        const conditions = await condResponse.json();

        conditions.forEach(cond => {
            const option = document.createElement('option');
            option.value = cond.code;
            option.textContent = cond.name;
            condSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando condiciones fiscales:', error);
    }
}

// Función para toggle cuenta corriente
function toggleCuentaCorriente() {
    const checkbox = document.getElementById('cliente_cuenta_corriente');
    const fields = document.getElementById('cuentaCorrienteFields');
    fields.style.display = checkbox.checked ? 'block' : 'none';
}
```

---

### ARCHIVO 2: `facturacion.js` (1190 líneas)

**Ubicación**: `backend/public/js/modules/facturacion.js`

Debido al tamaño del archivo (1190 líneas), voy a crear 2 nuevos archivos modulares que se integran dentro de facturacion.js:

#### Crear archivo: `facturacion-facturas-emitidas.js`

**Ubicación**: `backend/public/js/modules/facturacion-facturas-emitidas.js`

**Ver archivo completo en el siguiente bloque**

#### Crear archivo: `facturacion-config-afip.js`

**Ubicación**: `backend/public/js/modules/facturacion-config-afip.js`

**Ver archivo completo en el siguiente bloque**

#### Modificaciones en `facturacion.js`

**Al inicio del archivo (agregar imports)**:

```javascript
// Importar submódulos
import { FacturasEmitidasModule } from './facturacion-facturas-emitidas.js';
import { ConfigAfipModule } from './facturacion-config-afip.js';
```

**En la función principal donde se renderizan los tabs, agregar 2 nuevos tabs**:

**BUSCAR la sección de tabs** (probablemente alrededor de línea 50-100):

```javascript
<div class="tabs">
    <button class="tab-btn active" data-tab="crear-factura">Crear Factura</button>
    <button class="tab-btn" data-tab="presupuestos">Presupuestos</button>
    <!-- AGREGAR ESTOS 2 NUEVOS TABS -->
    <button class="tab-btn" data-tab="facturas-emitidas">📋 Facturas Emitidas</button>
    <button class="tab-btn" data-tab="config-afip">⚙️ Configuración AFIP</button>
</div>
```

**AGREGAR al final del contenido de tabs**:

```javascript
<!-- Tab: Facturas Emitidas -->
<div id="tab-facturas-emitidas" class="tab-content" style="display: none;">
    <div id="facturas-emitidas-container"></div>
</div>

<!-- Tab: Configuración AFIP -->
<div id="tab-config-afip" class="tab-content" style="display: none;">
    <div id="config-afip-container"></div>
</div>
```

**En la función de switch tabs, agregar casos**:

```javascript
function switchTab(tabName) {
    // ... código existente ...

    if (tabName === 'facturas-emitidas') {
        FacturasEmitidasModule.render();
    } else if (tabName === 'config-afip') {
        ConfigAfipModule.render();
    }
}
```

---

## 📝 INSTRUCCIONES DE IMPLEMENTACIÓN

### Opción 1: Implementar Todo Ahora

1. Modificar `clientes.js` según los snippets de código arriba
2. Crear los 2 nuevos archivos modulares
3. Modificar `facturacion.js` para integrar los nuevos tabs
4. Aplicar dark theme en todos los componentes
5. Agregar ayuda contextual unificada

### Opción 2: Implementar por Partes

**Sesión 1**: Clientes
- Dark theme en `clientes.js`
- Ayuda contextual
- Nuevos campos formulario

**Sesión 2**: Facturas Emitidas
- Crear archivo modular
- Integrar en facturacion.js
- Dark theme

**Sesión 3**: Config AFIP
- Crear archivo modular
- Integrar en facturacion.js
- Dark theme

---

## 🎨 PALETA DE COLORES DARK THEME

```css
--bg-dark-primary: #1a1a2e;
--bg-dark-secondary: #16213e;
--bg-dark-tertiary: #1e1e2f;
--border-dark: #2a2a3e;
--text-primary: #e0e0e0;
--text-secondary: #a0a0a0;
--accent-purple: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--accent-blue: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
```

---

## 📊 ARCHIVOS A CREAR (CONTINUACIÓN EN PRÓXIMO MENSAJE)

Debido al límite de caracteres, los archivos completos de:
- `facturacion-facturas-emitidas.js`
- `facturacion-config-afip.js`

Se crearán en el siguiente paso.

---

**Última actualización**: 2025-01-20
**Estado**: Backend 100% completo, Frontend pendiente
**Próximo paso**: Crear archivos modulares para facturas emitidas y config AFIP
