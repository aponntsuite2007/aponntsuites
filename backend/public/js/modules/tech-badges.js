/**
 * ============================================================================
 * TECH STACK BADGES - MARKETING SUBLIMINAL PROFESIONAL
 * ============================================================================
 *
 * Genera badges de tecnologías profesionales de forma dinámica.
 * Marketing subliminal que genera confianza y percepción de valor premium.
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const TechBadges = {
    /**
     * Configuración de tecnologías a mostrar
     */
    technologies: [
        {
            name: 'ISO 8601',
            icon: '📅',
            category: 'standards',
            tooltip: 'Timestamps internacionales estándar - Precisión temporal global',
            highlight: true
        },
        {
            name: 'PostgreSQL 14+',
            icon: '🐘',
            category: 'database',
            tooltip: 'Base de datos empresarial líder - Alta disponibilidad y confiabilidad'
        },
        {
            name: 'Sequelize ORM',
            icon: '🔗',
            category: 'database',
            tooltip: 'ORM profesional - Abstracción de BD con seguridad enterprise'
        },
        {
            name: 'Node.js',
            icon: '⚡',
            category: 'infrastructure',
            tooltip: 'Backend de alto rendimiento - Arquitectura event-driven'
        },
        {
            name: 'Ollama AI',
            icon: '🧠',
            category: 'ai',
            tooltip: 'Inteligencia Artificial local (Llama 3.1 8B) - Sin costos de API'
        },
        {
            name: 'RAG System',
            icon: '📚',
            category: 'ai',
            tooltip: 'Retrieval Augmented Generation - IA contextual con Knowledge Base'
        },
        {
            name: 'WebSocket',
            icon: '🔌',
            category: 'realtime',
            tooltip: 'Comunicación en tiempo real - Actualizaciones instantáneas'
        },
        {
            name: 'Puppeteer',
            icon: '🎭',
            category: 'testing',
            tooltip: 'Testing E2E automatizado - Garantía de calidad continua'
        },
        {
            name: 'Logging Sistemático',
            icon: '📝',
            category: 'infrastructure',
            tooltip: 'Sistema de logging profesional - Trazabilidad completa'
        },
        {
            name: 'Auto-Repair',
            icon: '🔧',
            category: 'infrastructure',
            tooltip: 'Motor de auto-reparación con IA - Disponibilidad 24/7'
        },
        {
            name: 'Biometría Empresarial',
            icon: '🔐',
            category: 'security',
            tooltip: 'Control biométrico profesional - Máxima seguridad'
        },
        {
            name: 'Multi-Tenant',
            icon: '🏢',
            category: 'infrastructure',
            tooltip: 'Arquitectura multi-empresa - Aislamiento total de datos'
        }
    ],

    /**
     * Estado del componente
     */
    state: {
        isCollapsed: false,
        container: null
    },

    /**
     * Inicializar el componente
     */
    init() {
        // Verificar si ya existe para evitar duplicados
        if (document.querySelector('.tech-badges-container')) {
            console.log('[TechBadges] Ya existe, skipping...');
            return;
        }

        console.log('[TechBadges] Inicializando badges tecnológicos...');

        // Crear contenedor
        this.state.container = this.createContainer();

        // Insertar en el body
        document.body.appendChild(this.state.container);

        // Setup event listeners
        this.setupEventListeners();

        // Cargar estado guardado
        this.loadState();

        console.log('[TechBadges] ✅ Badges tecnológicos cargados');
    },

    /**
     * Crear el contenedor HTML completo
     */
    createContainer() {
        const container = document.createElement('div');
        container.className = 'tech-badges-container';
        container.innerHTML = `
            <button class="tech-badges-toggle" title="Mostrar/Ocultar tecnologías">
                <span>🏆 Tech Stack</span>
                <i class="fas fa-chevron-down"></i>
            </button>

            <div class="tech-badges-content">
                <div class="tech-badges-header">
                    <h6 class="tech-badges-title">🏆 Tecnologías Profesionales</h6>
                    <small class="tech-badges-subtitle">Sistema construido con estándares enterprise de clase mundial</small>
                </div>

                <div class="tech-badges-wrapper">
                    ${this.renderBadges()}
                </div>
            </div>
        `;

        return container;
    },

    /**
     * Renderizar badges individuales
     */
    renderBadges() {
        return this.technologies.map(tech => `
            <div class="tech-badge category-${tech.category}${tech.highlight ? ' highlight' : ''}"
                 data-tech="${tech.name}"
                 role="button"
                 tabindex="0">
                <span class="tech-badge-icon">${tech.icon}</span>
                <span class="tech-badge-name">${tech.name}</span>
                <div class="tech-badge-tooltip">${tech.tooltip}</div>
            </div>
        `).join('');
    },

    /**
     * Setup de event listeners
     */
    setupEventListeners() {
        const toggleBtn = this.state.container.querySelector('.tech-badges-toggle');

        // Toggle collapse/expand
        toggleBtn.addEventListener('click', () => {
            this.toggle();
        });

        // Click en badges individuales
        this.state.container.querySelectorAll('.tech-badge').forEach(badge => {
            badge.addEventListener('click', (e) => {
                this.onBadgeClick(e.currentTarget);
            });

            badge.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.onBadgeClick(e.currentTarget);
                }
            });
        });
    },

    /**
     * Toggle collapse/expand
     */
    toggle() {
        this.state.isCollapsed = !this.state.isCollapsed;

        if (this.state.isCollapsed) {
            this.state.container.classList.add('collapsed');
        } else {
            this.state.container.classList.remove('collapsed');
        }

        // Guardar estado
        this.saveState();
    },

    /**
     * Click en badge individual
     */
    onBadgeClick(badgeElement) {
        const techName = badgeElement.dataset.tech;
        console.log(`[TechBadges] Click en: ${techName}`);

        // Animación de click
        badgeElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            badgeElement.style.transform = '';
        }, 150);

        // Opcional: Mostrar modal con más info
        // this.showTechInfo(techName);
    },

    /**
     * Guardar estado en localStorage
     */
    saveState() {
        try {
            localStorage.setItem('techBadgesCollapsed', JSON.stringify(this.state.isCollapsed));
        } catch (error) {
            console.warn('[TechBadges] No se pudo guardar estado:', error);
        }
    },

    /**
     * Cargar estado desde localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('techBadgesCollapsed');
            if (saved !== null) {
                this.state.isCollapsed = JSON.parse(saved);

                if (this.state.isCollapsed) {
                    this.state.container.classList.add('collapsed');
                }
            }
        } catch (error) {
            console.warn('[TechBadges] No se pudo cargar estado:', error);
        }
    },

    /**
     * Destruir el componente
     */
    destroy() {
        if (this.state.container) {
            try {
                if (this.state.container.parentNode) {
                    this.state.container.parentNode.removeChild(this.state.container);
                }
            } catch (e) {
                // Nodo ya fue removido por otro código - ignorar
            }
            this.state.container = null;
        }
    },

    /**
     * Actualizar badges dinámicamente
     */
    updateBadges(newTechnologies) {
        this.technologies = newTechnologies;

        const wrapper = this.state.container.querySelector('.tech-badges-wrapper');
        if (wrapper) {
            wrapper.innerHTML = this.renderBadges();
            this.setupEventListeners();
        }
    },

    /**
     * Agregar nueva tecnología dinámicamente
     */
    addTechnology(tech) {
        this.technologies.push(tech);
        this.updateBadges(this.technologies);
    },

    /**
     * Opcional: Mostrar info detallada de una tecnología
     */
    showTechInfo(techName) {
        const tech = this.technologies.find(t => t.name === techName);
        if (!tech) return;

        // Aquí se podría mostrar un modal con información detallada
        console.log(`[TechBadges] Info de ${techName}:`, tech);

        // Por ahora, solo mostrar alert como ejemplo
        // En producción, usar un modal bonito
        // alert(`${tech.icon} ${tech.name}\n\n${tech.tooltip}`);
    }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TechBadges.init());
} else {
    TechBadges.init();
}

// Exportar para uso externo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechBadges;
}
