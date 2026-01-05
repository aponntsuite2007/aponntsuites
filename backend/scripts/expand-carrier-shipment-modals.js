const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/logistics-dashboard.js';
let content = fs.readFileSync(path, 'utf8');

console.log('=== EXPANDIENDO MODALES DE CARRIER Y SHIPMENT ===\n');
console.log('Líneas antes:', content.split('\n').length);

// ============================================================================
// 1. REEMPLAZAR MODAL DE CARRIER (simple -> 4 tabs)
// ============================================================================

const carrierOld = `    // ============================================================================
    // MODAL: CREAR TRANSPORTISTA
    // ============================================================================
    window.LogisticsDashboard.showCreateCarrierModal = function() {
        const content = \`
            <form id="carrier-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código *</label>
                        <input type="text" name="code" required placeholder="TRANS-001" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Nombre/Razón Social *</label>
                        <input type="text" name="name" required placeholder="Transportes Express S.A.">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>CUIT/Tax ID</label>
                        <input type="text" name="tax_id" placeholder="30-12345678-9">
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="carrier_type">
                            <option value="own">Flota Propia</option>
                            <option value="third_party">Tercerizado</option>
                            <option value="courier">Courier/Mensajería</option>
                            <option value="freight">Carga Pesada</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="phone" placeholder="+54 11 1234-5678">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" placeholder="contacto@transporte.com">
                    </div>
                </div>
            </form>
        \`;

        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            try {
                const response = await fetchAPI('/carriers', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                if (response.success) {
                    showSuccess('Transportista creado exitosamente');
                    closeModal();
                    loadTabData('fleet');
                }
            } catch (error) {
                showError('Error al crear transportista');
            }
        });
    };`;

const carrierNew = `    // ============================================================================
    // MODAL: CREAR TRANSPORTISTA (EXPANDIDO - 4 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateCarrierModal = function() {
        const content = \`
            <form id="carrier-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="services">🚚 Servicios</button>
                    <button type="button" class="form-tab" data-tab="rates">💰 Tarifas</button>
                    <button type="button" class="form-tab" data-tab="metrics">📊 Métricas</button>
                </div>

                <!-- TAB 1: DATOS BÁSICOS -->
                <div class="form-tab-content active" data-tab="basic">
                    <div class="form-section-title">🏢 Identificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="TRANS-001" maxlength="20"></div>
                        <div class="form-group"><label>Nombre Comercial *</label><input type="text" name="name" required placeholder="Transportes Express"></div>
                        <div class="form-group"><label>Razón Social</label><input type="text" name="legal_name" placeholder="Transportes Express S.A."></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>CUIT *</label><input type="text" name="tax_id" required placeholder="30-12345678-9"></div>
                        <div class="form-group"><label>Tipo *</label>
                            <select name="type" required>
                                <option value="INTERNAL">🏠 Flota Propia</option>
                                <option value="EXTERNAL">🤝 Tercerizado</option>
                                <option value="COURIER">📦 Courier</option>
                                <option value="FREIGHT">🚛 Carga Pesada</option>
                                <option value="LAST_MILE">🏃 Última Milla</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Estado</label>
                            <select name="active"><option value="true">✅ Activo</option><option value="false">❌ Inactivo</option></select>
                        </div>
                    </div>
                    <div class="form-section-title">📞 Contacto</div>
                    <div class="form-row">
                        <div class="form-group"><label>Persona de Contacto</label><input type="text" name="contact_name" placeholder="Juan Pérez"></div>
                        <div class="form-group"><label>Teléfono</label><input type="tel" name="phone" placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="email" placeholder="contacto@transporte.com"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Website</label><input type="url" name="website" placeholder="https://www.transporte.com"></div>
                        <div class="form-group"><label>Dirección</label><input type="text" name="address" placeholder="Av. Industrial 1234, CABA"></div>
                    </div>
                </div>

                <!-- TAB 2: SERVICIOS Y COBERTURA -->
                <div class="form-tab-content" data-tab="services">
                    <div class="form-section-title">🚚 Tipos de Servicio</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="service_standard" checked> 📦 Estándar (24-48hs)</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_express"> ⚡ Express (mismo día)</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_overnight"> 🌙 Overnight</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_sameday"> ⏰ Same Day (4hs)</label>
                    </div></div></div>
                    <div class="form-section-title">⚙️ Especialidades</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="spec_refrigerated"> ❄️ Refrigerados</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_hazmat"> ☢️ Mat. Peligrosos</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_fragile"> 🔮 Frágiles</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_oversized"> 📐 Sobredimensionados</label>
                    </div></div></div>
                    <div class="form-section-title">🗺️ Cobertura Nacional</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="zone_caba" checked> 🏙️ CABA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_gba" checked> 🏘️ GBA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_bsas"> 🌾 Interior Bs.As.</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_litoral"> 🌊 Litoral</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_noa"> 🏔️ NOA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_cuyo"> 🍇 Cuyo</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_patagonia"> 🐧 Patagonia</label>
                    </div></div></div>
                    <div class="form-section-title">🌎 Internacional (MERCOSUR)</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="intl_brazil"> 🇧🇷 Brasil</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_chile"> 🇨🇱 Chile</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_uruguay"> 🇺🇾 Uruguay</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_paraguay"> 🇵🇾 Paraguay</label>
                    </div></div></div>
                </div>

                <!-- TAB 3: TARIFAS -->
                <div class="form-tab-content" data-tab="rates">
                    <div class="form-section-title">💰 Estructura de Tarifas</div>
                    <div class="form-row">
                        <div class="form-group"><label>$/Kg</label><input type="number" name="weight_rate_per_kg" placeholder="150" step="0.01" min="0"></div>
                        <div class="form-group"><label>$/m³</label><input type="number" name="volume_rate_per_m3" placeholder="5000" step="0.01" min="0"></div>
                        <div class="form-group"><label>$ Fijo/Envío</label><input type="number" name="flat_rate" placeholder="500" step="0.01" min="0"></div>
                    </div>
                    <div class="form-section-title">📊 Cargos Adicionales</div>
                    <div class="form-row">
                        <div class="form-group"><label>Cargo Mínimo ($)</label><input type="number" name="min_charge" placeholder="500" step="0.01" min="0"></div>
                        <div class="form-group"><label>Recargo Combustible (%)</label><input type="number" name="fuel_surcharge_pct" placeholder="15" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Seguro (%)</label><input type="number" name="insurance_pct" placeholder="1.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">📅 Condiciones Comerciales</div>
                    <div class="form-row">
                        <div class="form-group"><label>Días de Crédito</label><input type="number" name="credit_days" placeholder="30" min="0" max="120"></div>
                        <div class="form-group"><label>Contrato Desde</label><input type="date" name="contract_start"></div>
                        <div class="form-group"><label>Contrato Hasta</label><input type="date" name="contract_end"></div>
                    </div>
                </div>

                <!-- TAB 4: MÉTRICAS Y API -->
                <div class="form-tab-content" data-tab="metrics">
                    <div class="form-section-title">📈 SLA y Métricas Objetivo</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tiempo Entrega Prom (días)</label><input type="number" name="avg_delivery_days" placeholder="2.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>On-Time Target (%)</label><input type="number" name="on_time_pct" placeholder="95" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Tasa Daño Máx (%)</label><input type="number" name="damage_rate_pct" placeholder="0.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">⭐ Calificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Rating</label>
                            <select name="rating"><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3" selected>⭐⭐⭐</option><option value="2">⭐⭐</option></select>
                        </div>
                        <div class="form-group"><label>Prioridad</label>
                            <select name="priority"><option value="1">🥇 Alta</option><option value="2">🥈 Media</option><option value="3" selected>🥉 Normal</option></select>
                        </div>
                    </div>
                    <div class="form-section-title">🔌 Integración API</div>
                    <div class="form-row">
                        <div class="form-group"><label><input type="checkbox" name="api_enabled" onchange="document.querySelectorAll('.carrier-api-fields').forEach(el=>el.style.display=this.checked?'flex':'none')"> Habilitar API</label></div>
                    </div>
                    <div class="form-row carrier-api-fields" style="display:none;">
                        <div class="form-group"><label>URL API</label><input type="url" name="api_url" placeholder="https://api.carrier.com/v1"></div>
                        <div class="form-group"><label>API Key</label><input type="password" name="api_key" placeholder="••••••••"></div>
                    </div>
                    <div class="form-row carrier-api-fields" style="display:none;">
                        <div class="form-group full-width"><label>Template URL Tracking</label><input type="text" name="tracking_url_template" placeholder="https://tracking.carrier.com/{tracking_number}"></div>
                    </div>
                    <div class="form-section-title">📝 Notas</div>
                    <div class="form-row"><div class="form-group full-width"><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div>
                </div>
            </form>
        \`;

        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            const services = [], specialties = [], coverageZones = [], internationalCoverage = [];
            ['standard','express','overnight','sameday'].forEach(s => { if(formData.get('service_'+s)) services.push(s.toUpperCase()); });
            ['refrigerated','hazmat','fragile','oversized'].forEach(s => { if(formData.get('spec_'+s)) specialties.push(s.toUpperCase()); });
            ['caba','gba','bsas','litoral','noa','cuyo','patagonia'].forEach(z => { if(formData.get('zone_'+z)) coverageZones.push(z.toUpperCase()); });
            ['brazil','chile','uruguay','paraguay'].forEach(c => { if(formData.get('intl_'+c)) internationalCoverage.push(c.toUpperCase()); });

            const data = {
                code: formData.get('code'), name: formData.get('name'), legal_name: formData.get('legal_name'),
                tax_id: formData.get('tax_id'), type: formData.get('type'),
                contact_name: formData.get('contact_name'), phone: formData.get('phone'), email: formData.get('email'),
                website: formData.get('website'), address: formData.get('address'),
                services, specialties, coverage_zones: coverageZones, international_coverage: internationalCoverage,
                weight_rate_per_kg: parseFloat(formData.get('weight_rate_per_kg')) || null,
                volume_rate_per_m3: parseFloat(formData.get('volume_rate_per_m3')) || null,
                flat_rate: parseFloat(formData.get('flat_rate')) || null,
                min_charge: parseFloat(formData.get('min_charge')) || null,
                fuel_surcharge_pct: parseFloat(formData.get('fuel_surcharge_pct')) || 0,
                insurance_pct: parseFloat(formData.get('insurance_pct')) || 0,
                credit_days: parseInt(formData.get('credit_days')) || 30,
                contract_start: formData.get('contract_start') || null,
                contract_end: formData.get('contract_end') || null,
                avg_delivery_days: parseFloat(formData.get('avg_delivery_days')) || null,
                on_time_pct: parseFloat(formData.get('on_time_pct')) || 95,
                damage_rate_pct: parseFloat(formData.get('damage_rate_pct')) || 0,
                rating: parseInt(formData.get('rating')) || 3,
                priority: parseInt(formData.get('priority')) || 3,
                api_enabled: !!formData.get('api_enabled'),
                api_url: formData.get('api_url') || null,
                api_key: formData.get('api_key') || null,
                tracking_url_template: formData.get('tracking_url_template') || null,
                notes: formData.get('notes'), active: formData.get('active') === 'true'
            };
            try {
                const response = await fetchAPI('/logistics/carriers', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Transportista creado'); closeModal(); loadTabData('fleet'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };`;

if (content.includes(carrierOld)) {
    content = content.replace(carrierOld, carrierNew);
    console.log('✅ Modal CARRIER expandido a 4 tabs');
} else {
    console.log('⚠️ Modal CARRIER no encontrado con patrón exacto, buscando alternativo...');
    // Buscar por función y reemplazar
    const carrierStart = content.indexOf('window.LogisticsDashboard.showCreateCarrierModal = function()');
    if (carrierStart > -1) {
        const commentStart = content.lastIndexOf('// ============', carrierStart);
        // Buscar el final de la función
        let braceCount = 0, funcEnd = -1, inFunc = false;
        for (let i = carrierStart; i < content.length; i++) {
            if (content[i] === '{') { braceCount++; inFunc = true; }
            else if (content[i] === '}') {
                braceCount--;
                if (inFunc && braceCount === 0) { funcEnd = i + 1; if(content[funcEnd]===';') funcEnd++; break; }
            }
        }
        if (funcEnd > carrierStart) {
            const blockStart = content.lastIndexOf('// ====', carrierStart);
            content = content.substring(0, blockStart) + carrierNew + content.substring(funcEnd);
            console.log('✅ Modal CARRIER expandido (método alternativo)');
        }
    }
}

// ============================================================================
// 2. BUSCAR Y EXPANDIR MODAL DE SHIPMENT
// ============================================================================

const shipmentStart = content.indexOf('window.LogisticsDashboard.showCreateShipmentModal = function()');
if (shipmentStart > -1) {
    // Buscar el final de la función actual
    let braceCount = 0, funcEnd = -1, inFunc = false;
    for (let i = shipmentStart; i < content.length; i++) {
        if (content[i] === '{') { braceCount++; inFunc = true; }
        else if (content[i] === '}') {
            braceCount--;
            if (inFunc && braceCount === 0) { funcEnd = i + 1; if(content[funcEnd]===';') funcEnd++; break; }
        }
    }

    const shipmentNew = `window.LogisticsDashboard.showCreateShipmentModal = function() {
        const carriersOptions = (cache.carriers || []).map(c => \`<option value="\${c.id}">\${c.name}</option>\`).join('');
        const zonesOptions = (cache.zones || []).map(z => \`<option value="\${z.id}">\${z.code} - \${z.name}</option>\`).join('');

        const content = \`
            <form id="shipment-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="origin">📤 Origen</button>
                    <button type="button" class="form-tab" data-tab="destination">📥 Destino</button>
                    <button type="button" class="form-tab" data-tab="content">📦 Contenido</button>
                    <button type="button" class="form-tab" data-tab="delivery">🚚 Entrega</button>
                </div>

                <!-- TAB 1: DATOS BÁSICOS -->
                <div class="form-tab-content active" data-tab="basic">
                    <div class="form-section-title">📋 Información del Envío</div>
                    <div class="form-row">
                        <div class="form-group"><label>Referencia *</label><input type="text" name="reference" required placeholder="ENV-2024-00001"></div>
                        <div class="form-group"><label>Referencia Cliente</label><input type="text" name="customer_reference" placeholder="OC-12345"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo de Envío *</label>
                            <select name="shipment_type" required>
                                <option value="DELIVERY">📤 Entrega</option>
                                <option value="PICKUP">📥 Retiro</option>
                                <option value="TRANSFER">🔄 Transferencia</option>
                                <option value="RETURN">↩️ Devolución</option>
                                <option value="CROSS_DOCK">🔀 Cross-Dock</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Prioridad *</label>
                            <select name="priority" required>
                                <option value="URGENT">🔴 Urgente</option>
                                <option value="HIGH">🟠 Alta</option>
                                <option value="NORMAL" selected>🟢 Normal</option>
                                <option value="LOW">🔵 Baja</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Transportista</label>
                            <select name="carrier_id"><option value="">Auto-asignar</option>\${carriersOptions}</select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Fecha Programada</label><input type="date" name="scheduled_date"></div>
                        <div class="form-group"><label>Hora Desde</label><input type="time" name="time_window_start" value="09:00"></div>
                        <div class="form-group"><label>Hora Hasta</label><input type="time" name="time_window_end" value="18:00"></div>
                    </div>
                </div>

                <!-- TAB 2: ORIGEN -->
                <div class="form-tab-content" data-tab="origin">
                    <div class="form-section-title">📤 Datos del Remitente</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nombre/Empresa *</label><input type="text" name="sender_name" required placeholder="Mi Empresa S.A."></div>
                        <div class="form-group"><label>Contacto</label><input type="text" name="sender_contact" placeholder="Juan Pérez"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Teléfono *</label><input type="tel" name="sender_phone" required placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="sender_email" placeholder="remitente@empresa.com"></div>
                    </div>
                    <div class="form-section-title">📍 Dirección de Origen</div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Dirección *</label><input type="text" name="origin_address" required placeholder="Av. Corrientes 1234, Piso 5"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Ciudad *</label><input type="text" name="origin_city" required placeholder="Buenos Aires"></div>
                        <div class="form-group"><label>CP</label><input type="text" name="origin_postal_code" placeholder="C1043"></div>
                        <div class="form-group"><label>Zona</label><select name="origin_zone_id"><option value="">Seleccionar...</option>\${zonesOptions}</select></div>
                    </div>
                </div>

                <!-- TAB 3: DESTINO -->
                <div class="form-tab-content" data-tab="destination">
                    <div class="form-section-title">📥 Datos del Destinatario</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nombre/Empresa *</label><input type="text" name="recipient_name" required placeholder="Cliente Final"></div>
                        <div class="form-group"><label>Contacto</label><input type="text" name="recipient_contact" placeholder="María García"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Teléfono *</label><input type="tel" name="recipient_phone" required placeholder="+54 11 9876-5432"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="recipient_email" placeholder="cliente@email.com"></div>
                    </div>
                    <div class="form-section-title">📍 Dirección de Destino</div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Dirección *</label><input type="text" name="delivery_address" required placeholder="Calle Falsa 123"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Ciudad *</label><input type="text" name="delivery_city" required placeholder="Quilmes"></div>
                        <div class="form-group"><label>CP</label><input type="text" name="delivery_postal_code" placeholder="B1878"></div>
                        <div class="form-group"><label>Zona</label><select name="delivery_zone_id"><option value="">Seleccionar...</option>\${zonesOptions}</select></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Instrucciones de Entrega</label><textarea name="delivery_instructions" rows="2" placeholder="Entre calle A y B, timbre 2do piso..."></textarea></div>
                    </div>
                </div>

                <!-- TAB 4: CONTENIDO -->
                <div class="form-tab-content" data-tab="content">
                    <div class="form-section-title">📦 Detalle del Contenido</div>
                    <div class="form-row">
                        <div class="form-group"><label>Descripción *</label><input type="text" name="contents_description" required placeholder="Electrodomésticos"></div>
                        <div class="form-group"><label>Bultos *</label><input type="number" name="pieces" required value="1" min="1"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Peso Total (kg)</label><input type="number" name="weight_kg" placeholder="10.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>Volumen (m³)</label><input type="number" name="volume_m3" placeholder="0.5" step="0.01" min="0"></div>
                        <div class="form-group"><label>Peso Vol. (kg)</label><input type="number" name="volumetric_weight" placeholder="12" step="0.1" min="0" readonly></div>
                    </div>
                    <div class="form-section-title">⚠️ Características Especiales</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="is_fragile"> 🔮 Frágil</label>
                        <label class="checkbox-item"><input type="checkbox" name="is_hazmat"> ☢️ Peligroso</label>
                        <label class="checkbox-item"><input type="checkbox" name="requires_refrigeration"> ❄️ Refrigerado</label>
                        <label class="checkbox-item"><input type="checkbox" name="requires_signature"> ✍️ Requiere Firma</label>
                        <label class="checkbox-item"><input type="checkbox" name="is_insured"> 🛡️ Asegurado</label>
                    </div></div></div>
                    <div class="form-section-title">💰 Valor</div>
                    <div class="form-row">
                        <div class="form-group"><label>Valor Declarado ($)</label><input type="number" name="declared_value" placeholder="10000" step="0.01" min="0"></div>
                        <div class="form-group"><label>COD - Cobrar al Entregar ($)</label><input type="number" name="cod_amount" placeholder="0" step="0.01" min="0"></div>
                    </div>
                </div>

                <!-- TAB 5: ENTREGA Y COSTOS -->
                <div class="form-tab-content" data-tab="delivery">
                    <div class="form-section-title">🚚 Servicio de Entrega</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo Servicio</label>
                            <select name="service_type">
                                <option value="STANDARD">📦 Estándar (24-48hs)</option>
                                <option value="EXPRESS">⚡ Express (mismo día)</option>
                                <option value="OVERNIGHT">🌙 Overnight</option>
                                <option value="SCHEDULED">📅 Programado</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Intentos Máx</label><input type="number" name="max_delivery_attempts" value="3" min="1" max="5"></div>
                    </div>
                    <div class="form-section-title">💵 Costos</div>
                    <div class="form-row">
                        <div class="form-group"><label>Costo Flete ($)</label><input type="number" name="freight_cost" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>Costo Seguro ($)</label><input type="number" name="insurance_cost" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>Otros Cargos ($)</label><input type="number" name="other_charges" placeholder="0" step="0.01" min="0"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Descuento ($)</label><input type="number" name="discount" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>IVA (%)</label><input type="number" name="tax_rate" value="21" step="0.1" min="0"></div>
                        <div class="form-group"><label>TOTAL ($)</label><input type="number" name="total_cost" placeholder="0" step="0.01" readonly></div>
                    </div>
                    <div class="form-section-title">📝 Notas</div>
                    <div class="form-row"><div class="form-group full-width"><textarea name="notes" rows="2" placeholder="Observaciones internas..."></textarea></div></div>
                </div>
            </form>
        \`;

        showModal('📦 Nuevo Envío', content, async () => {
            const form = document.getElementById('shipment-form');
            const formData = new FormData(form);
            const data = {
                reference: formData.get('reference'), customer_reference: formData.get('customer_reference'),
                shipment_type: formData.get('shipment_type'), priority: formData.get('priority'),
                carrier_id: formData.get('carrier_id') || null,
                scheduled_date: formData.get('scheduled_date') || null,
                time_window_start: formData.get('time_window_start'), time_window_end: formData.get('time_window_end'),
                sender_name: formData.get('sender_name'), sender_contact: formData.get('sender_contact'),
                sender_phone: formData.get('sender_phone'), sender_email: formData.get('sender_email'),
                origin_address: formData.get('origin_address'), origin_city: formData.get('origin_city'),
                origin_postal_code: formData.get('origin_postal_code'), origin_zone_id: formData.get('origin_zone_id') || null,
                recipient_name: formData.get('recipient_name'), recipient_contact: formData.get('recipient_contact'),
                recipient_phone: formData.get('recipient_phone'), recipient_email: formData.get('recipient_email'),
                delivery_address: formData.get('delivery_address'), delivery_city: formData.get('delivery_city'),
                delivery_postal_code: formData.get('delivery_postal_code'), delivery_zone_id: formData.get('delivery_zone_id') || null,
                delivery_instructions: formData.get('delivery_instructions'),
                contents_description: formData.get('contents_description'), pieces: parseInt(formData.get('pieces')) || 1,
                weight_kg: parseFloat(formData.get('weight_kg')) || null, volume_m3: parseFloat(formData.get('volume_m3')) || null,
                is_fragile: !!formData.get('is_fragile'), is_hazmat: !!formData.get('is_hazmat'),
                requires_refrigeration: !!formData.get('requires_refrigeration'),
                requires_signature: !!formData.get('requires_signature'), is_insured: !!formData.get('is_insured'),
                declared_value: parseFloat(formData.get('declared_value')) || null,
                cod_amount: parseFloat(formData.get('cod_amount')) || 0,
                service_type: formData.get('service_type'),
                max_delivery_attempts: parseInt(formData.get('max_delivery_attempts')) || 3,
                freight_cost: parseFloat(formData.get('freight_cost')) || 0,
                insurance_cost: parseFloat(formData.get('insurance_cost')) || 0,
                other_charges: parseFloat(formData.get('other_charges')) || 0,
                discount: parseFloat(formData.get('discount')) || 0,
                tax_rate: parseFloat(formData.get('tax_rate')) || 21,
                notes: formData.get('notes')
            };
            try {
                const response = await fetchAPI('/logistics/shipments', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Envío creado: ' + response.data.tracking_number); closeModal(); loadTabData('operations'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };`;

    if (funcEnd > shipmentStart) {
        const blockStart = content.lastIndexOf('// ====', shipmentStart);
        const headerLine = '    // ============================================================================\n    // MODAL: CREAR ENVÍO (EXPANDIDO - 5 TABS)\n    // ============================================================================\n    ';
        content = content.substring(0, blockStart) + headerLine + shipmentNew + content.substring(funcEnd);
        console.log('✅ Modal SHIPMENT expandido a 5 tabs');
    }
} else {
    console.log('⚠️ Modal SHIPMENT no encontrado');
}

// ============================================================================
// 3. MODIFICAR WAREHOUSE MODAL A READ-ONLY + WMS LINK
// ============================================================================

const warehouseStart = content.indexOf('window.LogisticsDashboard.showCreateWarehouseModal = function()');
if (warehouseStart > -1) {
    let braceCount = 0, funcEnd = -1, inFunc = false;
    for (let i = warehouseStart; i < content.length; i++) {
        if (content[i] === '{') { braceCount++; inFunc = true; }
        else if (content[i] === '}') {
            braceCount--;
            if (inFunc && braceCount === 0) { funcEnd = i + 1; if(content[funcEnd]===';') funcEnd++; break; }
        }
    }

    const warehouseNew = `window.LogisticsDashboard.showCreateWarehouseModal = function() {
        const content = \`
            <div class="info-panel info-panel-warning">
                <div class="info-icon">📦</div>
                <div class="info-content">
                    <h4>Gestión de Almacenes</h4>
                    <p>Los almacenes se gestionan desde el módulo <strong>WMS (Warehouse Management System)</strong>.</p>
                    <p>Esto asegura una <strong>fuente única de verdad (SSOT)</strong> para:</p>
                    <ul>
                        <li>✅ Ubicaciones y zonas de almacenamiento</li>
                        <li>✅ Inventario en tiempo real</li>
                        <li>✅ Operaciones de picking y packing</li>
                        <li>✅ Recepción y despacho</li>
                        <li>✅ Control de stock y movimientos</li>
                    </ul>
                    <div class="info-actions">
                        <button class="btn-primary" onclick="window.LogisticsDashboard.openWMSModule()">
                            🚀 Ir a WMS
                        </button>
                        <button class="btn-secondary" onclick="closeModal()">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        \`;
        showModal('📦 Almacenes - Solo Lectura', content, null);
        // Ocultar botón guardar ya que es solo informativo
        setTimeout(() => {
            const saveBtn = document.getElementById('modal-save-btn');
            if (saveBtn) saveBtn.style.display = 'none';
        }, 50);
    };`;

    if (funcEnd > warehouseStart) {
        const blockStart = content.lastIndexOf('// ====', warehouseStart);
        const headerLine = '    // ============================================================================\n    // MODAL: ALMACENES (SOLO LECTURA - SSOT: WMS)\n    // ============================================================================\n    ';
        content = content.substring(0, blockStart) + headerLine + warehouseNew + content.substring(funcEnd);
        console.log('✅ Modal WAREHOUSE cambiado a read-only + WMS link');
    }
} else {
    console.log('⚠️ Modal WAREHOUSE no encontrado');
}

// Guardar cambios
fs.writeFileSync(path, content, 'utf8');

console.log('\nLíneas después:', content.split('\n').length);
console.log('\n=== PROCESO COMPLETADO ===');
