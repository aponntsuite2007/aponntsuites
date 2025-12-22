/**
 * ============================================================================
 * KNOWLEDGE DATABASE - Base de Conocimiento del Sistema
 * ============================================================================
 *
 * Central de conocimiento que unifica:
 * - UI Discovery (elementos, modales, botones)
 * - Flow Recorder (flujos CRUD, tutoriales)
 * - FAQ y troubleshooting
 * - Aprendizaje de interacciones
 *
 * Usado por todos los agentes IA:
 * - Support AI: para responder preguntas
 * - Trainer AI: para generar tutoriales
 * - Tester AI: para generar tests
 * - Sales AI: para demos
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class KnowledgeDatabase {
    constructor(options = {}) {
        this.config = {
            knowledgeDir: options.knowledgeDir || path.join(__dirname, '../knowledge'),
            ...options
        };

        this.cache = {
            ui: null,
            flows: null,
            faq: null,
            modules: null,
            lastLoaded: null
        };

        this.stats = {
            queriesAnswered: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Inicializar y cargar todo el conocimiento
     */
    async initialize() {
        console.log('🧠 [KNOWLEDGE-DB] Inicializando base de conocimiento...');

        await this.loadAllKnowledge();

        console.log('✅ [KNOWLEDGE-DB] Inicializado');
        console.log(`   UI Elements: ${this.cache.ui?.stats?.totalButtons || 0} buttons, ${this.cache.ui?.stats?.totalInputs || 0} inputs`);
        console.log(`   Flows: ${Object.keys(this.cache.flows?.flows || {}).length}`);
        console.log(`   Modules: ${Object.keys(this.cache.modules || {}).length}`);
        console.log(`   FAQ: ${this.cache.faq?.length || 0} preguntas`);

        return this;
    }

    /**
     * Cargar todo el conocimiento en cache
     */
    async loadAllKnowledge() {
        // Cargar UI knowledge
        this.cache.ui = this.loadJSON('ui/static-analysis.json');

        // Cargar flows
        this.cache.flows = this.loadJSON('flows/flows-index.json');

        // Cargar modules summary
        this.cache.modules = this.loadJSON('ui/modules-summary.json');

        // Cargar o generar FAQ
        this.cache.faq = this.loadJSON('faq/faq-database.json') || this.generateDefaultFAQ();

        this.cache.lastLoaded = new Date();
    }

    /**
     * Cargar archivo JSON
     */
    loadJSON(relativePath) {
        try {
            const fullPath = path.join(this.config.knowledgeDir, relativePath);
            if (fs.existsSync(fullPath)) {
                return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            }
        } catch (e) {
            // Ignore errors
        }
        return null;
    }

    /**
     * Generar FAQ por defecto
     */
    generateDefaultFAQ() {
        return [
            {
                id: 'faq-1',
                question: '¿Cómo creo un nuevo usuario?',
                answer: 'Ve al módulo Usuarios, haz click en "Nuevo Usuario", completa los campos requeridos y guarda.',
                module: 'users',
                keywords: ['crear', 'nuevo', 'usuario', 'agregar'],
                confidence: 1.0
            },
            {
                id: 'faq-2',
                question: '¿Cómo registro asistencia?',
                answer: 'La asistencia se registra desde el kiosco biométrico o la app móvil. También puedes registrar manualmente desde el módulo Asistencia.',
                module: 'attendance',
                keywords: ['asistencia', 'registrar', 'entrada', 'salida', 'marcar'],
                confidence: 1.0
            },
            {
                id: 'faq-3',
                question: '¿Cómo solicito vacaciones?',
                answer: 'Ve a Mi Espacio > Vacaciones, selecciona las fechas y envía la solicitud. Tu supervisor la aprobará.',
                module: 'vacation',
                keywords: ['vacaciones', 'solicitar', 'días', 'licencia'],
                confidence: 1.0
            },
            {
                id: 'faq-4',
                question: '¿Cómo configuro un turno?',
                answer: 'Ve al módulo Turnos, click en "Nuevo Turno", define horarios de entrada/salida y asigna a usuarios.',
                module: 'shifts',
                keywords: ['turno', 'horario', 'configurar', 'crear'],
                confidence: 1.0
            },
            {
                id: 'faq-5',
                question: '¿Cómo genero un reporte?',
                answer: 'Cada módulo tiene su sección de reportes. Usa los filtros de fecha y tipo, luego haz click en Exportar.',
                module: 'reports',
                keywords: ['reporte', 'exportar', 'generar', 'descargar'],
                confidence: 1.0
            }
        ];
    }

    /**
     * ========================================================================
     * BÚSQUEDA DE CONOCIMIENTO
     * ========================================================================
     */

    /**
     * Buscar respuesta a una pregunta
     */
    async search(query, options = {}) {
        this.stats.queriesAnswered++;

        const results = {
            query,
            answers: [],
            relatedFlows: [],
            suggestedActions: [],
            confidence: 0
        };

        const queryLower = query.toLowerCase();
        const keywords = this.extractKeywords(queryLower);

        // 1. Buscar en FAQ
        const faqMatches = this.searchFAQ(keywords, queryLower);
        if (faqMatches.length > 0) {
            results.answers.push(...faqMatches);
            results.confidence = Math.max(results.confidence, faqMatches[0].score);
        }

        // 2. Buscar flujos relacionados
        const flowMatches = this.searchFlows(keywords, queryLower);
        results.relatedFlows = flowMatches;

        // 3. Buscar módulos relacionados
        const moduleMatches = this.searchModules(keywords);
        if (moduleMatches.length > 0) {
            results.suggestedActions.push({
                type: 'navigate',
                target: moduleMatches[0].key,
                label: `Ir a ${moduleMatches[0].name || moduleMatches[0].key}`
            });
        }

        // 4. Buscar elementos UI relacionados
        const uiMatches = this.searchUIElements(keywords, queryLower);
        if (uiMatches.length > 0) {
            results.suggestedActions.push(...uiMatches.map(ui => ({
                type: 'click',
                target: ui.selector || ui.id,
                label: ui.text || ui.label
            })));
        }

        return results;
    }

    /**
     * Extraer keywords de una query
     */
    extractKeywords(query) {
        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'que', 'como', 'cómo', 'para', 'por', 'con', 'en', 'es', 'son', 'y', 'o'];
        return query
            .split(/\s+/)
            .map(w => w.replace(/[¿?¡!.,]/g, ''))
            .filter(w => w.length > 2 && !stopWords.includes(w));
    }

    /**
     * Buscar en FAQ
     */
    searchFAQ(keywords, query) {
        if (!this.cache.faq) return [];

        return this.cache.faq
            .map(faq => {
                let score = 0;

                // Match por keywords
                for (const kw of keywords) {
                    if (faq.keywords?.some(fkw => fkw.includes(kw) || kw.includes(fkw))) {
                        score += 0.3;
                    }
                    if (faq.question.toLowerCase().includes(kw)) {
                        score += 0.2;
                    }
                    if (faq.answer.toLowerCase().includes(kw)) {
                        score += 0.1;
                    }
                }

                return {
                    ...faq,
                    score: Math.min(score, 1)
                };
            })
            .filter(faq => faq.score > 0.2)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    /**
     * Buscar flujos relacionados
     */
    searchFlows(keywords, query) {
        if (!this.cache.flows?.flows) return [];

        const results = [];
        for (const [id, flow] of Object.entries(this.cache.flows.flows)) {
            let score = 0;

            for (const kw of keywords) {
                if (flow.name?.includes(kw)) score += 0.4;
                if (flow.description?.toLowerCase().includes(kw)) score += 0.3;
                if (flow.module?.includes(kw)) score += 0.2;
            }

            if (score > 0.2) {
                results.push({
                    flowId: id,
                    name: flow.name,
                    description: flow.description,
                    score
                });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    /**
     * Buscar módulos relacionados
     */
    searchModules(keywords) {
        if (!this.cache.modules) return [];

        const results = [];
        for (const [key, mod] of Object.entries(this.cache.modules)) {
            let score = 0;

            for (const kw of keywords) {
                if (key.includes(kw)) score += 0.5;
                if (mod.name?.toLowerCase().includes(kw)) score += 0.4;
            }

            if (score > 0.3) {
                results.push({ key, ...mod, score });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    /**
     * Buscar elementos UI
     */
    searchUIElements(keywords, query) {
        if (!this.cache.ui?.globalElements) return [];

        const results = [];

        // Buscar en botones
        for (const btn of this.cache.ui.globalElements.buttons || []) {
            let score = 0;
            for (const kw of keywords) {
                if (btn.text?.toLowerCase().includes(kw)) score += 0.4;
                if (btn.inferredAction?.includes(kw)) score += 0.3;
            }
            if (score > 0.2) {
                results.push({ type: 'button', ...btn, score });
            }
        }

        // Buscar en inputs
        for (const input of this.cache.ui.globalElements.inputs || []) {
            let score = 0;
            for (const kw of keywords) {
                if (input.label?.toLowerCase().includes(kw)) score += 0.4;
                if (input.placeholder?.toLowerCase().includes(kw)) score += 0.3;
            }
            if (score > 0.2) {
                results.push({ type: 'input', ...input, score });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    /**
     * ========================================================================
     * APRENDIZAJE
     * ========================================================================
     */

    /**
     * Agregar nuevo conocimiento
     */
    async addKnowledge(type, data) {
        switch (type) {
            case 'faq':
                this.cache.faq = this.cache.faq || [];
                this.cache.faq.push({
                    id: `faq-${Date.now()}`,
                    ...data,
                    addedAt: new Date().toISOString(),
                    source: 'learned'
                });
                await this.saveFAQ();
                break;

            case 'flow':
                // Agregar a flujos
                break;

            default:
                console.log(`   ⚠️ Tipo de conocimiento desconocido: ${type}`);
        }
    }

    /**
     * Guardar FAQ
     */
    async saveFAQ() {
        const faqDir = path.join(this.config.knowledgeDir, 'faq');
        if (!fs.existsSync(faqDir)) {
            fs.mkdirSync(faqDir, { recursive: true });
        }

        const faqPath = path.join(faqDir, 'faq-database.json');
        fs.writeFileSync(faqPath, JSON.stringify(this.cache.faq, null, 2));
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    /**
     * Obtener conocimiento de un módulo específico
     */
    getModuleKnowledge(moduleKey) {
        return {
            summary: this.cache.modules?.[moduleKey] || null,
            ui: this.cache.ui?.modules?.[moduleKey] || null,
            flows: Object.entries(this.cache.flows?.flows || {})
                .filter(([id]) => id.startsWith(moduleKey))
                .map(([id, flow]) => ({ id, ...flow })),
            faq: (this.cache.faq || []).filter(f => f.module === moduleKey)
        };
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            cacheAge: this.cache.lastLoaded ? Date.now() - this.cache.lastLoaded.getTime() : null,
            totalFAQ: this.cache.faq?.length || 0,
            totalFlows: Object.keys(this.cache.flows?.flows || {}).length,
            totalModules: Object.keys(this.cache.modules || {}).length
        };
    }

    /**
     * Refrescar cache
     */
    async refresh() {
        await this.loadAllKnowledge();
    }
}

// Singleton
let instance = null;

module.exports = {
    KnowledgeDatabase,
    getInstance: async () => {
        if (!instance) {
            instance = new KnowledgeDatabase();
            await instance.initialize();
        }
        return instance;
    }
};
