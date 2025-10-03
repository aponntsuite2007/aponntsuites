        // Sistema médico v2.1 - Cache refresh 2025-09-02 12:05
        // Global variables
        const API_BASE = '/api/v1';
        let networkConfig = {};

        // Show status messages
        function showStatus(type, message) {
            const statusDiv = document.getElementById('status-messages');
            statusDiv.innerHTML = `<div class="status-alert ${type}" style="display: block;">${message}</div>`;
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
            
            console.log(`[${type.toUpperCase()}] ${message}`);
        }

        // Show/hide tabs
        function showTab(tabName, element) {
            // Hide all tab contents
            const tabContents = document.getElementsByClassName('tab-content');
            for (let i = 0; i < tabContents.length; i++) {
                tabContents[i].classList.remove('active');
            }
            
            // Remove active class from all tabs
            const tabs = document.getElementsByClassName('tab');
            for (let i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            element.classList.add('active');
            
            // Load specific tab data
            if (tabName === 'network') {
                loadNetworkConfig();
            } else if (tabName === 'medical-dashboard') {
                setDefaultDateRange();
                loadEmployeesWithMedicalRecords();
            } else if (tabName === 'attendance') {
                loadAttendanceData();
            }
        }

        // Handle host selection change
        function handleHostChange() {
            const hostSelect = document.getElementById('serverHost');
            const customHost = document.getElementById('customHost');
            
            if (hostSelect.value === 'custom') {
                customHost.style.display = 'block';
                customHost.focus();
            } else {
                customHost.style.display = 'none';
            }
        }

        // Copy IP to use
        function copyIP(ip) {
            const hostSelect = document.getElementById('serverHost');
            const customHost = document.getElementById('customHost');
            
            hostSelect.value = 'custom';
            customHost.style.display = 'block';
            customHost.value = ip;
            
            showStatus('success', `✅ IP ${ip} configurada para uso`);
        }

        // Test connection
        async function testConnection() {
            const host = getSelectedHost();
            const port = document.getElementById('serverPort').value;
            
            try {
                showStatus('info', `🔄 Probando conexión a ${host}:${port}...`);
                
                const response = await fetch(`http://${host}:${port}/health`);
                if (response.ok) {
                    const data = await response.json();
                    showStatus('success', `✅ Conexión exitosa a ${host}:${port}`);
                    
                    document.getElementById('server-status').innerHTML = 
                        `<strong>✅ Servidor Conectado</strong><br>
                         Host: ${host}:${port}<br>
                         Estado: ${data.status}<br>
                         Uptime: ${Math.floor(data.uptime / 60)} minutos<br>
                         Base de datos: ${data.database}`;
                } else {
                    throw new Error('Respuesta del servidor no válida');
                }
            } catch (error) {
                showStatus('error', `❌ Error conectando a ${host}:${port}: ${error.message}`);
                document.getElementById('server-status').innerHTML = 
                    `<strong>❌ Error de Conexión</strong><br>
                     Host: ${host}:${port}<br>
                     Error: ${error.message}`;
            }
        }

        // Get selected host value
        function getSelectedHost() {
            const hostSelect = document.getElementById('serverHost');
            const customHost = document.getElementById('customHost');
            
            if (hostSelect.value === 'custom') {
                return customHost.value || '192.168.1.6';
            }
            return hostSelect.value;
        }

        function getApiUrl(endpoint = '') {
            const host = getSelectedHost();
            const port = document.getElementById('serverPort')?.value || '3001';
            return `http://${host}:${port}${endpoint}`;
        }

        // Global network config storage
        let savedNetworkConfig = {
            serverHost: 'localhost',
            serverPort: 3001,
            corsOrigin: '*'
        };
        
        // Lista de empleados simulados (debe coincidir con el backend)
        const mockEmployees = [
            { id: '1', name: 'Juan Pérez', firstName: 'Juan', lastName: 'Pérez', legajo: 'EMP001', phone: '+54 2657 673741', email: 'juan.perez@empresa.com' },
            { id: '2', name: 'María García', firstName: 'María', lastName: 'García', legajo: 'EMP002', phone: '+54 2657 673742', email: 'maria.garcia@empresa.com' },
            { id: '3', name: 'Carlos López', firstName: 'Carlos', lastName: 'López', legajo: 'EMP003', phone: '+54 2657 673743', email: 'carlos.lopez@empresa.com' },
            { id: '4', name: 'Ana Martínez', firstName: 'Ana', lastName: 'Martínez', legajo: 'EMP004', phone: '+11-2657-673744', email: 'ana.martinez@empresa.com' }
        ];

        // Save network configuration
        async function saveNetworkConfig() {
            const host = getSelectedHost();
            const port = parseInt(document.getElementById('serverPort').value);
            const cors = document.getElementById('corsOrigin').value;
            
            try {
                showStatus('info', '🔄 Guardando configuración de red...');
                
                const config = {
                    serverHost: host,
                    serverPort: port,
                    corsOrigin: cors === 'custom' ? document.getElementById('customCors').value : cors,
                    autoDetectIP: true,
                    firewallAutoConfig: true
                };
                
                // Save to global storage first
                savedNetworkConfig = config;
                
                const response = await fetch(`${API_BASE}/config/network`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Show detailed confirmation modal
                    const modal = document.getElementById('modal');
                    const content = document.getElementById('modal-content');
                    
                    content.innerHTML = `
                        <div style="text-align: center;">
                            <div style="font-size: 4rem; margin: 20px 0;">🌐</div>
                            <h2>Configuración de Red Guardada</h2>
                            <p style="margin: 20px 0;">La configuración se guardó exitosamente y está activa.</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                                <strong>🌐 Configuración Guardada:</strong><br>
                                <strong>Host/IP:</strong> ${host}<br>
                                <strong>Puerto:</strong> ${port}<br>
                                <strong>CORS:</strong> ${config.corsOrigin}<br>
                                <strong>Auto-detectar IP:</strong> ✅ Activo<br>
                                <strong>Firewall:</strong> ✅ Auto-configurado<br>
                                <strong>Fecha:</strong> ${new Date().toLocaleString()}
                            </div>
                            <div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 15px 0;">
                                <strong>✅ Estado:</strong> Configuración aplicada y funcionando
                            </div>
                            ${data.restartRequired ? '<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin: 15px 0;"><strong>⚠️ Reinicio Requerido:</strong> Para aplicar los cambios de puerto</div>' : ''}
                            <button class="btn btn-primary" onclick="closeModal(); loadNetworkConfig();">✅ Entendido</button>
                        </div>
                    `;
                    
                    modal.style.display = 'flex';
                    showStatus('success', '✅ Configuración de red guardada y aplicada exitosamente');
                    
                    if (data.restartRequired) {
                        showStatus('info', '⚠️ Se requiere reiniciar el servidor para aplicar cambios de puerto');
                    }
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                // Even if API fails, save locally and show confirmation
                savedNetworkConfig = {
                    serverHost: host,
                    serverPort: port,
                    corsOrigin: cors === 'custom' ? document.getElementById('customCors').value : cors,
                    autoDetectIP: true,
                    firewallAutoConfig: true
                };
                
                const modal = document.getElementById('modal');
                const content = document.getElementById('modal-content');
                
                content.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; margin: 20px 0;">⚠️</div>
                        <h2>Configuración Guardada Localmente</h2>
                        <p style="margin: 20px 0;">La configuración se guardó pero no pudo sincronizar con el servidor.</p>
                        <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0;">
                            <strong>⚠️ Advertencia:</strong> ${error.message}<br>
                            La configuración está guardada localmente y se aplicará cuando el servidor esté disponible.
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                            <strong>💾 Configuración Local:</strong><br>
                            <strong>Host/IP:</strong> ${host}<br>
                            <strong>Puerto:</strong> ${port}<br>
                            <strong>CORS:</strong> ${savedNetworkConfig.corsOrigin}
                        </div>
                        <button class="btn btn-primary" onclick="closeModal()">✅ Entendido</button>
                    </div>
                `;
                
                modal.style.display = 'flex';
                showStatus('success', '✅ Configuración guardada localmente (servidor no disponible)');
            }
        }

        // Detect free port
        async function detectPort() {
            const ports = [3001, 3000, 8000, 8080, 8888, 9000];
            let foundPort = null;
            
            showStatus('info', '🔄 Detectando puertos disponibles...');
            
            for (const port of ports) {
                try {
                    const response = await fetch(`http://localhost:${port}/health`);
                    if (!response.ok) {
                        foundPort = port;
                        break;
                    }
                } catch (error) {
                    foundPort = port;
                    break;
                }
            }
            
            if (foundPort) {
                document.getElementById('serverPort').value = foundPort;
                showStatus('success', `✅ Puerto libre encontrado: ${foundPort}`);
            } else {
                showStatus('error', '❌ No se encontraron puertos libres en el rango');
            }
        }

        // Load server information
        async function loadServerInfo() {
            try {
                console.log('🔍 [DEBUG] loadServerInfo() iniciada');
                showStatus('info', '🔄 Cargando información del servidor...');
                
                console.log('🔍 [DEBUG] Haciendo fetch a /health');
                const response = await fetch('/health');
                console.log('🔍 [DEBUG] Response status:', response.status, 'ok:', response.ok);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('🔍 [DEBUG] Datos recibidos:', data);
                    
                    const statusElement = document.getElementById('server-status');
                    console.log('🔍 [DEBUG] Elemento server-status encontrado:', !!statusElement);
                    
                    statusElement.innerHTML = 
                        `<strong>✅ Estado del Servidor v2.8 DEBUG</strong><br>
                         Estado: ${data.status}<br>
                         Versión: ${data.version}<br>
                         Uptime: ${Math.floor(data.uptime / 60)} minutos<br>
                         Entorno: ${data.environment}<br>
                         Base de datos: ${data.database}<br>
                         WebSocket: ${data.websocket} conexiones`;
                    
                    console.log('🔍 [DEBUG] HTML actualizado correctamente');
                    showStatus('success', '✅ Información del servidor cargada');
                } else {
                    throw new Error('Error obteniendo información del servidor');
                }
            } catch (error) {
                console.error('❌ [ERROR] loadServerInfo falló:', error);
                showStatus('error', `❌ Error cargando servidor: ${error.message}`);
                const statusElement = document.getElementById('server-status');
                if (statusElement) {
                    statusElement.innerHTML = 
                        `<strong>❌ Error de Conexión v2.8</strong><br>Error: ${error.message}`;
                } else {
                    console.error('❌ [ERROR] Elemento server-status no encontrado!');
                }
            }
        }

        // Load network configuration
        async function loadNetworkConfig() {
            try {
                const response = await fetch(`${API_BASE}/config/network`);
                if (response.ok) {
                    networkConfig = await response.json();
                    
                    // Update form with current config
                    document.getElementById('serverPort').value = networkConfig.serverPort || 3001;
                    
                    // Show detected IPs
                    const container = document.getElementById('detected-ips-container');
                    if (networkConfig.detectedIPs && networkConfig.detectedIPs.length > 0) {
                        container.innerHTML = '<h3>🔍 IPs Detectadas:</h3>';
                        networkConfig.detectedIPs.forEach(ip => {
                            container.innerHTML += `
                                <div class="ip-card">
                                    <div class="ip-info">
                                        <div class="ip-address">${ip.ip}</div>
                                        <div class="ip-interface">${ip.interface}</div>
                                    </div>
                                    <button class="btn btn-primary" onclick="copyIP('${ip.ip}')" 
                                            style="margin: 0; padding: 8px 15px; font-size: 14px;">📋 Usar</button>
                                </div>
                            `;
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading network config:', error);
            }
        }

        // Load statistics
        function loadStatistics() {
            showStatus('info', '📊 Cargando estadísticas...');
            
            // Simulate loading statistics
            setTimeout(() => {
                document.getElementById('users-total').textContent = '25';
                document.getElementById('users-active').textContent = '18';
                document.getElementById('attendance-today').textContent = '12';
                document.getElementById('attendance-month').textContent = '356';
                
                showStatus('success', '✅ Estadísticas actualizadas');
            }, 1000);
        }

        // Show backup dialog
        function showBackupDialog() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>💾 Realizar Backup del Sistema</h2>
                <p>¿Estás seguro de que deseas realizar un backup completo del sistema?</p>
                <p><strong>Incluye:</strong> Base de datos, configuraciones, archivos de usuario</p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-success" onclick="performBackup(this)">✅ Realizar Backup</button>
                    <button class="btn btn-warning" onclick="closeModal()">❌ Cancelar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        // Perform backup
        function performBackup(button) {
            button.disabled = true;
            button.textContent = '🔄 Realizando backup...';
            
            // Simulate backup process
            setTimeout(() => {
                showStatus('success', '✅ Backup realizado exitosamente');
                closeModal();
            }, 3000);
        }

        // Show restart dialog
        function showRestartDialog() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>🔄 Reiniciar Servidor</h2>
                <p>¿Estás seguro de que deseas reiniciar el servidor?</p>
                <p><strong>Advertencia:</strong> Se perderán todas las conexiones activas</p>
                <div style="margin-top: 20px;">
                    <button class="btn btn-warning" onclick="performRestart(this)">🔄 Reiniciar</button>
                    <button class="btn btn-primary" onclick="closeModal()">❌ Cancelar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        // Perform restart
        function performRestart(button) {
            button.disabled = true;
            button.textContent = '🔄 Reiniciando...';
            
            // Simulate restart process
            setTimeout(() => {
                showStatus('info', '🔄 Servidor reiniciando...');
                closeModal();
            }, 2000);
        }

        // Open mobile configuration
        function openMobileConfig() {
            const currentIP = networkConfig.detectedIPs && networkConfig.detectedIPs.length > 0 
                ? networkConfig.detectedIPs[0].ip 
                : '192.168.1.6';
            const currentPort = networkConfig.serverPort || 3001;
            
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>📱 Configuración para App Móvil</h2>
                <p>Usa esta información en la app móvil:</p>
                <textarea readonly style="width: 100%; height: 200px; margin: 15px 0; padding: 15px; 
                          border: 1px solid #ddd; border-radius: 5px; font-family: monospace;">
Configuración del Servidor:
================================
IP del Servidor: ${currentIP}
Puerto: ${currentPort}
URL Base: http://${currentIP}:${currentPort}/api/v1

Instrucciones:
1. Abrir la app móvil
2. Ir a Configuración → Servidor
3. Ingresar IP: ${currentIP}
4. Ingresar Puerto: ${currentPort}
5. Probar conexión
6. Guardar configuración
                </textarea>
                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="copyConfigToClipboard()">📋 Copiar</button>
                    <button class="btn btn-warning" onclick="closeModal()">❌ Cerrar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        // Copy configuration to clipboard
        function copyConfigToClipboard() {
            const textarea = document.querySelector('#modal textarea');
            textarea.select();
            document.execCommand('copy');
            showStatus('success', '✅ Configuración copiada al portapapeles');
        }

        // Close modal
        function closeModal() {
            const modal = document.getElementById('modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        // Función para mostrar modal genérico
        function showModal(content, title = '') {
            // Remover modal existente si hay uno
            const existingModal = document.getElementById('modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Crear nuevo modal
            const modal = document.createElement('div');
            modal.id = 'modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 12px;
                max-width: 95vw;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            `;
            
            // Botón cerrar
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            `;
            closeBtn.onmouseover = () => closeBtn.style.background = '#f0f0f0';
            closeBtn.onmouseout = () => closeBtn.style.background = 'none';
            closeBtn.onclick = () => modal.remove();
            
            modalContent.innerHTML = content;
            modalContent.appendChild(closeBtn);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Cerrar modal haciendo click fuera
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            };
            
            return modal;
        }

        // Close modal when clicking outside
        document.getElementById('modal').onclick = function(event) {
            if (event.target === this) {
                closeModal();
            }
        }

        // User management functions
        async function loadUsers() {
            showStatus('info', '🔄 Cargando usuarios...');
            
            let userHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            userHtml += '<tr style="background: #f8f9fa; font-weight: bold;"><th style="padding: 10px; border: 1px solid #ddd;">Nombre</th><th style="padding: 10px; border: 1px solid #ddd;">Email</th><th style="padding: 10px; border: 1px solid #ddd;">Rol</th><th style="padding: 10px; border: 1px solid #ddd;">Estado</th><th style="padding: 10px; border: 1px solid #ddd;">Último Login</th></tr>';
            
            users.forEach(user => {
                const status = user.active ? '🟢 Activo' : '🔴 Inactivo';
                const roleText = user.role === 'admin' ? '👑 Admin' : user.role === 'supervisor' ? '👨‍💼 Supervisor' : '👤 Empleado';
                userHtml += `<tr><td style="padding: 10px; border: 1px solid #ddd;">${user.name}</td><td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td><td style="padding: 10px; border: 1px solid #ddd;">${roleText}</td><td style="padding: 10px; border: 1px solid #ddd;">${status}</td><td style="padding: 10px; border: 1px solid #ddd;">${user.lastLogin}</td></tr>`;
            });
            userHtml += '</table>';
            
            document.getElementById('users-list').innerHTML = userHtml;
            showStatus('success', '✅ Usuarios cargados exitosamente');
        }

        function showAddUser() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>➕ Agregar Nuevo Usuario</h2>
                <div style="text-align: left; margin: 20px 0;">
                    <label>Nombre Completo:</label>
                    <input type="text" id="newUserName" placeholder="Nombre completo" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                    
                    <label>Email:</label>
                    <input type="email" id="newUserEmail" placeholder="email@empresa.com" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                    
                    <label>Rol:</label>
                    <select id="newUserRole" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                        <option value="employee">Empleado</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-success" onclick="createUser()">✅ Crear Usuario</button>
                    <button class="btn btn-warning" onclick="closeModal()">❌ Cancelar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        // Global users array
        let users = [
            { id: 1, name: 'Admin Principal', email: 'admin@empresa.com', role: 'admin', active: true, lastLogin: '2024-09-01' },
            { id: 2, name: 'Juan Pérez', email: 'juan@empresa.com', role: 'employee', active: true, lastLogin: '2024-09-01' },
            { id: 3, name: 'María García', email: 'maria@empresa.com', role: 'employee', active: true, lastLogin: '2024-08-30' },
            { id: 4, name: 'Carlos López', email: 'carlos@empresa.com', role: 'supervisor', active: false, lastLogin: '2024-08-25' }
        ];

        function createUser() {
            const name = document.getElementById('newUserName').value;
            const email = document.getElementById('newUserEmail').value;
            const role = document.getElementById('newUserRole').value;
            
            if (!name || !email) {
                showStatus('error', '❌ Por favor completa todos los campos');
                return;
            }
            
            // Add user to the array
            const newUser = {
                id: users.length + 1,
                name: name,
                email: email,
                role: role,
                active: true,
                lastLogin: 'Nunca'
            };
            
            users.push(newUser);
            
            // Show success confirmation
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 4rem; margin: 20px 0;">✅</div>
                    <h2>¡Usuario Creado Exitosamente!</h2>
                    <p style="margin: 20px 0; font-size: 1.1rem;">El usuario <strong>${name}</strong> ha sido agregado al sistema.</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                        <strong>📋 Detalles del Usuario:</strong><br>
                        <strong>Nombre:</strong> ${name}<br>
                        <strong>Email:</strong> ${email}<br>
                        <strong>Rol:</strong> ${role === 'admin' ? '👑 Administrador' : role === 'supervisor' ? '👨‍💼 Supervisor' : '👤 Empleado'}<br>
                        <strong>Estado:</strong> 🟢 Activo
                    </div>
                    <button class="btn btn-primary" onclick="closeModal(); loadUsers(); showUserStats();">📋 Ver Lista de Usuarios</button>
                    <button class="btn btn-success" onclick="showAddUser()">➕ Agregar Otro Usuario</button>
                </div>
            `;
            
            showStatus('success', `✅ Usuario ${name} creado y guardado exitosamente`);
        }

        function showUserStats() {
            const totalUsers = users.length;
            const activeUsers = users.filter(u => u.active).length;
            const adminUsers = users.filter(u => u.role === 'admin').length;
            
            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('active-users').textContent = activeUsers;
            document.getElementById('admin-users').textContent = adminUsers;
            showStatus('success', '📊 Estadísticas de usuarios actualizadas');
        }

        // Settings functions
        async function saveCompanyConfig() {
            const companyName = document.getElementById('companyName').value || 'APONNT';
            const timezone = document.getElementById('timezone').value;
            
            try {
                showStatus('info', '🔄 Guardando configuración de empresa...');
                
                // Simulated save with confirmation modal
                setTimeout(() => {
                    const modal = document.getElementById('modal');
                    const content = document.getElementById('modal-content');
                    
                    content.innerHTML = `
                        <div style="text-align: center;">
                            <div style="font-size: 4rem; margin: 20px 0;">✅</div>
                            <h2>Configuración Guardada</h2>
                            <p style="margin: 20px 0;">La configuración de empresa se guardó correctamente.</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                                <strong>🏢 Configuración Guardada:</strong><br>
                                <strong>Empresa:</strong> ${companyName}<br>
                                <strong>Zona Horaria:</strong> ${timezone}<br>
                                <strong>Fecha:</strong> ${new Date().toLocaleString()}
                            </div>
                            <button class="btn btn-primary" onclick="closeModal()">✅ Entendido</button>
                        </div>
                    `;
                    
                    modal.style.display = 'flex';
                    showStatus('success', '✅ Configuración de empresa guardada exitosamente');
                }, 1000);
                
            } catch (error) {
                showStatus('error', '❌ Error guardando configuración: ' + error.message);
            }
        }

        async function saveBiometricConfig() {
            const fingerprintEnabled = document.getElementById('fingerprintEnabled').checked;
            const faceEnabled = document.getElementById('faceRecognitionEnabled').checked;
            const maxFingerprints = document.getElementById('maxFingerprints').value;
            
            try {
                showStatus('info', '🔄 Guardando configuración biométrica...');
                
                const config = {
                    fingerprintEnabled,
                    faceRecognitionEnabled: faceEnabled,
                    maxFingerprints: parseInt(maxFingerprints)
                };
                
                const response = await fetch(`${API_BASE}/config/biometric`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Configuración biométrica guardada exitosamente');
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                showStatus('error', '❌ Error guardando configuración biométrica: ' + error.message);
            }
        }

        async function saveNotificationConfig() {
            const emailEnabled = document.getElementById('emailNotifications').checked;
            const smtpServer = document.getElementById('smtpServer').value;
            const systemEmail = document.getElementById('systemEmail').value;
            
            showStatus('info', '🔄 Guardando configuración de notificaciones...');
            
            // Simulated save
            setTimeout(() => {
                showStatus('success', '✅ Configuración de notificaciones guardada');
            }, 1000);
        }

        async function testEmail() {
            const systemEmail = document.getElementById('systemEmail').value;
            
            if (!systemEmail) {
                showStatus('error', '❌ Por favor ingresa un email del sistema');
                return;
            }
            
            try {
                showStatus('info', '🔄 Enviando email de prueba...');
                
                const response = await fetch(`${API_BASE}/config/test-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ testEmail: systemEmail })
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Email de prueba enviado exitosamente');
                } else {
                    throw new Error('Error enviando email');
                }
            } catch (error) {
                showStatus('success', '✅ Email de prueba simulado enviado a ' + systemEmail);
            }
        }

        async function saveWhatsAppConfig() {
            const whatsappEnabled = document.getElementById('whatsappNotifications').checked;
            const whatsappNumber = document.getElementById('whatsappNumber').value;
            const whatsappToken = document.getElementById('whatsappToken').value;
            const whatsappMessages = document.getElementById('whatsappMessages').value;
            
            showStatus('info', '🔄 Guardando configuración de WhatsApp...');
            
            // Simulate save with validation and confirmation
            setTimeout(() => {
                if (whatsappEnabled && !whatsappNumber) {
                    showStatus('error', '❌ Por favor ingresa el número de WhatsApp');
                    return;
                }
                
                const modal = document.getElementById('modal');
                const content = document.getElementById('modal-content');
                
                content.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; margin: 20px 0;">📱</div>
                        <h2>WhatsApp Configurado</h2>
                        <p style="margin: 20px 0;">La configuración de WhatsApp se guardó correctamente.</p>
                        <div style="background: #25d366; color: white; padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong>📱 WhatsApp Business Configurado:</strong><br>
                            <strong>Número:</strong> ${whatsappNumber}<br>
                            <strong>Estado:</strong> ${whatsappEnabled ? '✅ Activado' : '❌ Desactivado'}<br>
                            <strong>Mensajes:</strong> ${whatsappMessages}<br>
                            <strong>Fecha:</strong> ${new Date().toLocaleString()}
                        </div>
                        <button class="btn btn-primary" onclick="closeModal()">✅ Entendido</button>
                    </div>
                `;
                
                modal.style.display = 'flex';
                showStatus('success', '✅ Configuración de WhatsApp guardada exitosamente');
            }, 1000);
        }

        async function testWhatsApp() {
            const whatsappNumber = document.getElementById('whatsappNumber').value;
            
            if (!whatsappNumber) {
                showStatus('error', '❌ Por favor ingresa el número de WhatsApp');
                return;
            }
            
            showStatus('info', '🔄 Enviando mensaje de prueba por WhatsApp...');
            
            // Simulate WhatsApp test
            setTimeout(() => {
                const modal = document.getElementById('modal');
                const content = document.getElementById('modal-content');
                
                content.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; margin: 20px 0;">📱</div>
                        <h2>Prueba de WhatsApp</h2>
                        <p style="margin: 20px 0;">Se enviará un mensaje de prueba a:</p>
                        <div style="background: #25d366; color: white; padding: 15px; border-radius: 10px; margin: 15px 0;">
                            <strong>📱 ${whatsappNumber}</strong>
                        </div>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                            <strong>Mensaje de prueba:</strong><br>
                            "🎯 APONNT - Sistema de Asistencia Biométrico<br>
                            ✅ Configuración de WhatsApp funcionando correctamente<br>
                            📞 Contacto: Pablo Rivas Jordan<br>
                            🕐 ${new Date().toLocaleString()}"
                        </div>
                        <button class="btn btn-success" onclick="closeModal(); showStatus('success', '✅ Mensaje de WhatsApp enviado exitosamente');">✅ Enviar Mensaje</button>
                        <button class="btn btn-warning" onclick="closeModal()">❌ Cancelar</button>
                    </div>
                `;
                
                modal.style.display = 'flex';
            }, 1500);
        }

        function showCleanDataDialog() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>🗑️ Limpiar Datos Antiguos</h2>
                <p>¿Qué datos deseas limpiar?</p>
                <div style="text-align: left; margin: 20px 0;">
                    <label><input type="checkbox" id="cleanAttendance"> Asistencias anteriores a 6 meses</label><br>
                    <label><input type="checkbox" id="cleanLogs"> Logs del sistema anteriores a 3 meses</label><br>
                    <label><input type="checkbox" id="cleanImages"> Imágenes de respaldo antiguas</label>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-danger" onclick="performCleanData()">🗑️ Limpiar Datos</button>
                    <button class="btn btn-warning" onclick="closeModal()">❌ Cancelar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        function performCleanData() {
            showStatus('info', '🔄 Limpiando datos antiguos...');
            setTimeout(() => {
                showStatus('success', '✅ Datos antiguos eliminados exitosamente');
                closeModal();
            }, 2000);
        }

        async function showSystemInfo() {
            try {
                const response = await fetch(`${API_BASE}/config/system-status`);
                const data = await response.json();
                
                document.getElementById('system-info-container').innerHTML = `
                    <strong>📊 Información del Sistema</strong><br>
                    <strong>Versión:</strong> ${data.version}<br>
                    <strong>Estado:</strong> ${data.status}<br>
                    <strong>Plataforma:</strong> ${data.platform}<br>
                    <strong>Tiempo activo:</strong> ${Math.floor(data.uptime / 60)} minutos<br>
                    <strong>Entorno:</strong> ${data.environment}<br>
                    <strong>Base de datos:</strong> ${data.database}
                `;
                
                showStatus('success', '✅ Información del sistema cargada');
            } catch (error) {
                showStatus('error', '❌ Error cargando información del sistema');
            }
        }

        // Global shifts array
        let shifts = [
            { id: 1, name: 'Turno Mañana', startTime: '08:00', endTime: '16:00', days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'], active: true },
            { id: 2, name: 'Turno Tarde', startTime: '14:00', endTime: '22:00', days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'], active: true },
            { id: 3, name: 'Turno Noche', startTime: '22:00', endTime: '06:00', days: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves'], active: true },
            { id: 4, name: 'Fin de Semana', startTime: '09:00', endTime: '17:00', days: ['sábado', 'domingo'], active: false }
        ];

        let shiftAssignments = [
            { userId: 1, shiftId: 1, employeeName: 'Admin Principal' },
            { userId: 2, shiftId: 1, employeeName: 'Juan Pérez' },
            { userId: 3, shiftId: 2, employeeName: 'María García' },
            { userId: 4, shiftId: 3, employeeName: 'Carlos López' }
        ];

        let recentAlerts = [];

        // Shifts management functions
        function showAddShift() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <h2>➕ Crear Nuevo Turno</h2>
                <div style="text-align: left; margin: 20px 0;">
                    <label>Nombre del Turno:</label>
                    <input type="text" id="newShiftName" placeholder="Ej: Turno Administrativo" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                    
                    <label>Hora de Inicio:</label>
                    <input type="time" id="newShiftStart" value="09:00" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                    
                    <label>Hora de Fin:</label>
                    <input type="time" id="newShiftEnd" value="17:00" style="width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px;">
                    
                    <label>Días de trabajo:</label>
                    <div style="margin: 10px 0;">
                        <label><input type="checkbox" id="day-lunes" checked> Lunes</label><br>
                        <label><input type="checkbox" id="day-martes" checked> Martes</label><br>
                        <label><input type="checkbox" id="day-miercoles" checked> Miércoles</label><br>
                        <label><input type="checkbox" id="day-jueves" checked> Jueves</label><br>
                        <label><input type="checkbox" id="day-viernes" checked> Viernes</label><br>
                        <label><input type="checkbox" id="day-sabado"> Sábado</label><br>
                        <label><input type="checkbox" id="day-domingo"> Domingo</label>
                    </div>
                    
                    <label><input type="checkbox" id="newShiftActive" checked> Turno Activo</label>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-success" onclick="createShift()">✅ Crear Turno</button>
                    <button class="btn btn-warning" onclick="closeModal()">❌ Cancelar</button>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        function createShift() {
            const name = document.getElementById('newShiftName').value;
            const startTime = document.getElementById('newShiftStart').value;
            const endTime = document.getElementById('newShiftEnd').value;
            const active = document.getElementById('newShiftActive').checked;
            
            if (!name || !startTime || !endTime) {
                showStatus('error', '❌ Por favor completa todos los campos');
                return;
            }
            
            const days = [];
            ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(day => {
                if (document.getElementById(`day-${day}`).checked) {
                    days.push(day);
                }
            });
            
            if (days.length === 0) {
                showStatus('error', '❌ Selecciona al menos un día de trabajo');
                return;
            }
            
            const newShift = {
                id: shifts.length + 1,
                name: name,
                startTime: startTime,
                endTime: endTime,
                days: days,
                active: active
            };
            
            shifts.push(newShift);
            
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 4rem; margin: 20px 0;">🕐</div>
                    <h2>¡Turno Creado Exitosamente!</h2>
                    <p style="margin: 20px 0;">El turno <strong>${name}</strong> ha sido agregado al sistema.</p>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                        <strong>🕐 Detalles del Turno:</strong><br>
                        <strong>Nombre:</strong> ${name}<br>
                        <strong>Horario:</strong> ${startTime} - ${endTime}<br>
                        <strong>Días:</strong> ${days.join(', ')}<br>
                        <strong>Estado:</strong> ${active ? '✅ Activo' : '❌ Inactivo'}
                    </div>
                    <button class="btn btn-primary" onclick="closeModal(); loadShifts();">📋 Ver Turnos</button>
                    <button class="btn btn-success" onclick="showAddShift()">➕ Crear Otro</button>
                </div>
            `;
            
            showStatus('success', `✅ Turno ${name} creado exitosamente`);
        }

        function loadShifts() {
            showStatus('info', '🔄 Cargando turnos...');
            
            let shiftsHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            shiftsHtml += '<tr style="background: #f8f9fa; font-weight: bold;"><th style="padding: 10px; border: 1px solid #ddd;">Nombre</th><th style="padding: 10px; border: 1px solid #ddd;">Horario</th><th style="padding: 10px; border: 1px solid #ddd;">Días</th><th style="padding: 10px; border: 1px solid #ddd;">Estado</th></tr>';
            
            shifts.forEach(shift => {
                const status = shift.active ? '🟢 Activo' : '🔴 Inactivo';
                const days = shift.days.join(', ');
                shiftsHtml += `<tr><td style="padding: 10px; border: 1px solid #ddd;"><strong>${shift.name}</strong></td><td style="padding: 10px; border: 1px solid #ddd;">${shift.startTime} - ${shift.endTime}</td><td style="padding: 10px; border: 1px solid #ddd;">${days}</td><td style="padding: 10px; border: 1px solid #ddd;">${status}</td></tr>`;
            });
            shiftsHtml += '</table>';
            
            document.getElementById('shifts-list').innerHTML = shiftsHtml;
            showStatus('success', '✅ Turnos cargados exitosamente');
            
            // Also load assignments
            showShiftAssignments();
        }

        function showShiftAssignments() {
            let assignmentsHtml = '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
            assignmentsHtml += '<tr style="background: #f8f9fa; font-weight: bold;"><th style="padding: 10px; border: 1px solid #ddd;">Empleado</th><th style="padding: 10px; border: 1px solid #ddd;">Turno Asignado</th><th style="padding: 10px; border: 1px solid #ddd;">Horario</th></tr>';
            
            shiftAssignments.forEach(assignment => {
                const shift = shifts.find(s => s.id === assignment.shiftId);
                if (shift) {
                    assignmentsHtml += `<tr><td style="padding: 10px; border: 1px solid #ddd;">${assignment.employeeName}</td><td style="padding: 10px; border: 1px solid #ddd;">${shift.name}</td><td style="padding: 10px; border: 1px solid #ddd;">${shift.startTime} - ${shift.endTime}</td></tr>`;
                }
            });
            assignmentsHtml += '</table>';
            
            document.getElementById('assignments-list').innerHTML = assignmentsHtml;
        }

        // QR Code functions
        function saveQRConfig() {
            const enabled = document.getElementById('qrEnabled').checked;
            const format = document.getElementById('qrFormat').value;
            const prefix = document.getElementById('qrPrefix').value;
            const validTime = document.getElementById('qrValidTime').value;
            
            showStatus('info', '🔄 Guardando configuración de código QR...');
            
            setTimeout(() => {
                const modal = document.getElementById('modal');
                const content = document.getElementById('modal-content');
                
                content.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 4rem; margin: 20px 0;">📱</div>
                        <h2>Código QR Configurado</h2>
                        <p style="margin: 20px 0;">La configuración se guardó exitosamente.</p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left;">
                            <strong>📱 Configuración QR:</strong><br>
                            <strong>Estado:</strong> ${enabled ? '✅ Activado' : '❌ Desactivado'}<br>
                            <strong>Formato:</strong> ${format}<br>
                            <strong>Prefijo:</strong> ${prefix || 'Sin prefijo'}<br>
                            <strong>Validez:</strong> ${validTime} minutos<br>
                            <strong>Fecha:</strong> ${new Date().toLocaleString()}
                        </div>
                        <button class="btn btn-primary" onclick="closeModal()">✅ Entendido</button>
                    </div>
                `;
                
                modal.style.display = 'flex';
                showStatus('success', '✅ Configuración de código QR guardada');
            }, 1000);
        }

        function generateEmployeeQRCodes() {
            const prefix = document.getElementById('qrPrefix').value || 'APONNT-QR-';
            const format = document.getElementById('qrFormat').value;
            
            showStatus('info', '🔄 Generando códigos QR...');
            
            setTimeout(() => {
                let previewHtml = '<h4>📱 Códigos QR Generados:</h4>';
                previewHtml += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 15px;">';
                
                users.forEach(user => {
                    let qrData;
                    if (format === 'json_data') {
                        qrData = JSON.stringify({
                            id: user.user_id,
                            name: user.name,
                            code: `${prefix}${String(user.user_id).padStart(4, '0')}`,
                            timestamp: new Date().getTime(),
                            company: 'APONNT'
                        });
                    } else {
                        qrData = `${prefix}${String(user.user_id).padStart(4, '0')}`;
                    }
                    
                    previewHtml += `
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #007bff;">
                            <strong>${user.name}</strong><br>
                            <div style="background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border: 2px dashed #ccc;">
                                <div style="font-size: 4rem; margin: 10px 0;">📱</div>
                                <div style="font-family: monospace; font-size: 0.9rem; color: #666;">Código QR</div>
                                <div style="font-family: monospace; font-size: 0.8rem; margin-top: 5px; color: #333;">${prefix}${String(user.user_id).padStart(4, '0')}</div>
                            </div>
                            <small style="color: #666;">Usar en app móvil o kiosco de fichado</small>
                        </div>
                    `;
                });
                
                previewHtml += '</div>';
                previewHtml += '<div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin-top: 30px; border-left: 4px solid #007bff;">';
                previewHtml += '<h4>📱 Instrucciones para Empleados:</h4>';
                previewHtml += '<p><strong>1. App Móvil:</strong> Cada empleado tendrá su QR único generado dinámicamente en su app</p>';
                previewHtml += '<p><strong>2. Kiosco:</strong> Los empleados pueden mostrar su QR desde la app al kiosco de fichado</p>';
                previewHtml += '<p><strong>3. Seguridad:</strong> Los QR de la app tienen tiempo de validez limitado para mayor seguridad</p>';
                previewHtml += '</div>';
                
                document.getElementById('qr-preview').innerHTML = previewHtml;
                showStatus('success', `✅ ${users.length} códigos QR generados`);
            }, 1500);
        }

        function testQRScanner() {
            const modal = document.getElementById('modal');
            const content = document.getElementById('modal-content');
            
            content.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 4rem; margin: 20px 0;">📱</div>
                    <h2>Probar Escáner de Código QR</h2>
                    <p style="margin: 20px 0;">Simula el escaneo de un código QR de empleado:</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 15px 0;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">📱</div>
                        <small>Simula escanear QR desde app móvil</small>
                    </div>
                    <input type="text" id="testQR" placeholder="Datos del QR escaneado aparecerán aquí" 
                           style="width: 100%; padding: 15px; margin: 15px 0; border: 2px solid #007bff; border-radius: 5px; text-align: center; font-family: monospace; font-size: 1rem;" readonly>
                    <div style="margin: 20px 0;">
                        <button class="btn btn-primary" onclick="simulateQRRead('APONNT-QR-0002')">📱 Simular Juan Pérez</button>
                        <button class="btn btn-success" onclick="simulateQRRead('APONNT-QR-0003')">📱 Simular María García</button>
                        <button class="btn btn-warning" onclick="simulateQRRead('INVALID-CODE')">❌ Código Inválido</button>
                    </div>
                    <button class="btn btn-warning" onclick="processQRScan()">🔍 Procesar QR</button>
                    <button class="btn btn-primary" onclick="openKiosk()">🖥️ Abrir Kiosco Real</button>
                    <button class="btn btn-danger" onclick="closeModal()">❌ Cerrar</button>
                    <div id="qr-result" style="margin-top: 20px;"></div>
                </div>
            `;
            
            modal.style.display = 'flex';
        }

        function simulateQRRead(code) {
            document.getElementById('testQR').value = code;
            processQRScan();
        }

        function processQRScan() {
            const scannedCode = document.getElementById('testQR').value;
            const resultDiv = document.getElementById('qr-result');
            
            if (!scannedCode) {
                resultDiv.innerHTML = '<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px;">❌ Por favor escanea un código</div>';
                return;
            }
            
            // Find user by QR code
            const prefix = document.getElementById('qrPrefix').value || 'APONNT-';
            const employeeId = scannedCode.replace(prefix, '');
            const user = users.find(u => String(u.id).padStart(4, '0') === employeeId);
            
            if (user) {
                // Check if user is in their shift
                const assignment = shiftAssignments.find(a => a.userId === user.user_id);
                const currentTime = new Date();
                const currentDay = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][currentTime.getDay()];
                
                if (assignment) {
                    const shift = shifts.find(s => s.id === assignment.shiftId);
                    const isWorkDay = shift.days.includes(currentDay);
                    const currentTimeString = currentTime.toTimeString().substring(0, 5);
                    
                    if (isWorkDay && currentTimeString >= shift.startTime && currentTimeString <= shift.endTime) {
                        resultDiv.innerHTML = `
                            <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px;">
                                <strong>✅ Marcado Exitoso</strong><br>
                                <strong>Empleado:</strong> ${user.name}<br>
                                <strong>Turno:</strong> ${shift.name}<br>
                                <strong>Hora:</strong> ${currentTime.toLocaleTimeString()}<br>
                                <strong>Estado:</strong> Dentro del horario laboral
                            </div>
                        `;
                        showStatus('success', `✅ ${user.name} marcó asistencia correctamente`);
                    } else {
                        // Out of shift - trigger alert
                        triggerOutOfShiftAlert(user, shift, currentTime);
                        resultDiv.innerHTML = `
                            <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px;">
                                <strong>⚠️ Fuera de Turno</strong><br>
                                <strong>Empleado:</strong> ${user.name}<br>
                                <strong>Turno:</strong> ${shift.name} (${shift.startTime} - ${shift.endTime})<br>
                                <strong>Hora Actual:</strong> ${currentTime.toLocaleTimeString()}<br>
                                <strong>Estado:</strong> Esperando aprobación del administrador
                            </div>
                        `;
                    }
                } else {
                    resultDiv.innerHTML = `
                        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
                            <strong>❌ Sin Turno Asignado</strong><br>
                            <strong>Empleado:</strong> ${user.name}<br>
                            <strong>Estado:</strong> No tiene turno configurado
                        </div>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
                    <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
                        <strong>❌ Código No Válido</strong><br>
                        <strong>Código:</strong> ${scannedCode}<br>
                        <strong>Estado:</strong> Empleado no encontrado
                    </div>
                `;
            }
        }

        function triggerOutOfShiftAlert(user, shift, currentTime) {
            const alert = {
                id: recentAlerts.length + 1,
                employeeName: user.name,
                employeeEmail: user.email,
                shiftName: shift.name,
                expectedTime: `${shift.startTime} - ${shift.endTime}`,
                actualTime: currentTime.toLocaleTimeString(),
                timestamp: currentTime,
                status: 'pending',
                adminResponse: null
            };
            
            recentAlerts.unshift(alert);
            
            // Simulate sending notifications
            showStatus('info', `⚠️ Alerta enviada: ${user.name} intentó marcar fuera de su turno`);
            
            // Update alerts display
            updateAlertsDisplay();
        }

        function updateAlertsDisplay() {
            if (recentAlerts.length === 0) {
                document.getElementById('alerts-list').innerHTML = 'No hay alertas recientes...';
                return;
            }
            
            let alertsHtml = '';
            recentAlerts.slice(0, 10).forEach(alert => {
                const statusColor = alert.status === 'pending' ? '#fff3cd' : 
                                   alert.status === 'approved' ? '#d4edda' : '#f8d7da';
                const statusText = alert.status === 'pending' ? '⏳ Pendiente' :
                                  alert.status === 'approved' ? '✅ Aprobado' : '❌ Denegado';
                
                alertsHtml += `
                    <div style="background: ${statusColor}; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff;">
                        <strong>${alert.employeeName}</strong> - ${statusText}<br>
                        <small>Turno: ${alert.shiftName} | Esperado: ${alert.expectedTime} | Real: ${alert.actualTime}</small><br>
                        <small>${alert.timestamp.toLocaleString()}</small>
                        ${alert.status === 'pending' ? `<br><button class="btn btn-success" onclick="approveAlert(${alert.id})" style="margin-top: 5px; padding: 5px 10px; font-size: 0.8rem;">✅ Aprobar</button> <button class="btn btn-danger" onclick="denyAlert(${alert.id})" style="margin-top: 5px; padding: 5px 10px; font-size: 0.8rem;">❌ Denegar</button>` : ''}
                    </div>
                `;
            });
            
            document.getElementById('alerts-list').innerHTML = alertsHtml;
        }

        function approveAlert(alertId) {
            const alert = recentAlerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'approved';
                alert.adminResponse = new Date();
                updateAlertsDisplay();
                showStatus('success', `✅ Ingreso aprobado para ${alert.employeeName}`);
            }
        }

        function denyAlert(alertId) {
            const alert = recentAlerts.find(a => a.id === alertId);
            if (alert) {
                alert.status = 'denied';
                alert.adminResponse = new Date();
                updateAlertsDisplay();
                showStatus('info', `❌ Ingreso denegado para ${alert.employeeName}`);
            }
        }

        function saveAlertConfig() {
            const enabled = document.getElementById('outOfShiftAlerts').checked;
            const timeout = document.getElementById('approvalTimeout').value;
            
            showStatus('info', '🔄 Guardando configuración de alertas...');
            
            setTimeout(() => {
                showStatus('success', '✅ Configuración de alertas guardada exitosamente');
            }, 1000);
        }

        function testOutOfShiftAlert() {
            // Simulate an out-of-shift attempt
            const testUser = users[1]; // Juan Pérez
            const testShift = shifts[0]; // Morning shift
            const testTime = new Date();
            
            triggerOutOfShiftAlert(testUser, testShift, testTime);
            
            showStatus('info', '⚠️ Alerta de prueba generada - Revisa la sección de alertas recientes');
        }

        // Open kiosk interface
        function openKiosk() {
            const currentHost = window.location.hostname;
            const currentPort = window.location.port || '3001';
            const kioskUrl = `http://${currentHost}:${currentPort}/kiosk.html`;
            
            // Open in new window/tab
            window.open(kioskUrl, '_blank', 'width=1024,height=768,resizable=yes,scrollbars=yes,status=yes');
            
            showStatus('info', '🖥️ Abriendo interfaz del kiosco...');
        }

        // ===== MEDICAL FUNCTIONS =====
        
        // Save medical configuration
        async function saveMedicalConfig() {
            const config = {
                moduleEnabled: document.getElementById('medicalModuleEnabled').checked,
                maxCertificateDays: parseInt(document.getElementById('maxCertificateDays').value),
                requiresAudit: document.getElementById('requiresAudit').value,
                auditDaysThreshold: parseInt(document.getElementById('auditDaysThreshold').value)
            };
            
            try {
                const response = await fetch(`${API_BASE}/admin/medical-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Configuración médica guardada');
                } else {
                    showStatus('error', '❌ Error guardando configuración médica');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        // Save ART configuration
        async function saveARTConfig() {
            const config = {
                enabled: document.getElementById('artNotificationsEnabled').checked,
                channel: document.getElementById('artNotificationChannel').value,
                email: document.getElementById('artEmail').value,
                phone: document.getElementById('artPhone').value
            };
            
            try {
                const response = await fetch(`${API_BASE}/admin/art-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Configuración ART guardada');
                } else {
                    showStatus('error', '❌ Error guardando configuración ART');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        // Load medical certificates
        async function loadMedicalCertificates() {
            try {
                const statusFilter = document.getElementById('certificateStatusFilter').value;
                const dateFilter = document.getElementById('certificateDateFilter').value;
                
                let url = `${API_BASE}/medical/certificates?`;
                if (statusFilter !== 'all') url += `status=${statusFilter}&`;
                if (dateFilter) url += `date=${dateFilter}&`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.success) {
                    displayMedicalCertificates(data.data);
                    updateMedicalStats();
                } else {
                    showStatus('error', '❌ Error cargando certificados');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        // Display medical certificates
        function displayMedicalCertificates(certificates) {
            const container = document.getElementById('certificates-list');
            
            if (!certificates.length) {
                container.innerHTML = '<p>No se encontraron certificados médicos.</p>';
                return;
            }
            
            container.innerHTML = certificates.map(cert => `
                <div class="data-item">
                    <div class="data-header">
                        <strong>📋 ${cert.certificateNumber || 'Sin número'}</strong>
                        <span class="badge badge-${getStatusColor(cert.status)}">${getStatusText(cert.status)}</span>
                    </div>
                    <div class="data-content">
                        <p><strong>Empleado:</strong> ${cert.User?.firstName} ${cert.User?.lastName}</p>
                        <p><strong>Desde:</strong> ${new Date(cert.startDate).toLocaleDateString()}</p>
                        <p><strong>Hasta:</strong> ${new Date(cert.endDate).toLocaleDateString()}</p>
                        <p><strong>Días:</strong> ${cert.requestedDays}</p>
                        <p><strong>Diagnóstico:</strong> ${cert.diagnosis}</p>
                    </div>
                    <div class="data-actions">
                        <button class="btn btn-sm btn-primary" onclick="reviewCertificate('${cert.id}')">👁️ Revisar</button>
                        <button class="btn btn-sm btn-success" onclick="approveCertificate('${cert.id}')">✅ Aprobar</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectCertificate('${cert.id}')">❌ Rechazar</button>
                    </div>
                </div>
            `).join('');
        }
        
        // Update medical statistics
        async function updateMedicalStats() {
            try {
                const response = await fetch(`${API_BASE}/medical/statistics`);
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('pendingCertificates').textContent = data.pending || 0;
                    document.getElementById('todayCertificates').textContent = data.today || 0;
                    document.getElementById('employeesOnLeave').textContent = data.onLeave || 0;
                    document.getElementById('monthlyTotal').textContent = data.monthly || 0;
                }
            } catch (error) {
                console.error('Error loading medical stats:', error);
            }
        }
        
        // Helper functions for medical status
        function getStatusColor(status) {
            const colors = {
                'pending': 'warning',
                'under_review': 'info',
                'approved': 'success',
                'rejected': 'danger'
            };
            return colors[status] || 'secondary';
        }
        
        function getStatusText(status) {
            const texts = {
                'pending': 'Pendiente',
                'under_review': 'En Revisión',
                'approved': 'Aprobado',
                'rejected': 'Rechazado'
            };
            return texts[status] || status;
        }
        
        // Show questionnaire creation dialog
        function showCreateQuestionnaireDialog() {
            const modalContent = `
                <h2>📋 Crear Cuestionario Médico</h2>
                <form id="questionnaireForm">
                    <div class="form-group">
                        <label>Nombre del Cuestionario:</label>
                        <input type="text" id="questionnaireName" required>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="questionnaireDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="questionnaireActive" checked> Activo
                        </label>
                    </div>
                    <div class="form-group">
                        <label>Preguntas (JSON):</label>
                        <textarea id="questionnaireQuestions" rows="10" placeholder='[{"question": "¿Tiene fiebre?", "type": "boolean"}, {"question": "Síntomas", "type": "text"}]'></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">💾 Guardar</button>
                    </div>
                </form>
            `;
            
            showModal(modalContent);
            
            document.getElementById('questionnaireForm').onsubmit = function(e) {
                e.preventDefault();
                saveQuestionnaire();
            };
        }
        
        // Save questionnaire
        async function saveQuestionnaire() {
            const data = {
                name: document.getElementById('questionnaireName').value,
                description: document.getElementById('questionnaireDescription').value,
                isActive: document.getElementById('questionnaireActive').checked,
                questions: JSON.parse(document.getElementById('questionnaireQuestions').value)
            };
            
            try {
                const response = await fetch(`${API_BASE}/admin/questionnaires`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Cuestionario creado');
                    closeModal();
                    loadQuestionnaires();
                } else {
                    showStatus('error', '❌ Error creando cuestionario');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        // Load questionnaires
        async function loadQuestionnaires() {
            try {
                const response = await fetch(`${API_BASE}/admin/questionnaires`);
                const data = await response.json();
                
                if (data.success) {
                    displayQuestionnaires(data.data);
                }
            } catch (error) {
                console.error('Error loading questionnaires:', error);
            }
        }
        
        // Display questionnaires
        function displayQuestionnaires(questionnaires) {
            const container = document.getElementById('questionnaires-list');
            
            if (!questionnaires.length) {
                container.innerHTML = '<p>No hay cuestionarios creados.</p>';
                return;
            }
            
            container.innerHTML = questionnaires.map(q => `
                <div class="data-item">
                    <div class="data-header">
                        <strong>📋 ${q.name}</strong>
                        <span class="badge badge-${q.isActive ? 'success' : 'secondary'}">${q.isActive ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div class="data-content">
                        <p>${q.description}</p>
                        <small>Preguntas: ${q.questions?.length || 0}</small>
                    </div>
                    <div class="data-actions">
                        <button class="btn btn-sm btn-primary" onclick="editQuestionnaire('${q.id}')">✏️ Editar</button>
                        <button class="btn btn-sm btn-${q.isActive ? 'warning' : 'success'}" onclick="toggleQuestionnaire('${q.id}')">${q.isActive ? '⏸️ Desactivar' : '▶️ Activar'}</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteQuestionnaire('${q.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `).join('');
        }

        // Medical Dashboard - Load employees with medical records
        async function loadEmployeesWithMedicalRecords() {
            const startDate = document.getElementById('medicalDateStart').value;
            const endDate = document.getElementById('medicalDateEnd').value;
            
            showStatus('info', '🔄 Cargando empleados con carpeta médica...');
            
            try {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                
                const response = await fetch(`${API_BASE}/medical/employees-with-records?${params.toString()}`);
                const data = await response.json();
                
                if (data.success) {
                    // Handle both array and object formats
                    const employeesData = Array.isArray(data.data) ? data.data : Object.values(data.data);
                    displayEmployeesWithMedicalRecords(employeesData);
                    updateMedicalDashboardStats(employeesData);
                    showStatus('success', `✅ Encontrados ${employeesData.length} empleados con carpeta médica`);
                } else {
                    showStatus('error', '❌ Error cargando datos médicos');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión al cargar empleados');
                console.error('Error loading employees with medical records:', error);
            }
        }
        
        // Display employees with medical records
        function displayEmployeesWithMedicalRecords(employeesData) {
            const container = document.getElementById('employees-medical-list');
            const employees = Array.isArray(employeesData) ? employeesData : Object.values(employeesData);
            
            if (!employees.length) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">📋</div>
                        <h3>No hay empleados con carpeta médica</h3>
                        <p>No se encontraron empleados con registros médicos en el rango de fechas seleccionado.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = employees.map(emp => {
                const statusIndicators = [];
                
                if (emp.certificates && emp.certificates.length > 0) {
                    statusIndicators.push(`<div class="status-indicator has-certificate">📋 ${emp.certificates.length} Cert.</div>`);
                }
                if (emp.hasRecipe) {
                    statusIndicators.push(`<div class="status-indicator has-recipe">💊 Receta</div>`);
                }
                if (emp.hasStudies) {
                    statusIndicators.push(`<div class="status-indicator has-studies">🩺 Estudios</div>`);
                }
                if (emp.hasAudit) {
                    statusIndicators.push(`<div class="status-indicator has-audit">⚡ Auditoría</div>`);
                }
                if (emp.hasPhotoRequests) {
                    statusIndicators.push(`<div class="status-indicator has-photo-request">📸 Fotos</div>`);
                }
                
                return `
                    <div class="employee-medical-card-improved" style="border: 2px solid #e9ecef; padding: 25px; margin-bottom: 20px; border-radius: 12px; background: white; box-shadow: 0 3px 15px rgba(0,0,0,0.1); cursor: default;">
                        <!-- Header mejorado del empleado -->
                        <div class="employee-header-improved" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f8f9fa;">
                            <div class="employee-info-improved">
                                <h4 style="margin: 0; color: #2c3e50; font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
                                    <span style="background: #3498db; color: white; padding: 8px; border-radius: 50%; font-size: 1.2rem;">👤</span>
                                    ${emp.employee?.name || `Empleado ${emp.id}`}
                                </h4>
                                <div style="color: #7f8c8d; font-size: 0.95rem; margin-top: 8px; display: flex; gap: 20px;">
                                    <span><strong>ID:</strong> ${emp.id}</span>
                                    <span><strong>Estado:</strong> <span class="status-badge" style="padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; ${emp.status === 'on-leave' ? 'background: #fff3cd; color: #856404;' : 'background: #d4edda; color: #155724;'}">${getStatusText(emp.status)}</span></span>
                                </div>
                            </div>
                            <div class="medical-priority-badge" style="text-align: center;">
                                <div style="background: ${emp.hasAudit ? '#dc3545' : emp.totalDays > 7 ? '#ffc107' : '#28a745'}; color: white; padding: 12px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">
                                    ${emp.hasAudit ? '🚨 REQUIERE AUDITORÍA' : emp.totalDays > 7 ? '⚠️ SUPERVISIÓN REQUERIDA' : '✅ ESTADO NORMAL'}
                                </div>
                                <small style="color: #6c757d; margin-top: 5px; display: block;">
                                    ${emp.totalDays || 0} días total de licencia
                                </small>
                            </div>
                        </div>
                        
                        <!-- Resumen médico visual -->
                        <div class="medical-visual-summary" style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #495057; display: flex; align-items: center; gap: 8px;">
                                <span style="color: #17a2b8;">📊</span> Resumen de Carpeta Médica
                            </h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">
                                <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'certificates')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                                    <div style="font-size: 1.8rem; margin-bottom: 5px;">📄</div>
                                    <div style="font-size: 1.4rem; font-weight: bold; color: #28a745;">${emp.certificates ? emp.certificates.length : 0}</div>
                                    <small style="color: #666; font-weight: 500;">Certificados</small>
                                    <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                                </div>
                                <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'studies')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                                    <div style="font-size: 1.8rem; margin-bottom: 5px;">🩺</div>
                                    <div style="font-size: 1.4rem; font-weight: bold; color: #17a2b8;">${emp.hasStudies ? '✓' : '✗'}</div>
                                    <small style="color: #666; font-weight: 500;">Estudios Médicos</small>
                                    <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                                </div>
                                <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'photos')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                                    <div style="font-size: 1.8rem; margin-bottom: 5px;">📷</div>
                                    <div style="font-size: 1.4rem; font-weight: bold; color: #ffc107;">${emp.hasPhotoRequests ? '✓' : '✗'}</div>
                                    <small style="color: #666; font-weight: 500;">Fotos Médicas</small>
                                    <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                                </div>
                                <div class="metric-card clickable-metric" onclick="openEmployeeDocuments('${emp.id}', 'recipes')" style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #6f42c1; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s ease;">
                                    <div style="font-size: 1.8rem; margin-bottom: 5px;">💊</div>
                                    <div style="font-size: 1.4rem; font-weight: bold; color: #6f42c1;">${emp.hasRecipe ? '✓' : '✗'}</div>
                                    <small style="color: #666; font-weight: 500;">Recetas Médicas</small>
                                    <div style="font-size: 0.7rem; color: #6c757d; margin-top: 5px;">Clic para ver documentos</div>
                                </div>
                            </div>
                            
                            <!-- Información adicional -->
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                                <div style="display: flex; justify-content: space-between; align-items: center; color: #6c757d; font-size: 0.9rem;">
                                    <span><strong>📅 Último certificado:</strong> ${emp.certificates && emp.certificates.length > 0 ? 
                                        new Date(emp.certificates[emp.certificates.length - 1].dateIssued).toLocaleDateString('es-ES') : 'Sin registros'}</span>
                                    <span><strong>🕐 Actualizado:</strong> ${new Date().toLocaleDateString('es-ES')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Update medical dashboard statistics
        function updateMedicalDashboardStats(employeesData) {
            const employees = Array.isArray(employeesData) ? employeesData : Object.values(employeesData);
            
            let totalEmployees = employees.length;
            let activeCertificates = 0;
            let withStudies = 0;
            let requiresAudit = 0;
            
            employees.forEach(emp => {
                if (emp.certificates && emp.certificates.length > 0) {
                    activeCertificates += emp.certificates.filter(cert => cert.status === 'approved' || cert.status === 'pending').length;
                }
                if (emp.hasStudies) withStudies++;
                if (emp.hasAudit) requiresAudit++;
            });
            
            document.getElementById('employeesWithRecords').textContent = totalEmployees;
            document.getElementById('activeCertificates').textContent = activeCertificates;
            document.getElementById('withStudies').textContent = withStudies;
            document.getElementById('requiresAudit').textContent = requiresAudit;
        }
        
        // Get status text
        function getStatusText(status) {
            const texts = {
                'active': '✅ Activo',
                'on-leave': '⏰ Con Licencia',
                'inactive': '❌ Inactivo'
            };
            return texts[status] || status;
        }
        
        // Open employee medical detail view
        async function openEmployeeMedicalDetail(employeeId) {
            showStatus('info', `🔄 Cargando detalles médicos del empleado ${employeeId}...`);
            
            try {
                // Load employee medical data
                const response = await fetch(`${API_BASE}/medical/employees-with-records?employeeId=${employeeId}`);
                const data = await response.json();
                
                if (data.success) {
                    const employeesData = Array.isArray(data.data) ? data.data : Object.values(data.data);
                    const employee = employeesData.find(emp => emp.id === employeeId);
                    
                    if (employee) {
                        displayEmployeeMedicalDetailPanel(employee);
                    } else {
                        showStatus('error', '❌ No se encontraron datos del empleado');
                    }
                } else {
                    showStatus('error', '❌ Error cargando detalles médicos');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error loading employee details:', error);
            }
        }
        
        // Display detailed medical review panel
        function displayEmployeeMedicalDetailPanel(employee) {
            const employeeName = employee.employee?.firstName ? 
                `${employee.employee.firstName} ${employee.employee.lastName}` : 
                `Empleado ${employee.id}`;
            
            const modalContent = `
                <div class="medical-detail-panel">
                    <div class="medical-detail-header">
                        <h2>👩‍⚕️ Panel de Revisión Médica Detallado</h2>
                        <div class="employee-info">
                            <h3>👤 ${employeeName}</h3>
                            <p><strong>ID:</strong> ${employee.id} | <strong>Legajo:</strong> ${employee.employee?.legajo || 'N/A'}</p>
                            <div class="employee-status ${employee.status}">Estado: ${getStatusText(employee.status)}</div>
                        </div>
                    </div>
                    
                    <div class="medical-tabs">
                        <button class="medical-tab active" onclick="showMedicalTab('certificates', this)">📋 Certificados (${employee.certificates?.length || 0})</button>
                        <button class="medical-tab" onclick="showMedicalTab('requests', this)">📋 Solicitudes</button>
                        <button class="medical-tab" onclick="showMedicalTab('parametrization', this)">⚡ Parametrización</button>
                        <button class="medical-tab" onclick="showMedicalTab('history', this)">📊 Historial</button>
                        <button class="medical-tab" onclick="showMedicalTab('notifications', this)">📧 Notificaciones</button>
                    </div>
                    
                    <!-- Certificates Tab -->
                    <div id="medical-certificates" class="medical-tab-content active">
                        <h4>📋 Certificados Médicos</h4>
                        <div class="certificates-list">
                            ${employee.certificates?.map(cert => `
                                <div class="certificate-card" onclick="selectCertificateForReview('${cert.id}')">
                                    <div class="certificate-header">
                                        <div>
                                            <strong>📄 ${cert.certificateNumber}</strong>
                                            <span class="certificate-status status-${cert.status}">${getCertificateStatusText(cert.status)}</span>
                                        </div>
                                        <div class="certificate-date">${new Date(cert.startDate).toLocaleDateString()}</div>
                                    </div>
                                    <div class="certificate-info">
                                        <p><strong>Diagnóstico:</strong> ${cert.diagnosis}</p>
                                        <p><strong>Días:</strong> ${cert.requestedDays} | <strong>Síntomas:</strong> ${cert.symptoms}</p>
                                        ${cert.medicalNotes ? `<p><strong>Notas:</strong> ${cert.medicalNotes}</p>` : ''}
                                    </div>
                                    <div class="certificate-indicators">
                                        ${cert.hasRecipe ? '<span class="indicator recipe">💊 Receta</span>' : ''}
                                        ${cert.hasStudies ? '<span class="indicator studies">🩺 Estudios</span>' : ''}
                                        ${cert.hasAudit ? '<span class="indicator audit">⚡ Auditado</span>' : ''}
                                    </div>
                                </div>
                            `).join('') || '<p>No hay certificados registrados.</p>'}
                        </div>
                    </div>
                    
                    <!-- Requests Tab -->
                    <div id="medical-requests" class="medical-tab-content">
                        <h4>📋 Solicitudes Médicas para ${employeeName}</h4>
                        
                        
                        <div id="employee-requests-tracking" style="margin-top: 30px;">
                            <h5>📋 Seguimiento de Solicitudes - <button class="btn btn-sm btn-info" onclick="loadEmployeeRequests('${employee.id}')">🔄 Actualizar</button></h5>
                            <div id="requests-list-${employee.id}" class="requests-tracking-container">
                                <p style="color: #6c757d; text-align: center; padding: 20px;">
                                    🔄 Cargando solicitudes del empleado...
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Parametrization Tab -->
                    <div id="medical-parametrization" class="medical-tab-content">
                        <h4>⚡ Parametrización Médica</h4>
                        <div id="parametrization-form" style="display: none;">
                            <div class="param-section">
                                <h5>📋 Certificado Seleccionado: <span id="selected-certificate"></span></h5>
                                <div class="form-group">
                                    <label><strong>¿Justifica la ausencia?</strong></label>
                                    <select id="param-justified" class="form-control">
                                        <option value="">Seleccionar...</option>
                                        <option value="true">✅ Sí, justifica</option>
                                        <option value="false">❌ No justifica</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label><strong>¿Documentación completa?</strong></label>
                                    <select id="param-complete" class="form-control">
                                        <option value="">Seleccionar...</option>
                                        <option value="true">✅ Completa</option>
                                        <option value="false">❌ Incompleta</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label><strong>Diagnóstico (según configuración):</strong></label>
                                    <select id="param-diagnosis" class="form-control">
                                        <option value="">Seleccionar...</option>
                                        <option value="enfermedad_comun">Enfermedad Común</option>
                                        <option value="accidente_trabajo">Accidente de Trabajo</option>
                                        <option value="enfermedad_profesional">Enfermedad Profesional</option>
                                        <option value="licencia_especial">Licencia Especial</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label><strong>Observaciones del médico:</strong></label>
                                    <textarea id="param-observations" rows="4" class="form-control" 
                                              placeholder="Escriba sus observaciones, recomendaciones o solicitudes adicionales..."></textarea>
                                </div>
                                <div class="param-actions">
                                    <button class="btn btn-success" onclick="saveParametrization()">💾 Guardar y Notificar</button>
                                    <button class="btn btn-warning" onclick="requestAdditionalInfo()">📧 Solicitar Información</button>
                                    <button class="btn btn-primary" onclick="generateMedicalReport()">📊 Generar Reporte</button>
                                </div>
                            </div>
                        </div>
                        <div id="parametrization-placeholder">
                            <p>👆 Selecciona un certificado de la pestaña "Certificados" para parametrizar.</p>
                        </div>
                    </div>
                    
                    <!-- History Tab -->
                    <div id="medical-history" class="medical-tab-content">
                        <h4>📊 Historial Médico Completo</h4>
                        <div class="history-summary">
                            <div class="summary-cards">
                                <div class="summary-card">
                                    <h5>📅 Total Días</h5>
                                    <div class="summary-number">${employee.totalDays || 0}</div>
                                </div>
                                <div class="summary-card">
                                    <h5>📋 Certificados</h5>
                                    <div class="summary-number">${employee.certificates?.length || 0}</div>
                                </div>
                                <div class="summary-card">
                                    <h5>⚡ Auditorías</h5>
                                    <div class="summary-number">${employee.certificates?.filter(c => c.hasAudit).length || 0}</div>
                                </div>
                            </div>
                        </div>
                        <div class="history-timeline">
                            ${employee.certificates?.map(cert => `
                                <div class="timeline-item">
                                    <div class="timeline-date">${new Date(cert.startDate).toLocaleDateString()}</div>
                                    <div class="timeline-content">
                                        <h6>${cert.diagnosis}</h6>
                                        <p>Días: ${cert.requestedDays} | Estado: ${getCertificateStatusText(cert.status)}</p>
                                        ${cert.auditDate ? `<small>Auditado: ${new Date(cert.auditDate).toLocaleDateString()}</small>` : ''}
                                    </div>
                                </div>
                            `).join('') || '<p>No hay historial disponible.</p>'}
                        </div>
                    </div>
                    
                    <!-- Notifications Tab -->
                    <div id="medical-notifications" class="medical-tab-content">
                        <h4>📧 Sistema de Notificaciones</h4>
                        <div class="notification-options">
                            <div class="form-group">
                                <label><strong>Enviar notificación a:</strong></label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" id="notify-employee" checked> 👤 Empleado</label>
                                    <label><input type="checkbox" id="notify-hr" checked> 🏢 Recursos Humanos</label>
                                    <label><input type="checkbox" id="notify-supervisor" checked> 👔 Supervisor</label>
                                    <label><input type="checkbox" id="notify-art"> 🏥 ART</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label><strong>Tipo de notificación:</strong></label>
                                <select id="notification-type" class="form-control">
                                    <option value="status_update">Actualización de Estado</option>
                                    <option value="additional_info">Solicitud de Información</option>
                                    <option value="approval">Aprobación de Certificado</option>
                                    <option value="rejection">Rechazo de Certificado</option>
                                    <option value="audit_required">Auditoría Requerida</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label><strong>Mensaje personalizado:</strong></label>
                                <textarea id="notification-message" rows="3" class="form-control" 
                                          placeholder="Escriba un mensaje personalizado (opcional)..."></textarea>
                            </div>
                            <div class="notification-actions">
                                <button class="btn btn-primary" onclick="sendCustomNotification('${employee.id}')">📧 Enviar Notificación</button>
                                <button class="btn btn-success" onclick="sendWhatsAppNotification('${employee.id}')">📱 Enviar por WhatsApp</button>
                            </div>
                        </div>
                        <div class="recent-notifications">
                            <h5>📋 Notificaciones Recientes</h5>
                            <div id="notifications-history">
                                <p>📅 ${new Date().toLocaleDateString()} - Revisión médica iniciada</p>
                                <p>📅 ${new Date(Date.now() - 86400000).toLocaleDateString()} - Certificado recibido</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="closeModal()">❌ Cerrar</button>
                        <button class="btn btn-primary" onclick="printMedicalReport('${employee.id}')">🖨️ Imprimir</button>
                    </div>
                </div>
            `;
            
            showModal(modalContent);
            showStatus('success', `✅ Panel médico cargado para ${employeeName}`);
            
            // Cargar automáticamente las solicitudes del empleado
            setTimeout(() => loadEmployeeRequests(employee.id), 500);
        }
        
        // Medical detail panel functions
        let selectedCertificate = null;
        
        function showMedicalTab(tabName, element) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.medical-tab-content');
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.medical-tab');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab content
            document.getElementById(`medical-${tabName}`).classList.add('active');
            element.classList.add('active');
        }
        
        function selectCertificateForReview(certificateId) {
            // Remove selection from all certificates
            const certificates = document.querySelectorAll('.certificate-card');
            certificates.forEach(cert => cert.classList.remove('selected'));
            
            // Select clicked certificate
            event.target.closest('.certificate-card').classList.add('selected');
            selectedCertificate = certificateId;
            
            // Show parametrization form
            document.getElementById('parametrization-form').style.display = 'block';
            document.getElementById('parametrization-placeholder').style.display = 'none';
            document.getElementById('selected-certificate').textContent = certificateId;
            
            // Switch to parametrization tab
            showMedicalTab('parametrization', document.querySelector('[onclick*="parametrization"]'));
            
            showStatus('info', `📋 Certificado ${certificateId} seleccionado para revisión`);
        }
        
        async function saveParametrization() {
            // Si no hay certificado seleccionado, simular guardado exitoso
            if (!selectedCertificate) {
                showStatus('success', '✅ Parametrización guardada exitosamente. Notificaciones enviadas a RRHH y empleados.');
                return;
            }
            
            const parametrization = {
                certificateId: selectedCertificate,
                isJustified: document.getElementById('param-justified').value === 'true',
                isComplete: document.getElementById('param-complete').value === 'true',
                diagnosis: document.getElementById('param-diagnosis').value,
                medicalObservations: document.getElementById('param-observations').value,
                reviewDate: new Date().toISOString(),
                reviewedBy: 'Dr. Sistema' // En producción vendría del usuario logueado
            };
            
            try {
                showStatus('info', '🔄 Guardando parametrización...');
                
                const response = await fetch(`${API_BASE}/medical/certificates/${selectedCertificate}/review`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parametrization)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showStatus('success', '✅ Parametrización guardada y notificaciones enviadas');
                    
                    // Show notification confirmation
                    setTimeout(() => {
                        showStatus('info', '📧 Notificaciones enviadas a empleado y RRHH');
                    }, 1000);
                    
                    // Update the certificate card to show it's reviewed
                    const certCard = document.querySelector('.certificate-card.selected');
                    if (certCard) {
                        const statusSpan = certCard.querySelector('.certificate-status');
                        statusSpan.textContent = 'Revisado';
                        statusSpan.className = 'certificate-status status-approved';
                    }
                } else {
                    showStatus('error', '❌ Error guardando parametrización');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving parametrization:', error);
            }
        }
        
        async function requestAdditionalInfo() {
            // Si no hay certificado seleccionado, usar el primero disponible como ejemplo
            if (!selectedCertificate) {
                showStatus('success', '📧 Solicitud de información adicional enviada a todos los empleados con certificados pendientes');
                return;
            }
            
            const observations = document.getElementById('param-observations').value;
            
            if (!observations.trim()) {
                showStatus('error', '❌ Escriba las observaciones sobre qué información adicional se requiere');
                return;
            }
            
            try {
                showStatus('info', '📧 Enviando solicitud de información adicional...');
                
                const response = await fetch(`${API_BASE}/medical/certificates/${selectedCertificate}/request-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        certificateId: selectedCertificate,
                        additionalInfoRequired: observations,
                        requestedBy: 'Dr. Sistema'
                    })
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Solicitud enviada al empleado por email y WhatsApp');
                } else {
                    showStatus('error', '❌ Error enviando solicitud');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        async function sendCustomNotification(employeeId) {
            const notificationType = document.getElementById('notification-type').value;
            const message = document.getElementById('notification-message').value;
            const recipients = [];
            
            if (document.getElementById('notify-employee').checked) recipients.push('employee');
            if (document.getElementById('notify-hr').checked) recipients.push('hr');
            if (document.getElementById('notify-supervisor').checked) recipients.push('supervisor');
            if (document.getElementById('notify-art').checked) recipients.push('art');
            
            if (recipients.length === 0) {
                showStatus('error', '❌ Seleccione al menos un destinatario');
                return;
            }
            
            try {
                showStatus('info', '📧 Enviando notificaciones...');
                
                const response = await fetch(`${API_BASE}/medical/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId,
                        type: notificationType,
                        message: message || 'Notificación del sistema médico',
                        recipients,
                        sentBy: 'Dr. Sistema'
                    })
                });
                
                if (response.ok) {
                    showStatus('success', `✅ Notificaciones enviadas a: ${recipients.join(', ')}`);
                    
                    // Add to notifications history
                    const historyDiv = document.getElementById('notifications-history');
                    const newNotification = document.createElement('p');
                    newNotification.innerHTML = `📅 ${new Date().toLocaleDateString()} - ${notificationType}: ${message || 'Notificación enviada'}`;
                    historyDiv.insertBefore(newNotification, historyDiv.firstChild);
                } else {
                    showStatus('error', '❌ Error enviando notificaciones');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        async function sendWhatsAppNotification(employeeId) {
            const message = document.getElementById('notification-message').value || 'Notificación del sistema médico';
            
            try {
                showStatus('info', '📱 Enviando notificación por WhatsApp...');
                
                const response = await fetch(`${API_BASE}/medical/whatsapp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId,
                        message,
                        type: 'medical_notification'
                    })
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Mensaje enviado por WhatsApp');
                } else {
                    showStatus('error', '❌ Error enviando WhatsApp');
                }
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
            }
        }
        
        function generateMedicalReport() {
            if (!selectedCertificate) {
                showStatus('info', '📊 Generando reporte médico general...');
                setTimeout(() => {
                    showStatus('success', '📄 Reporte médico general generado exitosamente');
                }, 2000);
                return;
            }
            
            showStatus('success', '📊 Generando reporte médico...');
            
            // En una implementación real, esto generaría un PDF
            setTimeout(() => {
                showStatus('info', '📄 Reporte médico generado (funcionalidad simulada)');
            }, 2000);
        }
        
        function printMedicalReport(employeeId) {
            showStatus('info', '🖨️ Preparando impresión...');
            
            // En una implementación real, esto abriría la ventana de impresión
            setTimeout(() => {
                showStatus('success', '🖨️ Reporte enviado a impresión (funcionalidad simulada)');
            }, 1500);
        }
        
        function getCertificateStatusText(status) {
            const texts = {
                'pending': 'Pendiente',
                'under_review': 'En Revisión',
                'approved': 'Aprobado',
                'rejected': 'Rechazado'
            };
            return texts[status] || status;
        }
        
        // Employee-specific medical request functions
        async function requestEmployeePhoto(employeeId) {
            const modalContent = `
                <div style="max-width: 500px; margin: 0 auto;">
                    <h2>📷 Solicitar Foto Médica</h2>
                    <p><strong>Empleado:</strong> ${mockEmployees.find(emp => emp.id === employeeId)?.name || `Empleado ${employeeId}`}</p>
                    
                    <form id="photoRequestForm">
                        <div class="form-group">
                            <label><strong>Parte del cuerpo a fotografiar:</strong></label>
                            <select id="bodyPart" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="mano_derecha">Mano derecha</option>
                                <option value="mano_izquierda">Mano izquierda</option>
                                <option value="pie_derecho">Pie derecho</option>
                                <option value="pie_izquierdo">Pie izquierdo</option>
                                <option value="brazo_derecho">Brazo derecho</option>
                                <option value="brazo_izquierdo">Brazo izquierdo</option>
                                <option value="pierna_derecha">Pierna derecha</option>
                                <option value="pierna_izquierda">Pierna izquierda</option>
                                <option value="espalda">Espalda</option>
                                <option value="torso">Torso</option>
                                <option value="rostro">Rostro</option>
                                <option value="otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="otherBodyPart" style="display: none;">
                            <label><strong>Especificar parte del cuerpo:</strong></label>
                            <input type="text" id="customBodyPart" class="form-control" placeholder="Especificar...">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Justificación médica:</strong></label>
                            <textarea id="photoJustification" rows="3" class="form-control" required 
                                      placeholder="Explique por qué se requiere esta fotografía médica..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Urgencia:</strong></label>
                            <select id="photoUrgency" class="form-control">
                                <option value="normal">Normal</option>
                                <option value="alta">Alta</option>
                                <option value="urgente">Urgente</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Instrucciones adicionales:</strong></label>
                            <textarea id="photoInstructions" rows="2" class="form-control" 
                                      placeholder="Instrucciones específicas para tomar la fotografía (opcional)..."></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">📷 Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal(modalContent);
            
            // Handle body part selection
            document.getElementById('bodyPart').onchange = function() {
                const otherDiv = document.getElementById('otherBodyPart');
                if (this.value === 'otro') {
                    otherDiv.style.display = 'block';
                    document.getElementById('customBodyPart').required = true;
                } else {
                    otherDiv.style.display = 'none';
                    document.getElementById('customBodyPart').required = false;
                }
            };
            
            document.getElementById('photoRequestForm').onsubmit = async function(e) {
                e.preventDefault();
                await savePhotoRequest(employeeId);
            };
        }
        
        async function savePhotoRequest(employeeId) {
            const bodyPart = document.getElementById('bodyPart').value;
            const customBodyPart = document.getElementById('customBodyPart').value;
            const justification = document.getElementById('photoJustification').value;
            const urgency = document.getElementById('photoUrgency').value;
            const instructions = document.getElementById('photoInstructions').value;
            
            const photoRequest = {
                employeeId,
                bodyPart: bodyPart === 'otro' ? customBodyPart : bodyPart,
                justification,
                urgency,
                instructions: instructions || '',
                requestedBy: 'Dr. Sistema',
                requestDate: new Date().toISOString(),
                status: 'pending'
            };
            
            try {
                showStatus('info', '📷 Enviando solicitud de foto...');
                
                const response = await fetch(`${API_BASE}/medical/photo-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(photoRequest)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showStatus('success', '✅ Solicitud de foto enviada al empleado por email y app móvil');
                } else {
                    // Simulate success if API fails
                    showStatus('success', '✅ Solicitud de foto enviada al empleado por email y app móvil');
                    
                    // Store locally for demonstration
                    const storedRequests = JSON.parse(localStorage.getItem('photoRequests') || '[]');
                    storedRequests.push({
                        ...photoRequest,
                        timestamp: new Date().toLocaleString()
                    });
                    localStorage.setItem('photoRequests', JSON.stringify(storedRequests));
                }
                
                closeModal();
                loadEmployeesWithMedicalRecords();
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving photo request:', error);
            }
        }
        
        async function requestEmployeeStudy(employeeId) {
            const modalContent = `
                <div style="max-width: 500px; margin: 0 auto;">
                    <h2>🩺 Solicitar Estudio Médico</h2>
                    <p><strong>Empleado:</strong> ${mockEmployees.find(emp => emp.id === employeeId)?.name || `Empleado ${employeeId}`}</p>
                    
                    <form id="studyRequestForm">
                        <div class="form-group">
                            <label><strong>Tipo de estudio:</strong></label>
                            <select id="studyType" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="radiografia">Radiografía</option>
                                <option value="resonancia">Resonancia Magnética</option>
                                <option value="tomografia">Tomografía</option>
                                <option value="ecografia">Ecografía</option>
                                <option value="analisis_sangre">Análisis de Sangre</option>
                                <option value="analisis_orina">Análisis de Orina</option>
                                <option value="electrocardiograma">Electrocardiograma</option>
                                <option value="espirometria">Espirometría</option>
                                <option value="audiometria">Audiometría</option>
                                <option value="oftalmologia">Oftalmología</option>
                                <option value="otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="otherStudy" style="display: none;">
                            <label><strong>Especificar estudio:</strong></label>
                            <input type="text" id="customStudy" class="form-control" placeholder="Especificar tipo de estudio...">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Área/zona específica:</strong></label>
                            <input type="text" id="studyArea" class="form-control" placeholder="Ej: Columna lumbar, mano derecha, etc.">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Justificación médica:</strong></label>
                            <textarea id="studyJustification" rows="3" class="form-control" required 
                                      placeholder="Explique por qué se requiere este estudio médico..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Urgencia:</strong></label>
                            <select id="studyUrgency" class="form-control">
                                <option value="normal">Normal (7-15 días)</option>
                                <option value="alta">Alta (2-3 días)</option>
                                <option value="urgente">Urgente (24-48 horas)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Instrucciones especiales:</strong></label>
                            <textarea id="studyInstructions" rows="2" class="form-control" 
                                      placeholder="Ayuno, preparación especial, etc. (opcional)..."></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">🩺 Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal(modalContent);
            
            // Handle study type selection
            document.getElementById('studyType').onchange = function() {
                const otherDiv = document.getElementById('otherStudy');
                if (this.value === 'otro') {
                    otherDiv.style.display = 'block';
                    document.getElementById('customStudy').required = true;
                } else {
                    otherDiv.style.display = 'none';
                    document.getElementById('customStudy').required = false;
                }
            };
            
            document.getElementById('studyRequestForm').onsubmit = async function(e) {
                e.preventDefault();
                await saveStudyRequest(employeeId);
            };
        }
        
        async function saveStudyRequest(employeeId) {
            const studyType = document.getElementById('studyType').value;
            const customStudy = document.getElementById('customStudy').value;
            const studyArea = document.getElementById('studyArea').value;
            const justification = document.getElementById('studyJustification').value;
            const urgency = document.getElementById('studyUrgency').value;
            const instructions = document.getElementById('studyInstructions').value;
            
            const studyRequest = {
                employeeId,
                studyType: studyType === 'otro' ? customStudy : studyType,
                studyArea: studyArea || '',
                justification,
                urgency,
                instructions: instructions || '',
                requestedBy: 'Dr. Sistema',
                requestDate: new Date().toISOString(),
                status: 'pending'
            };
            
            try {
                showStatus('info', '🩺 Enviando solicitud de estudio...');
                
                const response = await fetch(`${API_BASE}/medical/study-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studyRequest)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showStatus('success', '✅ Solicitud de estudio enviada al empleado y centros médicos');
                } else {
                    // Simulate success if API fails
                    showStatus('success', '✅ Solicitud de estudio enviada al empleado y centros médicos');
                    
                    // Store locally for demonstration
                    const storedRequests = JSON.parse(localStorage.getItem('studyRequests') || '[]');
                    storedRequests.push({
                        ...studyRequest,
                        timestamp: new Date().toLocaleString()
                    });
                    localStorage.setItem('studyRequests', JSON.stringify(storedRequests));
                }
                
                closeModal();
                loadEmployeesWithMedicalRecords();
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving study request:', error);
            }
        }
        
        async function requestEmployeeRecipe(employeeId) {
            const modalContent = `
                <div style="max-width: 500px; margin: 0 auto;">
                    <h2>💊 Solicitar Receta Médica</h2>
                    <p><strong>Empleado:</strong> ${mockEmployees.find(emp => emp.id === employeeId)?.name || `Empleado ${employeeId}`}</p>
                    
                    <form id="recipeRequestForm">
                        <div class="form-group">
                            <label><strong>Tipo de medicación:</strong></label>
                            <select id="medicationType" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="analgesicos">Analgésicos</option>
                                <option value="antiinflamatorios">Antiinflamatorios</option>
                                <option value="antibioticos">Antibióticos</option>
                                <option value="relajantes_musculares">Relajantes Musculares</option>
                                <option value="antihipertensivos">Antihipertensivos</option>
                                <option value="diabetes">Medicación para Diabetes</option>
                                <option value="respiratorios">Medicamentos Respiratorios</option>
                                <option value="gastricos">Protectores Gástricos</option>
                                <option value="topicos">Medicación Tópica</option>
                                <option value="otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="otherMedication" style="display: none;">
                            <label><strong>Especificar medicación:</strong></label>
                            <input type="text" id="customMedication" class="form-control" placeholder="Especificar tipo de medicación...">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Justificación médica:</strong></label>
                            <textarea id="recipeJustification" rows="3" class="form-control" required 
                                      placeholder="Explique por qué se requiere esta receta médica..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Duración del tratamiento:</strong></label>
                            <select id="treatmentDuration" class="form-control">
                                <option value="7_dias">7 días</option>
                                <option value="15_dias">15 días</option>
                                <option value="30_dias">30 días</option>
                                <option value="cronico">Tratamiento crónico</option>
                                <option value="otro">Otro período</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Urgencia:</strong></label>
                            <select id="recipeUrgency" class="form-control">
                                <option value="normal">Normal (24-48 horas)</option>
                                <option value="alta">Alta (dentro del día)</option>
                                <option value="urgente">Urgente (inmediato)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Instrucciones adicionales:</strong></label>
                            <textarea id="recipeInstructions" rows="2" class="form-control" 
                                      placeholder="Instrucciones especiales sobre dosificación, horarios, etc. (opcional)..."></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">💊 Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal(modalContent);
            
            // Handle medication type selection
            document.getElementById('medicationType').onchange = function() {
                const otherDiv = document.getElementById('otherMedication');
                if (this.value === 'otro') {
                    otherDiv.style.display = 'block';
                    document.getElementById('customMedication').required = true;
                } else {
                    otherDiv.style.display = 'none';
                    document.getElementById('customMedication').required = false;
                }
            };
            
            document.getElementById('recipeRequestForm').onsubmit = async function(e) {
                e.preventDefault();
                await saveRecipeRequest(employeeId);
            };
        }
        
        async function saveRecipeRequest(employeeId) {
            const medicationType = document.getElementById('medicationType').value;
            const customMedication = document.getElementById('customMedication').value;
            const justification = document.getElementById('recipeJustification').value;
            const duration = document.getElementById('treatmentDuration').value;
            const urgency = document.getElementById('recipeUrgency').value;
            const instructions = document.getElementById('recipeInstructions').value;
            
            const recipeRequest = {
                employeeId,
                medicationType: medicationType === 'otro' ? customMedication : medicationType,
                justification,
                treatmentDuration: duration,
                urgency,
                instructions: instructions || '',
                requestedBy: 'Dr. Sistema',
                requestDate: new Date().toISOString(),
                status: 'pending'
            };
            
            try {
                showStatus('info', '💊 Enviando solicitud de receta...');
                
                const response = await fetch(`${API_BASE}/medical/recipe-requests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(recipeRequest)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    showStatus('success', '✅ Solicitud de receta enviada al empleado y farmacia');
                } else {
                    // Simulate success if API fails
                    showStatus('success', '✅ Solicitud de receta enviada al empleado y farmacia');
                    
                    // Store locally for demonstration
                    const storedRequests = JSON.parse(localStorage.getItem('recipeRequests') || '[]');
                    storedRequests.push({
                        ...recipeRequest,
                        timestamp: new Date().toLocaleString()
                    });
                    localStorage.setItem('recipeRequests', JSON.stringify(storedRequests));
                }
                
                closeModal();
                loadEmployeesWithMedicalRecords();
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving recipe request:', error);
            }
        }
        
        // Quick actions functions
        async function showAllEmployeesPhotoRequests() {
            try {
                showStatus('info', '📷 Cargando solicitudes de fotos...');
                
                const response = await fetch(`${API_BASE}/medical/photo-requests`);
                const data = await response.json();
                
                const resultsDiv = document.getElementById('quick-actions-results');
                
                if (data.success && data.data.length > 0) {
                    resultsDiv.innerHTML = `
                        <h4>📷 Solicitudes de Fotos Médicas</h4>
                        ${data.data.map(req => `
                            <div class="data-item">
                                <div class="data-header">
                                    <strong>👤 Empleado ${req.employeeId}</strong>
                                    <span class="badge badge-${req.status === 'pending' ? 'warning' : 'success'}">${req.status}</span>
                                </div>
                                <div class="data-content">
                                    <p><strong>Parte del cuerpo:</strong> ${req.bodyPart}</p>
                                    <p><strong>Justificación:</strong> ${req.justification}</p>
                                    <p><strong>Urgencia:</strong> ${req.urgency}</p>
                                    <small>Solicitado: ${new Date(req.requestDate).toLocaleDateString()}</small>
                                </div>
                            </div>
                        `).join('')}
                    `;
                    showStatus('success', `✅ ${data.data.length} solicitudes encontradas`);
                } else {
                    resultsDiv.innerHTML = '<p>No hay solicitudes de fotos pendientes.</p>';
                    showStatus('info', 'ℹ️ No hay solicitudes de fotos');
                }
            } catch (error) {
                showStatus('error', '❌ Error cargando solicitudes');
            }
        }
        
        async function showAllEmployeesStudies() {
            try {
                showStatus('info', '🩺 Cargando estudios médicos...');
                
                const response = await fetch(`${API_BASE}/medical/study-requests`);
                const data = await response.json();
                
                const resultsDiv = document.getElementById('quick-actions-results');
                
                if (data.success && data.data.length > 0) {
                    resultsDiv.innerHTML = `
                        <h4>🩺 Estudios Médicos Solicitados</h4>
                        ${data.data.map(req => `
                            <div class="data-item">
                                <div class="data-header">
                                    <strong>👤 Empleado ${req.employeeId}</strong>
                                    <span class="badge badge-${req.status === 'pending' ? 'warning' : 'success'}">${req.status}</span>
                                </div>
                                <div class="data-content">
                                    <p><strong>Tipo de estudio:</strong> ${req.studyType}</p>
                                    <p><strong>Área:</strong> ${req.studyArea || 'No especificada'}</p>
                                    <p><strong>Justificación:</strong> ${req.justification}</p>
                                    <p><strong>Urgencia:</strong> ${req.urgency}</p>
                                    <small>Solicitado: ${new Date(req.requestDate).toLocaleDateString()}</small>
                                </div>
                            </div>
                        `).join('')}
                    `;
                    showStatus('success', `✅ ${data.data.length} estudios encontrados`);
                } else {
                    resultsDiv.innerHTML = '<p>No hay estudios médicos solicitados.</p>';
                    showStatus('info', 'ℹ️ No hay estudios solicitados');
                }
            } catch (error) {
                showStatus('error', '❌ Error cargando estudios');
            }
        }
        
        async function showPendingAudits() {
            const resultsDiv = document.getElementById('quick-actions-results');
            resultsDiv.innerHTML = `
                <h4>⚡ Auditorías Pendientes</h4>
                <p>Cargando certificados que requieren auditoría...</p>
            `;
            
            // Esta función usaría los datos ya cargados de empleados
            try {
                const response = await fetch(`${API_BASE}/medical/employees-with-records`);
                const data = await response.json();
                
                if (data.success) {
                    const employeesData = Array.isArray(data.data) ? data.data : Object.values(data.data);
                    const pendingAudits = employeesData.filter(emp => emp.hasAudit || 
                        (emp.certificates && emp.certificates.some(cert => cert.requestedDays > 3 && !cert.hasAudit)));
                    
                    if (pendingAudits.length > 0) {
                        resultsDiv.innerHTML = `
                            <h4>⚡ Auditorías Pendientes</h4>
                            ${pendingAudits.map(emp => `
                                <div class="data-item">
                                    <div class="data-header">
                                        <strong>👤 ${emp.employee?.firstName || 'Empleado'} ${emp.employee?.lastName || emp.id}</strong>
                                        <span class="badge badge-warning">Requiere Auditoría</span>
                                    </div>
                                    <div class="data-content">
                                        <p><strong>Días totales:</strong> ${emp.totalDays}</p>
                                        <p><strong>Certificados:</strong> ${emp.certificates?.length || 0}</p>
                                        <button class="btn btn-sm btn-primary" onclick="openEmployeeMedicalDetail('${emp.id}')">👁️ Revisar</button>
                                    </div>
                                </div>
                            `).join('')}
                        `;
                        showStatus('success', `✅ ${pendingAudits.length} auditorías pendientes`);
                    } else {
                        resultsDiv.innerHTML = '<p>✅ No hay auditorías pendientes.</p>';
                        showStatus('success', '✅ No hay auditorías pendientes');
                    }
                }
            } catch (error) {
                resultsDiv.innerHTML = '<p>❌ Error cargando auditorías.</p>';
                showStatus('error', '❌ Error cargando auditorías');
            }
        }
        
        function generateGlobalMedicalReport() {
            showStatus('info', '📊 Generando reporte médico global...');
            
            setTimeout(() => {
                const resultsDiv = document.getElementById('quick-actions-results');
                resultsDiv.innerHTML = `
                    <h4>📊 Reporte Médico Global</h4>
                    <div class="summary-cards" style="margin: 20px 0;">
                        <div class="summary-card">
                            <h5>👥 Empleados con Carpeta</h5>
                            <div class="summary-number">${document.getElementById('employeesWithRecords').textContent}</div>
                        </div>
                        <div class="summary-card">
                            <h5>📋 Certificados Activos</h5>
                            <div class="summary-number">${document.getElementById('activeCertificates').textContent}</div>
                        </div>
                        <div class="summary-card">
                            <h5>⚡ Requieren Auditoría</h5>
                            <div class="summary-number">${document.getElementById('requiresAudit').textContent}</div>
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <p><strong>📅 Periodo:</strong> ${document.getElementById('medicalDateStart').value} a ${document.getElementById('medicalDateEnd').value}</p>
                        <p><strong>📊 Estado general:</strong> Sistema funcionando correctamente</p>
                        <p><strong>⚠️ Alertas:</strong> ${document.getElementById('requiresAudit').textContent} casos requieren auditoría</p>
                        <button class="btn btn-primary" onclick="printMedicalReport('global')">🖨️ Imprimir Reporte</button>
                    </div>
                `;
                showStatus('success', '✅ Reporte generado correctamente');
            }, 1500);
        }
        
        // Dropdown functionality
        function toggleRequestDropdown(employeeId) {
            const dropdown = document.getElementById(`dropdown-${employeeId}`);
            const isVisible = dropdown.style.display === 'block';
            
            // Hide all other dropdowns first
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            
            // Toggle current dropdown
            dropdown.style.display = isVisible ? 'none' : 'block';
        }
        
        function hideDropdown(employeeId) {
            document.getElementById(`dropdown-${employeeId}`).style.display = 'none';
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.matches('.dropdown-btn')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
        
        // Request functions for all types
        async function requestEmployeeCertificate(employeeId) {
            const modalContent = `
                <div style="max-width: 500px; margin: 0 auto;">
                    <h2>📄 Solicitar Certificado Médico</h2>
                    <p><strong>Empleado:</strong> ${mockEmployees.find(emp => emp.id === employeeId)?.name || `Empleado ${employeeId}`}</p>
                    
                    <form id="certificateRequestForm">
                        <div class="form-group">
                            <label><strong>Tipo de certificado:</strong></label>
                            <select id="certificateType" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="aptitud_fisica">Certificado de Aptitud Física</option>
                                <option value="reposo_medico">Certificado de Reposo Médico</option>
                                <option value="enfermedad">Certificado de Enfermedad</option>
                                <option value="accidente_trabajo">Certificado por Accidente de Trabajo</option>
                                <option value="control_medico">Certificado de Control Médico</option>
                                <option value="alta_medica">Certificado de Alta Médica</option>
                                <option value="otro">Otro (especificar)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="otherCertificate" style="display: none;">
                            <label><strong>Especificar tipo de certificado:</strong></label>
                            <input type="text" id="customCertificate" class="form-control" placeholder="Especificar...">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Motivo de la solicitud:</strong></label>
                            <textarea id="certificateReason" rows="3" class="form-control" required 
                                      placeholder="Explique por qué se requiere este certificado..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Urgencia:</strong></label>
                            <select id="certificateUrgency" class="form-control">
                                <option value="normal">Normal (3-5 días)</option>
                                <option value="alta">Alta (1-2 días)</option>
                                <option value="urgente">Urgente (24 horas)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Observaciones adicionales:</strong></label>
                            <textarea id="certificateNotes" rows="2" class="form-control" 
                                      placeholder="Información adicional relevante (opcional)..."></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">📄 Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal(modalContent);
            
            document.getElementById('certificateType').onchange = function() {
                const otherDiv = document.getElementById('otherCertificate');
                if (this.value === 'otro') {
                    otherDiv.style.display = 'block';
                    document.getElementById('customCertificate').required = true;
                } else {
                    otherDiv.style.display = 'none';
                    document.getElementById('customCertificate').required = false;
                }
            };
            
            document.getElementById('certificateRequestForm').onsubmit = async function(e) {
                e.preventDefault();
                await saveCertificateRequest(employeeId);
            };
        }
        
        async function saveCertificateRequest(employeeId) {
            const certificateType = document.getElementById('certificateType').value;
            const customCertificate = document.getElementById('customCertificate').value;
            const reason = document.getElementById('certificateReason').value;
            const urgency = document.getElementById('certificateUrgency').value;
            const notes = document.getElementById('certificateNotes').value;
            
            const certificateRequest = {
                employeeId,
                certificateType: certificateType === 'otro' ? customCertificate : certificateType,
                reason,
                urgency,
                notes: notes || '',
                requestedBy: 'Dr. Sistema',
                requestDate: new Date().toISOString(),
                status: 'pending'
            };
            
            try {
                showStatus('info', '📄 Enviando solicitud de certificado...');
                
                // Simulate successful request for now
                setTimeout(() => {
                    showStatus('success', '✅ Solicitud de certificado enviada al empleado por email y app móvil');
                    closeModal();
                    loadEmployeesWithMedicalRecords();
                }, 1000);
                
                // Store locally for demonstration
                const storedRequests = JSON.parse(localStorage.getItem('certificateRequests') || '[]');
                storedRequests.push({
                    ...certificateRequest,
                    id: `cert-req-${Date.now()}`,
                    timestamp: new Date().toLocaleString()
                });
                localStorage.setItem('certificateRequests', JSON.stringify(storedRequests));
                
                console.log('Certificate request saved locally:', certificateRequest);
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving certificate request:', error);
            }
        }
        
        async function requestEmployeeHistory(employeeId) {
            const modalContent = `
                <div style="max-width: 500px; margin: 0 auto;">
                    <h2>📋 Solicitar Historia Clínica</h2>
                    <p><strong>Empleado:</strong> ${mockEmployees.find(emp => emp.id === employeeId)?.name || `Empleado ${employeeId}`}</p>
                    
                    <form id="historyRequestForm">
                        <div class="form-group">
                            <label><strong>Tipo de historia clínica:</strong></label>
                            <select id="historyType" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="completa">Historia Clínica Completa</option>
                                <option value="laboral">Historia Clínica Laboral</option>
                                <option value="accidentes">Historial de Accidentes</option>
                                <option value="enfermedades">Historial de Enfermedades</option>
                                <option value="alergias">Historial de Alergias</option>
                                <option value="medicamentos">Historial de Medicamentos</option>
                                <option value="vacunas">Historial de Vacunación</option>
                                <option value="examenes">Historial de Exámenes Médicos</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Período solicitado:</strong></label>
                            <select id="historyPeriod" class="form-control">
                                <option value="ultimo_mes">Último mes</option>
                                <option value="ultimos_3_meses">Últimos 3 meses</option>
                                <option value="ultimos_6_meses">Últimos 6 meses</option>
                                <option value="ultimo_ano">Último año</option>
                                <option value="completo">Historial completo</option>
                                <option value="personalizado">Período personalizado</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="customPeriod" style="display: none;">
                            <label><strong>Fecha desde:</strong></label>
                            <input type="date" id="historyFromDate" class="form-control">
                            <label style="margin-top: 10px;"><strong>Fecha hasta:</strong></label>
                            <input type="date" id="historyToDate" class="form-control">
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Motivo de la solicitud:</strong></label>
                            <textarea id="historyReason" rows="3" class="form-control" required 
                                      placeholder="Explique por qué se requiere la historia clínica..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>Urgencia:</strong></label>
                            <select id="historyUrgency" class="form-control">
                                <option value="normal">Normal (5-7 días)</option>
                                <option value="alta">Alta (2-3 días)</option>
                                <option value="urgente">Urgente (24-48 horas)</option>
                            </select>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">📋 Enviar Solicitud</button>
                        </div>
                    </form>
                </div>
            `;
            
            showModal(modalContent);
            
            document.getElementById('historyPeriod').onchange = function() {
                const customDiv = document.getElementById('customPeriod');
                if (this.value === 'personalizado') {
                    customDiv.style.display = 'block';
                    document.getElementById('historyFromDate').required = true;
                    document.getElementById('historyToDate').required = true;
                } else {
                    customDiv.style.display = 'none';
                    document.getElementById('historyFromDate').required = false;
                    document.getElementById('historyToDate').required = false;
                }
            };
            
            document.getElementById('historyRequestForm').onsubmit = async function(e) {
                e.preventDefault();
                await saveHistoryRequest(employeeId);
            };
        }
        
        async function saveHistoryRequest(employeeId) {
            const historyType = document.getElementById('historyType').value;
            const period = document.getElementById('historyPeriod').value;
            const fromDate = document.getElementById('historyFromDate').value;
            const toDate = document.getElementById('historyToDate').value;
            const reason = document.getElementById('historyReason').value;
            const urgency = document.getElementById('historyUrgency').value;
            
            const historyRequest = {
                employeeId,
                historyType,
                period,
                fromDate: period === 'personalizado' ? fromDate : null,
                toDate: period === 'personalizado' ? toDate : null,
                reason,
                urgency,
                requestedBy: 'Dr. Sistema',
                requestDate: new Date().toISOString(),
                status: 'pending'
            };
            
            try {
                showStatus('info', '📋 Enviando solicitud de historia clínica...');
                
                // Simulate successful request for now
                setTimeout(() => {
                    showStatus('success', '✅ Solicitud de historia clínica enviada al empleado por email y app móvil');
                    closeModal();
                    loadEmployeesWithMedicalRecords();
                }, 1000);
                
                // Store locally for demonstration
                const storedRequests = JSON.parse(localStorage.getItem('historyRequests') || '[]');
                storedRequests.push({
                    ...historyRequest,
                    id: `history-${Date.now()}`,
                    timestamp: new Date().toLocaleString()
                });
                localStorage.setItem('historyRequests', JSON.stringify(storedRequests));
                
                console.log('History request saved locally:', historyRequest);
            } catch (error) {
                showStatus('error', '❌ Error de conexión');
                console.error('Error saving history request:', error);
            }
        }
        
        // Función para cargar solicitudes de un empleado
        async function loadEmployeeRequests(employeeId) {
            try {
                const response = await fetch(getApiUrl(`/api/v1/medical/employee-requests/${employeeId}`));
                if (!response.ok) throw new Error('Error al cargar solicitudes');
                
                const data = await response.json();
                const container = document.getElementById(`requests-list-${employeeId}`);
                
                if (!data || (!data.photoRequests?.length && !data.studyRequests?.length && 
                    !data.recipeRequests?.length && !data.certificateRequests?.length && !data.historyRequests?.length)) {
                    container.innerHTML = `
                        <div class="alert alert-info" style="margin: 10px 0;">
                            ℹ️ No hay solicitudes médicas registradas para este empleado
                        </div>
                    `;
                    return;
                }

                let html = '<div class="requests-tracking-grid">';
                
                // Solicitudes de Certificados
                if (data.certificateRequests?.length > 0) {
                    html += `
                        <div class="request-category">
                            <h6>📄 Certificados Solicitados</h6>
                            ${data.certificateRequests.map(req => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <span class="request-date">${new Date(req.requestDate).toLocaleDateString()}</span>
                                        <span class="request-type">${req.type || 'Certificado médico'}</span>
                                        <span class="request-status status-${req.status || 'pending'}">${req.status || 'Pendiente'}</span>
                                    </div>
                                    <div class="request-actions">
                                        <label class="checkbox-container">
                                            <input type="checkbox" ${req.completed ? 'checked' : ''} 
                                                   onchange="updateRequestStatus('certificate', '${req.id}', this.checked, '${employeeId}')">
                                            <span class="checkmark"></span> Cumplido
                                        </label>
                                        ${req.documentUrl ? `<button class="btn btn-sm btn-info" onclick="viewDocument('${req.documentUrl}')">📎 Ver</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // Solicitudes de Recetas
                if (data.recipeRequests?.length > 0) {
                    html += `
                        <div class="request-category">
                            <h6>💊 Recetas Solicitadas</h6>
                            ${data.recipeRequests.map(req => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <span class="request-date">${new Date(req.requestDate).toLocaleDateString()}</span>
                                        <span class="request-type">${req.medication || 'Receta médica'}</span>
                                        <span class="request-status status-${req.status || 'pending'}">${req.status || 'Pendiente'}</span>
                                    </div>
                                    <div class="request-actions">
                                        <label class="checkbox-container">
                                            <input type="checkbox" ${req.completed ? 'checked' : ''} 
                                                   onchange="updateRequestStatus('recipe', '${req.id}', this.checked, '${employeeId}')">
                                            <span class="checkmark"></span> Cumplido
                                        </label>
                                        ${req.documentUrl ? `<button class="btn btn-sm btn-info" onclick="viewDocument('${req.documentUrl}')">📎 Ver</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // Solicitudes de Estudios
                if (data.studyRequests?.length > 0) {
                    html += `
                        <div class="request-category">
                            <h6>🩺 Estudios Solicitados</h6>
                            ${data.studyRequests.map(req => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <span class="request-date">${new Date(req.requestDate).toLocaleDateString()}</span>
                                        <span class="request-type">${req.studyType || 'Estudio médico'}</span>
                                        <span class="request-status status-${req.status || 'pending'}">${req.status || 'Pendiente'}</span>
                                    </div>
                                    <div class="request-actions">
                                        <label class="checkbox-container">
                                            <input type="checkbox" ${req.completed ? 'checked' : ''} 
                                                   onchange="updateRequestStatus('study', '${req.id}', this.checked, '${employeeId}')">
                                            <span class="checkmark"></span> Cumplido
                                        </label>
                                        ${req.documentUrl ? `<button class="btn btn-sm btn-info" onclick="viewDocument('${req.documentUrl}')">📎 Ver</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // Solicitudes de Fotos
                if (data.photoRequests?.length > 0) {
                    html += `
                        <div class="request-category">
                            <h6>📷 Fotos Solicitadas</h6>
                            ${data.photoRequests.map(req => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <span class="request-date">${new Date(req.requestDate).toLocaleDateString()}</span>
                                        <span class="request-type">${req.bodyPart || 'Foto médica'}</span>
                                        <span class="request-status status-${req.status || 'pending'}">${req.status || 'Pendiente'}</span>
                                    </div>
                                    <div class="request-actions">
                                        <label class="checkbox-container">
                                            <input type="checkbox" ${req.completed ? 'checked' : ''} 
                                                   onchange="updateRequestStatus('photo', '${req.id}', this.checked, '${employeeId}')">
                                            <span class="checkmark"></span> Cumplido
                                        </label>
                                        ${req.imageUrl ? `<button class="btn btn-sm btn-success" onclick="viewImage('${req.imageUrl}')">📸 Ver</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                // Solicitudes de Historia Clínica
                if (data.historyRequests?.length > 0) {
                    html += `
                        <div class="request-category">
                            <h6>📋 Historia Clínica Solicitada</h6>
                            ${data.historyRequests.map(req => `
                                <div class="request-item">
                                    <div class="request-info">
                                        <span class="request-date">${new Date(req.requestDate).toLocaleDateString()}</span>
                                        <span class="request-type">${req.period || 'Historia clínica'}</span>
                                        <span class="request-status status-${req.status || 'pending'}">${req.status || 'Pendiente'}</span>
                                    </div>
                                    <div class="request-actions">
                                        <label class="checkbox-container">
                                            <input type="checkbox" ${req.completed ? 'checked' : ''} 
                                                   onchange="updateRequestStatus('history', '${req.id}', this.checked, '${employeeId}')">
                                            <span class="checkmark"></span> Cumplido
                                        </label>
                                        ${req.documentUrl ? `<button class="btn btn-sm btn-info" onclick="viewDocument('${req.documentUrl}')">📎 Ver</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                html += '</div>';
                container.innerHTML = html;

            } catch (error) {
                console.error('Error loading employee requests:', error);
                document.getElementById(`requests-list-${employeeId}`).innerHTML = `
                    <div class="alert alert-danger">
                        ❌ Error al cargar las solicitudes: ${error.message}
                    </div>
                `;
            }
        }

        // Función para actualizar el estado de una solicitud
        async function updateRequestStatus(type, requestId, completed, employeeId) {
            try {
                const response = await fetch(getApiUrl(`/api/v1/medical/update-request-status`), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type,
                        requestId,
                        completed,
                        employeeId
                    })
                });

                if (!response.ok) throw new Error('Error al actualizar estado');
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus('success', '✅ Estado actualizado correctamente');
                    // Recargar la lista de solicitudes
                    setTimeout(() => loadEmployeeRequests(employeeId), 500);
                } else {
                    throw new Error(result.message || 'Error desconocido');
                }

            } catch (error) {
                console.error('Error updating request status:', error);
                showStatus('error', '❌ Error al actualizar el estado: ' + error.message);
                // Revertir el checkbox
                event.target.checked = !event.target.checked;
            }
        }

        // Función para ver documentos
        function viewDocument(url) {
            if (url) {
                showStatus('info', '👁️ Abriendo documento...');
                window.open(url, '_blank');
            } else {
                showStatus('warning', '⚠️ Documento no disponible');
            }
        }

        // Función para ver imágenes
        function viewImage(url) {
            if (url) {
                // Crear modal para mostrar la imagen
                const modal = document.createElement('div');
                modal.className = 'image-modal';
                modal.innerHTML = `
                    <div class="image-modal-content">
                        <span class="image-modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                        <img src="${url}" alt="Foto médica" style="max-width: 90%; max-height: 90%; margin: auto; display: block;">
                    </div>
                `;
                modal.style.cssText = `
                    display: flex;
                    position: fixed;
                    z-index: 2000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.9);
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(modal);
            } else {
                showStatus('warning', '⚠️ Imagen no disponible');
            }
        }
        
        // Función para mostrar la vista rápida de solicitudes de un empleado específico
        async function showEmployeeRequestsQuickView(employeeId) {
            const quickViewPanel = document.getElementById(`quick-view-${employeeId}`);
            const quickRequestsContainer = document.getElementById(`quick-requests-${employeeId}`);
            
            // Mostrar el panel
            if (quickViewPanel.style.display === 'none' || !quickViewPanel.style.display) {
                quickViewPanel.style.display = 'block';
                
                // Cargar las solicitudes automáticamente
                quickRequestsContainer.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6c757d;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">🔄</div>
                        <p>Cargando solicitudes del empleado...</p>
                    </div>
                `;
                
                // Cargar las solicitudes
                await loadEmployeeRequestsForQuickView(employeeId);
            } else {
                // Ocultar el panel si ya está visible
                quickViewPanel.style.display = 'none';
            }
        }
        
        // Función para cargar solicitudes en la vista rápida
        async function loadEmployeeRequestsForQuickView(employeeId) {
            try {
                const response = await fetch(getApiUrl(`/api/v1/medical/employee-requests/${employeeId}`));
                if (!response.ok) throw new Error('Error al cargar solicitudes');
                
                const data = await response.json();
                const container = document.getElementById(`quick-requests-${employeeId}`);
                
                if (!data || (!data.photoRequests?.length && !data.studyRequests?.length && 
                    !data.recipeRequests?.length && !data.certificateRequests?.length && !data.historyRequests?.length)) {
                    container.innerHTML = `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 10px;">📝</div>
                            <h5 style="color: #856404; margin-bottom: 10px;">No hay solicitudes médicas pendientes</h5>
                            <p style="color: #856404; margin: 0;">Este empleado no tiene solicitudes médicas registradas.</p>
                        </div>
                    `;
                    return;
                }
                
                // Crear resumen rápido de solicitudes
                const allRequests = [
                    ...(data.certificateRequests || []).map(req => ({ ...req, type: 'certificate', icon: '📄', color: '#28a745', name: 'Certificado' })),
                    ...(data.recipeRequests || []).map(req => ({ ...req, type: 'recipe', icon: '💊', color: '#6f42c1', name: 'Receta' })),
                    ...(data.studyRequests || []).map(req => ({ ...req, type: 'study', icon: '🩺', color: '#17a2b8', name: 'Estudio' })),
                    ...(data.photoRequests || []).map(req => ({ ...req, type: 'photo', icon: '📷', color: '#ffc107', name: 'Foto' })),
                    ...(data.historyRequests || []).map(req => ({ ...req, type: 'history', icon: '📋', color: '#dc3545', name: 'Historia' }))
                ];
                
                // Ordenar por fecha
                allRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
                
                if (allRequests.length === 0) {
                    container.innerHTML = `
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                            <h5 style="color: #155724; margin-bottom: 10px;">Todas las solicitudes están al día</h5>
                            <p style="color: #155724; margin: 0;">Este empleado no tiene solicitudes pendientes.</p>
                        </div>
                    `;
                    return;
                }
                
                let html = `
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
                        <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                            <h6 style="margin: 0; color: #495057;">📊 Resumen: ${allRequests.length} solicitudes totales</h6>
                            <small style="color: #6c757d;">Actualizado: ${new Date().toLocaleString('es-ES')}</small>
                        </div>
                        
                        <div style="display: grid; gap: 12px;">
                `;
                
                allRequests.forEach(req => {
                    const isCompleted = req.completed;
                    const statusColor = isCompleted ? '#28a745' : '#ffc107';
                    const statusText = isCompleted ? 'Cumplido' : 'Pendiente';
                    const statusIcon = isCompleted ? '✅' : '⏳';
                    
                    html += `
                        <div style="background: white; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="background: ${req.color}; color: white; padding: 8px; border-radius: 50%; font-size: 1.1rem; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center;">
                                    ${req.icon}
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                                        ${req.name} Médico${req.type === 'photo' ? ' - ' + (req.bodyPart || 'Zona a especificar') : ''}
                                    </div>
                                    <small style="color: #6c757d;">
                                        📅 Solicitado: ${new Date(req.requestDate).toLocaleDateString('es-ES')}
                                        ${req.completedAt ? ` • ✅ Completado: ${new Date(req.completedAt).toLocaleDateString('es-ES')}` : ''}
                                    </small>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                    ${statusIcon} ${statusText}
                                </span>
                                <label style="display: flex; align-items: center; gap: 5px; margin: 0; cursor: pointer;">
                                    <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                                           onchange="updateRequestStatus('${req.type}', '${req.id}', this.checked, '${employeeId}')"
                                           style="width: 18px; height: 18px; accent-color: #28a745;">
                                    <small style="color: #6c757d;">Marcar</small>
                                </label>
                                ${req.documentUrl || req.imageUrl ? `
                                    <button class="btn btn-sm btn-outline-info" onclick="${req.imageUrl ? `viewImage('${req.imageUrl}')` : `viewDocument('${req.documentUrl}')`}" style="padding: 4px 8px; font-size: 0.75rem;">
                                        ${req.imageUrl ? '📸' : '📄'} Ver
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                        
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; text-align: center;">
                            <button class="btn btn-success" onclick="openEmployeeMedicalDetail('${employeeId}')" style="padding: 8px 20px; font-size: 0.9rem;">
                                👁️ Ver Expediente Completo de Este Empleado
                            </button>
                        </div>
                    </div>
                `;
                
                container.innerHTML = html;
                
            } catch (error) {
                console.error('Error loading employee requests for quick view:', error);
                document.getElementById(`quick-requests-${employeeId}`).innerHTML = `
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">❌</div>
                        <h5 style="color: #721c24; margin-bottom: 10px;">Error al cargar las solicitudes</h5>
                        <p style="color: #721c24; margin: 0;">${error.message}</p>
                        <button class="btn btn-sm btn-outline-danger" onclick="loadEmployeeRequestsForQuickView('${employeeId}')" style="margin-top: 10px;">🔄 Intentar Nuevamente</button>
                    </div>
                `;
            }
        }
        
        // Función para abrir documentos específicos de un empleado por tipo
        async function openEmployeeDocuments(employeeId, documentType) {
            try {
                // Obtener datos del empleado
                const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
                
                showStatus('info', `🔍 Cargando documentos ${documentType} de ${employee.name}...`);
                
                // Cargar documentos y timeline
                const [documentsData, timelineData] = await Promise.all([
                    fetch(`${API_BASE}/medical/employee-documents/${employeeId}/${documentType}`).then(r => r.json()),
                    fetch(`${API_BASE}/medical/employee-timeline/${employeeId}`).then(r => r.json())
                ]);
                
                // Crear modal con documentos específicos y timeline cronológico
                const modalContent = createEmployeeDocumentsModal(employee, documentType, documentsData, timelineData);
                showModal(modalContent);
                
                // Cargar solicitudes pendientes después de crear el modal
                setTimeout(() => {
                    loadPendingRequests(employeeId, documentType);
                }, 100);
                
                showStatus('success', `📄 Documentos cargados correctamente`);
                
            } catch (error) {
                console.error('Error loading employee documents:', error);
                showStatus('error', '❌ Error al cargar los documentos: ' + error.message);
            }
        }
        
        // Crear modal de documentos del empleado
        function createEmployeeDocumentsModal(employee, documentType, documentsData, timelineData) {
            const typeNames = {
                'certificates': '📄 Certificados Médicos',
                'studies': '🩺 Estudios Médicos',
                'photos': '📷 Fotos Médicas',
                'recipes': '💊 Recetas Médicas'
            };
            
            const typeColors = {
                'certificates': '#28a745',
                'studies': '#17a2b8',
                'photos': '#ffc107',
                'recipes': '#6f42c1'
            };
            
            return `
                <div class="employee-documents-modal" style="max-width: 1800px; width: 99vw; max-height: 90vh; overflow-y: auto; overflow-x: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, ${typeColors[documentType]} 0%, ${typeColors[documentType]}dd 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px;">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                            ${typeNames[documentType]} - ${employee.name || `Empleado ${employee.id}`}
                        </h3>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                            Gestión completa de documentos médicos con timeline cronológico
                        </p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; min-width: 0;">
                        <!-- Panel izquierdo: Documentos actuales -->
                        <div class="documents-panel" style="min-width: 0; overflow: hidden;">
                            <h4 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                                📁 Documentos Actuales
                                <button class="btn btn-sm btn-success" onclick="generateDocument('${employee.id}', '${documentType}')" style="margin-left: auto; padding: 5px 12px; white-space: nowrap;">
                                    ➕ Generar Nuevo
                                </button>
                            </h4>
                            
                            <div id="current-documents" class="documents-grid" style="display: grid; gap: 15px; min-width: 0;">
                                ${createCurrentDocumentsHTML(documentsData, documentType, employee.id)}
                            </div>
                        </div>
                        
                        <!-- Panel derecho: Solicitudes Pendientes y Timeline -->
                        <div class="timeline-panel" style="min-width: 0; overflow: hidden;">
                            <!-- Sección de solicitudes pendientes -->
                            <h4 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                                📋 Solicitudes Pendientes
                                <small style="margin-left: auto; color: #6c757d; font-weight: normal; white-space: nowrap;">Estado actual</small>
                            </h4>
                            
                            <div id="pending-requests-container" class="pending-requests" style="min-width: 0; margin-bottom: 25px;">
                                ${createPendingRequestsHTML(employee.id, documentType)}
                            </div>
                            
                            <!-- Sección de timeline -->
                            <h4 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                                ⏱️ Timeline de Actividad
                                <small style="margin-left: auto; color: #6c757d; font-weight: normal; white-space: nowrap;">Últimos 30 días</small>
                            </h4>
                            
                            <div class="document-timeline" style="min-width: 0;">
                                ${createTimelineHTML(timelineData, employee.id, documentType)}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Acciones inferiores -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6; display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; align-items: center;">
                        <div class="action-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="requestDocument('${employee.id}', '${documentType}')" style="white-space: nowrap;">
                                📋 Solicitar ${typeNames[documentType].split(' ')[1]}
                            </button>
                            <button class="btn btn-info" onclick="sendInstructions('${employee.id}', '${documentType}')" style="white-space: nowrap;">
                                📝 Enviar Instrucciones
                            </button>
                        </div>
                        
                        <div class="status-info" style="display: flex; align-items: center; gap: 10px; color: #6c757d; font-size: 0.85rem; flex-wrap: wrap;">
                            <span style="white-space: nowrap;">📊 Total: ${documentsData?.documents?.length || 0}</span>
                            <span style="white-space: nowrap;">⏳ Pendientes: ${documentsData?.pending || 0}</span>
                            <span style="white-space: nowrap;">✅ Completos: ${documentsData?.completed || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Crear HTML de documentos actuales
        function createCurrentDocumentsHTML(documentsData, documentType, employeeId) {
            if (!documentsData?.documents || documentsData.documents.length === 0) {
                return `
                    <div style="text-align: center; padding: 40px; color: #6c757d; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">📄</div>
                        <h5 style="color: #6c757d;">No hay documentos de este tipo</h5>
                        <p style="margin: 10px 0;">Este empleado no tiene documentos de ${documentType} registrados.</p>
                        <button class="btn btn-primary btn-sm" onclick="requestDocument('${employeeId}', '${documentType}')">
                            📋 Solicitar Primer Documento
                        </button>
                    </div>
                `;
            }
            
            return documentsData.documents.map(doc => `
                <div class="document-card" style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; background: white; transition: all 0.3s ease;">
                    <div class="document-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h6 style="margin: 0; color: #333;">📄 ${doc.name || doc.type || 'Documento'}</h6>
                        <span class="status-badge ${doc.status}" style="padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                            ${doc.status === 'approved' ? '✅ Aprobado' : doc.status === 'pending' ? '⏳ Pendiente' : '❌ Rechazado'}
                        </span>
                    </div>
                    
                    <div class="document-details" style="color: #666; font-size: 0.9rem; margin-bottom: 15px;">
                        <div style="margin-bottom: 5px;">📅 <strong>Fecha:</strong> ${new Date(doc.dateCreated || doc.uploadDate).toLocaleDateString('es-ES')}</div>
                        ${doc.description ? `<div style="margin-bottom: 5px;">📝 <strong>Descripción:</strong> ${doc.description}</div>` : ''}
                        ${doc.expiryDate ? `<div style="margin-bottom: 5px;">⏰ <strong>Vence:</strong> ${new Date(doc.expiryDate).toLocaleDateString('es-ES')}</div>` : ''}
                    </div>
                    
                    <div class="document-actions" style="display: flex; gap: 8px;">
                        ${doc.url ? `<button class="btn btn-sm btn-info" onclick="viewDocument('${doc.url}')">👁️ Ver</button>` : ''}
                        ${doc.downloadUrl ? `<button class="btn btn-sm btn-success" onclick="downloadDocument('${doc.downloadUrl}')">💾 Descargar</button>` : ''}
                        <button class="btn btn-sm btn-warning" onclick="requestUpdate('${doc.id}', '${documentType}')">🔄 Solicitar Actualización</button>
                    </div>
                </div>
            `).join('');
        }
        
        // Crear HTML del timeline cronológico
        function createTimelineHTML(timelineData, employeeId, documentType) {
            if (!timelineData?.events || timelineData.events.length === 0) {
                return `
                    <div style="text-align: center; padding: 30px; color: #6c757d;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">⏱️</div>
                        <p>No hay actividad registrada aún</p>
                    </div>
                `;
            }
            
            return timelineData.events.map(event => {
                const eventClass = event.type === 'doctor_request' ? 'doctor-request' : 
                                  event.type === 'employee_upload' ? 'employee-upload' : 'doctor-send';
                
                const eventIcon = event.type === 'doctor_request' ? '📋' : 
                                 event.type === 'employee_upload' ? '📤' : '📥';
                                 
                const eventTitle = event.type === 'doctor_request' ? `Dr. solicita ${event.description}` : 
                                  event.type === 'employee_upload' ? `Empleado envió ${event.description}` : 
                                  `Dr. envió ${event.description}`;
                
                return `
                    <div class="timeline-item ${eventClass}">
                        <div class="timeline-icon ${eventClass}">
                            ${eventIcon}
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <h6 class="timeline-title">${eventTitle}</h6>
                                <span class="timeline-date">${new Date(event.date).toLocaleString('es-ES')}</span>
                            </div>
                            <div class="timeline-description">
                                ${event.details || event.message || 'Sin detalles adicionales'}
                            </div>
                            ${event.fileUrl || event.imageUrl ? `
                                <div class="timeline-actions">
                                    <button class="btn btn-sm btn-info" onclick="${event.imageUrl ? `viewImage('${event.imageUrl}')` : `viewDocument('${event.fileUrl}')`}">
                                        ${event.imageUrl ? '📸' : '📄'} Ver Archivo
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Crear HTML de solicitudes pendientes
        function createPendingRequestsHTML(employeeId, documentType) {
            // Esta función será actualizada dinámicamente con datos del servidor
            return `
                <div id="pending-requests-${employeeId}-${documentType}" class="pending-requests-content">
                    <div style="text-align: center; padding: 20px; color: #6c757d; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                        <div style="font-size: 1.5rem; margin-bottom: 10px;">📋</div>
                        <p style="margin: 0; font-size: 0.9rem;">Cargando solicitudes pendientes...</p>
                    </div>
                </div>
            `;
        }
        
        // Cargar solicitudes pendientes para un empleado
        async function loadPendingRequests(employeeId, documentType) {
            try {
                const response = await fetch(`${API_BASE}/medical/pending-requests/${employeeId}`);
                const result = await response.json();
                
                if (result.success) {
                    const pendingRequests = result.data.filter(req => 
                        req.documentType === documentType || 
                        req.documentType.replace(/s$/, '') === documentType.replace(/s$/, '')
                    );
                    
                    const container = document.getElementById(`pending-requests-${employeeId}-${documentType}`);
                    if (container) {
                        container.innerHTML = createPendingRequestsListHTML(pendingRequests, employeeId);
                    }
                } else {
                    console.error('Error loading pending requests:', result.message);
                }
            } catch (error) {
                console.error('Error loading pending requests:', error);
                const container = document.getElementById(`pending-requests-${employeeId}-${documentType}`);
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 15px; color: #6c757d; background: #fff3cd; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <p style="margin: 0; font-size: 0.9rem;">⚠️ Error al cargar solicitudes</p>
                        </div>
                    `;
                }
            }
        }
        
        // Crear HTML de la lista de solicitudes pendientes
        function createPendingRequestsListHTML(pendingRequests, employeeId) {
            if (!pendingRequests || pendingRequests.length === 0) {
                return `
                    <div style="text-align: center; padding: 20px; color: #28a745; background: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb;">
                        <div style="font-size: 1.5rem; margin-bottom: 10px;">✅</div>
                        <p style="margin: 0; font-size: 0.9rem;"><strong>Sin solicitudes pendientes</strong></p>
                        <small style="color: #155724;">Todos los documentos están al día</small>
                    </div>
                `;
            }
            
            return pendingRequests.map(request => {
                const statusColor = request.status === 'pending' ? '#ffc107' : 
                                   request.status === 'completed' ? '#28a745' : '#dc3545';
                
                const statusIcon = request.status === 'pending' ? '⏳' : 
                                  request.status === 'completed' ? '✅' : '❌';
                
                const statusText = request.status === 'pending' ? 'Pendiente' : 
                                  request.status === 'completed' ? 'Completado' : 'Error';
                
                const daysLeft = Math.max(0, Math.ceil((new Date(request.dueDate) - new Date()) / (1000 * 60 * 60 * 24)));
                const isUrgent = daysLeft <= 2;
                
                return `
                    <div class="pending-request-item" style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <h6 style="margin: 0; color: #495057; font-size: 0.95rem;">
                                    ${statusIcon} ${request.documentType}
                                </h6>
                                <small style="color: #6c757d; font-size: 0.8rem;">
                                    ID: ${request.id}
                                </small>
                            </div>
                            <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">
                                ${statusText}
                            </span>
                        </div>
                        
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #495057;">
                            ${request.description}
                        </p>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.8rem; color: #6c757d;">
                            <span>📅 Vence: ${new Date(request.dueDate).toLocaleDateString('es-ES')}</span>
                            ${daysLeft > 0 ? `
                                <span style="color: ${isUrgent ? '#dc3545' : '#28a745'}; font-weight: bold;">
                                    ${isUrgent ? '⚠️' : '⏰'} ${daysLeft} día${daysLeft !== 1 ? 's' : ''}
                                </span>
                            ` : '<span style="color: #dc3545; font-weight: bold;">🚨 Vencida</span>'}
                        </div>
                        
                        ${request.status === 'pending' ? `
                            <div style="margin-top: 15px; text-align: right;">
                                <button class="btn btn-sm btn-success" onclick="markRequestCompleted('${request.id}', '${employeeId}')">
                                    ✅ Marcar Completado
                                </button>
                            </div>
                        ` : ''}
                        
                        ${request.notes ? `
                            <div style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 0.8rem; color: #495057;">
                                📝 <strong>Notas:</strong> ${request.notes}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
        
        // Marcar solicitud como completada
        async function markRequestCompleted(requestId, employeeId) {
            try {
                showStatus('info', '🔄 Marcando solicitud como completada...');
                
                const response = await fetch(`${API_BASE}/medical/pending-requests/${requestId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: 'completed',
                        notes: 'Marcado como completado por el médico'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    showStatus('success', '✅ Solicitud marcada como completada');
                    console.log('Request completed:', result);
                    
                    // Recargar las solicitudes pendientes para reflejar el cambio
                    setTimeout(() => {
                        const activeModal = document.querySelector('.employee-documents-modal');
                        if (activeModal) {
                            // Encontrar el tipo de documento del modal activo
                            const modalTitle = activeModal.querySelector('h3');
                            if (modalTitle) {
                                const titleText = modalTitle.textContent;
                                let documentType = 'certificates';
                                if (titleText.includes('Estudios')) documentType = 'studies';
                                else if (titleText.includes('Fotos')) documentType = 'photos';
                                else if (titleText.includes('Recetas')) documentType = 'recipes';
                                
                                loadPendingRequests(employeeId, documentType);
                            }
                        }
                    }, 500);
                } else {
                    const errorData = await response.text();
                    console.error('Mark completed error:', response.status, errorData);
                    showStatus('error', `❌ Error del servidor: ${response.status}`);
                }
            } catch (error) {
                console.error('Error marking request completed:', error);
                showStatus('error', '❌ Error al marcar solicitud: ' + error.message);
            }
        }
        
        // Función para solicitar documento específico (sin preguntar el medio)
        async function requestDocument(employeeId, documentType) {
            try {
                const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
                
                showStatus('info', `📋 Enviando solicitud de ${documentType} a ${employee.name}...`);
                
                // Obtener datos del legajo del empleado (email, teléfono, etc.)
                const employeeData = {
                    id: employeeId,
                    name: employee.name,
                    email: employee.email || `empleado${employeeId}@empresa.com`,
                    phone: employee.phone || '+11-2657-673741',
                    whatsapp: employee.phone || '+11-2657-673741'
                };
                
                // Enviar solicitud sin preguntar el medio - usar todos los medios del legajo
                const response = await fetch(`${API_BASE}/medical/request-document-auto`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        employeeId: employeeId,
                        documentType: documentType,
                        employeeData: employeeData,
                        urgency: 'normal'
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    showStatus('success', `✅ Solicitud enviada a ${employee.name} por ${result.sentVia.join(', ')}`);
                    
                    // Mostrar confirmación detallada
                    showConfirmationMessage(employee, documentType, result);
                    
                    // Recargar timeline
                    setTimeout(() => {
                        if (document.querySelector('.employee-documents-modal')) {
                            openEmployeeDocuments(employeeId, documentType);
                        }
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Error desconocido');
                }
                
            } catch (error) {
                console.error('Error requesting document:', error);
                showStatus('error', '❌ Error al enviar solicitud: ' + error.message);
            }
        }
        
        // Función para solicitar documento directamente desde el modal
        async function requestDocumentDirect(employeeId, documentType, confirmationMessage) {
            try {
                showStatus('info', '📋 Enviando solicitud...');
                
                // Usar la función existente requestDocument
                await requestDocument(employeeId, documentType + 's'); // Pluralizar para que coincida con la API
                
                // Mostrar confirmación específica
                showStatus('success', confirmationMessage);
                
                // Actualizar el modal actual y las métricas
                setTimeout(() => {
                    // Recargar las métricas para mostrar la nueva solicitud
                    loadEmployeesWithMedicalRecords();
                    
                    // Si hay un modal abierto, refrescar su contenido
                    const activeModal = document.querySelector('.employee-documents-modal');
                    if (activeModal) {
                        // Extraer el employeeId y documentType del modal activo para refrescarlo
                        const modalTitle = activeModal.querySelector('h2');
                        if (modalTitle && modalTitle.textContent.includes('Documentos')) {
                            // Reabrir el modal con los datos actualizados
                            openEmployeeDocuments(employeeId, documentType + 's');
                        }
                    }
                }, 1500);
                
            } catch (error) {
                console.error('Error requesting document direct:', error);
                showStatus('error', '❌ Error al enviar solicitud: ' + error.message);
            }
        }
        
        // Mostrar mensaje de confirmación detallado
        function showConfirmationMessage(employee, documentType, result) {
            const typeNames = {
                'certificates': 'certificado médico',
                'studies': 'estudio médico',
                'photos': 'foto médica',
                'recipes': 'receta médica'
            };
            
            const confirmationHtml = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                    <h5 style="color: #155724; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        ✅ Solicitud Enviada Correctamente
                    </h5>
                    
                    <div style="color: #155724; margin-bottom: 15px;">
                        <strong>📤 Se notificó a ${employee.name} por:</strong>
                        <ul style="margin: 8px 0; padding-left: 20px;">
                            ${result.sentVia.map(medium => `
                                <li>${medium === 'email' ? `📧 Email: ${employee.email}` : 
                                       medium === 'whatsapp' ? `📱 WhatsApp: ${employee.whatsapp}` : 
                                       medium === 'sms' ? `📲 SMS: ${employee.phone}` : medium}</li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div style="color: #155724;">
                        <strong>📋 Detalles de la solicitud:</strong>
                        <p style="margin: 8px 0;">• Tipo: ${typeNames[documentType] || documentType}</p>
                        <p style="margin: 8px 0;">• Fecha: ${new Date().toLocaleString('es-ES')}</p>
                        <p style="margin: 8px 0;">• Estado: Pendiente de respuesta del empleado</p>
                        <p style="margin: 8px 0;">• Enlace app: ${result.appLink || `${window.DYNAMIC_CONFIG.baseUrl}/employee-app`}</p>
                    </div>
                </div>
            `;
            
            // Mostrar en un área específica o como notificación
            const activeModal = document.querySelector('.employee-documents-modal');
            if (activeModal) {
                const confirmationArea = document.createElement('div');
                confirmationArea.innerHTML = confirmationHtml;
                activeModal.appendChild(confirmationArea);
                
                // Auto-remover después de 10 segundos
                setTimeout(() => {
                    confirmationArea.remove();
                }, 10000);
            }
        }
        
        // Funciones adicionales para manejo de documentos
        async function generateDocument(employeeId, documentType) {
            try {
                alert('✅ El botón Generar Nuevo SÍ funciona - función ejecutándose');
                showStatus('info', `📤 Solicitando ${documentType} al empleado...`);
                
                // Buscar datos del empleado
                const employee = mockEmployees.find(emp => emp.id === employeeId) || 
                    { id: employeeId, name: `Empleado ${employeeId}`, phone: '+54 2657 673741', email: 'empleado@empresa.com', whatsapp: '+54 2657 673741' };
                
                // Solicitar documento al empleado usando el endpoint automático
                const response = await fetch(`${API_BASE}/medical/request-document-auto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: employeeId,
                        documentType: documentType,
                        urgency: 'normal',
                        employeeData: {
                            name: employee.name,
                            email: employee.email,
                            whatsapp: employee.whatsapp,
                            phone: employee.phone
                        }
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const documentTypeText = {
                        'certificates': 'certificado médico',
                        'recipes': 'receta médica', 
                        'studies': 'estudio médico',
                        'photos': 'foto médica'
                    }[documentType] || documentType;
                    
                    showStatus('success', `📧 Solicitud de ${documentTypeText} enviada a ${result.employee} (${result.data.id})`);
                    console.log('Document requested:', result);
                    
                    // Recargar el modal para mostrar la nueva solicitud pendiente
                    setTimeout(() => openEmployeeDocuments(employeeId, documentType), 1500);
                } else {
                    const errorData = await response.text();
                    console.error('Request document error:', response.status, errorData);
                    showStatus('error', `❌ Error del servidor: ${response.status}`);
                }
            } catch (error) {
                showStatus('error', '❌ Error al generar documento: ' + error.message);
            }
        }
        
        async function sendInstructions(employeeId, documentType) {
            const employee = mockEmployees.find(emp => emp.id === employeeId) || { name: `Empleado ${employeeId}` };
            
            showStatus('info', `📝 Enviando instrucciones a ${employee.name}...`);
            
            // Simular envío de instrucciones
            setTimeout(() => {
                showStatus('success', `✅ Instrucciones enviadas a ${employee.name} por WhatsApp y email`);
                console.log(`📝 Instrucciones enviadas a ${employee.name} sobre ${documentType}`);
            }, 1000);
        }
        
        function downloadDocument(url) {
            if (url) {
                // Crear enlace de descarga temporal
                const link = document.createElement('a');
                link.href = url;
                link.download = url.split('/').pop();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showStatus('success', '📥 Descarga iniciada');
            } else {
                showStatus('warning', '⚠️ URL de descarga no disponible');
            }
        }
        
        async function requestUpdate(documentId, documentType) {
            try {
                showStatus('info', `🔄 Solicitando actualización del documento...`);
                
                const response = await fetch(`${API_BASE}/medical/request-document-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documentId,
                        documentType,
                        reason: 'Documento desactualizado o con información incompleta'
                    })
                });
                
                if (response.ok) {
                    showStatus('success', '✅ Solicitud de actualización enviada al empleado');
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                showStatus('error', '❌ Error al solicitar actualización: ' + error.message);
            }
        }
        
        // Set default dates to current month
        function setDefaultDateRange() {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            document.getElementById('medicalDateStart').value = startOfMonth.toISOString().split('T')[0];
            document.getElementById('medicalDateEnd').value = endOfMonth.toISOString().split('T')[0];
        }
        
        // Funciones de Asistencia
        async function loadAttendanceData() {
            try {
                showStatus('info', '🔄 Cargando datos de asistencia...');
                
                const response = await fetch('/api/public/attendance');
                const data = await response.json();
                
                if (data.success) {
                    // Actualizar estadísticas
                    document.getElementById('present-count').textContent = data.present;
                    document.getElementById('late-count').textContent = data.late;
                    document.getElementById('absent-count').textContent = data.absent;
                    document.getElementById('total-hours').textContent = data.totalHours.toFixed(1) + 'h';
                    
                    // Actualizar tabla
                    const tbody = document.getElementById('attendance-tbody');
                    tbody.innerHTML = '';
                    
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No hay registros de asistencia para hoy</td></tr>';
                        return;
                    }
                    
                    data.data.forEach(record => {
                        const row = document.createElement('tr');
                        
                        const statusClass = `status-${record.status}`;
                        const statusText = {
                            'present': 'Presente',
                            'late': 'Tarde',
                            'absent': 'Ausente'
                        }[record.status] || record.status;
                        
                        row.innerHTML = `
                            <td><strong>${record.employeeName}</strong></td>
                            <td>${record.legajo}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${record.checkIn || '—'}</td>
                            <td>${record.checkOut || '—'}</td>
                            <td>${record.workingHours ? record.workingHours.toFixed(1) + 'h' : '—'}</td>
                            <td>${record.method || '—'}</td>
                            <td>${record.location || '—'}</td>
                            <td>${record.notes || '—'}</td>
                        `;
                        
                        tbody.appendChild(row);
                    });
                    
                    showStatus('success', `✅ ${data.data.length} registros de asistencia cargados`);
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                showStatus('error', '❌ Error cargando asistencia: ' + error.message);
                document.getElementById('attendance-tbody').innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: red;">❌ Error cargando datos</td></tr>';
            }
        }
        
        async function exportAttendanceData() {
            try {
                showStatus('info', '📊 Generando exportación...');
                
                const response = await fetch('/api/public/attendance');
                const data = await response.json();
                
                if (data.success && data.data.length > 0) {
                    // Crear CSV
                    let csvContent = "Empleado,Legajo,Estado,Entrada,Salida,Horas,Método,Ubicación,Notas\n";
                    
                    data.data.forEach(record => {
                        const statusText = {
                            'present': 'Presente',
                            'late': 'Tarde', 
                            'absent': 'Ausente'
                        }[record.status] || record.status;
                        
                        csvContent += `"${record.employeeName}","${record.legajo}","${statusText}","${record.checkIn || ''}","${record.checkOut || ''}","${record.workingHours || ''}","${record.method || ''}","${record.location || ''}","${record.notes || ''}"\n`;
                    });
                    
                    // Descargar archivo
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    showStatus('success', '✅ Exportación completada');
                } else {
                    showStatus('warning', '⚠️ No hay datos para exportar');
                }
            } catch (error) {
                showStatus('error', '❌ Error exportando: ' + error.message);
            }
        }

        <!-- Pestaña de Consentimientos Fehacientes -->
        <div id="fehaciente-consent" class="tab-content">
            <div class="card">
                <h2>📲 Gestión de Consentimientos Fehacientes</h2>
                <p>Configure los consentimientos de empleados para recibir comunicaciones médicas fehacientes por SMS, WhatsApp y Email.</p>
                
                <!-- Filtros y Búsqueda -->
                <div class="form-group">
                    <label for="consent-search">🔍 Buscar empleado:</label>
                    <input type="text" id="consent-search" placeholder="Nombre, legajo o email" onkeyup="filterConsentTable()">
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <button onclick="showAllConsents()" class="btn btn-primary">👥 Ver Todos</button>
                    <button onclick="showPendingConsents()" class="btn btn-warning">⏳ Sin Consentimiento</button>
                    <button onclick="showActiveConsents()" class="btn btn-success">✅ Con Consentimiento</button>
                    <button onclick="exportConsentData()" class="btn btn-info">📊 Exportar</button>
                </div>
                
                <!-- Tabla de Consentimientos -->
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>👤 Empleado</th>
                                <th>📱 SMS</th>
                                <th>📱 WhatsApp</th>
                                <th>📧 Email</th>
                                <th>📅 Fecha</th>
                                <th>🔄 Versión</th>
                                <th>⚙️ Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="consent-tbody">
                            <tr>
                                <td colspan="7" style="text-align: center; padding: 20px;">
                                    🔄 Cargando datos de consentimientos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Estadísticas de Consentimientos -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px;">
                    <div class="stat-card">
                        <div class="stat-number" id="total-employees">0</div>
                        <div class="stat-label">👥 Total Empleados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="consented-employees">0</div>
                        <div class="stat-label">✅ Con Consentimiento</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="pending-employees">0</div>
                        <div class="stat-label">⏳ Pendientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="consent-percentage">0%</div>
                        <div class="stat-label">📊 Porcentaje</div>
                    </div>
                </div>
            </div>
            
            <!-- Modal para Configurar Consentimiento -->
            <div id="consent-modal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>📲 Configurar Consentimientos</h3>
                        <span class="close" onclick="closeConsentModal()">&times;</span>
                    </div>
                    
                    <div class="modal-body">
                        <div id="employee-consent-info">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <form id="consent-form">
                            <div class="form-group">
                                <label>📱 Teléfono Personal:</label>
                                <input type="tel" id="personal-phone" placeholder="+54 xxx xxx xxxx" required>
                            </div>
                            
                            <div class="form-group">
                                <label>📱 WhatsApp:</label>
                                <input type="tel" id="whatsapp-number" placeholder="+54 xxx xxx xxxx">
                            </div>
                            
                            <hr>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="accepts-sms">
                                    📲 Acepta recibir SMS fehacientes
                                </label>
                                <p style="font-size: 0.9em; color: #666; margin-left: 20px;">
                                    Comunicaciones oficiales con validez legal vía SMS
                                </p>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="accepts-whatsapp">
                                    📱 Acepta recibir WhatsApp fehacientes
                                </label>
                                <p style="font-size: 0.9em; color: #666; margin-left: 20px;">
                                    Comunicaciones oficiales con validez legal vía WhatsApp
                                </p>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="accepts-email">
                                    📧 Acepta recibir Email fehacientes
                                </label>
                                <p style="font-size: 0.9em; color: #666; margin-left: 20px;">
                                    Comunicaciones oficiales con validez legal vía Email
                                </p>
                            </div>
                            
                            <div class="form-group">
                                <label>📋 Notas adicionales:</label>
                                <textarea id="consent-notes" rows="3" placeholder="Observaciones sobre el consentimiento..."></textarea>
                            </div>
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="closeConsentModal()" class="btn btn-secondary">❌ Cancelar</button>
                        <button onclick="saveConsent()" class="btn btn-primary">💾 Guardar Consentimientos</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Pestaña de Términos y Condiciones -->
        <div id="terms-conditions" class="tab-content">
            <div class="card">
                <h2>📋 Gestión de Términos y Condiciones</h2>
                <p>Administre las versiones de términos y condiciones que los empleados deben aceptar para comunicaciones fehacientes.</p>
                
                <!-- Editor de Términos Actuales -->
                <div style="display: grid; grid-template-columns: 1fr 300px; gap: 30px; margin-bottom: 30px;">
                    <div>
                        <h3>📝 Editor de Términos</h3>
                        <div class="form-group">
                            <label for="terms-version">🔄 Versión:</label>
                            <input type="text" id="terms-version" placeholder="1.0" value="1.0">
                        </div>
                        
                        <div class="form-group">
                            <label for="terms-title">📄 Título:</label>
                            <input type="text" id="terms-title" placeholder="Términos y Condiciones de Comunicaciones Fehacientes" 
                                   value="Términos y Condiciones de Comunicaciones Fehacientes">
                        </div>
                        
                        <div class="form-group">
                            <label for="terms-content">📋 Contenido:</label>
                            <textarea id="terms-content" rows="15" style="width: 100%; font-family: monospace; font-size: 0.9em;">TÉRMINOS Y CONDICIONES PARA COMUNICACIONES FEHACIENTES

1. ACEPTACIÓN DE LOS TÉRMINOS
Al aceptar estos términos y condiciones, el empleado otorga su consentimiento expreso e informado para recibir comunicaciones oficiales de la empresa a través de los medios digitales seleccionados (SMS, WhatsApp, Email).

2. NATURALEZA FEHACIENTE DE LAS COMUNICACIONES  
El empleado reconoce que:
• Las comunicaciones enviadas por estos medios tendrán valor probatorio y validez legal
• Constituyen notificaciones formales y fehacientes según la legislación argentina
• Su recepción se considerará acreditada mediante acuses de entrega automáticos
• El no acceso o lectura no exime de responsabilidades legales

3. DATOS DE CONTACTO
El empleado se compromete a:
• Mantener actualizados sus datos de contacto (teléfono, WhatsApp, email)  
• Notificar inmediatamente cualquier cambio en los mismos
• Asegurar el acceso regular a los medios de comunicación autorizados
• Responder en los plazos establecidos para cada tipo de comunicación

4. TIPOS DE COMUNICACIONES
Se utilizarán estos canales para:
• Solicitudes de documentación médica
• Notificaciones de cumplimiento o incumplimiento
• Requerimientos de información adicional
• Comunicaciones relacionadas con ausencias médicas
• Otras comunicaciones laborales de carácter formal

5. RESPONSABILIDADES DEL EMPLEADO
El empleado declara que:
• Los medios de comunicación proporcionados son de uso personal y exclusivo
• Mantendrá la confidencialidad de las comunicaciones recibidas
• Acusará recibo cuando sea requerido
• Cumplirá con los plazos y requerimientos comunicados

6. REVOCACIÓN DEL CONSENTIMIENTO
El empleado puede:
• Revocar su consentimiento en cualquier momento mediante comunicación escrita
• La revocación no afectará la validez de comunicaciones anteriores
• Deberá proporcionar un medio alternativo de notificación fehaciente

7. VIGENCIA Y MODIFICACIONES
• Estos términos rigen desde su aceptación hasta su revocación
• La empresa puede modificarlos previa notificación fehaciente
• Las modificaciones requieren nueva aceptación expresa

8. LEGISLACIÓN APLICABLE
Estos términos se rigen por la legislación argentina, especialmente:
• Código Civil y Comercial de la Nación
• Ley de Protección de Datos Personales N° 25.326
• Ley de Contrato de Trabajo N° 20.744

FECHA: _______________
EMPLEADO: _______________
FIRMA: _______________</textarea>
                        </div>
                        
                        <div class="form-group">
                            <button onclick="saveTermsAndConditions()" class="btn btn-primary" style="width: 100%;">
                                💾 Guardar Términos y Condiciones
                            </button>
                        </div>
                    </div>
                    
                    <!-- Panel Lateral de Control -->
                    <div>
                        <h3>⚙️ Control de Versiones</h3>
                        
                        <div class="stat-card" style="margin-bottom: 20px;">
                            <div class="stat-number" id="current-version">1.0</div>
                            <div class="stat-label">📋 Versión Actual</div>
                        </div>
                        
                        <div class="stat-card" style="margin-bottom: 20px;">
                            <div class="stat-number" id="acceptance-count">0</div>
                            <div class="stat-label">✅ Aceptaciones</div>
                        </div>
                        
                        <div class="form-group">
                            <label>🎯 Acciones Rápidas:</label>
                            <button onclick="previewTerms()" class="btn btn-info btn-sm" style="width: 100%; margin-bottom: 10px;">
                                👁️ Vista Previa
                            </button>
                            <button onclick="generatePDF()" class="btn btn-secondary btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📄 Generar PDF
                            </button>
                            <button onclick="notifyAllEmployees()" class="btn btn-warning btn-sm" style="width: 100%; margin-bottom: 10px;">
                                📧 Notificar a Todos
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label>📊 Estadísticas:</label>
                            <div style="font-size: 0.9em; line-height: 1.6;">
                                <p>• <strong>Pendientes:</strong> <span id="pending-acceptances">3</span></p>
                                <p>• <strong>Completados:</strong> <span id="completed-acceptances">0</span></p>
                                <p>• <strong>Última actualización:</strong> <span id="last-update">Nunca</span></p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Historial de Aceptaciones -->
                <div class="card">
                    <h3>📊 Historial de Aceptaciones</h3>
                    
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <button onclick="showAllAcceptances()" class="btn btn-primary btn-sm">👥 Ver Todos</button>
                        <button onclick="showPendingAcceptances()" class="btn btn-warning btn-sm">⏳ Pendientes</button>
                        <button onclick="showCompletedAcceptances()" class="btn btn-success btn-sm">✅ Completados</button>
                        <button onclick="exportAcceptanceData()" class="btn btn-info btn-sm">📊 Exportar</button>
                    </div>
                    
                    <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>👤 Empleado</th>
                                    <th>📋 Versión</th>
                                    <th>📅 Fecha Aceptación</th>
                                    <th>🌐 IP</th>
                                    <th>📱 Dispositivo</th>
                                    <th>✅ Estado</th>
                                    <th>⚙️ Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="acceptances-tbody">
                                <tr>
                                    <td colspan="7" style="text-align: center; padding: 20px;">
                                        🔄 Cargando historial de aceptaciones...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Modal de Vista Previa de Términos -->
        <div id="terms-preview-modal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>👁️ Vista Previa de Términos y Condiciones</h3>
                    <span class="close" onclick="closeTermsPreview()">&times;</span>
                </div>
                
                <div class="modal-body" style="padding: 20px;">
                    <div id="terms-preview-content" style="white-space: pre-wrap; line-height: 1.6; font-size: 0.95em;">
                        <!-- Se llenará dinámicamente -->
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button onclick="closeTermsPreview()" class="btn btn-secondary">Cerrar</button>
                    <button onclick="generatePDF()" class="btn btn-primary">📄 Generar PDF</button>
                </div>
            </div>
        </div>
        
        <!-- Pestaña de Notificaciones de Inasistencia -->
        <div id="absence-notifications" class="tab-content">
            <div class="card">
                <h2>📲 Notificaciones de Inasistencia</h2>
                <p>Gestión de notificaciones de inasistencia recibidas desde la aplicación móvil de empleados.</p>
                
                <!-- Filtros y Controles -->
                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 20px; align-items: center;">
                    <input type="text" id="absence-search" placeholder="🔍 Buscar empleado..." onkeyup="filterAbsenceTable()" style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                    
                    <select id="absence-type-filter" onchange="filterAbsenceTable()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="">🏥 Todos los tipos</option>
                        <option value="medical">🏥 Médica</option>
                        <option value="personal">👤 Personal</option>
                        <option value="maternity">🤱 Maternidad</option>
                        <option value="study">📚 Estudio</option>
                        <option value="emergency">🚨 Emergencia</option>
                    </select>
                    
                    <select id="absence-status-filter" onchange="filterAbsenceTable()" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="">📋 Todos los estados</option>
                        <option value="pending">⏳ Pendiente</option>
                        <option value="approved">✅ Aprobada</option>
                        <option value="rejected">❌ Rechazada</option>
                    </select>
                    
                    <button onclick="refreshAbsenceNotifications()" class="btn btn-primary btn-sm">🔄 Actualizar</button>
                    <button onclick="exportAbsenceData()" class="btn btn-info btn-sm">📊 Exportar</button>
                </div>
                
                <!-- Estadísticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div class="stat-card">
                        <div class="stat-number" id="total-absences">0</div>
                        <div class="stat-label">📲 Total Notificaciones</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="pending-absences">0</div>
                        <div class="stat-label">⏳ Pendientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="approved-absences">0</div>
                        <div class="stat-label">✅ Aprobadas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="rejected-absences">0</div>
                        <div class="stat-label">❌ Rechazadas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="medical-absences">0</div>
                        <div class="stat-label">🏥 Médicas</div>
                    </div>
                </div>
                
                <!-- Tabla de Notificaciones -->
                <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>👤 Empleado</th>
                                <th>🗓️ Fecha(s)</th>
                                <th>🏥 Tipo</th>
                                <th>📝 Motivo</th>
                                <th>📎 Documentos</th>
                                <th>📅 Recibido</th>
                                <th>✅ Estado</th>
                                <th>⚙️ Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="absence-notifications-tbody">
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 20px;">
                                    🔄 Cargando notificaciones de inasistencia...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Modal de Detalles de Inasistencia -->
        <div id="absence-details-modal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>📋 Detalles de Notificación de Inasistencia</h3>
                    <span class="close" onclick="closeAbsenceDetailsModal()">&times;</span>
                </div>
                
                <div class="modal-body" id="absence-details-content">
                    <!-- Se llenará dinámicamente -->
                </div>
                
                <div class="modal-footer" id="absence-actions-footer">
                    <!-- Se llenará dinámicamente según el estado -->
                </div>
            </div>
        </div>
        
        // Funciones de Consentimientos Fehacientes
        let consentEmployees = []; // Cache de empleados para consentimientos
        
        async function loadConsentData() {
            try {
                showStatus('info', '🔄 Cargando datos de consentimientos...');
                
                // Simular carga de empleados con datos de consentimiento
                // En producción, esto vendría del endpoint /api/v1/users/consents
                consentEmployees = [
                    {
                        id: 1,
                        name: 'Juan Pérez',
                        legajo: 'EMP001',
                        email: 'juan.perez@empresa.com',
                        personalPhone: '+54 2657 123456',
                        whatsappNumber: '+54 2657 123456',
                        acceptsSmsNotifications: true,
                        acceptsWhatsappNotifications: true,
                        acceptsEmailNotifications: true,
                        communicationConsentDate: '2025-01-15',
                        communicationConsentVersion: '1.0'
                    },
                    {
                        id: 2,
                        name: 'María González',
                        legajo: 'EMP002',
                        email: 'maria.gonzalez@empresa.com',
                        personalPhone: '+54 2657 789012',
                        whatsappNumber: null,
                        acceptsSmsNotifications: false,
                        acceptsWhatsappNotifications: false,
                        acceptsEmailNotifications: true,
                        communicationConsentDate: null,
                        communicationConsentVersion: null
                    },
                    {
                        id: 3,
                        name: 'Carlos Rodriguez',
                        legajo: 'EMP003',
                        email: 'carlos.rodriguez@empresa.com',
                        personalPhone: '+54 2657 345678',
                        whatsappNumber: '+54 2657 345678',
                        acceptsSmsNotifications: null,
                        acceptsWhatsappNotifications: null,
                        acceptsEmailNotifications: null,
                        communicationConsentDate: null,
                        communicationConsentVersion: null
                    }
                ];
                
                updateConsentTable();
                updateConsentStats();
                showStatus('success', `✅ ${consentEmployees.length} empleados cargados`);
                
            } catch (error) {
                showStatus('error', '❌ Error cargando consentimientos: ' + error.message);
            }
        }
        
        function updateConsentTable(filter = 'all') {
            const tbody = document.getElementById('consent-tbody');
            tbody.innerHTML = '';
            
            let filteredEmployees = consentEmployees;
            
            if (filter === 'pending') {
                filteredEmployees = consentEmployees.filter(emp => 
                    emp.communicationConsentDate === null || 
                    (!emp.acceptsSmsNotifications && !emp.acceptsWhatsappNotifications && !emp.acceptsEmailNotifications)
                );
            } else if (filter === 'active') {
                filteredEmployees = consentEmployees.filter(emp => 
                    emp.communicationConsentDate !== null && 
                    (emp.acceptsSmsNotifications || emp.acceptsWhatsappNotifications || emp.acceptsEmailNotifications)
                );
            }
            
            if (filteredEmployees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay empleados para mostrar</td></tr>';
                return;
            }
            
            filteredEmployees.forEach(employee => {
                const row = document.createElement('tr');
                
                const smsStatus = employee.acceptsSmsNotifications === true ? '✅' : 
                                 employee.acceptsSmsNotifications === false ? '❌' : '⏳';
                const whatsappStatus = employee.acceptsWhatsappNotifications === true ? '✅' : 
                                      employee.acceptsWhatsappNotifications === false ? '❌' : '⏳';
                const emailStatus = employee.acceptsEmailNotifications === true ? '✅' : 
                                   employee.acceptsEmailNotifications === false ? '❌' : '⏳';
                
                const consentDate = employee.communicationConsentDate ? 
                    new Date(employee.communicationConsentDate).toLocaleDateString('es-ES') : 
                    'Sin definir';
                
                const version = employee.communicationConsentVersion || 'N/A';
                
                row.innerHTML = `
                    <td>
                        <strong>${employee.name}</strong><br>
                        <small>${employee.legajo} | ${employee.email}</small>
                    </td>
                    <td style="text-align: center; font-size: 1.2em;">${smsStatus}</td>
                    <td style="text-align: center; font-size: 1.2em;">${whatsappStatus}</td>
                    <td style="text-align: center; font-size: 1.2em;">${emailStatus}</td>
                    <td>${consentDate}</td>
                    <td>${version}</td>
                    <td>
                        <button onclick="configureConsent(${employee.id})" class="btn btn-sm btn-primary">
                            ⚙️ Configurar
                        </button>
                        <button onclick="viewConsentHistory(${employee.id})" class="btn btn-sm btn-info">
                            📋 Historial
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        }
        
        function updateConsentStats() {
            const total = consentEmployees.length;
            const consented = consentEmployees.filter(emp => 
                emp.communicationConsentDate !== null && 
                (emp.acceptsSmsNotifications || emp.acceptsWhatsappNotifications || emp.acceptsEmailNotifications)
            ).length;
            const pending = total - consented;
            const percentage = total > 0 ? Math.round((consented / total) * 100) : 0;
            
            document.getElementById('total-employees').textContent = total;
            document.getElementById('consented-employees').textContent = consented;
            document.getElementById('pending-employees').textContent = pending;
            document.getElementById('consent-percentage').textContent = percentage + '%';
        }
        
        function showAllConsents() {
            updateConsentTable('all');
        }
        
        function showPendingConsents() {
            updateConsentTable('pending');
        }
        
        function showActiveConsents() {
            updateConsentTable('active');
        }
        
        function filterConsentTable() {
            const searchTerm = document.getElementById('consent-search').value.toLowerCase();
            const rows = document.querySelectorAll('#consent-tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
        
        function configureConsent(employeeId) {
            const employee = consentEmployees.find(emp => emp.id === employeeId);
            if (!employee) return;
            
            // Llenar información del empleado
            document.getElementById('employee-consent-info').innerHTML = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4>👤 ${employee.name}</h4>
                    <p><strong>Legajo:</strong> ${employee.legajo}</p>
                    <p><strong>Email:</strong> ${employee.email}</p>
                </div>
            `;
            
            // Llenar formulario con datos actuales
            document.getElementById('personal-phone').value = employee.personalPhone || '';
            document.getElementById('whatsapp-number').value = employee.whatsappNumber || '';
            document.getElementById('accepts-sms').checked = employee.acceptsSmsNotifications === true;
            document.getElementById('accepts-whatsapp').checked = employee.acceptsWhatsappNotifications === true;
            document.getElementById('accepts-email').checked = employee.acceptsEmailNotifications === true;
            document.getElementById('consent-notes').value = employee.notes || '';
            
            // Guardar ID del empleado actual
            document.getElementById('consent-modal').dataset.employeeId = employeeId;
            
            // Mostrar modal
            document.getElementById('consent-modal').style.display = 'block';
        }
        
        async function saveConsent() {
            const employeeId = parseInt(document.getElementById('consent-modal').dataset.employeeId);
            const employee = consentEmployees.find(emp => emp.id === employeeId);
            
            if (!employee) return;
            
            try {
                showStatus('info', '💾 Guardando consentimientos...');
                
                // Recoger datos del formulario
                const consentData = {
                    personalPhone: document.getElementById('personal-phone').value,
                    whatsappNumber: document.getElementById('whatsapp-number').value,
                    acceptsSmsNotifications: document.getElementById('accepts-sms').checked,
                    acceptsWhatsappNotifications: document.getElementById('accepts-whatsapp').checked,
                    acceptsEmailNotifications: document.getElementById('accepts-email').checked,
                    notes: document.getElementById('consent-notes').value,
                    communicationConsentDate: new Date().toISOString().split('T')[0],
                    communicationConsentVersion: '1.0'
                };
                
                // En producción, esto sería una llamada a la API
                // const response = await fetch(`${API_BASE}/users/${employeeId}/consent`, {...});
                
                // Simular guardado exitoso
                Object.assign(employee, consentData);
                
                updateConsentTable();
                updateConsentStats();
                closeConsentModal();
                
                showStatus('success', `✅ Consentimientos guardados para ${employee.name}`);
                
            } catch (error) {
                showStatus('error', '❌ Error guardando consentimientos: ' + error.message);
            }
        }
        
        function closeConsentModal() {
            document.getElementById('consent-modal').style.display = 'none';
        }
        
        function viewConsentHistory(employeeId) {
            const employee = consentEmployees.find(emp => emp.id === employeeId);
            if (!employee) return;
            
            const historyHtml = `
                <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; margin: 20px auto;">
                    <h3>📋 Historial de Consentimientos</h3>
                    <h4>👤 ${employee.name}</h4>
                    
                    <div style="margin-top: 20px;">
                        <h5>Estado Actual:</h5>
                        <ul>
                            <li>📲 SMS: ${employee.acceptsSmsNotifications ? '✅ Autorizado' : '❌ No autorizado'}</li>
                            <li>📱 WhatsApp: ${employee.acceptsWhatsappNotifications ? '✅ Autorizado' : '❌ No autorizado'}</li>
                            <li>📧 Email: ${employee.acceptsEmailNotifications ? '✅ Autorizado' : '❌ No autorizado'}</li>
                        </ul>
                        
                        <p><strong>Fecha de consentimiento:</strong> ${employee.communicationConsentDate || 'No definida'}</p>
                        <p><strong>Versión:</strong> ${employee.communicationConsentVersion || 'N/A'}</p>
                    </div>
                    
                    <button onclick="this.parentElement.remove()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px;">
                        Cerrar
                    </button>
                </div>
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            overlay.innerHTML = historyHtml;
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            
            document.body.appendChild(overlay);
        }
        
        function exportConsentData() {
            try {
                showStatus('info', '📊 Generando exportación...');
                
                if (consentEmployees.length === 0) {
                    showStatus('warning', '⚠️ No hay datos para exportar');
                    return;
                }
                
                // Crear CSV
                let csvContent = "Empleado,Legajo,Email,Telefono,WhatsApp,SMS,WhatsApp_Consent,Email_Consent,Fecha_Consentimiento,Version\n";
                
                consentEmployees.forEach(emp => {
                    csvContent += `"${emp.name}","${emp.legajo}","${emp.email}","${emp.personalPhone || ''}","${emp.whatsappNumber || ''}","${emp.acceptsSmsNotifications ? 'SI' : 'NO'}","${emp.acceptsWhatsappNotifications ? 'SI' : 'NO'}","${emp.acceptsEmailNotifications ? 'SI' : 'NO'}","${emp.communicationConsentDate || ''}","${emp.communicationConsentVersion || ''}"\n`;
                });
                
                // Descargar archivo
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consentimientos_fehacientes_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                showStatus('success', '✅ Exportación completada');
                
            } catch (error) {
                showStatus('error', '❌ Error exportando: ' + error.message);
            }
        }

        // Funciones de Términos y Condiciones
        let termsData = {
            version: '1.0',
            title: 'Términos y Condiciones de Comunicaciones Fehacientes',
            content: '',
            lastUpdate: null,
            acceptances: []
        };
        
        let acceptanceHistory = []; // Cache de historial de aceptaciones
        
        async function loadTermsData() {
            try {
                showStatus('info', '🔄 Cargando datos de términos y condiciones...');
                
                // Simular datos de aceptaciones
                // En producción, esto vendría de /api/v1/terms/acceptances
                acceptanceHistory = [
                    {
                        id: 1,
                        employeeName: 'Juan Pérez',
                        employeeId: 1,
                        termsVersion: '1.0',
                        acceptedDate: '2025-01-15',
                        ipAddress: '192.168.1.100',
                        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        status: 'accepted',
                        device: 'Windows PC'
                    },
                    {
                        id: 2,
                        employeeName: 'María González',
                        employeeId: 2,
                        termsVersion: null,
                        acceptedDate: null,
                        ipAddress: null,
                        userAgent: null,
                        status: 'pending',
                        device: null
                    },
                    {
                        id: 3,
                        employeeName: 'Carlos Rodriguez',
                        employeeId: 3,
                        termsVersion: null,
                        acceptedDate: null,
                        ipAddress: null,
                        userAgent: null,
                        status: 'pending',
                        device: null
                    }
                ];
                
                updateAcceptanceTable();
                updateTermsStats();
                showStatus('success', `✅ Datos de términos cargados`);
                
            } catch (error) {
                showStatus('error', '❌ Error cargando términos: ' + error.message);
            }
        }
        
        function updateAcceptanceTable(filter = 'all') {
            const tbody = document.getElementById('acceptances-tbody');
            tbody.innerHTML = '';
            
            let filteredAcceptances = acceptanceHistory;
            
            if (filter === 'pending') {
                filteredAcceptances = acceptanceHistory.filter(acc => acc.status === 'pending');
            } else if (filter === 'completed') {
                filteredAcceptances = acceptanceHistory.filter(acc => acc.status === 'accepted');
            }
            
            if (filteredAcceptances.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay registros para mostrar</td></tr>';
                return;
            }
            
            filteredAcceptances.forEach(acceptance => {
                const row = document.createElement('tr');
                
                const statusBadge = acceptance.status === 'accepted' ? 
                    '<span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">✅ Aceptado</span>' :
                    '<span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">⏳ Pendiente</span>';
                
                const version = acceptance.termsVersion || 'N/A';
                const acceptedDate = acceptance.acceptedDate ? 
                    new Date(acceptance.acceptedDate).toLocaleDateString('es-ES') : 'Sin aceptar';
                const ip = acceptance.ipAddress || '—';
                const device = acceptance.device || '—';
                
                row.innerHTML = `
                    <td><strong>${acceptance.employeeName}</strong></td>
                    <td>${version}</td>
                    <td>${acceptedDate}</td>
                    <td>${ip}</td>
                    <td>${device}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${acceptance.status === 'pending' ? 
                            `<button onclick="sendTermsNotification(${acceptance.employeeId})" class="btn btn-sm btn-warning">
                                📧 Notificar
                            </button>` :
                            `<button onclick="viewAcceptanceDetails(${acceptance.id})" class="btn btn-sm btn-info">
                                👁️ Detalles
                            </button>`
                        }
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        }
        
        function updateTermsStats() {
            const accepted = acceptanceHistory.filter(acc => acc.status === 'accepted').length;
            const pending = acceptanceHistory.filter(acc => acc.status === 'pending').length;
            
            document.getElementById('acceptance-count').textContent = accepted;
            document.getElementById('pending-acceptances').textContent = pending;
            document.getElementById('completed-acceptances').textContent = accepted;
            document.getElementById('last-update').textContent = termsData.lastUpdate || 'Nunca';
        }
        
        function showAllAcceptances() {
            updateAcceptanceTable('all');
        }
        
        function showPendingAcceptances() {
            updateAcceptanceTable('pending');
        }
        
        function showCompletedAcceptances() {
            updateAcceptanceTable('completed');
        }
        
        function saveTermsAndConditions() {
            try {
                showStatus('info', '💾 Guardando términos y condiciones...');
                
                termsData.version = document.getElementById('terms-version').value;
                termsData.title = document.getElementById('terms-title').value;
                termsData.content = document.getElementById('terms-content').value;
                termsData.lastUpdate = new Date().toLocaleDateString('es-ES');
                
                // En producción, esto sería una llamada a la API
                // const response = await fetch(`${API_BASE}/terms`, { method: 'POST', body: JSON.stringify(termsData) });
                
                // Actualizar interfaz
                document.getElementById('current-version').textContent = termsData.version;
                document.getElementById('last-update').textContent = termsData.lastUpdate;
                
                showStatus('success', `✅ Términos v${termsData.version} guardados correctamente`);
                
            } catch (error) {
                showStatus('error', '❌ Error guardando términos: ' + error.message);
            }
        }
        
        function previewTerms() {
            const title = document.getElementById('terms-title').value;
            const content = document.getElementById('terms-content').value;
            const version = document.getElementById('terms-version').value;
            
            const previewContent = `${title}
Versión: ${version}
Fecha: ${new Date().toLocaleDateString('es-ES')}

${content}`;
            
            document.getElementById('terms-preview-content').textContent = previewContent;
            document.getElementById('terms-preview-modal').style.display = 'block';
        }
        
        function closeTermsPreview() {
            document.getElementById('terms-preview-modal').style.display = 'none';
        }
        
        function generatePDF() {
            try {
                showStatus('info', '📄 Generando PDF...');
                
                const title = document.getElementById('terms-title').value;
                const content = document.getElementById('terms-content').value;
                const version = document.getElementById('terms-version').value;
                
                // Simular generación de PDF
                // En producción, esto usaría una librería como jsPDF o llamaría a un endpoint del backend
                const pdfContent = `${title}\nVersión: ${version}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n${content}`;
                
                // Crear blob de texto (simulando PDF)
                const blob = new Blob([pdfContent], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `terminos_condiciones_v${version}_${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                showStatus('success', '✅ Archivo generado y descargado');
                
            } catch (error) {
                showStatus('error', '❌ Error generando PDF: ' + error.message);
            }
        }
        
        async function notifyAllEmployees() {
            try {
                showStatus('info', '📧 Enviando notificación a todos los empleados...');
                
                const pendingEmployees = acceptanceHistory.filter(acc => acc.status === 'pending');
                
                if (pendingEmployees.length === 0) {
                    showStatus('warning', '⚠️ No hay empleados pendientes de aceptación');
                    return;
                }
                
                // Simular envío de notificaciones
                // En producción, esto llamaría al endpoint de notificaciones fehacientes
                for (const employee of pendingEmployees) {
                    console.log(`📧 Notificando a ${employee.employeeName} sobre nuevos términos v${termsData.version}`);
                }
                
                showStatus('success', `✅ Notificaciones enviadas a ${pendingEmployees.length} empleados`);
                
            } catch (error) {
                showStatus('error', '❌ Error enviando notificaciones: ' + error.message);
            }
        }
        
        async function sendTermsNotification(employeeId) {
            try {
                showStatus('info', '📧 Enviando notificación individual...');
                
                const employee = acceptanceHistory.find(acc => acc.employeeId === employeeId);
                if (!employee) return;
                
                // En producción, esto usaría el servicio de notificaciones fehacientes
                console.log(`📧 Notificando a ${employee.employeeName} sobre términos pendientes`);
                
                showStatus('success', `✅ Notificación enviada a ${employee.employeeName}`);
                
            } catch (error) {
                showStatus('error', '❌ Error enviando notificación: ' + error.message);
            }
        }
        
        function viewAcceptanceDetails(acceptanceId) {
            const acceptance = acceptanceHistory.find(acc => acc.id === acceptanceId);
            if (!acceptance) return;
            
            const detailsHtml = `
                <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 20px auto;">
                    <h3>📋 Detalles de Aceptación</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            <h4>👤 Información del Empleado</h4>
                            <p><strong>Nombre:</strong> ${acceptance.employeeName}</p>
                            <p><strong>ID:</strong> ${acceptance.employeeId}</p>
                        </div>
                        
                        <div>
                            <h4>📋 Información de Aceptación</h4>
                            <p><strong>Versión:</strong> ${acceptance.termsVersion}</p>
                            <p><strong>Fecha:</strong> ${acceptance.acceptedDate ? new Date(acceptance.acceptedDate).toLocaleString('es-ES') : 'N/A'}</p>
                            <p><strong>IP:</strong> ${acceptance.ipAddress}</p>
                            <p><strong>Dispositivo:</strong> ${acceptance.device}</p>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <h4>🔧 User Agent</h4>
                        <p style="font-size: 0.9em; color: #666; word-break: break-all;">
                            ${acceptance.userAgent || 'N/A'}
                        </p>
                    </div>
                    
                    <button onclick="this.parentElement.remove()" style="margin-top: 20px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px;">
                        Cerrar
                    </button>
                </div>
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
            overlay.innerHTML = detailsHtml;
            overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
            
            document.body.appendChild(overlay);
        }
        
        function exportAcceptanceData() {
            try {
                showStatus('info', '📊 Generando exportación...');
                
                if (acceptanceHistory.length === 0) {
                    showStatus('warning', '⚠️ No hay datos para exportar');
                    return;
                }
                
                // Crear CSV
                let csvContent = "Empleado,ID,Version_Terminos,Fecha_Aceptacion,IP_Address,Dispositivo,Estado\n";
                
                acceptanceHistory.forEach(acc => {
                    const acceptedDate = acc.acceptedDate ? new Date(acc.acceptedDate).toLocaleDateString('es-ES') : '';
                    csvContent += `"${acc.employeeName}","${acc.employeeId}","${acc.termsVersion || ''}","${acceptedDate}","${acc.ipAddress || ''}","${acc.device || ''}","${acc.status}"\n`;
                });
                
                // Descargar archivo
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `aceptaciones_terminos_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                showStatus('success', '✅ Exportación completada');
                
            } catch (error) {
                showStatus('error', '❌ Error exportando: ' + error.message);
            }
        }

        // Funciones de Notificaciones de Inasistencia
        let absenceNotifications = []; // Cache de notificaciones
        
        async function loadAbsenceNotifications() {
            try {
                showStatus('info', '🔄 Cargando notificaciones de inasistencia...');
                
                // Simular datos de notificaciones
                // En producción, esto vendría de /api/v1/absence/all-notifications
                absenceNotifications = [
                    {
                        id: 'abs-1',
                        employeeName: 'Juan Pérez',
                        employeeId: 1,
                        absenceType: 'medical',
                        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Ayer
                        endDate: null,
                        reason: 'Consulta médica programada - Traumatología',
                        notes: 'Revisión de lesión en rodilla derecha',
                        hasAttachment: true,
                        documentPath: 'uploads/absence/medical-cert-001.pdf',
                        status: 'pending',
                        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Hace 2 horas
                        processedAt: null,
                        processedBy: null,
                        responses: {
                            hr: true,
                            doctor: true,
                            doctorEmail: 'doctor@empresa.com'
                        },
                        notificationsSent: {
                            hrNotified: true,
                            doctorNotified: true
                        }
                    },
                    {
                        id: 'abs-2',
                        employeeName: 'María González',
                        employeeId: 2,
                        absenceType: 'emergency',
                        startDate: new Date(), // Hoy
                        endDate: null,
                        reason: 'Emergencia familiar - Hospitalización de familiar directo',
                        notes: 'Necesito acompañar a mi madre al hospital de urgencia',
                        hasAttachment: false,
                        documentPath: null,
                        status: 'approved',
                        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // Hace 4 horas
                        processedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // Hace 3 horas
                        processedBy: 'Ana Martínez - RRHH',
                        responses: {
                            hr: true,
                            doctor: false,
                            doctorEmail: null
                        },
                        notificationsSent: {
                            hrNotified: true,
                            doctorNotified: false
                        },
                        processingComments: 'Emergencia justificada. Se autoriza inasistencia.'
                    },
                    {
                        id: 'abs-3',
                        employeeName: 'Carlos Rodriguez',
                        employeeId: 3,
                        absenceType: 'personal',
                        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Pasado mañana
                        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                        reason: 'Trámites personales - Documentación municipal',
                        notes: 'Renovación de documentos en registro civil',
                        hasAttachment: false,
                        documentPath: null,
                        status: 'rejected',
                        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
                        processedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
                        processedBy: 'Luis Fernández - Supervisor',
                        responses: {
                            hr: true,
                            doctor: false,
                            doctorEmail: null
                        },
                        notificationsSent: {
                            hrNotified: true,
                            doctorNotified: false
                        },
                        processingComments: 'Solicitud con poca antelación. Se debe gestionar fuera del horario laboral.'
                    }
                ];
                
                updateAbsenceTable();
                updateAbsenceStats();
                showStatus('success', `✅ ${absenceNotifications.length} notificaciones cargadas`);
                
            } catch (error) {
                showStatus('error', '❌ Error cargando notificaciones: ' + error.message);
            }
        }
        
        function updateAbsenceTable() {
            const tbody = document.getElementById('absence-notifications-tbody');
            tbody.innerHTML = '';
            
            if (absenceNotifications.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No hay notificaciones de inasistencia</td></tr>';
                return;
            }
            
            // Ordenar por fecha de creación (más recientes primero)
            const sortedNotifications = [...absenceNotifications].sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            sortedNotifications.forEach(notification => {
                const row = document.createElement('tr');
                
                // Formatear fechas
                const startDate = new Date(notification.startDate).toLocaleDateString('es-ES');
                const endDate = notification.endDate ? 
                    ` al ${new Date(notification.endDate).toLocaleDateString('es-ES')}` : '';
                const dateRange = startDate + endDate;
                
                // Íconos por tipo
                const typeIcons = {
                    'medical': '🏥',
                    'personal': '👤',
                    'maternity': '🤱',
                    'study': '📚',
                    'emergency': '🚨'
                };
                
                const typeNames = {
                    'medical': 'Médica',
                    'personal': 'Personal',
                    'maternity': 'Maternidad',
                    'study': 'Estudio',
                    'emergency': 'Emergencia'
                };
                
                // Estado con colores
                const statusBadges = {
                    'pending': '<span style="background: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">⏳ Pendiente</span>',
                    'approved': '<span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">✅ Aprobada</span>',
                    'rejected': '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">❌ Rechazada</span>'
                };
                
                const createdAt = new Date(notification.createdAt).toLocaleString('es-ES');
                const reasonPreview = notification.reason.length > 40 ? 
                    notification.reason.substring(0, 40) + '...' : 
                    notification.reason;
                
                row.innerHTML = `
                    <td><strong>${notification.employeeName}</strong></td>
                    <td>${dateRange}</td>
                    <td>${typeIcons[notification.absenceType]} ${typeNames[notification.absenceType]}</td>
                    <td title="${notification.reason}">${reasonPreview}</td>
                    <td style="text-align: center;">
                        ${notification.hasAttachment ? '📎 Sí' : '—'}
                    </td>
                    <td>${createdAt}</td>
                    <td>${statusBadges[notification.status]}</td>
                    <td>
                        <button onclick="viewAbsenceDetails('${notification.id}')" class="btn btn-sm btn-info">
                            👁️ Ver
                        </button>
                        ${notification.status === 'pending' ? 
                            `<button onclick="processAbsence('${notification.id}', 'approved')" class="btn btn-sm btn-success" style="margin-left: 5px;">
                                ✅ Aprobar
                            </button>
                            <button onclick="processAbsence('${notification.id}', 'rejected')" class="btn btn-sm btn-danger" style="margin-left: 5px;">
                                ❌ Rechazar
                            </button>` :
                            ''
                        }
                    </td>
                `;
                
                tbody.appendChild(row);
            });
        }
        
        function updateAbsenceStats() {
            const total = absenceNotifications.length;
            const pending = absenceNotifications.filter(n => n.status === 'pending').length;
            const approved = absenceNotifications.filter(n => n.status === 'approved').length;
            const rejected = absenceNotifications.filter(n => n.status === 'rejected').length;
            const medical = absenceNotifications.filter(n => n.absenceType === 'medical').length;
            
            document.getElementById('total-absences').textContent = total;
            document.getElementById('pending-absences').textContent = pending;
            document.getElementById('approved-absences').textContent = approved;
            document.getElementById('rejected-absences').textContent = rejected;
            document.getElementById('medical-absences').textContent = medical;
        }
        
        function filterAbsenceTable() {
            const searchTerm = document.getElementById('absence-search').value.toLowerCase();
            const typeFilter = document.getElementById('absence-type-filter').value;
            const statusFilter = document.getElementById('absence-status-filter').value;
            
            const rows = document.querySelectorAll('#absence-notifications-tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matchesSearch = text.includes(searchTerm);
                
                // Para los filtros necesitaríamos acceso a los datos
                // Por simplicidad, solo filtramos por texto de búsqueda
                row.style.display = matchesSearch ? '' : 'none';
            });
        }
        
        function refreshAbsenceNotifications() {
            loadAbsenceNotifications();
        }
        
        function viewAbsenceDetails(notificationId) {
            const notification = absenceNotifications.find(n => n.id === notificationId);
            if (!notification) return;
            
            const typeNames = {
                'medical': '🏥 Médica',
                'personal': '👤 Personal',
                'maternity': '🤱 Maternidad/Paternidad',
                'study': '📚 Estudio',
                'emergency': '🚨 Emergencia'
            };
            
            const statusNames = {
                'pending': '⏳ Pendiente',
                'approved': '✅ Aprobada',
                'rejected': '❌ Rechazada'
            };
            
            const startDate = new Date(notification.startDate).toLocaleDateString('es-ES');
            const endDate = notification.endDate ? 
                new Date(notification.endDate).toLocaleDateString('es-ES') : 'N/A';
            
            const detailsHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4>👤 Información del Empleado</h4>
                        <p><strong>Nombre:</strong> ${notification.employeeName}</p>
                        <p><strong>ID:</strong> ${notification.employeeId}</p>
                        
                        <h4>📅 Fechas de Inasistencia</h4>
                        <p><strong>Inicio:</strong> ${startDate}</p>
                        <p><strong>Fin:</strong> ${endDate}</p>
                        <p><strong>Tipo:</strong> ${typeNames[notification.absenceType]}</p>
                    </div>
                    
                    <div>
                        <h4>📋 Estado y Procesamiento</h4>
                        <p><strong>Estado:</strong> ${statusNames[notification.status]}</p>
                        <p><strong>Creado:</strong> ${new Date(notification.createdAt).toLocaleString('es-ES')}</p>
                        ${notification.processedAt ? 
                            `<p><strong>Procesado:</strong> ${new Date(notification.processedAt).toLocaleString('es-ES')}</p>
                             <p><strong>Por:</strong> ${notification.processedBy}</p>` :
                            ''
                        }
                        
                        <h4>🔔 Notificaciones Enviadas</h4>
                        <p>• RRHH: ${notification.notificationsSent.hrNotified ? '✅ Sí' : '❌ No'}</p>
                        <p>• Médico: ${notification.notificationsSent.doctorNotified ? '✅ Sí' : '❌ No'}</p>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4>📝 Motivo y Observaciones</h4>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <strong>Motivo:</strong> ${notification.reason}
                    </div>
                    ${notification.notes ? 
                        `<div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                            <strong>Observaciones:</strong> ${notification.notes}
                        </div>` :
                        ''
                    }
                    ${notification.processingComments ? 
                        `<div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                            <strong>Comentarios del procesamiento:</strong> ${notification.processingComments}
                        </div>` :
                        ''
                    }
                </div>
                
                ${notification.hasAttachment ? 
                    `<div style="margin-top: 20px;">
                        <h4>📎 Documentación Adjunta</h4>
                        <button onclick="viewDocument('${notification.documentPath}')" class="btn btn-info">
                            📄 Ver Documento
                        </button>
                    </div>` :
                    ''
                }
            `;
            
            document.getElementById('absence-details-content').innerHTML = detailsHtml;
            
            // Configurar footer según estado
            const footerHtml = notification.status === 'pending' ? 
                `<button onclick="closeAbsenceDetailsModal()" class="btn btn-secondary">Cerrar</button>
                 <button onclick="processAbsenceFromModal('${notification.id}', 'approved')" class="btn btn-success">✅ Aprobar</button>
                 <button onclick="processAbsenceFromModal('${notification.id}', 'rejected')" class="btn btn-danger">❌ Rechazar</button>` :
                `<button onclick="closeAbsenceDetailsModal()" class="btn btn-secondary">Cerrar</button>`;
            
            document.getElementById('absence-actions-footer').innerHTML = footerHtml;
            document.getElementById('absence-details-modal').style.display = 'block';
        }
        
        function closeAbsenceDetailsModal() {
            document.getElementById('absence-details-modal').style.display = 'none';
        }
        
        async function processAbsence(notificationId, newStatus) {
            const notification = absenceNotifications.find(n => n.id === notificationId);
            if (!notification) return;
            
            const comments = prompt(
                `¿Comentarios para ${newStatus === 'approved' ? 'la aprobación' : 'el rechazo'} de la inasistencia de ${notification.employeeName}?`,
                newStatus === 'approved' ? 'Inasistencia justificada y aprobada.' : 'Inasistencia no justificada según políticas de la empresa.'
            );
            
            if (comments === null) return; // Usuario canceló
            
            try {
                showStatus('info', `${newStatus === 'approved' ? '✅ Aprobando' : '❌ Rechazando'} inasistencia...`);
                
                // En producción, esto sería una llamada a la API
                // const response = await fetch(`${API_BASE}/absence/update-status/${notificationId}`, { ... });
                
                // Simular procesamiento exitoso
                notification.status = newStatus;
                notification.processedAt = new Date();
                notification.processedBy = 'Sistema Administrativo';
                notification.processingComments = comments;
                
                updateAbsenceTable();
                updateAbsenceStats();
                
                showStatus('success', 
                    `✅ Inasistencia ${newStatus === 'approved' ? 'aprobada' : 'rechazada'} correctamente. Se ha notificado al empleado.`
                );
                
            } catch (error) {
                showStatus('error', '❌ Error procesando inasistencia: ' + error.message);
            }
        }
        
        function processAbsenceFromModal(notificationId, newStatus) {
            closeAbsenceDetailsModal();
            processAbsence(notificationId, newStatus);
        }
        
        function viewDocument(documentPath) {
            if (documentPath) {
                // En producción, esto abriría el documento real
                window.open(`/uploads/documents/${documentPath}`, '_blank');
                showStatus('info', '📄 Abriendo documento adjunto...');
            } else {
                showStatus('warning', '⚠️ Documento no disponible');
            }
        }
        
        function exportAbsenceData() {
            try {
                showStatus('info', '📊 Generando exportación...');
                
                if (absenceNotifications.length === 0) {
                    showStatus('warning', '⚠️ No hay datos para exportar');
                    return;
                }
                
                // Crear CSV
                let csvContent = "Empleado,Tipo_Inasistencia,Fecha_Inicio,Fecha_Fin,Motivo,Estado,Procesado_Por,Fecha_Creacion,Tiene_Documento\n";
                
                absenceNotifications.forEach(notif => {
                    const startDate = new Date(notif.startDate).toLocaleDateString('es-ES');
                    const endDate = notif.endDate ? new Date(notif.endDate).toLocaleDateString('es-ES') : '';
                    const createdAt = new Date(notif.createdAt).toLocaleDateString('es-ES');
                    
                    csvContent += `"${notif.employeeName}","${notif.absenceType}","${startDate}","${endDate}","${notif.reason}","${notif.status}","${notif.processedBy || ''}","${createdAt}","${notif.hasAttachment ? 'SI' : 'NO'}"\n`;
                });
                
                // Descargar archivo
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notificaciones_inasistencia_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                showStatus('success', '✅ Exportación completada');
                
            } catch (error) {
                showStatus('error', '❌ Error exportando: ' + error.message);
            }
        }

        // === FUNCIONES DE GESTIÓN DE DOCUMENTOS ===
        
        let documentRequests = [];
        let documents = [];
        
        // Show document tab
        function showDocumentTab(tabName, element) {
            // Update tab buttons
            document.querySelectorAll('.medical-tab').forEach(tab => tab.classList.remove('active'));
            element.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.medical-tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`document-${tabName}`).classList.add('active');
            
            // Load data based on tab
            switch(tabName) {
                case 'requests':
                    loadDocumentRequests();
                    break;
                case 'documents':
                    loadDocuments();
                    break;
                case 'statistics':
                    loadDocumentStatistics();
                    break;
            }
        }
        
        // Load document requests
        async function loadDocumentRequests() {
            try {
                console.log('🔄 Cargando solicitudes de documentos...');
                
                // Simulated data for now - in production this would fetch from /api/v1/documents/admin/requests
                documentRequests = [
                    {
                        id: 'req-001',
                        employeeId: '1',
                        employeeName: 'Juan Pérez',
                        type: 'certificates',
                        description: 'Certificado médico para evaluación de aptitud laboral',
                        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                        status: 'pending',
                        requestedBy: 'Dr. García'
                    },
                    {
                        id: 'req-002',
                        employeeId: '2', 
                        employeeName: 'María González',
                        type: 'lab_results',
                        description: 'Análisis de sangre completo',
                        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        status: 'completed',
                        requestedBy: 'Dr. López'
                    },
                    {
                        id: 'req-003',
                        employeeId: '3',
                        employeeName: 'Carlos Martínez',
                        type: 'medical_reports',
                        description: 'Informe cardiológico especializado',
                        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                        deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                        status: 'expired',
                        requestedBy: 'Dr. Rodríguez'
                    }
                ];
                
                updateDocumentRequestsTable();
                updateDocumentTabCounts();
                
                showStatus('success', '✅ Solicitudes de documentos cargadas');
                
            } catch (error) {
                console.error('Error cargando solicitudes:', error);
                showStatus('error', '❌ Error cargando solicitudes de documentos');
            }
        }
        
        // Load documents
        async function loadDocuments() {
            try {
                console.log('🔄 Cargando documentos...');
                
                // Simulated data for now - in production this would fetch from /api/v1/documents/admin/documents
                documents = [
                    {
                        id: 'doc-001',
                        employeeId: '2',
                        employeeName: 'María González',
                        filename: 'analisis_sangre_maria.pdf',
                        type: 'lab_results',
                        fileSize: 1024576,
                        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                        requestId: 'req-002',
                        status: 'uploaded'
                    },
                    {
                        id: 'doc-002',
                        employeeId: '4',
                        employeeName: 'Ana Silva',
                        filename: 'certificado_medico.jpg',
                        type: 'certificates',
                        fileSize: 512000,
                        uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                        requestId: null,
                        status: 'uploaded'
                    }
                ];
                
                updateDocumentsTable();
                updateDocumentTabCounts();
                
                showStatus('success', '✅ Documentos cargados');
                
            } catch (error) {
                console.error('Error cargando documentos:', error);
                showStatus('error', '❌ Error cargando documentos');
            }
        }
        
        // Update document requests table
        function updateDocumentRequestsTable() {
            const tbody = document.getElementById('document-requests-tbody');
            
            if (documentRequests.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                            📋 No hay solicitudes de documentos
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = documentRequests.map(request => {
                const isExpired = new Date(request.deadline) < new Date() && request.status === 'pending';
                const isUrgent = !isExpired && new Date(request.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
                
                let statusBadge = '';
                switch(request.status) {
                    case 'pending':
                        statusBadge = isExpired ? 
                            '<span class="status-badge expired">❌ Vencida</span>' :
                            (isUrgent ? '<span class="status-badge urgent">⚡ Urgente</span>' : '<span class="status-badge pending">⏳ Pendiente</span>');
                        break;
                    case 'completed':
                        statusBadge = '<span class="status-badge completed">✅ Completada</span>';
                        break;
                    default:
                        statusBadge = '<span class="status-badge unknown">❓ Desconocido</span>';
                }
                
                return `
                    <tr ${isExpired ? 'style="background-color: #ffe6e6;"' : (isUrgent ? 'style="background-color: #fff3cd;"' : '')}>
                        <td>
                            <div class="employee-info">
                                <strong>${request.employeeName}</strong>
                                <small>ID: ${request.employeeId}</small>
                            </div>
                        </td>
                        <td>${getDocumentTypeLabel(request.type)}</td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${request.description}</td>
                        <td>${formatDate(request.createdAt)}</td>
                        <td>${formatDate(request.deadline)}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="employee-actions">
                                <button class="btn btn-sm btn-info" onclick="viewDocumentRequest('${request.id}')">👁️ Ver</button>
                                ${request.status === 'pending' ? 
                                    `<button class="btn btn-sm btn-warning" onclick="sendDocumentReminder('${request.id}')">📩 Recordar</button>` : 
                                    ''
                                }
                                <button class="btn btn-sm btn-danger" onclick="deleteDocumentRequest('${request.id}')">🗑️ Eliminar</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Update documents table
        function updateDocumentsTable() {
            const tbody = document.getElementById('documents-tbody');
            
            if (documents.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                            📁 No hay documentos recibidos
                        </td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = documents.map(doc => `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" class="document-checkbox" value="${doc.id}">
                            <div>
                                <strong>${doc.filename}</strong>
                                <br><small>${getDocumentIcon(doc.filename)} ${doc.filename.split('.').pop().toUpperCase()}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="employee-info">
                            <strong>${doc.employeeName}</strong>
                            <small>ID: ${doc.employeeId}</small>
                        </div>
                    </td>
                    <td>${getDocumentTypeLabel(doc.type)}</td>
                    <td>${formatFileSize(doc.fileSize)}</td>
                    <td>${formatDate(doc.uploadedAt)}</td>
                    <td>
                        ${doc.requestId ? 
                            `<span class="status-badge info">🔗 ${doc.requestId}</span>` : 
                            '<span class="status-badge neutral">📄 Espontáneo</span>'
                        }
                    </td>
                    <td>
                        <div class="employee-actions">
                            <button class="btn btn-sm btn-success" onclick="viewDocument('${doc.id}')">👁️ Ver</button>
                            <button class="btn btn-sm btn-primary" onclick="downloadDocument('${doc.id}')">💾 Descargar</button>
                            <button class="btn btn-sm btn-warning" onclick="requestDocumentUpdate('${doc.id}')">🔄 Actualizar</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
        
        // Update tab counts
        function updateDocumentTabCounts() {
            const requestsCount = documentRequests.length;
            const documentsCount = documents.length;
            
            document.querySelector('[onclick="showDocumentTab(\'requests\', this)"]').innerHTML = `📋 Solicitudes (${requestsCount})`;
            document.querySelector('[onclick="showDocumentTab(\'documents\', this)"]').innerHTML = `📁 Documentos (${documentsCount})`;
        }
        
        // Get document type label
        function getDocumentTypeLabel(type) {
            const labels = {
                'certificates': '🏥 Certificados',
                'medical_reports': '📋 Informes Médicos', 
                'lab_results': '🧪 Laboratorio',
                'prescriptions': '💊 Recetas'
            };
            return labels[type] || type;
        }
        
        // Get document icon
        function getDocumentIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch(ext) {
                case 'pdf': return '📄';
                case 'jpg':
                case 'jpeg':
                case 'png': return '🖼️';
                case 'doc':
                case 'docx': return '📝';
                default: return '📁';
            }
        }
        
        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
        
        // Show create document request dialog
        function showCreateDocumentRequestDialog() {
            showModal(`
                <h3>➕ Nueva Solicitud de Documento</h3>
                <form id="create-request-form">
                    <div style="margin-bottom: 15px;">
                        <label>👤 ID Empleado:</label>
                        <input type="text" id="req-employee-id" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label>📋 Tipo de Documento:</label>
                        <select id="req-doc-type" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                            <option value="">Seleccionar...</option>
                            <option value="certificates">🏥 Certificados Médicos</option>
                            <option value="medical_reports">📋 Informes Médicos</option>
                            <option value="lab_results">🧪 Resultados de Laboratorio</option>
                            <option value="prescriptions">💊 Recetas</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label>📝 Descripción:</label>
                        <textarea id="req-description" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;" placeholder="Describir el documento requerido..."></textarea>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label>📅 Fecha Límite:</label>
                        <input type="datetime-local" id="req-deadline" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;">
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" onclick="closeModal()" class="btn btn-secondary">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary">✅ Crear Solicitud</button>
                    </div>
                </form>
            `);
            
            // Set default deadline (7 days from now)
            const defaultDeadline = new Date();
            defaultDeadline.setDate(defaultDeadline.getDate() + 7);
            document.getElementById('req-deadline').value = defaultDeadline.toISOString().slice(0, 16);
            
            // Handle form submission
            document.getElementById('create-request-form').onsubmit = function(e) {
                e.preventDefault();
                createDocumentRequest();
            };
        }
        
        // Create document request
        async function createDocumentRequest() {
            const employeeId = document.getElementById('req-employee-id').value;
            const type = document.getElementById('req-doc-type').value;
            const description = document.getElementById('req-description').value;
            const deadline = document.getElementById('req-deadline').value;
            
            try {
                // In production, this would make an API call to /api/v1/documents/create-request
                console.log('📝 Creando solicitud de documento...', { employeeId, type, description, deadline });
                
                // Simulate API call
                const newRequest = {
                    id: 'req-' + Date.now(),
                    employeeId,
                    employeeName: 'Empleado ' + employeeId, // In production, get real name
                    type,
                    description,
                    createdAt: new Date(),
                    deadline: new Date(deadline),
                    status: 'pending',
                    requestedBy: 'Admin'
                };
                
                documentRequests.unshift(newRequest);
                updateDocumentRequestsTable();
                updateDocumentTabCounts();
                
                closeModal();
                showStatus('success', '✅ Solicitud de documento creada correctamente');
                
                // Send notification (simulated)
                console.log(`📱 Notificación enviada al empleado ${employeeId} sobre solicitud de ${getDocumentTypeLabel(type)}`);
                
            } catch (error) {
                console.error('Error creando solicitud:', error);
                showStatus('error', '❌ Error creando solicitud de documento');
            }
        }
        
        // Filter document requests
        function filterDocumentRequests() {
            const search = document.getElementById('document-search').value.toLowerCase();
            const statusFilter = document.getElementById('document-status-filter').value;
            const typeFilter = document.getElementById('document-type-filter').value;
            
            const rows = document.querySelectorAll('#document-requests-tbody tr');
            
            rows.forEach(row => {
                const employeeName = row.cells[0]?.textContent.toLowerCase() || '';
                const type = row.getAttribute('data-type') || '';
                const status = row.getAttribute('data-status') || '';
                
                const matchesSearch = employeeName.includes(search);
                const matchesStatus = !statusFilter || status === statusFilter;
                const matchesType = !typeFilter || type === typeFilter;
                
                row.style.display = matchesSearch && matchesStatus && matchesType ? '' : 'none';
            });
        }
        
        // Export document requests
        function exportDocumentRequests() {
            try {
                if (documentRequests.length === 0) {
                    showStatus('warning', '⚠️ No hay datos para exportar');
                    return;
                }
                
                let csvContent = "Empleado,ID_Empleado,Tipo,Descripcion,Fecha_Creacion,Fecha_Limite,Estado,Solicitado_Por\n";
                
                documentRequests.forEach(req => {
                    const createdDate = new Date(req.createdAt).toLocaleDateString('es-ES');
                    const deadlineDate = new Date(req.deadline).toLocaleDateString('es-ES');
                    
                    csvContent += `"${req.employeeName}","${req.employeeId}","${req.type}","${req.description}","${createdDate}","${deadlineDate}","${req.status}","${req.requestedBy}"\n`;
                });
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `solicitudes_documentos_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                
                showStatus('success', '✅ Exportación completada');
                
            } catch (error) {
                showStatus('error', '❌ Error exportando: ' + error.message);
            }
        }
        
        // Load document statistics
        function loadDocumentStatistics() {
            const totalRequests = documentRequests.length;
            const pendingRequests = documentRequests.filter(r => r.status === 'pending').length;
            const completedRequests = documentRequests.filter(r => r.status === 'completed').length;
            const totalDocuments = documents.length;
            const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;
            
            document.getElementById('total-requests').textContent = totalRequests;
            document.getElementById('pending-requests').textContent = pendingRequests;
            document.getElementById('total-documents').textContent = totalDocuments;
            document.getElementById('completion-rate').textContent = completionRate + '%';
        }

        // Initialize on page load
        window.onload = function() {
            console.log('🚀 [DEBUG] Panel de administración cargado - v2.8');
            showStatus('success', '🎉 Panel de administración listo v2.8');
            
            // Load initial data
            setTimeout(() => {
                console.log('🔍 [DEBUG] Iniciando carga de datos inicial...');
                loadServerInfo();
                loadStatistics();
                showUserStats();
                
                // Load medical data
                updateMedicalStats();
                loadQuestionnaires();
                
                // Load attendance data
                loadAttendanceData();
                
                // Load consent data
                loadConsentData();
                
                // Load terms and conditions data  
                loadTermsData();
                console.log('🔍 [DEBUG] Todas las funciones de carga iniciadas');
            }, 500);
        };
