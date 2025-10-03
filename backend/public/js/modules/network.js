// Network Module - v4.0 PROGRESSIVE
console.log('🌐 [NETWORK] Módulo network cargado');

// Network configuration functions
function showNetworkContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="network">
            <div class="section-header">
                <h2>🌐 Configuración de Red</h2>
                <div class="section-actions">
                    <button class="btn primary" onclick="saveNetworkConfig()">💾 Guardar Configuración</button>
                    <button class="btn secondary" onclick="testConnection()">🔄 Probar Conexión</button>
                </div>
            </div>
            
            <div class="config-grid">
                <div class="config-section">
                    <h3>🖥️ Configuración del Servidor</h3>
                    <div class="form-group">
                        <label for="serverHost">Host del Servidor:</label>
                        <select id="serverHost" onchange="updateHostConfig()">
                            <option value="localhost" selected>localhost</option>
                            <option value="127.0.0.1">127.0.0.1</option>
                            <option value="0.0.0.0">0.0.0.0 (todas las interfaces)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="serverPort">Puerto del Servidor:</label>
                        <input type="number" id="serverPort" value="3001" min="1000" max="65535">
                    </div>
                    
                    <div class="form-group">
                        <label for="corsOrigin">CORS Origin:</label>
                        <input type="text" id="corsOrigin" value="*" placeholder="${window.DYNAMIC_CONFIG.baseUrl}">
                    </div>
                </div>
                
                <div class="config-section">
                    <h3>📡 Estado de la Conexión</h3>
                    <div class="connection-status">
                        <div class="status-item">
                            <span class="status-label">Estado del Servidor:</span>
                            <span class="status-value" id="connectionStatus">🔄 Verificando...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">URL Actual:</span>
                            <span class="status-value" id="currentUrl">-</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Última Verificación:</span>
                            <span class="status-value" id="lastCheck">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="config-section">
                    <h3>🔧 Herramientas de Red</h3>
                    <div class="tools-grid">
                        <button class="tool-btn" onclick="restartServer()">🔄 Reiniciar Servidor</button>
                        <button class="tool-btn" onclick="clearCache()">🗑️ Limpiar Caché</button>
                        <button class="tool-btn" onclick="exportNetworkConfig()">📤 Exportar Config</button>
                        <button class="tool-btn" onclick="importNetworkConfig()">📥 Importar Config</button>
                    </div>
                </div>
                
                <div class="config-section">
                    <h3>🗄️ Base de Datos PostgreSQL</h3>
                    <div id="systemInfo" class="system-info">
                        <div class="info-item">Cargando información de la base de datos...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load current configuration
    loadNetworkConfiguration();
    
    // Update connection status
    testConnection();
    
    // Load system info
    loadSystemInfo();
}

// Load current network configuration
function loadNetworkConfiguration() {
    console.log('🌐 [NETWORK] Cargando configuración actual...');
    
    const config = window.progressiveAdmin.savedNetworkConfig;
    
    // Update form fields
    document.getElementById('serverHost').value = config.serverHost || 'localhost';
    document.getElementById('serverPort').value = config.serverPort || 3001;
    document.getElementById('corsOrigin').value = config.corsOrigin || '*';
    
    // Update current URL display
    const currentUrl = window.progressiveAdmin.getApiUrl('');
    document.getElementById('currentUrl').textContent = currentUrl;
}

// Update host configuration
function updateHostConfig() {
    const host = document.getElementById('serverHost').value;
    window.progressiveAdmin.savedNetworkConfig.serverHost = host;
    
    // Update current URL display
    const currentUrl = window.progressiveAdmin.getApiUrl('');
    document.getElementById('currentUrl').textContent = currentUrl;
    
    console.log('🌐 [NETWORK] Host actualizado a:', host);
}

// Save network configuration
async function saveNetworkConfig() {
    console.log('💾 [NETWORK] Guardando configuración...');
    
    const config = {
        serverHost: document.getElementById('serverHost').value,
        serverPort: parseInt(document.getElementById('serverPort').value),
        corsOrigin: document.getElementById('corsOrigin').value
    };
    
    // Update global config
    Object.assign(window.progressiveAdmin.savedNetworkConfig, config);
    
    try {
        // Save to server if available
        const response = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/config/network'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            showMessage('✅ Configuración guardada exitosamente', 'success');
        } else {
            showMessage('⚠️ Configuración guardada localmente', 'warning');
        }
    } catch (error) {
        console.error('❌ [NETWORK] Error guardando config:', error);
        showMessage('⚠️ Configuración guardada localmente', 'warning');
    }
    
    // Update current URL display
    const currentUrl = window.progressiveAdmin.getApiUrl('');
    document.getElementById('currentUrl').textContent = currentUrl;
}

// Test connection to server
async function testConnection() {
    console.log('🔄 [NETWORK] Probando conexión...');
    
    const statusElement = document.getElementById('connectionStatus');
    const lastCheckElement = document.getElementById('lastCheck');
    
    if (statusElement) statusElement.textContent = '🔄 Probando...';
    
    try {
        const startTime = Date.now();
        const response = await fetch(window.progressiveAdmin.getApiUrl('/health'));
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
            const data = await response.json();
            if (statusElement) {
                statusElement.textContent = `🟢 Conectado (${responseTime}ms)`;
                statusElement.style.color = 'green';
            }
            window.progressiveAdmin.updateServerStatus(true, 'Conectado');
            showMessage('✅ Conexión exitosa', 'success');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ [NETWORK] Error de conexión:', error);
        if (statusElement) {
            statusElement.textContent = `🔴 Error: ${error.message}`;
            statusElement.style.color = 'red';
        }
        window.progressiveAdmin.updateServerStatus(false, 'Error');
        showMessage('❌ Error de conexión: ' + error.message, 'error');
    }
    
    // Update last check time
    if (lastCheckElement) {
        lastCheckElement.textContent = new Date().toLocaleTimeString();
    }
}

// Load system information
async function loadSystemInfo() {
    const systemInfoContainer = document.getElementById('systemInfo');
    if (!systemInfoContainer) return;
    
    try {
        const response = await fetch(window.progressiveAdmin.getApiUrl('/health'));
        
        if (response.ok) {
            const data = await response.json();
            // PostgreSQL info instead of generic system info
            displaySystemInfo({
                database: 'PostgreSQL',
                host: 'localhost:5432',
                schema: 'attendance_system',
                user: 'postgres',
                status: data.database || 'Connected',
                version: data.version || 'v6.0',
                uptime: data.uptime ? Math.floor(data.uptime) + ' segundos' : 'N/A'
            });
        } else {
            // Fallback PostgreSQL info
            displaySystemInfo({
                database: 'PostgreSQL',
                host: 'localhost:5432',
                schema: 'attendance_system',
                user: 'postgres',
                status: 'Unknown',
                version: 'v6.0',
                uptime: 'N/A'
            });
        }
    } catch (error) {
        console.error('❌ [NETWORK] Error cargando database info:', error);
        systemInfoContainer.innerHTML = '<div class="info-item">Error cargando información de la base de datos</div>';
    }
}

// Display system information
function displaySystemInfo(info) {
    const systemInfoContainer = document.getElementById('systemInfo');
    if (!systemInfoContainer) return;
    
    systemInfoContainer.innerHTML = `
        <div class="info-item"><strong>🗄️ Base de Datos:</strong> ${info.database || 'N/A'}</div>
        <div class="info-item"><strong>🖥️ Host:</strong> ${info.host || 'N/A'}</div>
        <div class="info-item"><strong>📊 Schema:</strong> ${info.schema || 'N/A'}</div>
        <div class="info-item"><strong>👤 Usuario:</strong> ${info.user || 'N/A'}</div>
        <div class="info-item"><strong>🔗 Estado:</strong> <span style="color: ${info.status === 'Connected' ? 'green' : 'red'}">${info.status || 'N/A'}</span></div>
        <div class="info-item"><strong>📌 Versión:</strong> ${info.version || 'N/A'}</div>
        <div class="info-item"><strong>⏱️ Uptime:</strong> ${info.uptime || 'N/A'}</div>
    `;
}

// Restart server
async function restartServer() {
    if (!confirm('¿Está seguro que desea reiniciar el servidor?')) {
        return;
    }
    
    console.log('🔄 [NETWORK] Reiniciando servidor...');
    
    try {
        const response = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/system/restart'), {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('🔄 Servidor reiniciándose...', 'info');
            setTimeout(() => {
                testConnection();
            }, 5000);
        } else {
            throw new Error('Error reiniciando servidor');
        }
    } catch (error) {
        console.error('❌ [NETWORK] Error reiniciando:', error);
        showMessage('❌ Error reiniciando servidor', 'error');
    }
}

// Clear cache
function clearCache() {
    if (confirm('¿Limpiar caché del navegador?')) {
        location.reload(true);
    }
}

// Export network configuration
function exportNetworkConfig() {
    const config = window.progressiveAdmin.savedNetworkConfig;
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'network_config.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showMessage('📤 Configuración exportada', 'success');
}

// Import network configuration
function importNetworkConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                Object.assign(window.progressiveAdmin.savedNetworkConfig, config);
                loadNetworkConfiguration();
                showMessage('📥 Configuración importada exitosamente', 'success');
            } catch (error) {
                showMessage('❌ Error importando configuración', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Show message utility
function showMessage(message, type) {
    // Create or update message element
    let messageElement = document.getElementById('networkMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'networkMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageElement);
    }
    
    // Set message and color based on type
    messageElement.textContent = message;
    switch (type) {
        case 'success':
            messageElement.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            messageElement.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            messageElement.style.backgroundColor = '#ff9800';
            break;
        case 'info':
            messageElement.style.backgroundColor = '#2196F3';
            break;
        default:
            messageElement.style.backgroundColor = '#666';
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

console.log('✅ [NETWORK] Módulo network configurado');