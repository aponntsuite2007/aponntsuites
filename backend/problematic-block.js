            function updateDateTime() {
                const now = new Date();
                const dateOptions = { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric'
                };
                const timeOptions = {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                };
                
                const dateElement = document.getElementById('currentDate');
                const timeElement = document.getElementById('currentTime');

                if (dateElement) dateElement.textContent = now.toLocaleDateString('es-ES', dateOptions);
                if (timeElement) timeElement.textContent = now.toLocaleTimeString('es-ES', timeOptions);
            }
            
            // Ejecutar cuando el DOM esté completamente cargado
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('📅 [DATETIME] Iniciando actualización de fecha/hora...');
                    updateDateTime();
                    setInterval(updateDateTime, 1000);
                });
            } else {
                // El DOM ya está listo
                console.log('📅 [DATETIME] DOM listo, iniciando fecha/hora...');
                updateDateTime();
                setInterval(updateDateTime, 1000);
            }
            
            /* ✅ CÓDIGO FUNCIONAL PROTEGIDO - NO MODIFICAR SIN ANÁLISIS
             * 📅 Fecha: 23/SEP/2025 04:02:00
             * 🏷️ Versión: v2.1.2
             * 📋 Funcionalidad: Sistema actualización header dinámico con datos reales
             * ⚠️ IMPORTANTE: Este código maneja login, empresa y usuario - verificar impacto antes de cambios
             */
            function updateUserInfo() {
                // Esta función se llamará cuando el usuario se loguee
                console.log('🔍 [HEADER DEBUG] updateUserInfo() ejecutándose...');
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                console.log('🔍 [HEADER DEBUG] userData:', userData);

                if (userData.firstName) {
                    document.getElementById('currentUserName').textContent = `${userData.firstName} ${userData.lastName}`;
                    document.getElementById('currentUserRole').textContent = userData.role.toUpperCase();

                    // Si el usuario tiene foto, la mostramos, sino usamos iniciales
                    if (userData.photoUrl) {
                        document.getElementById('userAvatar').innerHTML = `<img src="${userData.photoUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
                    } else {
                        // Usar iniciales como avatar
                        const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
                        document.getElementById('userAvatar').textContent = initials;
                    }
                }

                // DESACTIVADO - traducción simplificada
                // // initializeLanguageSelector(); // DESACTIVADO

                // ✅ NUEVO v2.1.2: Actualizar información de empresa y foto también
                updateCompanyInfo();
                updateUserPhoto(); // ✅ Intentar cargar foto real desde módulo usuarios
            }

            /* ✅ CÓDIGO FUNCIONAL PROTEGIDO - NO MODIFICAR SIN ANÁLISIS
             * 📅 Fecha: 23/SEP/2025 04:02:00
             * 🏷️ Versión: v2.1.2
             * 📋 Funcionalidad: Sistema actualización empresa dinámico con datos reales PostgreSQL
             * ⚠️ IMPORTANTE: Este código maneja datos empresa seleccionada - verificar impacto antes de cambios
             */
            async function updateCompanyInfo() {
                try {
                    console.log('🔍 [HEADER DEBUG] updateCompanyInfo() ejecutándose...');
                    const savedCompanyStr = localStorage.getItem('selectedCompany');
                    const selectedCompany = (savedCompanyStr && savedCompanyStr !== 'undefined') ? JSON.parse(savedCompanyStr) : {};
                    console.log('🔍 [HEADER DEBUG] selectedCompany:', selectedCompany);

                    if (selectedCompany && selectedCompany?.id) {
                        // Actualizar datos de empresa en header
                        document.getElementById('companyNameDisplay').textContent = selectedCompany?.name || 'Empresa Cliente';
                        document.getElementById('companyAddressDisplay').textContent = selectedCompany.address || 'Dirección empresa';
                        document.getElementById('companyPhoneDisplay').textContent = `📞 ${selectedCompany.phone || 'Teléfono'}`;

                        console.log(`✅ [HEADER v2.1.2] Empresa actualizada: ${selectedCompany?.name}`);
                    } else {
                        console.log('⚠️ [HEADER DEBUG] No hay empresa seleccionada o falta ID');
                    }
                } catch (error) {
                    console.error('❌ [HEADER v2.1.2] Error actualizando empresa:', error);
                }
            }

            /* ✅ CÓDIGO FUNCIONAL PROTEGIDO - NO MODIFICAR SIN ANÁLISIS
             * 📅 Fecha: 23/SEP/2025 04:02:00
             * 🏷️ Versión: v2.1.2
             * 📋 Funcionalidad: Sistema actualización foto usuario desde módulo usuarios
             * ⚠️ IMPORTANTE: Este código consulta la ficha personal del usuario - verificar impacto antes de cambios
             */
            async function updateUserPhoto() {
                try {
                    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                    if (userData && userData.id) {
                        // Intentar obtener foto de la ficha personal
                        const response = await fetch(`/api/aponnt/dashboard/users/${userData.id}/profile`, {
                            headers: {
                                'Authorization': 'Bearer ' + (localStorage.getItem('token') || 'token_test'),
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response.ok) {
                            const profileData = await response.json();
                            if (profileData && profileData.photoUrl) {
                                document.getElementById('userAvatar').innerHTML =
                                    `<img src="${profileData.photoUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
                                console.log('✅ [HEADER v2.1.2] Foto usuario actualizada desde ficha personal');
                                return;
                            }
                        }

                        // Fallback: usar iniciales si no hay foto
                        if (userData.firstName && userData.lastName) {
                            const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
                            document.getElementById('userAvatar').textContent = initials;
                            console.log('✅ [HEADER v2.1.2] Usando iniciales como avatar');
                        }
                    }
                } catch (error) {
                    console.error('❌ [HEADER v2.1.2] Error actualizando foto usuario:', error);
                    // Fallback en caso de error
                    document.getElementById('userAvatar').textContent = '👤';
                }
            }
            
            // Establecer idioma inicial basado en país de empresa (MEJORADO - PLUG AND PLAY v2)
            function setInitialLanguageFromCompany() {
                try {
                    // Intentar obtener empresa desde múltiples fuentes
                    let company = window.currentCompany || window.selectedCompany;

                    if (!company) {
                        const savedCompanyStr = localStorage.getItem('selectedCompany') || localStorage.getItem('currentCompany');
                        company = (savedCompanyStr && savedCompanyStr !== 'undefined') ? JSON.parse(savedCompanyStr) : null;
                    }

                    console.log('🌍 [AUTO-LANG] Iniciando detección automática...');
                    console.log('🌍 [AUTO-LANG] Empresa:', company?.name);
                    console.log('🌍 [AUTO-LANG] Translator disponible:', !!window.translator);

                    if (!company) {
                        console.warn('⚠️ [AUTO-LANG] No hay empresa disponible');
                        return;
                    }

                    if (!window.translator) {
                        console.warn('⚠️ [AUTO-LANG] Translator no disponible, reintentando en 500ms...');
                        setTimeout(setInitialLanguageFromCompany, 500);
                        return;
                    }

                    // Detectar país desde múltiples fuentes: country, address, location
                    let detectedCountry = null;
                    const addressString = (company.country || company.address || company.location || '').toLowerCase();

                    console.log('🌍 [AUTO-LANG] Dirección completa:', addressString);

                    // Mapeo inteligente de países/palabras clave a idiomas
                    const countryPatterns = {
                        'es': ['argentina', 'españa', 'spain', 'méxico', 'mexico', 'chile', 'colombia', 'perú', 'peru', 'venezuela', 'uruguay', 'paraguay', 'bolivia', 'ecuador', 'san luis', 'buenos aires', 'madrid', 'barcelona'],
                        'en': ['united states', 'usa', 'estados unidos', 'united kingdom', 'uk', 'canada', 'australia', 'new zealand', 'ireland'],
                        'pt': ['brazil', 'brasil', 'portugal', 'são paulo', 'rio de janeiro', 'lisboa'],
                        'de': ['germany', 'alemania', 'deutschland', 'austria', 'österreich', 'schweiz', 'berlin', 'münchen'],
                        'it': ['italy', 'italia', 'rome', 'roma', 'milan', 'milano'],
                        'fr': ['france', 'francia', 'paris', 'lyon', 'marseille', 'belgium', 'bélgica', 'switzerland', 'suiza']
                    };

                    // Buscar coincidencia en la dirección
                    let detectedLanguage = 'es'; // Default: español
                    for (const [lang, patterns] of Object.entries(countryPatterns)) {
                        for (const pattern of patterns) {
                            if (addressString.includes(pattern)) {
                                detectedLanguage = lang;
                                detectedCountry = pattern;
                                console.log(`✅ [AUTO-LANG] Coincidencia encontrada: "${pattern}" → ${lang}`);
                                break;
                            }
                        }
                        if (detectedCountry) break;
                    }

                    console.log(`🌍 [AUTO-LANG] País detectado: "${detectedCountry || 'default'}" → Idioma: ${detectedLanguage}`);

                    // SIEMPRE establecer el idioma automáticamente al hacer login (ignorar user_language en login)
                    // El usuario puede cambiarlo manualmente después
                    console.log(`🔄 [AUTO-LANG] Cambiando idioma automáticamente a: ${detectedLanguage}`);

                    window.translator.changeLanguage(detectedLanguage).then(() => {
                        console.log(`✅ [AUTO-LANG] Idioma cambiado exitosamente a: ${detectedLanguage.toUpperCase()}`);

                        // Actualizar el selector de idioma para reflejar el cambio
                        setTimeout(() => {
                            const selector = document.querySelector('#languageSelectorContainer select');
                            if (selector) {
                                selector.value = detectedLanguage;
                                console.log(`✅ [AUTO-LANG] Selector actualizado a: ${detectedLanguage}`);
                            }
                        }, 200);
                    }).catch(error => {
                        console.error('❌ [AUTO-LANG] Error cambiando idioma:', error);
                    });

                } catch (error) {
                    console.error('❌ [AUTO-LANG] Error en detección automática:', error);
                }
            }

            function initializeLanguageSelector() {
                const container = document.getElementById('languageSelectorContainer');
                if (!container) {
                    console.error('❌ [HEADER] No se encontró languageSelectorContainer');
                    return;
                }

                if (container.hasChildNodes()) {
                    console.log('⚠️ [HEADER] Selector de idioma ya existe');
                    return;
                }

                if (window.translator && typeof window.translator.createLanguageSelector === 'function') {
                    try {
                        const selector = window.translator.createLanguageSelector();
                        if (selector) {
                            container.innerHTML = '';
                            container.appendChild(selector);
                            console.log('✅ [HEADER] Selector de idioma inicializado correctamente');
                            return;
                        }
                    } catch (error) {
                        console.error('❌ [HEADER] Error creando selector:', error);
                    }
                }

                // Fallback: crear selector simple si el translator no está disponible
                console.warn('⚠️ [HEADER] Usando selector de idioma fallback');
                const fallbackSelector = document.createElement('select');
                fallbackSelector.style.cssText = `
                    padding: 4px 8px;
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 4px;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    font-size: 11px;
                    min-width: 120px;
                    cursor: pointer;
                `;

                const languages = {
                    'es': '🇪🇸 ESPAÑOL',
                    'en': '🇺🇸 ENGLISH',
                    'pt': '🇧🇷 PORTUGUÊS',
                    'de': '🇩🇪 DEUTSCH',
                    'it': '🇮🇹 ITALIANO',
                    'fr': '🇫🇷 FRANÇAIS'
                };

                const currentLang = window.translator?.currentLanguage || 'es';

                Object.entries(languages).forEach(([code, name]) => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = name;
                    option.style.color = '#333';
                    option.style.background = 'white';
                    if (code === currentLang) option.selected = true;
                    fallbackSelector.appendChild(option);
                });

                fallbackSelector.addEventListener('change', async function() {
                    const selectedLang = this.value;
                    console.log('🌍 [LANGUAGE] Usuario cambió idioma a:', selectedLang);

                    if (window.translator && typeof window.translator.changeLanguage === 'function') {
                        await window.translator.changeLanguage(selectedLang);
                        console.log('✅ [LANGUAGE] Idioma cambiado con translator a:', selectedLang);
                    } else {
                        localStorage.setItem('user_language', selectedLang);
                        console.log('⚠️ [LANGUAGE] Idioma guardado sin translator, recargando...');
                        location.reload();
                    }
                });

                container.innerHTML = '';
                container.appendChild(fallbackSelector);
                console.log('✅ [HEADER] Selector de idioma fallback creado y agregado al DOM');
            }
            
            // ✅ FUNCIÓN PARA OBTENER DATOS REALES - V2.1.2
            async function loadRealCompanyData() {
                try {
                    console.log('🔄 [REAL DATA] Cargando datos reales de empresas...');

                    // Llamar a la API para obtener empresas reales
                    const response = await fetch('/api/aponnt/dashboard/companies', {
                        headers: {
                            'Authorization': 'Bearer ' + (localStorage.getItem('token') || 'token_test'),
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const companies = data.companies || data || [];
                        console.log('✅ [REAL DATA] Empresas cargadas:', companies.length);

                        // Si no hay empresa seleccionada, tomar la primera disponible
                        const savedCompanyStr = localStorage.getItem('selectedCompany');
                        const selectedCompany = (savedCompanyStr && savedCompanyStr !== 'undefined') ? JSON.parse(savedCompanyStr) : {};
                        if ((!selectedCompany || !selectedCompany?.id) && companies.length > 0) {
                            const firstCompany = companies[0];
                            localStorage.setItem('selectedCompany', JSON.stringify(firstCompany));
                            console.log('✅ [REAL DATA] Empresa seleccionada automáticamente:', firstCompany.name);
                            updateCompanyInfo(); // ✅ Actualizar UI inmediatamente
                        }
                    } else {
                        console.log('⚠️ [REAL DATA] Error cargando empresas, usando datos existentes');
                    }
                } catch (error) {
                    console.error('❌ [REAL DATA] Error:', error);
                }
            }

            async function loadRealUserData() {
                try {
                    console.log('🔄 [REAL DATA] Verificando datos reales de usuario...');

                    // Intentar obtener datos de usuario desde el token o API
                    const token = localStorage.getItem('token');
                    if (token && token !== 'token_test') {
                        // Aquí podrías decodificar el token JWT para obtener datos del usuario
                        console.log('✅ [REAL DATA] Token de usuario válido encontrado');
                    }

                    // Si no hay datos de usuario válidos, mantener los existentes o usar defaults mínimos
                    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                    if (!userData.firstName) {
                        console.log('⚠️ [REAL DATA] No hay datos de usuario, manteniendo defaults');
                    }
                } catch (error) {
                    console.error('❌ [REAL DATA] Error cargando datos usuario:', error);
                }
            }

            // ✅ BACKEND AUTO-DISCOVERY v2.4.0 - Railway Compatible
            let DETECTED_BACKEND_URL = null;

            async function discoverBackendPort() {
                // Detectar si estamos en producción
                const isProduction = !window.location.port ||
                                    window.location.hostname.includes('railway.app') ||
                                    window.location.hostname.includes('herokuapp.com') ||
                                    window.location.hostname.includes('vercel.app') ||
                                    window.location.hostname.includes('onrender.com');

                if (isProduction) {
                    // 🚂 PRODUCCIÓN: Usar la URL actual sin puerto
                    console.log('🚂 [BACKEND-DISCOVERY] Modo PRODUCCIÓN - usando URL base');
                    const testUrl = `${window.location.protocol}//${window.location.hostname}`;

                    try {
                        const response = await fetch(`${testUrl}/api/v1/health`, {
                            method: 'GET',
                            signal: AbortSignal.timeout(2000)
                        });

                        if (response.ok) {
                            console.log(`✅ [BACKEND-DISCOVERY] Backend encontrado en producción: ${testUrl}`);
                            DETECTED_BACKEND_URL = testUrl;
                            return testUrl;
                        }
                    } catch (error) {
                        console.error('❌ [BACKEND-DISCOVERY] Error en producción:', error);
                        return null;
                    }
                } else {
                    // 💻 LOCAL: Probar puertos comunes
                    console.log('💻 [BACKEND-DISCOVERY] Modo LOCAL - probando puertos');
                    const commonPorts = [window.DYNAMIC_CONFIG.port, 9997, 9998, 9999, 3000, 3001, 8080, 8000];

                    for (const port of commonPorts) {
                        try {
                            console.log(`🔍 [BACKEND-DISCOVERY] Probando puerto ${port}...`);
                            const testUrl = `http://localhost:${port}`;
                            const response = await fetch(`${testUrl}/api/v1/health`, {
                                method: 'GET',
                                signal: AbortSignal.timeout(2000)
                            });

                            if (response.ok) {
                                console.log(`✅ [BACKEND-DISCOVERY] Backend encontrado en puerto ${port}`);
                                DETECTED_BACKEND_URL = testUrl;
                                return testUrl;
                            }
                        } catch (error) {
                            console.log(`❌ [BACKEND-DISCOVERY] Puerto ${port} no disponible`);
                        }
                    }

                    console.warn('❌ [BACKEND-DISCOVERY] No se encontró backend en ningún puerto');
                }

                return null;
            }

            async function checkBackendStatus() {
                // Si no tenemos URL detectada, intentar descubrirla
                if (!DETECTED_BACKEND_URL) {
                    DETECTED_BACKEND_URL = await discoverBackendPort();
                }

                if (!DETECTED_BACKEND_URL) {
                    console.error('❌ [BACKEND-CHECK] Backend no disponible en ningún puerto');
                    return false;
                }

                try {
                    const response = await fetch(`${DETECTED_BACKEND_URL}/api/v1/health`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(3000)
                    });

                    if (response.ok) {
                        console.log(`✅ [BACKEND-CHECK] Backend verificado en ${DETECTED_BACKEND_URL}`);
                        return true;
                    } else {
                        throw new Error(`Backend responde con error: ${response.status}`);
                    }
                } catch (error) {
                    console.warn('❌ [BACKEND-CHECK] Backend no disponible:', error.message);
                    showBackendWarning();
                    return false;
                }
            }

            function showBackendWarning() {
                const warningDiv = document.createElement('div');
                warningDiv.id = 'backend-warning';
                warningDiv.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 99999;
                    color: white;
                    font-family: Arial, sans-serif;
                `;

                warningDiv.innerHTML = `
                    <div style="background: #1a1a1a; padding: 30px; border-radius: 10px; text-align: center; max-width: 500px;">
                        <h2 style="color: #ff6b6b; margin-bottom: 20px;">⚠️ Backend No Detectado</h2>
                        <p style="margin-bottom: 15px;">El sistema necesita el backend ejecutándose en puerto <strong id="dynamicPortDisplay"></strong></p>
                        <div style="background: #2d2d2d; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #4ecdc4; margin-bottom: 10px;">🚀 Para iniciar el backend:</h3>
                            <p style="font-family: monospace; background: #000; padding: 10px; border-radius: 3px;">
                                Haz doble clic en: <strong>INICIO_AUTOMATICO.bat</strong>
                            </p>
                            <p style="margin-top: 10px; font-size: 14px; color: #aaa;">
                                O abre terminal y ejecuta: <code>cd backend && PORT=9999 npm start</code>
                            </p>
                        </div>
                        <button onclick="window.location.reload()" style="
                            background: #4ecdc4;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            color: white;
                            cursor: pointer;
                            margin-right: 10px;
                        ">🔄 Verificar Nuevamente</button>
                        <button onclick="document.getElementById('backend-warning').style.display='none'" style="
                            background: #666;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            color: white;
                            cursor: pointer;
                        ">⚠️ Continuar sin Backend</button>
                    </div>
                `;

                document.body.appendChild(warningDiv);
            }

            // Llamar cuando la página se carga
            document.addEventListener('DOMContentLoaded', async () => {
                console.log('🎯 [HEADER] DOM loaded, inicializando componentes...');

                // 🚫 BYPASS DESACTIVADO - AHORA SE REQUIERE LOGIN SIEMPRE
                console.log('🔐 [NO-BYPASS] Login requerido - no hay bypass automático');

                // COMENTADO TODO EL BYPASS PARA FORZAR LOGIN:
                // window.selectedCompany = {id: 11, name: 'ISI', slug: 'isi'};
                // window.companyAuthToken = 'token...';
                // window.isAuthenticated = true;
                // (resto del código de bypass eliminado)

                // NO HAY return - continuar con flujo normal de login

                // ❌ CÓDIGO DESHABILITADO COMPLETAMENTE
                if (false) {
                // ✅ DEFINIR FUNCIÓN ANTES DE USAR v2.3.0
                function handleCompanySelection() {
                    console.log('🔥🔥🔥 [COMPANY-SELECT] FUNCIÓN EJECUTADA! Usuario seleccionó:', this.value);
                    console.log('🔍 [COMPANY-SELECT] availableCompanies:', availableCompanies);

                    if (this.value && this.value !== "") {
                        selectedCompany = availableCompanies.find(c => c.slug === this.value);
                        console.log('🔍 [COMPANY-SELECT] selectedCompany encontrada:', selectedCompany);
                        if (selectedCompany) {
                            console.log('✅ [COMPANY-SELECT] Empresa seleccionada correctamente:', selectedCompany?.name);

                            // ✅ BYPASS AUTOMÁTICO PARA ISI (Company ID: 11)
                            console.log('🔥 [DEBUG-ISI] Verificando ISI - ID:', selectedCompany?.id, 'Name:', selectedCompany?.name);
                            if (selectedCompany?.id === 11 || selectedCompany?.name?.toLowerCase().includes('isi')) {
                                console.log('🚀🚀🚀 [ISI-BYPASS] ¡¡¡APLICANDO BYPASS AUTOMÁTICO PARA ISI!!!');

                                // Asignar token JWT válido directamente
                                companyAuthToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA1OTNmOTcxLTg0NjEtNGU2Ny04MGExLTFmZGRkMTg5MzJmNCIsImVtYWlsIjoiYWRtaW5AdGVzdC1jb21wYW55LmNvbSIsImNvbXBhbnlfaWQiOjQsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1ODgxMTk1OSwiZXhwIjoxNzU4ODk4MzU5fQ.4wskIaStFAas4kVF4L6Mn3z_SXNZKfLbi97L1bem2Hc';
                                authToken = companyAuthToken;
                                isAuthenticated = true;

                                // Configurar usuario ISI
                                currentUser = {
                                    id: '0593f971-8461-4e67-80a1-1fddd18932f4',
                                    email: 'admin@isi.com',
                                    company_id: selectedCompany.id,
                                    role: 'admin',
                                    firstName: 'Admin',
                                    lastName: 'ISI'
                                };

                                console.log('✅ [ISI-BYPASS] Usuario ISI configurado automáticamente');
                            }

                            // ✅ Guardar empresa en localStorage y actualizar UI
                            localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));
                            updateCompanyInfo(); // ✅ Actualizar información en header

                            // ✅ RECARGAR MÓDULOS CUANDO CAMBIE LA EMPRESA
                            console.log('🔄 [COMPANY-SELECT] Recargando módulos para empresa:', selectedCompany?.name);
                            loadContractedModules().catch(error => {
                                console.error('❌ [COMPANY-SELECT] Error recargando módulos:', error);
                            });

                            showLoginForm();
                        } else {
                            console.error('❌ [COMPANY-SELECT] No se encontró empresa con slug:', this.value);
                            console.log('🔍 [COMPANY-SELECT] Slugs disponibles:', availableCompanies.map(c => c.slug));
                        }
                    } else {
                        console.log('⚠️ [COMPANY-SELECT] Valor vacío seleccionado');
                        hideLoginForm();
                    }
                }

                async function forceLoadCompaniesDropdown() {
                    try {
                        console.log('🔥 [FORCE-DROPDOWN] *** FORZANDO CARGA DIRECTA DE EMPRESAS ***');

                        // ✅ Usar el endpoint que sabemos que funciona
                        const apiUrl = `${window.getDynamicUrl('/api/aponnt/dashboard/companies')}`;
                        console.log('🔥 [FORCE-DROPDOWN] URL:', apiUrl);

                        const response = await fetch(apiUrl, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'}
                        });

                        if (!response.ok) {
                            throw new Error(`API error: ${response.status}`);
                        }

                        const result = await response.json();
                        console.log('🔥 [FORCE-DROPDOWN] Respuesta API:', result);

                        const companies = result.companies || result;
                        if (!Array.isArray(companies) || companies.length === 0) {
                            throw new Error('No se encontraron empresas');
                        }

                        // ✅ Actualizar availableCompanies globalmente
                        availableCompanies = companies.map(company => ({
                            id: company.company_id,
                            name: company.name,
                            slug: company.slug || company.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                            contact_email: company.contact_email || company.contactEmail,
                            phone: company.phone || company.contactPhone,
                            address: company.address,
                            is_active: company.status === 'active',
                            activeModules: company.active_modules || {},
                            modulesPricing: company.modules_pricing || {},
                            adminUser: {
                                username: (company.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '_admin',
                                email: company.contact_email || company.contactEmail,
                                role: 'company_admin'
                            }
                        }));

                        console.log(`🔥 [FORCE-DROPDOWN] Empresas procesadas: ${availableCompanies.length}`);

                        // ✅ FORZAR POBLACIÓN DEL DROPDOWN
                        const select = document.getElementById('companySelect');
                        if (select) {
                            // Limpiar opciones existentes
                            select.innerHTML = '<option value="">🏢 Seleccionar Empresa...</option>';

                            // Agregar cada empresa
                            availableCompanies.forEach(company => {
                                const option = document.createElement('option');
                                option.value = company.slug;
                                option.textContent = company.name;
                                option.setAttribute('data-company-id', company.company_id);
                                select.appendChild(option);
                                console.log(`🔥 [FORCE-DROPDOWN] ✓ ${company.name} agregada`);
                            });

                            // ✅ AGREGAR EVENT LISTENER DIRECTO AQUÍ
                            select.onchange = function() {
                                console.log('🚨 [DROPDOWN] CHANGE DETECTADO:', this.value);
                                if (this.value && this.value !== "") {
                                    selectedCompany = availableCompanies.find(c => c.slug === this.value);
                                    if (selectedCompany) {
                                        console.log('✅ Empresa seleccionada:', selectedCompany?.name);
                                        localStorage.setItem('selectedCompany', JSON.stringify(selectedCompany));

                                        // ❌ LOGIN DESHABILITADO - BYPASS ISI DIRECTO
                                        console.log('🚫 [LOGIN-FORM] Login form deshabilitado - bypass ISI');
                                        const form = document.getElementById('loginForm');
                                        if (form) {
                                            form.style.display = 'none !important';
                                            console.log('❌ [LOGIN-FORM] Formulario forzado oculto');
                                        }

                                        // ✅ BYPASS DIRECTO AL DASHBOARD PARA ISI
                                        console.log('🚀 [ISI-BYPASS] Saltando login - acceso directo al dashboard');
                                        loadCoreInterface();
                                        return; // ✅ CORTAR EJECUCIÓN AQUÍ

                                        // ❌ CÓDIGO DE LOGIN DESHABILITADO COMPLETAMENTE
                                        if (false) {
                                            // ✅ LOGIN DIRECTO CON API
                                            const loginButton = document.getElementById('loginButton');
                                            if (loginButton) {
                                                loginButton.onclick = async function() {
                                                    console.log('🔐 [LOGIN] Iniciando login directo');

                                                    const username = document.getElementById('userEmail')?.value.trim();
                                                    const password = document.getElementById('userPassword')?.value.trim();

                                                    if (!username || !password) {
                                                        alert('❌ Usuario y contraseña requeridos');
                                                        return;
                                                    }

                                                    if (!selectedCompany) {
                                                        alert('❌ Selecciona una empresa');
                                                        return;
                                                    }

                                                    // ✅ USAR SISTEMA DE AUTH REAL CON JWT
                                                    console.log('🔐 [AUTH] Usando autenticación real con JWT');
                                                    console.log('🏢 [AUTH] Empresa:', selectedCompany?.name, 'ID:', selectedCompany?.id);
                                                    console.log('👤 [AUTH] Usuario:', username);

                                                    if (!selectedCompany) {
                                                        alert('❌ Error: No se pudo cargar información de la empresa');
                                                        return;
                                                    }

                                                    // USAR AUTENTICACIÓN REAL CON LA API
                                                    try {
                                                        console.log('🌐 [AUTH] Enviando petición de login...');
                                                        const response = await fetch('/api/v1/auth/login', {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json'
                                                            },
                                                            body: JSON.stringify({
                                                                identifier: username,
                                                                password: password,
                                                                companyId: selectedCompany.id
                                                            })
                                                        });

                                                        const authData = await response.json();

                                                        if (response.ok && authData.token) {
                                                            console.log('✅ [AUTH] Login exitoso con JWT');
                                                            console.log('👤 [AUTH] Usuario autenticado:', authData.user.firstName, authData.user.lastName);

                                                            // Guardar token JWT y datos del usuario - REACTIVADO para módulos biométricos
                                                            localStorage.setItem('authToken', authData.token);
                                                            localStorage.setItem('refreshToken', authData.refreshToken || '');
                                                            localStorage.setItem('currentUser', JSON.stringify({
                                                                id: authData.user.user_id,
                                                                employeeId: authData.user.employeeId,
                                                                username: authData.user.email,
                                                                firstName: authData.user.firstName,
                                                                lastName: authData.user.lastName,
                                                                email: authData.user.email,
                                                                role: authData.user.role,
                                                                company_id: selectedCompany.id,
                                                                isAuthenticated: true
                                                            }));

                                                            // Ocultar formulario de login
                                                            form.style.display = 'none';

                                                            // Mostrar dashboard
                                                            const dashboard = document.getElementById('dashboardContent');
                                                            const moduleGrid = document.getElementById('moduleGrid');

                                                            if (dashboard) {
                                                                dashboard.style.display = 'block';
                                                            }
                                                            if (moduleGrid) {
                                                                moduleGrid.style.display = 'block';
                                                            }

                                                            console.log('✅ [AUTH] Login exitoso - Dashboard habilitado');
                                                            alert('✅ Login exitoso para: ' + authData.user.firstName + ' ' + authData.user.lastName + ' en empresa: ' + selectedCompany.name);

                                                            // Cargar módulos de la empresa
                                                            window.location.reload();

                                                        } else {
                                                            // Error en el login
                                                            console.error('❌ [AUTH] Error de login:', authData.error || 'Error desconocido');
                                                            alert('❌ Error de login: ' + (authData.error || 'Credenciales inválidas'));
                                                        }

                                                    } catch (error) {
                                                        console.error('❌ [AUTH] Error de conexión:', error);
                                                        alert('❌ Error de conexión al servidor. Verifica tu conexión a internet.');
                                                    }
                                                };
                                                console.log('✅ [LOGIN-BUTTON] Login directo configurado');
                                            }
                                        }
                                    }
                                } // ❌ FIN CÓDIGO DESHABILITADO
                            };

                            console.log(`🔥 [FORCE-DROPDOWN] ✅ DROPDOWN POBLADO CON ${availableCompanies.length} EMPRESAS`);

                            console.log('🔥 [FORCE-DROPDOWN] ✅ EVENT LISTENER DIRECTO AGREGADO');

                            return true;
                        } else {
                            console.error('🔥 [FORCE-DROPDOWN] ❌ No se encontró companySelect');
                            return false;
                        }

                    } catch (error) {
                        console.error('🔥 [FORCE-DROPDOWN] ❌ Error:', error);
                        return false;
                    }
                }

                // ✅ LIMPIAR TOKENS SI SE SOLICITA
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('clear') === '1') {
                    console.log('🧹 [CLEAR] Limpiando localStorage...');
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log('✅ [CLEAR] Storage limpiado - refrescando...');
                    window.location.href = window.location.href.split('?')[0];
                    return;
                }

                // ✅ FORCE PUERTO 9997 - Limpiar configuraciones con puerto incorrecto
                const savedConfig = localStorage.getItem('networkConfig');
                if (savedConfig && (savedConfig.includes(':9999') || savedConfig.includes(':9998'))) {
                    console.log('🔧 [FORCE] Limpiando configuración de red con puerto incorrecto');
                    localStorage.removeItem('networkConfig');
                    localStorage.removeItem('lastConnectedEndpoint');
                }

                // ✅ NUEVO v2.3.0: Descubrir backend automáticamente
                console.log('🔍 [HEADER] Iniciando descubrimiento automático de backend...');
                await discoverBackendPort();

                // ✅ Verificar backend después del descubrimiento
                const backendActive = await checkBackendStatus();

                if (backendActive) {
                    // ✅ Backend OK: Cargar datos reales
                    await loadRealCompanyData();
                    await loadRealUserData();

                    // ✅ FORZAR CARGA DE DROPDOWN v2.3.0
                    setTimeout(async () => {
                        console.log('🔄 [FORCE-DROPDOWN] Forzando carga de dropdown empresas...');
                        await forceLoadCompaniesDropdown();
                    }, 1000);
                } else {
                    // ❌ Backend no disponible: Mostrar advertencia pero continuar
                    console.warn('⚠️ [HEADER] Continuando sin backend - datos limitados');
                }

                console.log('🔍 [HEADER DEBUG] Llamando updateUserInfo()...');
                updateUserInfo();
                console.log('🔍 [HEADER DEBUG] Llamando updateCompanyInfo()...');
                updateCompanyInfo(); // ✅ NUEVO v2.1.2: Forzar actualización header empresa

                // Establecer idioma inicial basado en país de empresa
                setInitialLanguageFromCompany();

                console.log('🔍 [HEADER DEBUG] Llamando initializeLanguageSelector()...');
                initializeLanguageSelector(); // ACTIVADO

                // Inicializar sistema de traducción después de cargar
                setTimeout(() => {
                    if (window.translator) {
                        window.translator.updateInterface();
                    }
                    // Reintentar selector si no se creó
                    if (!document.getElementById('languageSelectorContainer')?.hasChildNodes()) {
                        initializeLanguageSelector();
                    }
                }, 1000);

                // Otro intento después de 3 segundos
                setTimeout(() => {
                    if (!document.getElementById('languageSelectorContainer')?.hasChildNodes()) {
                        initializeLanguageSelector();
                    }
                }, 3000);
            });
