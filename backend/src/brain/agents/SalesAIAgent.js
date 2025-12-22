/**
 * ============================================================================
 * SALES AI AGENT - Agente Vendedor Autónomo
 * ============================================================================
 *
 * Reemplaza al vendedor/demos humano:
 * - Demos interactivos personalizados por industria
 * - Presentación de módulos según necesidades
 * - Cálculo de pricing en tiempo real
 * - Generación de propuestas comerciales
 * - Seguimiento de leads
 * - Respuestas a objeciones
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { getInstance: getKnowledgeDB } = require('../services/KnowledgeDatabase');
const FlowRecorder = require('../crawlers/FlowRecorder');
const fs = require('fs');
const path = require('path');

class SalesAIAgent {
    constructor(options = {}) {
        this.config = {
            proposalsDir: options.proposalsDir || path.join(__dirname, '../knowledge/proposals'),
            defaultCurrency: options.currency || 'USD',
            ...options
        };

        this.knowledgeDB = null;
        this.flowRecorder = null;

        // Leads y demos en memoria
        this.leads = new Map(); // leadId -> leadData
        this.demoSessions = new Map(); // sessionId -> demoState

        // Conocimiento comercial
        this.industries = this.defineIndustries();
        this.pricingTiers = this.definePricingTiers();
        this.objectionHandlers = this.defineObjectionHandlers();

        this.stats = {
            demosStarted: 0,
            demosCompleted: 0,
            proposalsGenerated: 0,
            conversionRate: 0
        };

        // Ensure proposals directory exists
        if (!fs.existsSync(this.config.proposalsDir)) {
            fs.mkdirSync(this.config.proposalsDir, { recursive: true });
        }
    }

    /**
     * Inicializar el agente
     */
    async initialize() {
        console.log('💼 [SALES-AI] Inicializando agente de ventas...');

        this.knowledgeDB = await getKnowledgeDB();
        this.flowRecorder = new FlowRecorder();

        console.log('✅ [SALES-AI] Agente listo');
        return this;
    }

    /**
     * Definir industrias y sus necesidades típicas
     */
    defineIndustries() {
        return {
            manufacturing: {
                name: 'Manufactura',
                icon: '🏭',
                typicalSize: '50-500 empleados',
                keyNeeds: ['control-asistencia', 'turnos-rotativos', 'kioscos-biometricos', 'horas-extra'],
                painPoints: ['Ausentismo', 'Control de horas extra', 'Turnos complejos'],
                recommendedModules: ['attendance', 'shifts', 'kiosks', 'overtime', 'reports'],
                caseStudy: 'Empresa manufacturera redujo ausentismo 40% en 3 meses'
            },
            retail: {
                name: 'Retail',
                icon: '🛒',
                typicalSize: '20-200 empleados',
                keyNeeds: ['multi-sucursal', 'turnos-flexibles', 'app-movil'],
                painPoints: ['Gestión multi-local', 'Rotación de personal', 'Horarios cambiantes'],
                recommendedModules: ['attendance', 'shifts', 'mobile-app', 'multi-branch', 'vacation'],
                caseStudy: 'Cadena de retail gestionó 15 sucursales con una sola plataforma'
            },
            healthcare: {
                name: 'Salud',
                icon: '🏥',
                typicalSize: '100-1000 empleados',
                keyNeeds: ['guardias-24h', 'certificados-medicos', 'cumplimiento-normativo'],
                painPoints: ['Guardias complejas', 'Licencias médicas', 'Regulaciones estrictas'],
                recommendedModules: ['attendance', 'shifts', 'medical', 'notifications', 'audit', 'reports'],
                caseStudy: 'Hospital optimizó programación de guardias reduciendo conflictos 60%'
            },
            services: {
                name: 'Servicios',
                icon: '💼',
                typicalSize: '10-100 empleados',
                keyNeeds: ['home-office', 'proyecto-horas', 'facturacion-horas'],
                painPoints: ['Control remoto', 'Registro de horas por proyecto', 'Productividad'],
                recommendedModules: ['attendance', 'remote-work', 'projects', 'reports', 'mobile-app'],
                caseStudy: 'Consultora implementó control de horas por proyecto con facturación integrada'
            },
            education: {
                name: 'Educación',
                icon: '🎓',
                typicalSize: '50-300 empleados',
                keyNeeds: ['docentes-horarios', 'periodos-academicos', 'vacaciones-especiales'],
                painPoints: ['Horarios académicos', 'Períodos especiales', 'Múltiples calendarios'],
                recommendedModules: ['attendance', 'shifts', 'vacation', 'calendar', 'notifications'],
                caseStudy: 'Universidad gestionó 200 docentes con horarios dinámicos por semestre'
            },
            construction: {
                name: 'Construcción',
                icon: '🏗️',
                typicalSize: '30-200 empleados',
                keyNeeds: ['obras-multiples', 'control-campo', 'gps-ubicacion'],
                painPoints: ['Personal en obra', 'Múltiples proyectos', 'Movilidad'],
                recommendedModules: ['attendance', 'mobile-app', 'geolocation', 'projects', 'kiosks'],
                caseStudy: 'Constructora controló asistencia en 8 obras simultáneas con app móvil'
            }
        };
    }

    /**
     * Definir tiers de pricing
     */
    definePricingTiers() {
        return {
            starter: {
                name: 'Starter',
                maxEmployees: 25,
                pricePerEmployee: 3.99,
                includedModules: ['attendance', 'users', 'departments', 'reports-basic'],
                features: ['Soporte email', 'Reportes básicos', '1 kiosco incluido'],
                recommended: false
            },
            professional: {
                name: 'Professional',
                maxEmployees: 100,
                pricePerEmployee: 5.99,
                includedModules: ['attendance', 'users', 'departments', 'shifts', 'vacation', 'reports', 'notifications'],
                features: ['Soporte prioritario', 'Reportes avanzados', '3 kioscos incluidos', 'App móvil'],
                recommended: true
            },
            enterprise: {
                name: 'Enterprise',
                maxEmployees: -1, // unlimited
                pricePerEmployee: 7.99,
                includedModules: ['*'], // todos
                features: ['Soporte 24/7', 'API acceso', 'Kioscos ilimitados', 'Personalización', 'SLA garantizado'],
                recommended: false
            }
        };
    }

    /**
     * Definir manejadores de objeciones
     */
    defineObjectionHandlers() {
        return {
            price: {
                keywords: ['caro', 'costoso', 'precio', 'presupuesto', 'económico'],
                response: `Entiendo tu preocupación sobre el precio. Permíteme mostrarte el ROI:

📊 **Ahorro típico:**
- Reducción de ausentismo: 20-40%
- Eliminación de errores manuales: 100%
- Ahorro de horas administrativas: 10+ horas/mes

💡 Con 50 empleados a $5.99/mes = $299.50
   Ahorro típico: $800-1500/mes

**¿Te gustaría ver un cálculo personalizado para tu empresa?**`,
                followUp: 'calculateROI'
            },
            time: {
                keywords: ['tiempo', 'implementar', 'complicado', 'aprender'],
                response: `La implementación es más rápida de lo que piensas:

⏱️ **Timeline típico:**
- Día 1: Configuración inicial (2-4 horas)
- Día 2-3: Carga de empleados (automático o Excel)
- Día 4-5: Capacitación del equipo (nuestro Trainer AI)
- Semana 2: En producción

🤖 **Además contamos con:**
- Trainer AI: Capacita a tus usuarios automáticamente
- Support AI: Soporte 24/7 sin esperas
- Onboarding guiado paso a paso

**¿Programamos una demostración de la implementación?**`,
                followUp: 'scheduleDemo'
            },
            competitor: {
                keywords: ['otro sistema', 'competencia', 'alternativa', 'comparar'],
                response: `Excelente que estés evaluando opciones. Aquí nuestros diferenciadores:

🏆 **¿Por qué elegirnos?**
1. **IA Integrada**: Soporte, capacitación y testing automáticos
2. **Multi-tenant real**: Cada empresa aislada y segura
3. **Biométrico avanzado**: Facial + huella + PIN
4. **Sin límite de módulos**: Todo incluido en Enterprise
5. **API abierta**: Integra con tu ERP/sistemas existentes

📱 **Tecnología moderna:**
- App móvil iOS/Android
- Kioscos touch screen
- Dashboard en tiempo real

**¿Qué sistema estás evaluando? Puedo hacer una comparación punto por punto.**`,
                followUp: 'compareCompetitor'
            },
            security: {
                keywords: ['seguridad', 'datos', 'privacidad', 'biométrico'],
                response: `La seguridad es nuestra prioridad #1:

🔒 **Medidas de seguridad:**
- Encriptación AES-256 en reposo y tránsito
- Datos biométricos hasheados (irreversibles)
- Backups automáticos diarios
- Servidores en la nube con certificación ISO 27001

📋 **Cumplimiento:**
- GDPR ready
- Ley de Protección de Datos Personales
- Auditoría de accesos completa

🔐 **Control de acceso:**
- MFA disponible
- Roles y permisos granulares
- Logs de auditoría inmutables

**¿Te gustaría ver nuestra documentación de seguridad?**`,
                followUp: 'showSecurityDocs'
            },
            notNow: {
                keywords: ['después', 'luego', 'ahora no', 'otro momento', 'pensarlo'],
                response: `Entiendo, tomate tu tiempo para decidir.

📅 **¿Qué te parece si:**
1. Te envío un resumen de lo que vimos hoy
2. Programamos un seguimiento en 1-2 semanas
3. Te doy acceso a un trial gratuito de 14 días

💡 **Mientras tanto:**
- Puedes explorar el sistema a tu ritmo
- Nuestro Support AI está disponible 24/7
- Sin compromiso ni tarjeta de crédito

**¿Cuál opción prefieres?**`,
                followUp: 'scheduleFollowUp'
            }
        };
    }

    /**
     * ========================================================================
     * DEMOS INTERACTIVOS
     * ========================================================================
     */

    /**
     * Iniciar demo personalizado
     */
    async startDemo(leadInfo) {
        console.log(`\n💼 [SALES-AI] Iniciando demo para: ${leadInfo.companyName || 'Prospecto'}`);

        const sessionId = `demo-${Date.now()}`;

        const demo = {
            sessionId,
            lead: {
                id: `lead-${Date.now()}`,
                ...leadInfo,
                createdAt: new Date().toISOString()
            },
            industry: this.industries[leadInfo.industry] || null,
            status: 'started',
            currentStep: 0,
            steps: [],
            startedAt: new Date().toISOString(),
            interactions: []
        };

        // Generar pasos del demo basados en industria
        demo.steps = this.generateDemoSteps(leadInfo);

        // Guardar lead
        this.leads.set(demo.lead.id, demo.lead);
        this.demoSessions.set(sessionId, demo);

        this.stats.demosStarted++;

        return {
            sessionId,
            welcome: this.generateWelcome(leadInfo),
            agenda: demo.steps.map((s, i) => ({ step: i + 1, title: s.title })),
            estimatedTime: `${demo.steps.length * 3}-${demo.steps.length * 5} minutos`
        };
    }

    /**
     * Generar mensaje de bienvenida
     */
    generateWelcome(leadInfo) {
        const industry = this.industries[leadInfo.industry];
        const name = leadInfo.contactName || 'estimado cliente';

        let welcome = `¡Hola ${name}! Bienvenido/a a la demostración del Sistema de Asistencia Biométrico.\n\n`;

        if (industry) {
            welcome += `Veo que vienes del sector ${industry.name} ${industry.icon}. `;
            welcome += `Tenemos experiencia ayudando a empresas como la tuya con: ${industry.painPoints.join(', ')}.\n\n`;
        }

        welcome += `En esta demo te mostraré cómo nuestro sistema puede ayudarte a:\n`;
        welcome += `✅ Controlar asistencia en tiempo real\n`;
        welcome += `✅ Eliminar el papeleo manual\n`;
        welcome += `✅ Reducir errores y fraude\n`;
        welcome += `✅ Generar reportes automáticos\n\n`;
        welcome += `¿Listo para comenzar?`;

        return welcome;
    }

    /**
     * Generar pasos del demo personalizados
     */
    generateDemoSteps(leadInfo) {
        const industry = this.industries[leadInfo.industry];
        const steps = [];

        // Paso 1: Dashboard
        steps.push({
            id: 'dashboard',
            title: 'Dashboard Principal',
            description: 'Vista general del sistema con métricas en tiempo real',
            talking_points: [
                'Métricas de asistencia del día',
                'Alertas de ausentismo',
                'Empleados presentes vs esperados'
            ],
            demo_flow: 'dashboard-overview',
            duration: '2-3 min'
        });

        // Paso 2: Módulo clave según industria
        if (industry) {
            const keyModule = industry.recommendedModules[0];
            steps.push({
                id: keyModule,
                title: `Gestión de ${this.capitalize(keyModule)}`,
                description: `Módulo principal para tu industria (${industry.name})`,
                talking_points: industry.painPoints,
                demo_flow: `${keyModule}-crud`,
                duration: '3-4 min'
            });
        }

        // Paso 3: Control biométrico
        steps.push({
            id: 'biometric',
            title: 'Control Biométrico',
            description: 'Registro de asistencia con huella, facial o PIN',
            talking_points: [
                'Reconocimiento facial en <1 segundo',
                'Múltiples métodos de registro',
                'Anti-fraude integrado'
            ],
            demo_flow: 'biometric-demo',
            duration: '2-3 min'
        });

        // Paso 4: Reportes
        steps.push({
            id: 'reports',
            title: 'Reportes y Analytics',
            description: 'Generación automática de reportes',
            talking_points: [
                'Reportes de asistencia por período',
                'Análisis de ausentismo',
                'Exportación a Excel/PDF'
            ],
            demo_flow: 'reports-generation',
            duration: '2-3 min'
        });

        // Paso 5: App móvil (si aplica)
        if (leadInfo.needsMobile || industry?.recommendedModules.includes('mobile-app')) {
            steps.push({
                id: 'mobile',
                title: 'Aplicación Móvil',
                description: 'Control desde cualquier lugar',
                talking_points: [
                    'Registro con geolocalización',
                    'Consulta de horarios',
                    'Solicitud de permisos'
                ],
                demo_flow: 'mobile-showcase',
                duration: '2 min'
            });
        }

        // Paso 6: Pricing
        steps.push({
            id: 'pricing',
            title: 'Planes y Precios',
            description: 'Opciones flexibles para tu empresa',
            talking_points: [
                'Sin costo de implementación',
                'Precios por empleado',
                'Escalable según crecimiento'
            ],
            demo_flow: null,
            duration: '3-4 min'
        });

        return steps;
    }

    /**
     * Avanzar al siguiente paso del demo
     */
    async advanceDemo(sessionId) {
        const demo = this.demoSessions.get(sessionId);
        if (!demo) return { error: 'Demo session not found' };

        demo.currentStep++;

        if (demo.currentStep >= demo.steps.length) {
            demo.status = 'completed';
            this.stats.demosCompleted++;

            return {
                completed: true,
                message: '¡Demo completada! ¿Te gustaría recibir una propuesta personalizada?',
                nextActions: ['generateProposal', 'scheduleFollowUp', 'startTrial']
            };
        }

        const currentStep = demo.steps[demo.currentStep];

        // Obtener flujo del demo si existe
        let demoFlow = null;
        if (currentStep.demo_flow) {
            demoFlow = this.flowRecorder.flowToTutorial(currentStep.demo_flow);
        }

        return {
            step: demo.currentStep + 1,
            total: demo.steps.length,
            current: currentStep,
            flow: demoFlow,
            script: this.generateStepScript(currentStep, demo.lead)
        };
    }

    /**
     * Generar script para un paso del demo
     */
    generateStepScript(step, lead) {
        let script = `## ${step.title}\n\n`;
        script += `${step.description}\n\n`;
        script += `**Puntos a destacar:**\n`;

        for (const point of step.talking_points) {
            script += `- ${point}\n`;
        }

        script += `\n**Duración estimada:** ${step.duration}`;

        return script;
    }

    /**
     * ========================================================================
     * MANEJO DE OBJECIONES
     * ========================================================================
     */

    /**
     * Manejar objeción del prospecto
     */
    handleObjection(objectionText, sessionId = null) {
        const textLower = objectionText.toLowerCase();

        // Buscar handler que matchee
        for (const [type, handler] of Object.entries(this.objectionHandlers)) {
            if (handler.keywords.some(kw => textLower.includes(kw))) {
                return {
                    objectionType: type,
                    response: handler.response,
                    followUpAction: handler.followUp,
                    detected: true
                };
            }
        }

        // Respuesta genérica si no detectamos objeción específica
        return {
            objectionType: 'unknown',
            response: `Gracias por compartir tu inquietud. ¿Podrías contarme más sobre qué aspecto te preocupa?

Estoy aquí para ayudarte a tomar la mejor decisión para tu empresa.`,
            detected: false
        };
    }

    /**
     * ========================================================================
     * PRICING Y PROPUESTAS
     * ========================================================================
     */

    /**
     * Calcular precio para un prospecto
     */
    calculatePricing(employeeCount, selectedModules = [], options = {}) {
        // Determinar tier recomendado
        let recommendedTier = 'starter';
        if (employeeCount > 100) recommendedTier = 'enterprise';
        else if (employeeCount > 25) recommendedTier = 'professional';

        const tier = this.pricingTiers[recommendedTier];
        const basePrice = tier.pricePerEmployee * employeeCount;

        // Descuentos por volumen
        let discount = 0;
        if (employeeCount >= 200) discount = 0.20;
        else if (employeeCount >= 100) discount = 0.15;
        else if (employeeCount >= 50) discount = 0.10;

        // Descuento por pago anual
        if (options.annualPayment) {
            discount += 0.15;
        }

        const finalPrice = basePrice * (1 - discount);

        return {
            tier: tier.name,
            employeeCount,
            pricePerEmployee: tier.pricePerEmployee,
            baseMonthlyPrice: basePrice,
            discount: `${(discount * 100).toFixed(0)}%`,
            finalMonthlyPrice: finalPrice,
            annualPrice: finalPrice * 12,
            includedModules: tier.includedModules,
            features: tier.features,
            currency: this.config.defaultCurrency,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
    }

    /**
     * Calcular ROI estimado
     */
    calculateROI(companyInfo) {
        const employees = companyInfo.employeeCount || 50;
        const avgSalary = companyInfo.avgMonthlySalary || 1500;

        // Estimaciones conservadoras
        const estimations = {
            // Ahorro por reducción de ausentismo (asumiendo 3% -> 2%)
            absenteeismReduction: {
                description: 'Reducción de ausentismo',
                currentRate: 0.03,
                improvedRate: 0.02,
                monthlySavings: employees * avgSalary * 0.01
            },

            // Ahorro administrativo (10 horas/mes a $15/hora)
            adminTimeSaved: {
                description: 'Tiempo administrativo ahorrado',
                hoursSavedPerMonth: 10,
                hourlyRate: 15,
                monthlySavings: 10 * 15
            },

            // Eliminación de errores de nómina (0.5% de nómina)
            payrollErrors: {
                description: 'Eliminación de errores de nómina',
                errorRate: 0.005,
                monthlySavings: employees * avgSalary * 0.005
            },

            // Reducción de buddy punching
            buddyPunchingReduction: {
                description: 'Eliminación de fraude de fichaje',
                estimatedFraud: 0.02,
                monthlySavings: employees * avgSalary * 0.02
            }
        };

        // Calcular totales
        const totalMonthlySavings = Object.values(estimations)
            .reduce((sum, e) => sum + e.monthlySavings, 0);

        // Costo del sistema
        const pricing = this.calculatePricing(employees);
        const monthlyCost = pricing.finalMonthlyPrice;

        return {
            companyProfile: {
                employees,
                avgSalary,
                monthlyPayroll: employees * avgSalary
            },
            estimatedSavings: estimations,
            totals: {
                monthlyGrossSavings: totalMonthlySavings,
                monthlyCost,
                monthlyNetSavings: totalMonthlySavings - monthlyCost,
                annualNetSavings: (totalMonthlySavings - monthlyCost) * 12,
                paybackPeriodMonths: monthlyCost > 0 ? (monthlyCost / (totalMonthlySavings - monthlyCost)).toFixed(1) : 0,
                roi: ((totalMonthlySavings - monthlyCost) / monthlyCost * 100).toFixed(0) + '%'
            },
            disclaimer: 'Estimaciones basadas en promedios de industria. Resultados reales pueden variar.'
        };
    }

    /**
     * Generar propuesta comercial
     */
    async generateProposal(leadId, options = {}) {
        const lead = this.leads.get(leadId);
        if (!lead) return { error: 'Lead not found' };

        console.log(`\n📄 [SALES-AI] Generando propuesta para: ${lead.companyName}`);

        const industry = this.industries[lead.industry];
        const pricing = this.calculatePricing(lead.employeeCount || 50);
        const roi = this.calculateROI({
            employeeCount: lead.employeeCount || 50,
            avgMonthlySalary: lead.avgSalary || 1500
        });

        const proposal = {
            id: `PROP-${Date.now()}`,
            generatedAt: new Date().toISOString(),
            validUntil: pricing.validUntil,
            lead: {
                company: lead.companyName,
                contact: lead.contactName,
                email: lead.email,
                industry: industry?.name || 'General'
            },
            sections: {
                executiveSummary: this.generateExecutiveSummary(lead, industry),
                painPoints: industry?.painPoints || ['Control de asistencia', 'Gestión de horarios'],
                solution: this.generateSolutionSection(lead, industry),
                modules: pricing.includedModules,
                features: pricing.features,
                pricing: {
                    tier: pricing.tier,
                    monthlyPrice: pricing.finalMonthlyPrice,
                    annualPrice: pricing.annualPrice,
                    discount: pricing.discount,
                    currency: pricing.currency
                },
                roi: roi.totals,
                implementation: {
                    timeline: '1-2 semanas',
                    training: 'Incluido (Trainer AI)',
                    support: '24/7 (Support AI)'
                },
                nextSteps: [
                    'Firma de contrato digital',
                    'Configuración inicial',
                    'Carga de empleados',
                    'Capacitación del equipo',
                    'Go-live'
                ]
            }
        };

        // Guardar propuesta
        const proposalPath = path.join(this.config.proposalsDir, `${proposal.id}.json`);
        fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));

        this.stats.proposalsGenerated++;

        console.log(`   ✅ Propuesta generada: ${proposal.id}`);

        return proposal;
    }

    /**
     * Generar resumen ejecutivo
     */
    generateExecutiveSummary(lead, industry) {
        return `
## Propuesta Comercial - Sistema de Asistencia Biométrico

Estimado/a ${lead.contactName || 'Cliente'},

Es un placer presentarle nuestra propuesta para ${lead.companyName || 'su empresa'}.

Basándonos en las necesidades típicas del sector ${industry?.name || 'empresarial'}, hemos preparado una solución que le permitirá:

✅ **Automatizar** el control de asistencia eliminando procesos manuales
✅ **Reducir** el ausentismo con alertas y reportes en tiempo real
✅ **Eliminar** el fraude de fichaje con tecnología biométrica
✅ **Ahorrar** tiempo administrativo con reportes automáticos

${industry?.caseStudy ? `\n📊 **Caso de éxito:** ${industry.caseStudy}` : ''}

Estamos seguros de que nuestra solución generará un retorno de inversión positivo desde el primer mes.
        `.trim();
    }

    /**
     * Generar sección de solución
     */
    generateSolutionSection(lead, industry) {
        const modules = industry?.recommendedModules || ['attendance', 'users', 'reports'];

        return {
            title: 'Solución Propuesta',
            description: 'Sistema integral de gestión de asistencia con los siguientes componentes:',
            modules: modules.map(m => ({
                id: m,
                name: this.capitalize(m.replace(/-/g, ' ')),
                description: this.getModuleDescription(m)
            })),
            differentiators: [
                {
                    title: 'IA Integrada',
                    description: 'Support AI 24/7, Trainer AI para capacitación, Tester AI para calidad'
                },
                {
                    title: 'Biometría Avanzada',
                    description: 'Reconocimiento facial, huella dactilar y PIN'
                },
                {
                    title: 'Multi-plataforma',
                    description: 'Web, móvil iOS/Android, kioscos touch'
                }
            ]
        };
    }

    /**
     * Obtener descripción de módulo
     */
    getModuleDescription(moduleKey) {
        const descriptions = {
            attendance: 'Control de entrada/salida en tiempo real',
            users: 'Gestión completa de empleados',
            shifts: 'Configuración de turnos y horarios',
            vacation: 'Solicitud y aprobación de vacaciones',
            reports: 'Reportes y analytics avanzados',
            kiosks: 'Terminales biométricos de registro',
            'mobile-app': 'Aplicación móvil para empleados',
            notifications: 'Alertas y notificaciones automáticas',
            medical: 'Gestión de licencias médicas',
            departments: 'Estructura organizacional',
            'remote-work': 'Control de trabajo remoto'
        };

        return descriptions[moduleKey] || 'Funcionalidad adicional';
    }

    /**
     * ========================================================================
     * UTILIDADES
     * ========================================================================
     */

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Obtener estadísticas
     */
    getStats() {
        const totalDemos = this.stats.demosStarted;
        const completedDemos = this.stats.demosCompleted;

        return {
            ...this.stats,
            leadsInPipeline: this.leads.size,
            activeDemo: this.demoSessions.size,
            conversionRate: totalDemos > 0
                ? ((completedDemos / totalDemos) * 100).toFixed(1) + '%'
                : 'N/A'
        };
    }

    /**
     * Obtener lead por ID
     */
    getLead(leadId) {
        return this.leads.get(leadId) || null;
    }

    /**
     * Listar leads
     */
    listLeads() {
        return Array.from(this.leads.values());
    }
}

// Singleton
let instance = null;

module.exports = {
    SalesAIAgent,
    getInstance: async () => {
        if (!instance) {
            instance = new SalesAIAgent();
            await instance.initialize();
        }
        return instance;
    }
};
