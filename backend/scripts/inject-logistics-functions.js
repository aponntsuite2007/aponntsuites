const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/logistics-dashboard.js';
let content = fs.readFileSync(path, 'utf8');

// PASO 1: Buscar el cierre del IIFE })(); al final
const iifeClose = content.lastIndexOf('})();');
if (iifeClose === -1) {
    console.log('❌ No se encontró cierre IIFE');
    process.exit(1);
}

// PASO 2: Encontrar la sección de stubs (desde "// Más funciones públicas...")
const stubStart = content.indexOf('// Más funciones públicas...');
if (stubStart === -1) {
    console.log('❌ No se encontró inicio de stubs');
    process.exit(1);
}

console.log('✅ Encontrado inicio de stubs en posición:', stubStart);
console.log('✅ Encontrado cierre IIFE en posición:', iifeClose);

// PASO 3: Nuevo código para reemplazar
const newFunctions = `// ============================================================================
    // UTILIDADES DE MODAL Y NOTIFICACIONES
    // ============================================================================

    function showModal(title, content, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'logistics-modal-overlay';
        overlay.innerHTML = \`
            <div class="modal-container modal-large">
                <div class="modal-header">
                    <h3>\${title}</h3>
                    <button class="modal-close" onclick="LogisticsDashboard.closeModal()">&times;</button>
                </div>
                <div class="modal-body">\${content}</div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="LogisticsDashboard.closeModal()">Cancelar</button>
                    <button class="btn-primary" id="modal-save-btn">Guardar</button>
                </div>
            </div>
        \`;
        document.body.appendChild(overlay);

        if (onSave) {
            document.getElementById('modal-save-btn').onclick = onSave;
        }
        setTimeout(() => overlay.classList.add('show'), 10);
    }

    function closeModal() {
        const overlay = document.getElementById('logistics-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    function initModalTabs() {
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.form-tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const contentId = 'tab-carrier-' + tabId;
                const contentEl = document.getElementById(contentId) ||
                                  document.getElementById('tab-vehicle-' + tabId) ||
                                  document.getElementById('tab-driver-' + tabId);
                if (contentEl) contentEl.classList.add('active');
            });
        });
    }

    function showInfo(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-info';
        toast.innerHTML = \`<span>ℹ️ \${message}</span>\`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 4000);
    }

    function showWarning(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-warning';
        toast.innerHTML = \`<span>⚠️ \${message}</span>\`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 5000);
    }

    // ============================================================================
    // EXPONER FUNCIONES AL OBJETO GLOBAL
    // ============================================================================
    window.LogisticsDashboard.switchTab = switchTab;
    window.LogisticsDashboard.showModal = showModal;
    window.LogisticsDashboard.closeModal = closeModal;
    window.LogisticsDashboard.initModalTabs = initModalTabs;
    window.LogisticsDashboard.showInfo = showInfo;
    window.LogisticsDashboard.showWarning = showWarning;

    // ============================================================================
    // MODAL: ALMACENES (Solo Lectura - SSOT: WMS)
    // ============================================================================
    window.LogisticsDashboard.showCreateWarehouseModal = function() {
        const content = \`
            <div class="info-box info-box-warning">
                <h4>📦 Gestión de Almacenes</h4>
                <p>Los almacenes se gestionan desde el módulo <strong>WMS (Warehouse Management System)</strong>.</p>
                <p>Esto asegura una fuente única de verdad (SSOT) para:</p>
                <ul>
                    <li>✅ Ubicaciones y zonas</li>
                    <li>✅ Inventario en tiempo real</li>
                    <li>✅ Picking y packing</li>
                    <li>✅ Recepción y despacho</li>
                </ul>
                <div class="mt-3">
                    <button class="btn-primary" onclick="window.location.hash='#wms'">
                        🚀 Ir a WMS
                    </button>
                </div>
            </div>
        \`;
        showModal('📦 Almacenes - Solo Lectura', content, null);
        document.getElementById('modal-save-btn').style.display = 'none';
    };

    // ============================================================================
    // MODAL: CREAR TRANSPORTISTA (4 TABS)
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
                <div class="form-tab-content active" id="tab-carrier-basic">
                    <div class="form-section-title">🏢 Identificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="TRANS-001" maxlength="20"></div>
                        <div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="Transportes Express"></div>
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
                            </select>
                        </div>
                        <div class="form-group"><label>Estado</label>
                            <select name="active"><option value="true">✅ Activo</option><option value="false">❌ Inactivo</option></select>
                        </div>
                    </div>
                    <div class="form-section-title">📞 Contacto</div>
                    <div class="form-row">
                        <div class="form-group"><label>Contacto</label><input type="text" name="contact_name" placeholder="Juan Pérez"></div>
                        <div class="form-group"><label>Teléfono</label><input type="tel" name="phone" placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="email" placeholder="contacto@transporte.com"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-carrier-services">
                    <div class="form-section-title">🚚 Tipos de Servicio</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="service_standard" checked> 📦 Estándar</label>
                        <label><input type="checkbox" name="service_express"> ⚡ Express</label>
                        <label><input type="checkbox" name="service_overnight"> 🌙 Overnight</label>
                        <label><input type="checkbox" name="service_sameday"> ⏰ Same Day</label>
                    </div></div></div>
                    <div class="form-section-title">⚙️ Especialidades</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="specialty_refrigerated"> ❄️ Refrigerados</label>
                        <label><input type="checkbox" name="specialty_hazmat"> ☢️ HAZMAT</label>
                        <label><input type="checkbox" name="specialty_fragile"> 🔮 Frágiles</label>
                        <label><input type="checkbox" name="specialty_oversized"> 📐 Sobredimensionados</label>
                    </div></div></div>
                    <div class="form-section-title">🗺️ Cobertura Nacional</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="zone_caba" checked> CABA</label>
                        <label><input type="checkbox" name="zone_gba" checked> GBA</label>
                        <label><input type="checkbox" name="zone_bsas"> Interior Bs.As.</label>
                        <label><input type="checkbox" name="zone_litoral"> Litoral</label>
                        <label><input type="checkbox" name="zone_noa"> NOA</label>
                        <label><input type="checkbox" name="zone_cuyo"> Cuyo</label>
                        <label><input type="checkbox" name="zone_patagonia"> Patagonia</label>
                    </div></div></div>
                </div>
                <div class="form-tab-content" id="tab-carrier-rates">
                    <div class="form-section-title">💰 Tarifas Base</div>
                    <div class="form-row">
                        <div class="form-group"><label>$/Kg</label><input type="number" name="weight_rate_per_kg" placeholder="150" step="0.01" min="0"></div>
                        <div class="form-group"><label>$/m³</label><input type="number" name="volume_rate_per_m3" placeholder="5000" step="0.01" min="0"></div>
                        <div class="form-group"><label>$/Km</label><input type="number" name="distance_rate_per_km" placeholder="25" step="0.01" min="0"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Cargo Mínimo ($)</label><input type="number" name="min_charge" placeholder="500" step="0.01" min="0"></div>
                        <div class="form-group"><label>Recargo Combustible (%)</label><input type="number" name="fuel_surcharge_pct" placeholder="15" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Seguro (%)</label><input type="number" name="insurance_pct" placeholder="1.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">📅 Condiciones</div>
                    <div class="form-row">
                        <div class="form-group"><label>Días de Crédito</label><input type="number" name="credit_days" placeholder="30" min="0" max="120"></div>
                        <div class="form-group"><label>Contrato Desde</label><input type="date" name="contract_start"></div>
                        <div class="form-group"><label>Contrato Hasta</label><input type="date" name="contract_end"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-carrier-metrics">
                    <div class="form-section-title">📈 SLA Objetivo</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tiempo Entrega Prom (días)</label><input type="number" name="avg_delivery_days" placeholder="2.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>On-Time Target (%)</label><input type="number" name="target_on_time_pct" placeholder="95" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Daño Máx (%)</label><input type="number" name="max_damage_pct" placeholder="0.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">⭐ Calificación Inicial</div>
                    <div class="form-row">
                        <div class="form-group"><label>Rating</label><select name="rating"><option value="5">⭐⭐⭐⭐⭐ Excelente</option><option value="4">⭐⭐⭐⭐ Muy Bueno</option><option value="3" selected>⭐⭐⭐ Bueno</option><option value="2">⭐⭐ Regular</option></select></div>
                        <div class="form-group"><label>Prioridad</label><select name="priority"><option value="1">🥇 Alta</option><option value="2">🥈 Media</option><option value="3" selected>🥉 Normal</option></select></div>
                    </div>
                    <div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="3" placeholder="Observaciones sobre el transportista..."></textarea></div></div>
                </div>
            </form>
        \`;
        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            const services = [];
            ['standard','express','overnight','sameday'].forEach(s => {
                if (formData.get('service_' + s)) services.push(s.toUpperCase());
            });
            const coverageZones = [];
            ['caba','gba','bsas','litoral','noa','cuyo','patagonia'].forEach(z => {
                if (formData.get('zone_' + z)) coverageZones.push(z.toUpperCase());
            });
            const data = {
                code: formData.get('code'), name: formData.get('name'), legal_name: formData.get('legal_name'),
                tax_id: formData.get('tax_id'), type: formData.get('type'), contact_name: formData.get('contact_name'),
                phone: formData.get('phone'), email: formData.get('email'),
                services: services, coverage_zones: coverageZones,
                weight_rate_per_kg: parseFloat(formData.get('weight_rate_per_kg')) || null,
                volume_rate_per_m3: parseFloat(formData.get('volume_rate_per_m3')) || null,
                min_charge: parseFloat(formData.get('min_charge')) || null,
                fuel_surcharge_pct: parseFloat(formData.get('fuel_surcharge_pct')) || 0,
                avg_delivery_days: parseFloat(formData.get('avg_delivery_days')) || null,
                notes: formData.get('notes'), active: formData.get('active') === 'true'
            };
            try {
                const response = await fetchAPI('/carriers', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Transportista creado'); closeModal(); loadTabData('fleet'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // ============================================================================
    // MODAL: CREAR VEHÍCULO (4 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateVehicleModal = function() {
        const content = \`
            <form id="vehicle-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="specs">⚙️ Specs</button>
                    <button type="button" class="form-tab" data-tab="docs">📄 Documentos</button>
                    <button type="button" class="form-tab" data-tab="equipment">🔧 Equipamiento</button>
                </div>
                <div class="form-tab-content active" id="tab-vehicle-basic">
                    <div class="form-section-title">🚗 Identificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Patente *</label><input type="text" name="plate_number" required placeholder="AB 123 CD" maxlength="10"></div>
                        <div class="form-group"><label>Código Interno</label><input type="text" name="internal_code" placeholder="VEH-001"></div>
                        <div class="form-group"><label>VIN</label><input type="text" name="vin" placeholder="1HGBH41JXMN109186" maxlength="17"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Marca *</label><input type="text" name="brand" required placeholder="Mercedes-Benz"></div>
                        <div class="form-group"><label>Modelo *</label><input type="text" name="model" required placeholder="Sprinter 516"></div>
                        <div class="form-group"><label>Año *</label><input type="number" name="year" required placeholder="2024" min="1990" max="2030"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo *</label>
                            <select name="vehicle_type" required>
                                <option value="VAN">🚐 Van</option>
                                <option value="TRUCK">🚛 Camión</option>
                                <option value="MOTORCYCLE">🏍️ Moto</option>
                                <option value="CAR">🚗 Auto</option>
                                <option value="TRAILER">🚃 Semi</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Estado</label>
                            <select name="status">
                                <option value="AVAILABLE">✅ Disponible</option>
                                <option value="IN_USE">🚀 En Uso</option>
                                <option value="MAINTENANCE">🔧 Mantenimiento</option>
                                <option value="OUT_OF_SERVICE">❌ Fuera de Servicio</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Transportista</label>
                            <select name="carrier_id"><option value="">Flota Propia</option></select>
                        </div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-vehicle-specs">
                    <div class="form-section-title">📐 Dimensiones</div>
                    <div class="form-row">
                        <div class="form-group"><label>Largo (m)</label><input type="number" name="length_m" placeholder="6.0" step="0.1" min="0"></div>
                        <div class="form-group"><label>Ancho (m)</label><input type="number" name="width_m" placeholder="2.2" step="0.1" min="0"></div>
                        <div class="form-group"><label>Alto (m)</label><input type="number" name="height_m" placeholder="2.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>Volumen (m³)</label><input type="number" name="volume_m3" placeholder="33" step="0.1" min="0"></div>
                    </div>
                    <div class="form-section-title">⚖️ Capacidad</div>
                    <div class="form-row">
                        <div class="form-group"><label>Carga Máx (kg)</label><input type="number" name="max_weight_kg" placeholder="3500" min="0"></div>
                        <div class="form-group"><label>Pallets</label><input type="number" name="pallet_capacity" placeholder="12" min="0"></div>
                        <div class="form-group"><label>Ejes</label><input type="number" name="axles" placeholder="2" min="1" max="10"></div>
                    </div>
                    <div class="form-section-title">⛽ Combustible</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo</label>
                            <select name="fuel_type">
                                <option value="DIESEL">🛢️ Diesel</option>
                                <option value="GASOLINE">⛽ Nafta</option>
                                <option value="ELECTRIC">⚡ Eléctrico</option>
                                <option value="GNC">🔵 GNC</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Consumo (L/100km)</label><input type="number" name="fuel_consumption" placeholder="12" step="0.1" min="0"></div>
                        <div class="form-group"><label>Tanque (L)</label><input type="number" name="fuel_tank_capacity" placeholder="80" min="0"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-vehicle-docs">
                    <div class="form-section-title">📋 Documentación Obligatoria</div>
                    <div class="form-row">
                        <div class="form-group"><label>VTV Vence</label><input type="date" name="vtv_expiry"></div>
                        <div class="form-group"><label>Seguro Vence</label><input type="date" name="insurance_expiry"></div>
                        <div class="form-group"><label>RUTA Vence</label><input type="date" name="ruta_expiry"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Póliza Nro</label><input type="text" name="insurance_policy" placeholder="POL-123456"></div>
                        <div class="form-group"><label>Compañía Seguro</label><input type="text" name="insurance_company" placeholder="La Caja"></div>
                    </div>
                    <div class="form-section-title">🔧 Mantenimiento</div>
                    <div class="form-row">
                        <div class="form-group"><label>Km Actual</label><input type="number" name="current_mileage" placeholder="50000" min="0"></div>
                        <div class="form-group"><label>Próximo Service (km)</label><input type="number" name="next_service_km" placeholder="60000" min="0"></div>
                        <div class="form-group"><label>Último Service</label><input type="date" name="last_service_date"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-vehicle-equipment">
                    <div class="form-section-title">🔧 Equipamiento Especial</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="has_gps" checked> 📍 GPS</label>
                        <label><input type="checkbox" name="has_dashcam"> 📹 Dashcam</label>
                        <label><input type="checkbox" name="has_refrigeration"> ❄️ Refrigeración</label>
                        <label><input type="checkbox" name="has_lift"> ⬆️ Plataforma</label>
                    </div></div></div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="has_tail_lift"> 📦 Rampa</label>
                        <label><input type="checkbox" name="hazmat_certified"> ☢️ HAZMAT</label>
                        <label><input type="checkbox" name="adr_certified"> 🔴 ADR</label>
                    </div></div></div>
                    <div class="form-row">
                        <div class="form-group"><label>Temp Mín (°C)</label><input type="number" name="temp_min" placeholder="-20" step="1"></div>
                        <div class="form-group"><label>Temp Máx (°C)</label><input type="number" name="temp_max" placeholder="25" step="1"></div>
                    </div>
                    <div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div>
                </div>
            </form>
        \`;
        showModal('🚗 Nuevo Vehículo', content, async () => {
            const form = document.getElementById('vehicle-form');
            const formData = new FormData(form);
            const data = {
                plate_number: formData.get('plate_number'), internal_code: formData.get('internal_code'),
                vin: formData.get('vin'), brand: formData.get('brand'), model: formData.get('model'),
                year: parseInt(formData.get('year')), vehicle_type: formData.get('vehicle_type'),
                status: formData.get('status'), carrier_id: formData.get('carrier_id') || null,
                length_m: parseFloat(formData.get('length_m')) || null,
                width_m: parseFloat(formData.get('width_m')) || null,
                height_m: parseFloat(formData.get('height_m')) || null,
                volume_m3: parseFloat(formData.get('volume_m3')) || null,
                max_weight_kg: parseFloat(formData.get('max_weight_kg')) || null,
                pallet_capacity: parseInt(formData.get('pallet_capacity')) || null,
                fuel_type: formData.get('fuel_type'),
                fuel_consumption: parseFloat(formData.get('fuel_consumption')) || null,
                has_gps: !!formData.get('has_gps'), has_dashcam: !!formData.get('has_dashcam'),
                has_refrigeration: !!formData.get('has_refrigeration'),
                notes: formData.get('notes')
            };
            try {
                const response = await fetchAPI('/vehicles', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Vehículo creado'); closeModal(); loadTabData('fleet'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // ============================================================================
    // MODAL: CREAR CONDUCTOR (5 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateDriverModal = function() {
        const content = \`
            <form id="driver-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">👤 Personal</button>
                    <button type="button" class="form-tab" data-tab="license">🪪 Licencia</button>
                    <button type="button" class="form-tab" data-tab="medical">🏥 Médico</button>
                    <button type="button" class="form-tab" data-tab="certs">📜 Certs</button>
                    <button type="button" class="form-tab" data-tab="hours">⏰ Horas</button>
                </div>
                <div class="form-tab-content active" id="tab-driver-basic">
                    <div class="form-section-title">👤 Datos Personales</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nombre *</label><input type="text" name="first_name" required placeholder="Juan"></div>
                        <div class="form-group"><label>Apellido *</label><input type="text" name="last_name" required placeholder="Pérez"></div>
                        <div class="form-group"><label>DNI *</label><input type="text" name="document_number" required placeholder="12345678"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Email</label><input type="email" name="email" placeholder="juan@email.com"></div>
                        <div class="form-group"><label>Teléfono</label><input type="tel" name="phone" placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Fecha Nac.</label><input type="date" name="birth_date"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Legajo</label><input type="text" name="employee_code" placeholder="EMP-001"></div>
                        <div class="form-group"><label>Estado</label>
                            <select name="status">
                                <option value="ACTIVE">✅ Activo</option>
                                <option value="ON_LEAVE">🏖️ Licencia</option>
                                <option value="SUSPENDED">⚠️ Suspendido</option>
                                <option value="INACTIVE">❌ Inactivo</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Transportista</label>
                            <select name="carrier_id"><option value="">Flota Propia</option></select>
                        </div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-driver-license">
                    <div class="form-section-title">🪪 Licencia de Conducir</div>
                    <div class="form-row">
                        <div class="form-group"><label>Número Licencia *</label><input type="text" name="license_number" required placeholder="12345678"></div>
                        <div class="form-group"><label>Categoría *</label>
                            <select name="license_category" required>
                                <option value="A1">A1 - Motos</option>
                                <option value="B1">B1 - Autos</option>
                                <option value="B2">B2 - Autos + remolque</option>
                                <option value="C1">C1 - Camiones livianos</option>
                                <option value="C2">C2 - Camiones pesados</option>
                                <option value="C3">C3 - Camiones articulados</option>
                                <option value="D1">D1 - Transporte pasajeros</option>
                                <option value="E1">E1 - Especiales</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Vence</label><input type="date" name="license_expiry"></div>
                    </div>
                    <div class="form-section-title">📋 LINTI</div>
                    <div class="form-row">
                        <div class="form-group"><label>Número LINTI</label><input type="text" name="linti_number" placeholder="LINTI-12345"></div>
                        <div class="form-group"><label>Vence</label><input type="date" name="linti_expiry"></div>
                        <div class="form-group"><label>Estado</label>
                            <select name="linti_status">
                                <option value="VALID">✅ Vigente</option>
                                <option value="PENDING">⏳ En Trámite</option>
                                <option value="EXPIRED">❌ Vencida</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-driver-medical">
                    <div class="form-section-title">🏥 Psicofísico</div>
                    <div class="form-row">
                        <div class="form-group"><label>Último Examen</label><input type="date" name="last_medical_exam"></div>
                        <div class="form-group"><label>Próximo Examen</label><input type="date" name="next_medical_exam"></div>
                        <div class="form-group"><label>Resultado</label>
                            <select name="medical_status">
                                <option value="APPROVED">✅ Apto</option>
                                <option value="CONDITIONAL">⚠️ Apto Condicional</option>
                                <option value="PENDING">⏳ Pendiente</option>
                                <option value="REJECTED">❌ No Apto</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-section-title">🩺 Información Médica</div>
                    <div class="form-row">
                        <div class="form-group"><label>Grupo Sanguíneo</label>
                            <select name="blood_type">
                                <option value="">Seleccionar...</option>
                                <option value="A+">A+</option><option value="A-">A-</option>
                                <option value="B+">B+</option><option value="B-">B-</option>
                                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                <option value="O+">O+</option><option value="O-">O-</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Contacto Emergencia</label><input type="text" name="emergency_contact" placeholder="María Pérez"></div>
                        <div class="form-group"><label>Tel. Emergencia</label><input type="tel" name="emergency_phone" placeholder="+54 11 9999-8888"></div>
                    </div>
                    <div class="form-row"><div class="form-group full-width"><label>Alergias/Condiciones</label><textarea name="medical_notes" rows="2" placeholder="Información médica relevante..."></textarea></div></div>
                </div>
                <div class="form-tab-content" id="tab-driver-certs">
                    <div class="form-section-title">📜 Certificaciones</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="cert_hazmat"> ☢️ HAZMAT</label>
                        <label><input type="checkbox" name="cert_adr"> 🔴 ADR</label>
                        <label><input type="checkbox" name="cert_refrigerated"> ❄️ Refrigerados</label>
                        <label><input type="checkbox" name="cert_livestock"> 🐄 Hacienda</label>
                    </div></div></div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="cert_defensive_driving"> 🛡️ Manejo Defensivo</label>
                        <label><input type="checkbox" name="cert_first_aid"> 🚑 Primeros Auxilios</label>
                        <label><input type="checkbox" name="cert_fire_extinguisher"> 🧯 Uso Extintores</label>
                    </div></div></div>
                    <div class="form-section-title">📱 App y Comunicación</div>
                    <div class="form-row">
                        <div class="form-group"><label><input type="checkbox" name="has_app_installed" checked> Tiene App instalada</label></div>
                        <div class="form-group"><label>ID App</label><input type="text" name="app_user_id" placeholder="DRV-123"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-driver-hours">
                    <div class="form-section-title">⏰ Control de Horas</div>
                    <div class="form-row">
                        <div class="form-group"><label>Horas Semanales Máx</label><input type="number" name="max_weekly_hours" placeholder="48" min="0" max="80"></div>
                        <div class="form-group"><label>Horas Diarias Máx</label><input type="number" name="max_daily_hours" placeholder="10" min="0" max="16"></div>
                        <div class="form-group"><label>Descanso Mín (hrs)</label><input type="number" name="min_rest_hours" placeholder="11" min="0" max="24"></div>
                    </div>
                    <div class="form-section-title">💰 Compensación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Salario Base ($)</label><input type="number" name="base_salary" placeholder="150000" min="0"></div>
                        <div class="form-group"><label>$/Km Extra</label><input type="number" name="per_km_bonus" placeholder="10" step="0.1" min="0"></div>
                        <div class="form-group"><label>$/Entrega</label><input type="number" name="per_delivery_bonus" placeholder="50" step="0.1" min="0"></div>
                    </div>
                    <div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div>
                </div>
            </form>
        \`;
        showModal('👤 Nuevo Conductor', content, async () => {
            const form = document.getElementById('driver-form');
            const formData = new FormData(form);
            const certifications = [];
            ['hazmat','adr','refrigerated','livestock','defensive_driving','first_aid','fire_extinguisher'].forEach(c => {
                if (formData.get('cert_' + c)) certifications.push(c.toUpperCase());
            });
            const data = {
                first_name: formData.get('first_name'), last_name: formData.get('last_name'),
                document_number: formData.get('document_number'), email: formData.get('email'),
                phone: formData.get('phone'), birth_date: formData.get('birth_date') || null,
                employee_code: formData.get('employee_code'), status: formData.get('status'),
                carrier_id: formData.get('carrier_id') || null,
                license_number: formData.get('license_number'), license_category: formData.get('license_category'),
                license_expiry: formData.get('license_expiry') || null,
                linti_number: formData.get('linti_number'), linti_expiry: formData.get('linti_expiry') || null,
                medical_status: formData.get('medical_status'),
                blood_type: formData.get('blood_type') || null,
                emergency_contact: formData.get('emergency_contact'), emergency_phone: formData.get('emergency_phone'),
                certifications: certifications,
                has_app_installed: !!formData.get('has_app_installed'),
                max_weekly_hours: parseInt(formData.get('max_weekly_hours')) || 48,
                notes: formData.get('notes')
            };
            try {
                const response = await fetchAPI('/drivers', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Conductor creado'); closeModal(); loadTabData('fleet'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // ============================================================================
    // MODAL: CREAR ZONA
    // ============================================================================
    window.LogisticsDashboard.showCreateZoneModal = function() {
        const content = \`
            <form id="zone-form" class="modal-form">
                <div class="form-section-title">🗺️ Nueva Zona de Entrega</div>
                <div class="form-row">
                    <div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="ZONA-CABA-01"></div>
                    <div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="CABA Norte"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Tipo</label>
                        <select name="zone_type">
                            <option value="URBAN">🏙️ Urbana</option>
                            <option value="SUBURBAN">🏘️ Suburbana</option>
                            <option value="RURAL">🌾 Rural</option>
                            <option value="INDUSTRIAL">🏭 Industrial</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Prioridad</label>
                        <select name="priority">
                            <option value="1">🔴 Alta</option>
                            <option value="2">🟡 Media</option>
                            <option value="3">🟢 Normal</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Tiempo Base (min)</label><input type="number" name="base_delivery_time" placeholder="60" min="0"></div>
                    <div class="form-group"><label>Costo Extra ($)</label><input type="number" name="extra_cost" placeholder="0" step="0.01" min="0"></div>
                </div>
                <div class="form-row"><div class="form-group full-width"><label>Descripción</label><textarea name="description" rows="2" placeholder="Límites de la zona..."></textarea></div></div>
            </form>
        \`;
        showModal('🗺️ Nueva Zona', content, async () => {
            const form = document.getElementById('zone-form');
            const formData = new FormData(form);
            const data = {
                code: formData.get('code'), name: formData.get('name'),
                zone_type: formData.get('zone_type'), priority: parseInt(formData.get('priority')),
                base_delivery_time: parseInt(formData.get('base_delivery_time')) || null,
                extra_cost: parseFloat(formData.get('extra_cost')) || 0,
                description: formData.get('description')
            };
            try {
                const response = await fetchAPI('/delivery-zones', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Zona creada'); closeModal(); loadTabData('routes'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // ============================================================================
    // MODAL: CREAR ENVÍO
    // ============================================================================
    window.LogisticsDashboard.showCreateShipmentModal = function() {
        const content = \`
            <form id="shipment-form" class="modal-form">
                <div class="form-section-title">📦 Nuevo Envío</div>
                <div class="form-row">
                    <div class="form-group"><label>Referencia *</label><input type="text" name="reference" required placeholder="ENV-2024-001"></div>
                    <div class="form-group"><label>Tipo</label>
                        <select name="shipment_type">
                            <option value="DELIVERY">📤 Entrega</option>
                            <option value="PICKUP">📥 Retiro</option>
                            <option value="TRANSFER">🔄 Transferencia</option>
                            <option value="RETURN">↩️ Devolución</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Prioridad</label>
                        <select name="priority">
                            <option value="URGENT">🔴 Urgente</option>
                            <option value="HIGH">🟠 Alta</option>
                            <option value="NORMAL" selected>🟢 Normal</option>
                            <option value="LOW">🔵 Baja</option>
                        </select>
                    </div>
                </div>
                <div class="form-section-title">📍 Destino</div>
                <div class="form-row">
                    <div class="form-group"><label>Destinatario *</label><input type="text" name="recipient_name" required placeholder="Juan Pérez"></div>
                    <div class="form-group"><label>Teléfono</label><input type="tel" name="recipient_phone" placeholder="+54 11 1234-5678"></div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width"><label>Dirección *</label><input type="text" name="delivery_address" required placeholder="Av. Corrientes 1234, CABA"></div>
                </div>
                <div class="form-section-title">📦 Contenido</div>
                <div class="form-row">
                    <div class="form-group"><label>Peso (kg)</label><input type="number" name="weight_kg" placeholder="5" step="0.1" min="0"></div>
                    <div class="form-group"><label>Bultos</label><input type="number" name="pieces" placeholder="1" min="1"></div>
                    <div class="form-group"><label>Valor Declarado ($)</label><input type="number" name="declared_value" placeholder="1000" step="0.01" min="0"></div>
                </div>
                <div class="form-row"><div class="form-group full-width"><label>Instrucciones</label><textarea name="delivery_instructions" rows="2" placeholder="Instrucciones especiales..."></textarea></div></div>
            </form>
        \`;
        showModal('📦 Nuevo Envío', content, async () => {
            const form = document.getElementById('shipment-form');
            const formData = new FormData(form);
            const data = {
                reference: formData.get('reference'), shipment_type: formData.get('shipment_type'),
                priority: formData.get('priority'), recipient_name: formData.get('recipient_name'),
                recipient_phone: formData.get('recipient_phone'), delivery_address: formData.get('delivery_address'),
                weight_kg: parseFloat(formData.get('weight_kg')) || null,
                pieces: parseInt(formData.get('pieces')) || 1,
                declared_value: parseFloat(formData.get('declared_value')) || null,
                delivery_instructions: formData.get('delivery_instructions')
            };
            try {
                const response = await fetchAPI('/shipments', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Envío creado'); closeModal(); loadTabData('operations'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // ============================================================================
    // MODAL: GENERAR OLA (WAVE)
    // ============================================================================
    window.LogisticsDashboard.showGenerateWaveModal = function() {
        const content = \`
            <form id="wave-form" class="modal-form">
                <div class="form-section-title">🌊 Generar Ola de Entregas</div>
                <div class="form-row">
                    <div class="form-group"><label>Nombre Ola *</label><input type="text" name="wave_name" required placeholder="OLA-2024-01-15-AM"></div>
                    <div class="form-group"><label>Fecha</label><input type="date" name="wave_date" value="${new Date().toISOString().split('T')[0]}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Turno</label>
                        <select name="shift">
                            <option value="AM">🌅 Mañana (6-14)</option>
                            <option value="PM">🌆 Tarde (14-22)</option>
                            <option value="NIGHT">🌙 Noche (22-6)</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Prioridad Mín</label>
                        <select name="min_priority">
                            <option value="URGENT">Solo Urgentes</option>
                            <option value="HIGH">Alta y Urgentes</option>
                            <option value="NORMAL" selected>Normal+</option>
                            <option value="LOW">Todas</option>
                        </select>
                    </div>
                </div>
                <div class="form-section-title">🚛 Asignación</div>
                <div class="form-row">
                    <div class="form-group"><label>Vehículo</label><select name="vehicle_id"><option value="">Auto-asignar</option></select></div>
                    <div class="form-group"><label>Conductor</label><select name="driver_id"><option value="">Auto-asignar</option></select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Máx Entregas</label><input type="number" name="max_stops" placeholder="20" min="1" max="100"></div>
                    <div class="form-group"><label>Optimizar Por</label>
                        <select name="optimization">
                            <option value="DISTANCE">📏 Distancia</option>
                            <option value="TIME">⏱️ Tiempo</option>
                            <option value="PRIORITY">🔴 Prioridad</option>
                        </select>
                    </div>
                </div>
            </form>
        \`;
        showModal('🌊 Generar Ola', content, async () => {
            const form = document.getElementById('wave-form');
            const formData = new FormData(form);
            const data = {
                wave_name: formData.get('wave_name'), wave_date: formData.get('wave_date'),
                shift: formData.get('shift'), min_priority: formData.get('min_priority'),
                vehicle_id: formData.get('vehicle_id') || null, driver_id: formData.get('driver_id') || null,
                max_stops: parseInt(formData.get('max_stops')) || 20,
                optimization: formData.get('optimization')
            };
            try {
                const response = await fetchAPI('/waves/generate', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Ola generada: ' + response.data.stops + ' paradas'); closeModal(); loadTabData('operations'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // ============================================================================
    // MODAL: CREAR RUTA
    // ============================================================================
    window.LogisticsDashboard.showCreateRouteModal = function() {
        const content = \`
            <form id="route-form" class="modal-form">
                <div class="form-section-title">🛣️ Nueva Ruta</div>
                <div class="form-row">
                    <div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="RUT-001"></div>
                    <div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="CABA Centro - GBA Sur"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Origen</label><input type="text" name="origin" placeholder="CD Central"></div>
                    <div class="form-group"><label>Destino</label><input type="text" name="destination" placeholder="Zona Sur"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Distancia (km)</label><input type="number" name="distance_km" placeholder="45" step="0.1" min="0"></div>
                    <div class="form-group"><label>Tiempo Est. (min)</label><input type="number" name="estimated_time" placeholder="90" min="0"></div>
                    <div class="form-group"><label>Tipo</label>
                        <select name="route_type">
                            <option value="FIXED">📍 Fija</option>
                            <option value="DYNAMIC">🔄 Dinámica</option>
                            <option value="EXPRESS">⚡ Express</option>
                        </select>
                    </div>
                </div>
                <div class="form-row"><div class="form-group full-width"><label>Descripción</label><textarea name="description" rows="2" placeholder="Descripción de la ruta..."></textarea></div></div>
            </form>
        \`;
        showModal('🛣️ Nueva Ruta', content, async () => {
            const form = document.getElementById('route-form');
            const formData = new FormData(form);
            const data = {
                code: formData.get('code'), name: formData.get('name'),
                origin: formData.get('origin'), destination: formData.get('destination'),
                distance_km: parseFloat(formData.get('distance_km')) || null,
                estimated_time: parseInt(formData.get('estimated_time')) || null,
                route_type: formData.get('route_type'), description: formData.get('description')
            };
            try {
                const response = await fetchAPI('/routes', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Ruta creada'); closeModal(); loadTabData('routes'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
    };

`;

// PASO 4: Reemplazar desde el comentario hasta el cierre IIFE
const beforeStubs = content.substring(0, stubStart);
const newContent = beforeStubs + newFunctions + '})();\n';

fs.writeFileSync(path, newContent, 'utf8');

const newLineCount = newContent.split('\n').length;
console.log('✅ SUCCESS: Funciones restauradas');
console.log('   Líneas antes:', content.split('\n').length);
console.log('   Líneas después:', newLineCount);
console.log('   Funciones agregadas:');
console.log('   - showModal, closeModal, initModalTabs');
console.log('   - showInfo, showWarning');
console.log('   - switchTab (expuesto)');
console.log('   - showCreateWarehouseModal (solo lectura + link WMS)');
console.log('   - showCreateCarrierModal (4 tabs)');
console.log('   - showCreateVehicleModal (4 tabs)');
console.log('   - showCreateDriverModal (5 tabs)');
console.log('   - showCreateZoneModal, showCreateShipmentModal');
console.log('   - showGenerateWaveModal, showCreateRouteModal');
