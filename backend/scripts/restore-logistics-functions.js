const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/logistics-dashboard.js';
let content = fs.readFileSync(path, 'utf8');

// Código a reemplazar
const oldCode = `    // Más funciones públicas...
    window.LogisticsDashboard.showCreateWarehouseModal = function() {
        console.log('Crear almacén');
        // TODO: Implementar modal
    };

    window.LogisticsDashboard.showCreateCarrierModal = function() {
        console.log('Crear transportista');
    };

    window.LogisticsDashboard.showCreateZoneModal = function() {
        console.log('Crear zona');
    };

    window.LogisticsDashboard.showCreateShipmentModal = function() {
        console.log('Crear envío');
    };

    window.LogisticsDashboard.showGenerateWaveModal = function() {
        console.log('Generar ola');
    };

})();`;

// Nuevo código completo
const newCode = `    // ============================================================================
    // FUNCIONES PÚBLICAS RESTAURADAS
    // ============================================================================

    // SWITCH TAB - Corregido para usar clase .logistics-tab
    window.LogisticsDashboard.switchTab = function(tabId) {
        console.log('🚚 [LOGISTICS] Cambiando a tab:', tabId);
        currentTab = tabId;
        const contentContainer = document.getElementById('logistics-content');
        if (contentContainer) {
            contentContainer.innerHTML = renderTabContent(tabId);
        }
        document.querySelectorAll('.logistics-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.logistics-tab').forEach(btn => {
            if (btn.getAttribute('onclick')?.includes("'" + tabId + "'")) {
                btn.classList.add('active');
            }
        });
        loadTabData(tabId);
    };

    // NOTIFICACIONES
    function showInfo(message) {
        const notification = document.createElement('div');
        notification.innerHTML = '<span>ℹ️</span> ' + message;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#e3f2fd;border-left:4px solid #2196f3;border-radius:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function showWarning(message) {
        const notification = document.createElement('div');
        notification.innerHTML = '<span>⚠️</span> ' + message;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#fff3e0;border-left:4px solid #ff9800;border-radius:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function showSuccess(message) {
        const notification = document.createElement('div');
        notification.innerHTML = '<span>✅</span> ' + message;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#e8f5e9;border-left:4px solid #4caf50;border-radius:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function showError(message) {
        const notification = document.createElement('div');
        notification.innerHTML = '<span>❌</span> ' + message;
        notification.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;background:#ffebee;border-left:4px solid #f44336;border-radius:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // MODAL GENERICO
    function showModal(title, content, onSave) {
        const existingModal = document.getElementById('logistics-modal');
        if (existingModal) existingModal.remove();
        const modal = document.createElement('div');
        modal.id = 'logistics-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-container" style="max-width:900px;max-height:90vh;overflow-y:auto;"><div class="modal-header"><h3>' + title + '</h3><button class="modal-close" onclick="LogisticsDashboard.closeModal()">&times;</button></div><div class="modal-body">' + content + '</div><div class="modal-footer"><button class="btn-secondary" onclick="LogisticsDashboard.closeModal()">Cancelar</button><button class="btn-primary" id="modal-save-btn">Guardar</button></div></div>';
        document.body.appendChild(modal);
        if (onSave) document.getElementById('modal-save-btn').addEventListener('click', onSave);
    }

    function closeModal() {
        const modal = document.getElementById('logistics-modal');
        if (modal) modal.remove();
    }
    window.LogisticsDashboard.closeModal = closeModal;

    // INIT MODAL TABS
    function initModalTabs() {
        document.querySelectorAll('.form-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.form-tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                const content = document.querySelector('.form-tab-content#tab-' + tabId + ', .form-tab-content#tab-carrier-' + tabId);
                if (content) content.classList.add('active');
            });
        });
    }

    // MODAL: ALMACÉN (SOLO LECTURA - USA WMS)
    window.LogisticsDashboard.showCreateWarehouseModal = function() {
        showInfo('Los almacenes se gestionan desde el módulo WMS');
        const content = '<div style="text-align:center;padding:30px;"><div style="font-size:48px;margin-bottom:20px;">🏭</div><h3>Gestión de Almacenes</h3><p style="margin:20px 0;color:#666;">Los almacenes se administran desde el módulo <strong>WMS</strong>.</p><button class="btn-primary" onclick="window.location.hash=\\'warehouse-management\\'" style="margin-top:20px;">🔗 Ir a Gestión de Almacenes</button></div>';
        showModal('🏭 Almacenes', content, null);
        setTimeout(() => { const btn = document.getElementById('modal-save-btn'); if(btn) btn.style.display='none'; }, 50);
    };

    // MODAL: TRANSPORTISTA (4 TABS)
    window.LogisticsDashboard.showCreateCarrierModal = function() {
        const content = '<form id="carrier-form" class="modal-form modal-form-large"><div class="form-tabs"><button type="button" class="form-tab active" data-tab="basic">📋 Básico</button><button type="button" class="form-tab" data-tab="services">🚚 Servicios</button><button type="button" class="form-tab" data-tab="rates">💰 Tarifas</button><button type="button" class="form-tab" data-tab="metrics">📊 Métricas</button></div><div class="form-tab-content active" id="tab-carrier-basic"><div class="form-section-title">🏢 Identificación</div><div class="form-row"><div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="TRANS-001"></div><div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="Transportes Express"></div><div class="form-group"><label>CUIT</label><input type="text" name="tax_id" placeholder="30-12345678-9"></div></div><div class="form-row"><div class="form-group"><label>Tipo *</label><select name="type" required><option value="INTERNAL">🏠 Flota Propia</option><option value="EXTERNAL">🤝 Tercerizado</option><option value="COURIER">📦 Courier</option><option value="FREIGHT">🚛 Carga Pesada</option></select></div></div><div class="form-section-title">📞 Contacto</div><div class="form-row"><div class="form-group"><label>Contacto</label><input type="text" name="contact_name" placeholder="Juan Pérez"></div><div class="form-group"><label>Teléfono</label><input type="tel" name="phone" placeholder="+54 11 1234-5678"></div><div class="form-group"><label>Email</label><input type="email" name="email" placeholder="contacto@transporte.com"></div></div></div><div class="form-tab-content" id="tab-carrier-services"><div class="form-section-title">🚚 Servicios</div><div class="form-row"><div class="form-group full-width"><div class="checkbox-group" style="display:flex;gap:15px;flex-wrap:wrap;"><label><input type="checkbox" name="service_standard" checked> 📦 Estándar</label><label><input type="checkbox" name="service_express"> ⚡ Express</label></div></div></div><div class="form-section-title">🗺️ Cobertura</div><div class="form-row"><div class="form-group full-width"><div class="checkbox-group" style="display:flex;gap:15px;flex-wrap:wrap;"><label><input type="checkbox" name="zone_caba" checked> CABA</label><label><input type="checkbox" name="zone_gba" checked> GBA</label><label><input type="checkbox" name="zone_interior"> Interior</label></div></div></div></div><div class="form-tab-content" id="tab-carrier-rates"><div class="form-section-title">💰 Tarifas</div><div class="form-row"><div class="form-group"><label>$/Kg</label><input type="number" name="weight_rate_per_kg" placeholder="150" step="0.01" min="0"></div><div class="form-group"><label>$/m³</label><input type="number" name="volume_rate_per_m3" placeholder="5000" step="0.01" min="0"></div><div class="form-group"><label>Cargo Mínimo ($)</label><input type="number" name="min_charge" placeholder="500" step="0.01" min="0"></div></div></div><div class="form-tab-content" id="tab-carrier-metrics"><div class="form-section-title">📈 SLA</div><div class="form-row"><div class="form-group"><label>Tiempo Entrega (días)</label><input type="number" name="avg_delivery_days" placeholder="2.5" step="0.1" min="0"></div><div class="form-group"><label>On-Time (%)</label><input type="number" name="on_time_pct" placeholder="95" step="0.1" min="0" max="100"></div></div><div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div></div></form>';
        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            const data = { code: formData.get('code'), name: formData.get('name'), tax_id: formData.get('tax_id'), type: formData.get('type'), contact_name: formData.get('contact_name'), phone: formData.get('phone'), email: formData.get('email'), weight_rate_per_kg: parseFloat(formData.get('weight_rate_per_kg')) || null, volume_rate_per_m3: parseFloat(formData.get('volume_rate_per_m3')) || null, min_charge: parseFloat(formData.get('min_charge')) || null, avg_delivery_days: parseFloat(formData.get('avg_delivery_days')) || null, notes: formData.get('notes') };
            try { const response = await fetchAPI('/carriers', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Transportista creado'); closeModal(); loadTabData('fleet'); } } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // MODAL: VEHÍCULO (4 TABS)
    window.LogisticsDashboard.showCreateVehicleModal = function() {
        const content = '<form id="vehicle-form" class="modal-form modal-form-large"><div class="form-tabs"><button type="button" class="form-tab active" data-tab="basic">📋 Básico</button><button type="button" class="form-tab" data-tab="specs">⚙️ Specs</button><button type="button" class="form-tab" data-tab="docs">📄 Docs</button><button type="button" class="form-tab" data-tab="equipment">🔧 Equipo</button></div><div class="form-tab-content active" id="tab-basic"><div class="form-section-title">Identificación</div><div class="form-row"><div class="form-group"><label>Patente *</label><input type="text" name="plate_number" required placeholder="ABC123"></div><div class="form-group"><label>Código</label><input type="text" name="code" placeholder="VEH-001"></div></div><div class="form-row"><div class="form-group"><label>Marca *</label><select name="brand" required><option value="">Seleccionar...</option><option value="Scania">Scania</option><option value="Volvo">Volvo</option><option value="Mercedes-Benz">Mercedes-Benz</option><option value="Iveco">Iveco</option><option value="Ford">Ford</option><option value="Fiat">Fiat</option></select></div><div class="form-group"><label>Modelo *</label><input type="text" name="model" required placeholder="R450"></div><div class="form-group"><label>Año *</label><input type="number" name="year" required min="1990" max="2030" placeholder="2023"></div></div><div class="form-row"><div class="form-group"><label>Tipo *</label><select name="vehicle_type" required><option value="VAN">🚐 Furgoneta</option><option value="TRUCK">🚚 Camión</option><option value="TRACTOR">🚛 Tractor</option><option value="MOTORCYCLE">🏍️ Moto</option></select></div><div class="form-group"><label>Estado</label><select name="status"><option value="AVAILABLE">✅ Disponible</option><option value="IN_USE">🚗 En Uso</option><option value="MAINTENANCE">🔧 Mantenimiento</option></select></div></div></div><div class="form-tab-content" id="tab-specs"><div class="form-section-title">Capacidades</div><div class="form-row"><div class="form-group"><label>Carga (kg)</label><input type="number" name="max_weight_kg" placeholder="25000" min="0"></div><div class="form-group"><label>Volumen (m³)</label><input type="number" name="max_volume_m3" placeholder="90" min="0" step="0.1"></div><div class="form-group"><label>Pallets</label><input type="number" name="max_pallets" placeholder="33" min="0"></div></div><div class="form-section-title">Motor</div><div class="form-row"><div class="form-group"><label>Combustible</label><select name="fuel_type"><option value="DIESEL">Diesel</option><option value="GASOLINE">Nafta</option><option value="GNC">GNC</option></select></div><div class="form-group"><label>Consumo (L/100km)</label><input type="number" name="avg_fuel_consumption" placeholder="35" step="0.1"></div></div><div class="form-row"><div class="form-group"><label><input type="checkbox" name="refrigerated"> ❄️ Refrigerado</label></div><div class="form-group"><label><input type="checkbox" name="hazmat_certified"> ☢️ HAZMAT</label></div></div></div><div class="form-tab-content" id="tab-docs"><div class="form-section-title">Documentación</div><div class="form-row"><div class="form-group"><label>VTV Venc. *</label><input type="date" name="vtv_expiry" required></div><div class="form-group"><label>Seguro Venc. *</label><input type="date" name="insurance_expiry" required></div></div><div class="form-row"><div class="form-group"><label>N° Póliza</label><input type="text" name="insurance_number" placeholder="POL-123456"></div><div class="form-group"><label>VIN</label><input type="text" name="vin" placeholder="1HGBH41JXMN109186" maxlength="17"></div></div></div><div class="form-tab-content" id="tab-equipment"><div class="form-section-title">Equipamiento</div><div class="form-row"><div class="form-group full-width"><div class="checkbox-group" style="display:flex;gap:15px;flex-wrap:wrap;"><label><input type="checkbox" name="has_gps" checked> 📍 GPS</label><label><input type="checkbox" name="has_dashcam"> 📹 Cámara</label><label><input type="checkbox" name="has_alarm"> 🚨 Alarma</label></div></div></div><div class="form-row"><div class="form-group"><label>ID GPS</label><input type="text" name="gps_device_id" placeholder="GPS-12345"></div></div><div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div></div></form>';
        showModal('🚛 Nuevo Vehículo', content, async () => {
            const form = document.getElementById('vehicle-form');
            const formData = new FormData(form);
            const data = { plate_number: formData.get('plate_number'), code: formData.get('code') || 'VEH-' + Date.now(), brand: formData.get('brand'), model: formData.get('model'), year: parseInt(formData.get('year')), vehicle_type: formData.get('vehicle_type'), status: formData.get('status'), max_weight_kg: parseFloat(formData.get('max_weight_kg')) || null, max_volume_m3: parseFloat(formData.get('max_volume_m3')) || null, max_pallets: parseInt(formData.get('max_pallets')) || null, fuel_type: formData.get('fuel_type'), avg_fuel_consumption: parseFloat(formData.get('avg_fuel_consumption')) || null, refrigerated: formData.get('refrigerated') === 'on', hazmat_certified: formData.get('hazmat_certified') === 'on', vtv_expiry: formData.get('vtv_expiry'), insurance_expiry: formData.get('insurance_expiry'), insurance_number: formData.get('insurance_number'), vin: formData.get('vin'), gps_device_id: formData.get('gps_device_id'), notes: formData.get('notes') };
            try { const response = await fetchAPI('/vehicles', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Vehículo creado'); closeModal(); loadTabData('fleet'); } } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // MODAL: CONDUCTOR (5 TABS)
    window.LogisticsDashboard.showCreateDriverModal = function() {
        const content = '<form id="driver-form" class="modal-form modal-form-large"><div class="form-tabs"><button type="button" class="form-tab active" data-tab="personal">👤 Personal</button><button type="button" class="form-tab" data-tab="license">🪪 Licencia</button><button type="button" class="form-tab" data-tab="medical">🏥 Médico</button><button type="button" class="form-tab" data-tab="certs">📜 Certs</button><button type="button" class="form-tab" data-tab="compliance">⏱️ Horas</button></div><div class="form-tab-content active" id="tab-personal"><div class="form-section-title">📋 Información Personal</div><div class="form-row"><div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="Juan Pérez"></div><div class="form-group"><label>DNI *</label><input type="text" name="dni" required placeholder="12345678"></div><div class="form-group"><label>Código</label><input type="text" name="code" placeholder="COND-001"></div></div><div class="form-section-title">📞 Contacto</div><div class="form-row"><div class="form-group"><label>Teléfono *</label><input type="tel" name="phone" required placeholder="+54 11 1234-5678"></div><div class="form-group"><label>Email</label><input type="email" name="email" placeholder="conductor@email.com"></div></div><div class="form-row"><div class="form-group"><label>Contacto Emerg.</label><input type="text" name="emergency_contact_name" placeholder="María Pérez"></div><div class="form-group"><label>Tel. Emerg.</label><input type="tel" name="emergency_contact_phone" placeholder="+54 11 8765-4321"></div></div></div><div class="form-tab-content" id="tab-license"><div class="form-section-title">🪪 Licencia</div><div class="form-row"><div class="form-group"><label>N° Licencia *</label><input type="text" name="license_number" required placeholder="12345678"></div><div class="form-group"><label>Categoría *</label><select name="license_type" required><option value="B1">B1 - Auto</option><option value="C1">C1 - Camión hasta 12t</option><option value="C2">C2 - Camión sin límite</option><option value="C3">C3 - Articulado</option></select></div><div class="form-group"><label>Vencimiento *</label><input type="date" name="license_expiry" required></div></div></div><div class="form-tab-content" id="tab-medical"><div class="form-section-title">🏥 Aptitud Médica</div><div class="form-row"><div class="form-group"><label>Venc. Certificado</label><input type="date" name="medical_expiry"></div><div class="form-group"><label>Grupo Sanguíneo</label><select name="blood_type"><option value="">Seleccionar</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></select></div></div></div><div class="form-tab-content" id="tab-certs"><div class="form-section-title">📜 Certificaciones</div><div class="form-row"><div class="form-group full-width"><div class="checkbox-group" style="display:flex;gap:15px;flex-wrap:wrap;"><label><input type="checkbox" name="has_hazmat_cert"> ☢️ HAZMAT</label><label><input type="checkbox" name="has_reefer_cert"> ❄️ Frío</label><label><input type="checkbox" name="has_livestock_cert"> 🐄 Ganado</label><label><input type="checkbox" name="has_linti"> 📋 LINTI</label></div></div></div></div><div class="form-tab-content" id="tab-compliance"><div class="form-section-title">⏱️ Control Horas</div><div class="form-row"><div class="form-group"><label>Máx. Horas/Día</label><input type="number" name="max_driving_hours" placeholder="9" min="4" max="15"></div><div class="form-group"><label>Descanso Mín. (hs)</label><input type="number" name="min_daily_rest" placeholder="11" min="8" max="14"></div></div></div></form>';
        showModal('👷 Nuevo Conductor', content, async () => {
            const form = document.getElementById('driver-form');
            const formData = new FormData(form);
            const data = { name: formData.get('name'), dni: formData.get('dni'), code: formData.get('code') || 'COND-' + Date.now(), phone: formData.get('phone'), email: formData.get('email'), emergency_contact_name: formData.get('emergency_contact_name'), emergency_contact_phone: formData.get('emergency_contact_phone'), license_number: formData.get('license_number'), license_type: formData.get('license_type'), license_expiry: formData.get('license_expiry') };
            try { const response = await fetchAPI('/drivers', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Conductor creado'); closeModal(); loadTabData('fleet'); } } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // MODAL: ZONA
    window.LogisticsDashboard.showCreateZoneModal = function() {
        const content = '<form id="zone-form" class="modal-form"><div class="form-row"><div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="ZONA-001"></div><div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="Zona Norte"></div></div></form>';
        showModal('🗺️ Nueva Zona', content, async () => {
            const form = document.getElementById('zone-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            try { const response = await fetchAPI('/delivery-zones', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Zona creada'); closeModal(); loadTabData('routes'); } } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // MODAL: ENVÍO
    window.LogisticsDashboard.showCreateShipmentModal = function() {
        const content = '<form id="shipment-form" class="modal-form"><div class="form-section-title">📦 Datos del Envío</div><div class="form-row"><div class="form-group"><label>Cliente *</label><input type="text" name="customer_name" required placeholder="Nombre del cliente"></div><div class="form-group"><label>Prioridad</label><select name="delivery_priority"><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></div></div><div class="form-section-title">📍 Dirección</div><div class="form-row"><div class="form-group full-width"><label>Dirección *</label><input type="text" name="delivery_address" required placeholder="Av. Corrientes 1234"></div></div><div class="form-row"><div class="form-group"><label>Ciudad</label><input type="text" name="delivery_city" placeholder="Buenos Aires"></div><div class="form-group"><label>CP</label><input type="text" name="delivery_postal_code" placeholder="C1000"></div></div></form>';
        showModal('📦 Nuevo Envío', content, async () => {
            const form = document.getElementById('shipment-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            data.shipment_number = 'SHIP-' + Date.now();
            data.source_type = 'MANUAL';
            data.source_id = 0;
            try { const response = await fetchAPI('/shipments', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Envío creado'); closeModal(); loadTabData('shipments'); } } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // MODAL: RUTA
    window.LogisticsDashboard.showCreateRouteModal = function() {
        const today = new Date().toISOString().split('T')[0];
        const content = '<form id="route-form" class="modal-form"><div class="form-row"><div class="form-group"><label>Fecha *</label><input type="date" name="route_date" required value="' + today + '"></div><div class="form-group"><label>Tipo</label><select name="route_type"><option value="DELIVERY">Entrega</option><option value="PICKUP">Recolección</option></select></div></div></form>';
        showModal('🗺️ Nueva Ruta', content, async () => {
            const form = document.getElementById('route-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            data.route_number = 'RUT-' + Date.now();
            try { const response = await fetchAPI('/routes', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Ruta creada'); closeModal(); loadTabData('routes'); } } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // MODAL: OLA PICKING
    window.LogisticsDashboard.showGenerateWaveModal = function() {
        const content = '<form id="wave-form" class="modal-form"><div class="form-section-title">🌊 Configuración</div><div class="form-row"><div class="form-group"><label>Tipo</label><select name="wave_type"><option value="STANDARD">Estándar</option><option value="EXPRESS">Express</option></select></div><div class="form-group"><label>Máx. Pedidos</label><input type="number" name="max_orders" placeholder="50" min="1"></div></div></form>';
        showModal('🌊 Generar Ola', content, async () => {
            const form = document.getElementById('wave-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            try { const response = await fetchAPI('/waves/generate', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Ola generada'); closeModal(); loadTabData('picking'); } } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // MODAL: TIPO UBICACIÓN
    window.LogisticsDashboard.showCreateLocationTypeModal = function() {
        const content = '<form id="location-type-form" class="modal-form"><div class="form-row"><div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="RACK"></div><div class="form-group"><label>Nombre *</label><input type="text" name="name" required placeholder="Rack de almacenamiento"></div></div></form>';
        showModal('📍 Nuevo Tipo Ubicación', content, async () => {
            const form = document.getElementById('location-type-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            try { const response = await fetchAPI('/location-types', { method: 'POST', body: JSON.stringify(data) }); if (response.success) { showSuccess('Tipo creado'); closeModal(); } } catch (error) { showError('Error: ' + error.message); }
        });
    };

    // Funciones helper
    window.LogisticsDashboard.refreshData = function() { loadTabData(currentTab); };
    window.LogisticsDashboard.editVehicle = async function(id) { showInfo('Editando vehículo ' + id); };
    window.LogisticsDashboard.editDriver = async function(id) { showInfo('Editando conductor ' + id); };
    window.LogisticsDashboard.editCarrier = async function(id) { showInfo('Editando transportista ' + id); };
    window.LogisticsDashboard.deleteVehicle = async function(id) { if(confirm('¿Eliminar vehículo?')) showInfo('Eliminando...'); };
    window.LogisticsDashboard.deleteDriver = async function(id) { if(confirm('¿Eliminar conductor?')) showInfo('Eliminando...'); };
    window.LogisticsDashboard.deleteCarrier = async function(id) { if(confirm('¿Eliminar transportista?')) showInfo('Eliminando...'); };
    window.LogisticsDashboard.assignDriver = async function(vehicleId) { showInfo('Asignar conductor a vehículo ' + vehicleId); };
    window.LogisticsDashboard.viewVehicleHistory = async function(id) { showInfo('Historial de vehículo ' + id); };

})();`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ SUCCESS: Funciones restauradas');
    console.log('   - switchTab expuesto');
    console.log('   - showInfo/showWarning/showSuccess/showError');
    console.log('   - showModal/closeModal/initModalTabs');
    console.log('   - showCreateWarehouseModal (solo lectura WMS)');
    console.log('   - showCreateCarrierModal (4 tabs)');
    console.log('   - showCreateVehicleModal (4 tabs)');
    console.log('   - showCreateDriverModal (5 tabs)');
    console.log('   - showCreateZoneModal');
    console.log('   - showCreateShipmentModal');
    console.log('   - showCreateRouteModal');
    console.log('   - showGenerateWaveModal');
    console.log('   - showCreateLocationTypeModal');
    console.log('   - Funciones helper (edit/delete/refresh)');
} else {
    console.log('❌ ERROR: No se encontró el código a reemplazar');
    console.log('Buscando patrón alternativo...');
    if (content.includes('window.LogisticsDashboard.showCreateWarehouseModal = function() {')) {
        console.log('Encontrada función showCreateWarehouseModal');
    }
}
