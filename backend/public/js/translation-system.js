// Translation System v3.9.0 - Dynamic & Automatic (Fixed infinite loop)
// Sistema de traducción multiidioma automático y dinámico para Aponnt
console.log('🌍 [TRANSLATION] Sistema de traducción avanzado cargado v3.9.0 - FIXED');

class TranslationSystem {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.translations = {};
        this.missingTranslations = new Set(); // Registro de traducciones faltantes
        this.autoTranslateMode = true; // Modo de traducción automática
        this.supportedLanguages = {
            'es': { name: 'Español', flag: '🇪🇸' },
            'en': { name: 'English', flag: '🇺🇸' },
            'pt': { name: 'Português', flag: '🇧🇷' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'it': { name: 'Italiano', flag: '🇮🇹' },
            'fr': { name: 'Français', flag: '🇫🇷' }
        };
        
        // Cargar idioma guardado del usuario
        this.loadUserLanguagePreference();
        
        // Inicializar observadores dinámicos
        this.initializeDynamicObservers();
    }

    // Cargar preferencia de idioma del usuario
    loadUserLanguagePreference() {
        // Prioridad: 1. localStorage del usuario, 2. configuración de licencia, 3. español
        const userLang = localStorage.getItem('user_language');
        const licenseLang = localStorage.getItem('license_default_language');
        
        if (userLang && this.supportedLanguages[userLang]) {
            this.currentLanguage = userLang;
            console.log(`🌍 [TRANSLATION] Idioma del usuario: ${this.currentLanguage}`);
        } else if (licenseLang && this.supportedLanguages[licenseLang]) {
            this.currentLanguage = licenseLang;
            console.log(`🌍 [TRANSLATION] Idioma de licencia: ${this.currentLanguage}`);
        } else {
            console.log(`🌍 [TRANSLATION] Idioma por defecto: ${this.currentLanguage}`);
        }
        
        console.log(`🌍 [TRANSLATION] Idioma activo: ${this.currentLanguage}`);
    }

    // Cargar archivo de traducción
    async loadTranslations(language) {
        if (this.translations[language]) {
            return this.translations[language];
        }

        try {
            const response = await fetch(`/locales/${language}.json`);
            if (!response.ok) {
                throw new Error(`Error loading ${language} translations`);
            }
            
            this.translations[language] = await response.json();
            console.log(`✅ [TRANSLATION] Traducciones cargadas para ${language}`);
            return this.translations[language];
        } catch (error) {
            console.error(`❌ [TRANSLATION] Error cargando traducciones ${language}:`, error);
            // Fallback al español si falla cargar otro idioma
            if (language !== 'es') {
                return await this.loadTranslations('es');
            }
            return {};
        }
    }

    // Función principal de traducción
    async t(key, params = {}) {
        // Cargar traducciones del idioma actual si no están cargadas
        if (!this.translations[this.currentLanguage]) {
            await this.loadTranslations(this.currentLanguage);
        }

        const translation = this.getNestedValue(this.translations[this.currentLanguage], key);
        
        if (!translation) {
            // Registrar traducción faltante
            this.registerMissingTranslation(key);
            
            // Fallback al español
            if (this.currentLanguage !== 'es') {
                if (!this.translations['es']) {
                    await this.loadTranslations('es');
                }
                const spanishTranslation = this.getNestedValue(this.translations['es'], key);
                if (spanishTranslation) {
                    return this.replaceParams(spanishTranslation, params);
                }
            }
            return key; // Devolver la clave si no hay traducción
        }

        return this.replaceParams(translation, params);
    }

    // Obtener valor anidado del objeto de traducciones
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Reemplazar parámetros en la traducción
    replaceParams(text, params) {
        let result = text;
        Object.keys(params).forEach(key => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), params[key]);
        });
        return result;
    }

    // Cambiar idioma
    async changeLanguage(newLanguage) {
        if (!this.supportedLanguages[newLanguage]) {
            console.error(`❌ [TRANSLATION] Idioma no soportado: ${newLanguage}`);
            return false;
        }

        this.currentLanguage = newLanguage;
        localStorage.setItem('user_language', newLanguage);
        
        // Cargar traducciones del nuevo idioma
        await this.loadTranslations(newLanguage);
        
        console.log(`🔄 [TRANSLATION] Idioma cambiado a: ${newLanguage}`);
        
        // Actualizar toda la interfaz
        await this.updateInterface();
        
        // Disparar evento de cambio de idioma
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: newLanguage } 
        }));
        
        return true;
    }

    // Actualizar toda la interfaz con el nuevo idioma
    async updateInterface() {
        console.log('🔄 [TRANSLATION] Actualizando interfaz...');
        console.log('🔄 [TRANSLATION] Idioma actual:', this.currentLanguage);

        // DEBUG: Verificar contenido de modulesContainer
        const modulesContainer = document.getElementById('modulesContainer');
        if (modulesContainer) {
            console.log('🔍 [DEBUG] modulesContainer existe:', !!modulesContainer);
            console.log('🔍 [DEBUG] modulesContainer.innerHTML length:', modulesContainer.innerHTML.length);
            console.log('🔍 [DEBUG] Módulos en container:', modulesContainer.querySelectorAll('[data-translate]').length);
        } else {
            console.warn('⚠️ [DEBUG] modulesContainer NO EXISTE');
        }

        // Actualizar elementos con atributo data-translate
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        console.log('🔄 [TRANSLATION] Elementos encontrados con [data-translate]:', elementsToTranslate.length);

        for (const element of elementsToTranslate) {
            const key = element.getAttribute('data-translate');
            const translation = await this.t(key);
            console.log(`🔄 [TRANSLATION] ${key} → ${translation}`);
            element.textContent = translation;
        }

        // Actualizar placeholders
        const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
        for (const element of placeholderElements) {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = await this.t(key);
        }

        // Actualizar títulos/tooltips
        const titleElements = document.querySelectorAll('[data-translate-title]');
        for (const element of titleElements) {
            const key = element.getAttribute('data-translate-title');
            element.title = await this.t(key);
        }

        // Actualizar encabezado
        this.updateHeader();
        
        // Actualizar módulo activo si existe
        if (window.currentModule) {
            this.updateCurrentModule();
        }
    }

    // Actualizar encabezado
    async updateHeader() {
        const systemTitle = document.querySelector('#systemTitle');
        if (systemTitle) {
            systemTitle.textContent = await this.t('header.system_title');
        }

        const developedBy = document.querySelector('#developedBy');
        if (developedBy) {
            developedBy.textContent = await this.t('header.developed_by');
        }
    }

    // Actualizar módulo actual
    async updateCurrentModule() {
        // Esta función se sobrescribirá por cada módulo
        if (window.currentModuleTranslationUpdate) {
            await window.currentModuleTranslationUpdate();
        }
    }

    // Crear selector de idioma
    createLanguageSelector() {
        const selector = document.createElement('select');
        selector.id = 'languageSelector';
        selector.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 4px;
            color: white;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
        `;

        // Agregar opciones
        Object.keys(this.supportedLanguages).forEach(langCode => {
            const option = document.createElement('option');
            option.value = langCode;
            option.textContent = `${this.supportedLanguages[langCode].flag} ${this.supportedLanguages[langCode].name}`;
            option.style.color = '#333';
            
            if (langCode === this.currentLanguage) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });

        // Event listener para cambio de idioma
        selector.addEventListener('change', async (event) => {
            await this.changeLanguage(event.target.value);
        });

        return selector;
    }

    // Obtener idioma actual
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Obtener idiomas soportados
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // Establecer idioma predeterminado de licencia
    setLicenseDefaultLanguage(language) {
        if (!this.supportedLanguages[language]) {
            console.error(`❌ [TRANSLATION] Idioma de licencia no soportado: ${language}`);
            return false;
        }

        localStorage.setItem('license_default_language', language);
        console.log(`🏢 [TRANSLATION] Idioma predeterminado de licencia establecido: ${language}`);
        
        // Si el usuario no ha seleccionado un idioma personal, usar el de la licencia
        const userLang = localStorage.getItem('user_language');
        if (!userLang) {
            this.changeLanguage(language);
        }
        
        return true;
    }

    // Obtener idioma predeterminado de licencia
    getLicenseDefaultLanguage() {
        return localStorage.getItem('license_default_language') || 'es';
    }

    // Inicializar observadores dinámicos para contenido nuevo
    initializeDynamicObservers() {
        // Observer para cambios en el DOM
        this.domObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.translateNewElements(node);
                        }
                    });
                }
            });
        });

        // Iniciar observación del DOM
        if (document.body) {
            this.domObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            console.warn('🔍 [TRANSLATION] document.body no está disponible aún, reintentando...');
            setTimeout(() => this.initializeDynamicObservers(), 100);
            return;
        }

        console.log('🔍 [TRANSLATION] Observador dinámico del DOM iniciado');
    }

    // Traducir elementos nuevos automáticamente
    async translateNewElements(container) {
        if (!this.autoTranslateMode) return;

        // Elementos con atributo data-translate
        const elementsToTranslate = container.querySelectorAll('[data-translate]');
        for (const element of elementsToTranslate) {
            const key = element.getAttribute('data-translate');
            element.textContent = await this.t(key);
        }

        // Elementos con placeholders
        const placeholderElements = container.querySelectorAll('[data-translate-placeholder]');
        for (const element of placeholderElements) {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = await this.t(key);
        }

        // Elementos con títulos/tooltips
        const titleElements = container.querySelectorAll('[data-translate-title]');
        for (const element of titleElements) {
            const key = element.getAttribute('data-translate-title');
            element.title = await this.t(key);
        }
    }

    // Traducir automáticamente textos comunes sin atributos
    async autoTranslateCommonTexts(container = document) {
        const commonTexts = {
            // Acciones básicas
            'Guardar': 'common.save',
            'Cancelar': 'common.cancel',
            'Eliminar': 'common.delete',
            'Editar': 'common.edit',
            'Ver': 'common.view',
            'Agregar': 'common.add',
            'Buscar': 'common.search',
            'Confirmar': 'common.confirm',
            'Aceptar': 'common.accept',
            'Rechazar': 'common.reject',
            'Enviar': 'common.submit',
            'Restablecer': 'common.reset',
            'Limpiar': 'common.clear',
            'Seleccionar': 'common.select',
            'Elegir': 'common.choose',
            'Subir': 'common.upload',
            'Descargar': 'common.download',
            'Imprimir': 'common.print',
            'Exportar': 'common.export',
            'Importar': 'common.import',
            'Actualizar': 'common.refresh',
            'Recargar': 'common.reload',
            
            // Estados y feedback
            'Cargando...': 'common.loading',
            'Error': 'common.error',
            'Éxito': 'common.success',
            'Advertencia': 'common.warning',
            'Información': 'common.info',
            'Procesando': 'common.processing',
            'Completado': 'common.completed',
            'Fallido': 'common.failed',
            'Pendiente': 'common.pending',
            
            // Navegación
            'Cerrar': 'common.close',
            'Volver': 'common.back',
            'Siguiente': 'common.next',
            'Anterior': 'common.previous',
            'Sí': 'common.yes',
            'No': 'common.no',
            'Configuración': 'common.settings',
            'Ayuda': 'common.help',
            'Menú': 'common.menu',
            'Perfil': 'common.profile',
            'Tablero': 'common.dashboard',
            
            // Campos comunes
            'Nombre': 'common.name',
            'Email': 'common.email',
            'Teléfono': 'common.phone',
            'Dirección': 'common.address',
            'Estado': 'common.status',
            'Acciones': 'common.actions',
            'Activo': 'common.active',
            'Inactivo': 'common.inactive',
            'Fecha': 'common.date',
            'Hora': 'common.time',
            'Descripción': 'common.description',
            'Título': 'common.title',
            'Categoría': 'common.category',
            'Tipo': 'common.type',
            
            // Estados específicos
            'Habilitado': 'common.enabled',
            'Deshabilitado': 'common.disabled',
            'Visible': 'common.visible',
            'Oculto': 'common.hidden',
            'Requerido': 'common.required',
            'Opcional': 'common.optional',
            'Disponible': 'common.available',
            'No disponible': 'common.unavailable',
            'En línea': 'common.online',
            'Fuera de línea': 'common.offline',
            'Conectado': 'common.connected',
            'Desconectado': 'common.disconnected',
            
            // Validaciones y mensajes
            'Sin datos': 'common.no_data',
            'Sin resultados': 'common.no_results',
            'No encontrado': 'common.not_found',
            'Acceso denegado': 'common.access_denied',
            'Sesión expirada': 'common.session_expired',
            'Error de conexión': 'common.connection_error',
            'Datos inválidos': 'common.invalid_data',
            'Campo requerido': 'common.required_field',
            'Formato inválido': 'common.invalid_format',
            'Seleccione una opción': 'common.select_option',
            'Ingrese texto': 'common.enter_text',
            'Seleccionar archivo': 'common.choose_file'
        };

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (commonTexts[text]) {
                const translation = await this.t(commonTexts[text]);
                node.textContent = node.textContent.replace(text, translation);
            }
        }
    }

    // Registrar traducción faltante
    registerMissingTranslation(key) {
        this.missingTranslations.add(key);
        console.warn(`⚠️ [TRANSLATION] Traducción faltante registrada: ${key} en ${this.currentLanguage}`);
    }

    // Obtener lista de traducciones faltantes
    getMissingTranslations() {
        return Array.from(this.missingTranslations);
    }

    // Obtener mapeo de textos comunes para traducción automática
    getCommonTexts() {
        return {
            // Acciones básicas
            'Guardar': 'common.save',
            'Cancelar': 'common.cancel',
            'Eliminar': 'common.delete',
            'Editar': 'common.edit',
            'Ver': 'common.view',
            'Agregar': 'common.add',
            'Buscar': 'common.search',
            'Confirmar': 'common.confirm',
            'Aceptar': 'common.accept',
            'Rechazar': 'common.reject',
            'Enviar': 'common.submit',
            'Restablecer': 'common.reset',
            'Limpiar': 'common.clear',
            'Seleccionar': 'common.select',
            'Elegir': 'common.choose',
            
            // Estados y feedback
            'Cargando...': 'common.loading',
            'Error': 'common.error',
            'Éxito': 'common.success',
            'Procesando': 'common.processing',
            'Completado': 'common.completed',
            
            // Campos comunes
            'Ingrese su nombre': 'common.enter_text',
            'Seleccione una opción': 'common.select_option',
            'Seleccionar archivo': 'common.choose_file',
            'Ingrese email': 'common.email',
            'Ingrese teléfono': 'common.phone',
            'Ingrese dirección': 'common.address'
        };
    }

    // Función de utilidad para traducir múltiples elementos
    async translateElements(elements) {
        for (const [selector, key] of Object.entries(elements)) {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = await this.t(key);
            }
        }
    }

    // Función para traducir formularios completos
    async translateForm(formElement) {
        // Labels
        const labels = formElement.querySelectorAll('label[data-translate]');
        for (const label of labels) {
            const key = label.getAttribute('data-translate');
            label.textContent = await this.t(key);
        }

        // Inputs con placeholders
        const inputs = formElement.querySelectorAll('input[data-translate-placeholder], textarea[data-translate-placeholder]');
        for (const input of inputs) {
            const key = input.getAttribute('data-translate-placeholder');
            input.placeholder = await this.t(key);
        }

        // Botones
        const buttons = formElement.querySelectorAll('button[data-translate], input[type="submit"][data-translate]');
        for (const button of buttons) {
            const key = button.getAttribute('data-translate');
            if (button.tagName === 'INPUT') {
                button.value = await this.t(key);
            } else {
                button.textContent = await this.t(key);
            }
        }

        // Selects y options
        const selects = formElement.querySelectorAll('select[data-translate-options]');
        for (const select of selects) {
            const optionsKey = select.getAttribute('data-translate-options');
            const options = select.querySelectorAll('option[data-translate]');
            for (const option of options) {
                const key = option.getAttribute('data-translate');
                option.textContent = await this.t(key);
            }
        }
    }

    // Función para traducir tablas
    async translateTable(tableElement) {
        // Headers
        const headers = tableElement.querySelectorAll('th[data-translate]');
        for (const header of headers) {
            const key = header.getAttribute('data-translate');
            header.textContent = await this.t(key);
        }

        // Celdas con data-translate
        const cells = tableElement.querySelectorAll('td[data-translate]');
        for (const cell of cells) {
            const key = cell.getAttribute('data-translate');
            cell.textContent = await this.t(key);
        }
    }

    // Función para traducir modales
    async translateModal(modalElement) {
        // Título del modal
        const title = modalElement.querySelector('.modal-title[data-translate], h1[data-translate], h2[data-translate], h3[data-translate]');
        if (title) {
            const key = title.getAttribute('data-translate');
            title.textContent = await this.t(key);
        }

        // Contenido del modal
        await this.translateNewElements(modalElement);
        
        // Traducir formularios dentro del modal
        const forms = modalElement.querySelectorAll('form');
        for (const form of forms) {
            await this.translateForm(form);
        }
    }
}

// Crear instancia global
window.translator = new TranslationSystem();

// Función global para traducción rápida
window.t = async (key, params) => {
    return await window.translator.t(key, params);
};

// Funciones globales para traducción automática
window.translatePage = async function() {
    console.log('🌍 [TRANSLATION] Traduciendo página completa...');
    await window.translator.updateInterface();
    await window.translator.autoTranslateCommonTexts();
    console.log('✅ [TRANSLATION] Página traducida completamente');
};

window.translateElement = async function(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        await window.translator.translateNewElements(element);
    }
};

window.translateForm = async function(form) {
    if (typeof form === 'string') {
        form = document.querySelector(form);
    }
    if (form) {
        await window.translator.translateForm(form);
    }
};

window.translateModal = async function(modal) {
    if (typeof modal === 'string') {
        modal = document.querySelector(modal);
    }
    if (modal) {
        await window.translator.translateModal(modal);
    }
};

window.translateTable = async function(table) {
    if (typeof table === 'string') {
        table = document.querySelector(table);
    }
    if (table) {
        await window.translator.translateTable(table);
    }
};

// Función para auto-traducir mensajes comunes - DEBE IR ANTES DE LOS PROXIES
window.translator.autoTranslateMessage = async function(message) {
    const commonMessages = {
        '¿Está seguro?': 'common.are_you_sure',
        'Elemento eliminado': 'common.item_deleted',
        'Operación exitosa': 'common.operation_successful',
        'Error al procesar': 'common.processing_error',
        'Por favor complete': 'common.please_complete',
        'Datos guardados': 'common.data_saved'
    };

    for (const [spanish, key] of Object.entries(commonMessages)) {
        if (message.includes(spanish)) {
            const translation = await this.t(key);
            return message.replace(spanish, translation);
        }
    }

    return message; // Devolver mensaje original si no hay traducción
};

// Función para traducir mensajes alert/confirm/prompt
window.alert = new Proxy(window.alert, {
    apply: async function(target, thisArg, argumentsList) {
        const message = argumentsList[0];
        const translatedMessage = await window.translator.autoTranslateMessage(message);
        return target.call(thisArg, translatedMessage);
    }
});

window.confirm = new Proxy(window.confirm, {
    apply: async function(target, thisArg, argumentsList) {
        const message = argumentsList[0];
        const translatedMessage = await window.translator.autoTranslateMessage(message);
        return target.call(thisArg, translatedMessage);
    }
});

// Interceptar creación de elementos HTML para traducción automática
const originalCreateElement = document.createElement;
document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    // Agregar observer para cuando el elemento sea añadido al DOM
    const originalSetTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set;
    Object.defineProperty(element, 'textContent', {
        set: function(value) {
            originalSetTextContent.call(this, value);
            // Auto-traducir si el elemento ya está en el DOM
            if (this.isConnected && window.translator && window.translator.autoTranslateMode) {
                setTimeout(() => window.translator.autoTranslateCommonTexts(this), 0);
            }
        },
        get: function() {
            return originalSetTextContent ? this.nodeValue : '';
        },
        configurable: true
    });
    
    return element;
};

// Interceptar innerHTML para traducir automáticamente
const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
const originalSetInnerHTML = originalInnerHTMLDescriptor.set;
const originalGetInnerHTML = originalInnerHTMLDescriptor.get;

Object.defineProperty(Element.prototype, 'innerHTML', {
    set: function(value) {
        originalSetInnerHTML.call(this, value);
        // Auto-traducir después de establecer innerHTML
        if (window.translator && window.translator.autoTranslateMode) {
            setTimeout(() => {
                window.translator.translateNewElements(this);
                window.translator.autoTranslateCommonTexts(this);
            }, 0);
        }
    },
    get: function() {
        return originalGetInnerHTML.call(this);
    },
    configurable: true
});

// Interceptar appendChild para traducir automáticamente
const originalAppendChild = Element.prototype.appendChild;
Element.prototype.appendChild = function(child) {
    const result = originalAppendChild.call(this, child);
    
    // Auto-traducir el elemento hijo
    if (child.nodeType === Node.ELEMENT_NODE && window.translator && window.translator.autoTranslateMode) {
        setTimeout(() => {
            window.translator.translateNewElements(child);
            window.translator.autoTranslateCommonTexts(child);
        }, 0);
    }
    
    return result;
};

// Interceptar insertAdjacentHTML para traducir automáticamente
const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
Element.prototype.insertAdjacentHTML = function(position, text) {
    const result = originalInsertAdjacentHTML.call(this, position, text);
    
    // Auto-traducir después de insertar HTML
    if (window.translator && window.translator.autoTranslateMode) {
        setTimeout(() => {
            window.translator.translateNewElements(this);
            window.translator.autoTranslateCommonTexts(this);
        }, 0);
    }
    
    return result;
};

// Interceptar setAttribute para traducir placeholders y títulos automáticamente
const originalSetAttribute = Element.prototype.setAttribute;
Element.prototype.setAttribute = function(name, value) {
    const result = originalSetAttribute.call(this, name, value);
    
    // Auto-traducir placeholders y títulos
    if (window.translator && window.translator.autoTranslateMode) {
        if (name === 'placeholder' || name === 'title') {
            const commonTexts = window.translator.getCommonTexts();
            if (commonTexts[value]) {
                setTimeout(async () => {
                    const translation = await window.translator.t(commonTexts[value]);
                    originalSetAttribute.call(this, name, translation);
                }, 0);
            }
        }
    }
    
    return result;
};

// Sistema de ayuda y documentación
window.translator.help = function() {
    console.log(`
🌍 === SISTEMA DE TRADUCCIÓN AUTOMÁTICO v2.0 ===

📋 FUNCIONES PRINCIPALES:
• translatePage() - Traduce toda la página actual
• translateElement(selector) - Traduce un elemento específico  
• translateForm(selector) - Traduce un formulario completo
• translateModal(selector) - Traduce un modal completo
• translateTable(selector) - Traduce una tabla completa
• t(key, params) - Traduce una clave específica

🔧 ATRIBUTOS PARA DESARROLLO:
• data-translate="key" - Traduce el contenido del elemento
• data-translate-placeholder="key" - Traduce el placeholder
• data-translate-title="key" - Traduce el título/tooltip

📝 EJEMPLO DE USO:
<button data-translate="common.save">Guardar</button>
<input data-translate-placeholder="common.enter_text" />
<span title="Ayuda" data-translate-title="common.help"></span>

🚀 TRADUCCIÓN AUTOMÁTICA:
El sistema traduce automáticamente textos comunes como:
• Guardar, Cancelar, Editar, Eliminar, Ver, Agregar
• Cargando..., Error, Éxito, Procesando
• Activo, Inactivo, Habilitado, Deshabilitado
• Y muchos más...

🌐 IDIOMAS SOPORTADOS:
• 🇪🇸 Español (predeterminado)
• 🇺🇸 English  
• 🇧🇷 Português
• 🇩🇪 Deutsch
• 🇮🇹 Italiano
• 🇫🇷 Français

💡 CONSEJOS:
1. Usa atributos data-translate para nuevos elementos
2. El sistema traduce automáticamente contenido dinámico
3. Las funciones alert() y confirm() se traducen automáticamente
4. Usa window.translator.getMissingTranslations() para ver traducciones faltantes

🔧 CONFIGURACIÓN:
• Cambiar idioma: window.translator.changeLanguage('en')
• Ver idioma actual: window.translator.getCurrentLanguage()
• Modo automático: window.translator.autoTranslateMode = true/false
`);
};

// Función para mostrar estadísticas del sistema de traducción
window.translator.stats = function() {
    const stats = {
        currentLanguage: this.getCurrentLanguage(),
        loadedLanguages: Object.keys(this.translations),
        missingTranslations: this.getMissingTranslations(),
        supportedLanguages: Object.keys(this.supportedLanguages),
        autoTranslateMode: this.autoTranslateMode
    };
    
    console.log('📊 [TRANSLATION] Estadísticas del sistema:', stats);
    return stats;
};

// Función para validar que todas las claves de traducción existan
window.translator.validateTranslations = async function() {
    console.log('🔍 [TRANSLATION] Validando traducciones...');
    
    const baseLanguage = 'es';
    if (!this.translations[baseLanguage]) {
        await this.loadTranslations(baseLanguage);
    }
    
    const baseKeys = this.getAllKeys(this.translations[baseLanguage]);
    const report = {};
    
    for (const lang of Object.keys(this.supportedLanguages)) {
        if (lang === baseLanguage) continue;
        
        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }
        
        const langKeys = this.getAllKeys(this.translations[lang]);
        const missing = baseKeys.filter(key => !langKeys.includes(key));
        
        if (missing.length > 0) {
            report[lang] = missing;
        }
    }
    
    if (Object.keys(report).length > 0) {
        console.warn('⚠️ [TRANSLATION] Traducciones faltantes:', report);
    } else {
        console.log('✅ [TRANSLATION] Todas las traducciones están completas');
    }
    
    return report;
};

// Función helper para obtener todas las claves de un objeto anidado
window.translator.getAllKeys = function(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(this.getAllKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
};

// Cargar traducciones iniciales
window.translator.loadTranslations(window.translator.currentLanguage);

console.log('✅ [TRANSLATION] Sistema de traducción avanzado listo v2.0');
console.log('💡 Usa window.translator.help() para ver la documentación completa');