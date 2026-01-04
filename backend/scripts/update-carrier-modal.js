const fs = require('fs');
const path = 'C:/Bio/sistema_asistencia_biometrico/backend/public/js/modules/logistics-dashboard.js';
let content = fs.readFileSync(path, 'utf8');

// Método directo usando posiciones
const headerIdx = content.indexOf('// MODAL: CREAR TRANSPORTISTA');
if (headerIdx === -1) { console.log('Modal no encontrado'); process.exit(1); }

const blockStart = content.lastIndexOf('// ====', headerIdx);
const funcStart = content.indexOf('window.LogisticsDashboard.showCreateCarrierModal', headerIdx);

let braceCount = 0, blockEnd = -1, foundFirstBrace = false;
for (let i = funcStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; foundFirstBrace = true; }
    else if (content[i] === '}') {
        braceCount--;
        if (foundFirstBrace && braceCount === 0) { blockEnd = i + 2; break; }
    }
}

console.log('Reemplazando bloque de posición', blockStart, 'a', blockEnd);

// Buscar y reemplazar el modal básico por el expandido
const searchPattern = /\/\/ ============================================================================\n    \/\/ MODAL: CREAR TRANSPORTISTA\n    \/\/ ============================================================================\n    window\.LogisticsDashboard\.showCreateCarrierModal = function\(\) \{[\s\S]*?showModal\('🚛 Nuevo Transportista', content, async \(\) => \{[\s\S]*?\}\);\n    \};/;

const newCode = `// ============================================================================
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
                    <div class="form-section-title">🚚 Servicios</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="service_standard" checked> 📦 Estándar</label>
                        <label><input type="checkbox" name="service_express"> ⚡ Express</label>
                        <label><input type="checkbox" name="service_overnight"> 🌙 Overnight</label>
                    </div></div></div>
                    <div class="form-section-title">⚙️ Especialidades</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="specialty_refrigerated"> ❄️ Refrigerados</label>
                        <label><input type="checkbox" name="specialty_hazmat"> ☢️ HAZMAT</label>
                        <label><input type="checkbox" name="specialty_livestock"> 🐄 Ganado</label>
                    </div></div></div>
                    <div class="form-section-title">🗺️ Cobertura</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="zone_caba" checked> CABA</label>
                        <label><input type="checkbox" name="zone_gba" checked> GBA</label>
                        <label><input type="checkbox" name="zone_bsas"> Bs.As.</label>
                        <label><input type="checkbox" name="zone_litoral"> Litoral</label>
                        <label><input type="checkbox" name="zone_patagonia"> Patagonia</label>
                    </div></div></div>
                    <div class="form-section-title">🌎 MERCOSUR</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-group">
                        <label><input type="checkbox" name="intl_brazil"> 🇧🇷 Brasil</label>
                        <label><input type="checkbox" name="intl_chile"> 🇨🇱 Chile</label>
                        <label><input type="checkbox" name="intl_uruguay"> 🇺🇾 Uruguay</label>
                    </div></div></div>
                </div>
                <div class="form-tab-content" id="tab-carrier-rates">
                    <div class="form-section-title">💰 Tarifas</div>
                    <div class="form-row">
                        <div class="form-group"><label>$/Kg</label><input type="number" name="weight_rate_per_kg" placeholder="150" step="0.01" min="0"></div>
                        <div class="form-group"><label>$/m³</label><input type="number" name="volume_rate_per_m3" placeholder="5000" step="0.01" min="0"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Cargo Mínimo ($)</label><input type="number" name="min_charge" placeholder="500" step="0.01" min="0"></div>
                        <div class="form-group"><label>Recargo Combustible (%)</label><input type="number" name="fuel_surcharge_pct" placeholder="15" step="0.1" min="0" max="100"></div>
                    </div>
                </div>
                <div class="form-tab-content" id="tab-carrier-metrics">
                    <div class="form-section-title">📈 SLA</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tiempo Entrega (días)</label><input type="number" name="avg_delivery_days" placeholder="2.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>On-Time (%)</label><input type="number" name="target_on_time_pct" placeholder="95" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">⭐ Calificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Rating</label><select name="rating"><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3" selected>⭐⭐⭐</option></select></div>
                        <div class="form-group"><label>Prioridad</label><select name="priority"><option value="1">🥇</option><option value="2">🥈</option><option value="3" selected>🥉</option></select></div>
                    </div>
                    <div class="form-row"><div class="form-group full-width"><label>Notas</label><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div>
                </div>
            </form>
        \`;
        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            const services = [];
            if (formData.get('service_standard')) services.push('STANDARD');
            if (formData.get('service_express')) services.push('EXPRESS');
            if (formData.get('service_overnight')) services.push('OVERNIGHT');
            const coverageZones = [];
            if (formData.get('zone_caba')) coverageZones.push('CABA');
            if (formData.get('zone_gba')) coverageZones.push('GBA');
            if (formData.get('zone_bsas')) coverageZones.push('BSAS');
            if (formData.get('zone_litoral')) coverageZones.push('LITORAL');
            if (formData.get('zone_patagonia')) coverageZones.push('PATAGONIA');
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
    };`;

if (searchPattern.test(content)) {
    content = content.replace(searchPattern, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('SUCCESS: Modal de transportista expandido con 4 tabs');
} else {
    console.log('Buscando otra forma...');
    // Busqueda más simple
    const idx = content.indexOf('// MODAL: CREAR TRANSPORTISTA\n');
    if (idx > -1) {
        console.log('Encontrado en posición:', idx);
        // Buscar el final de la función
        const startIdx = content.indexOf('window.LogisticsDashboard.showCreateCarrierModal', idx);
        let braceCount = 0;
        let endIdx = -1;
        let inFunction = false;

        for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '{') {
                braceCount++;
                inFunction = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (inFunction && braceCount === 0) {
                    // Buscar el punto y coma después del cierre
                    endIdx = i + 1;
                    if (content[endIdx] === ';') endIdx++;
                    break;
                }
            }
        }

        if (endIdx > startIdx) {
            const headerStart = content.lastIndexOf('// ===', startIdx);
            const fullBlock = content.substring(headerStart, endIdx);
            console.log('Bloque encontrado, longitud:', fullBlock.length);

            // Reemplazar
            content = content.substring(0, headerStart) + newCode + content.substring(endIdx);
            fs.writeFileSync(path, content, 'utf8');
            console.log('SUCCESS: Modal actualizado usando método alternativo');
        } else {
            console.log('No se pudo determinar el final de la función');
        }
    } else {
        console.log('No se encontró el modal de transportista');
    }
}
