/**
 * ========================================================================
 * MÓDULO: Electronic Prescriptions
 * ========================================================================
 * Entry point del módulo de recetas electrónicas multi-país
 *
 * Auto-registro en ModuleRegistry
 * Configuración de event listeners
 * Integración con SSOT (NotificationEnterpriseService, EventBus)
 *
 * @version 1.0.0
 * ========================================================================
 */

const ElectronicPrescriptionService = require('./ElectronicPrescriptionService');
const routes = require('./routes');

module.exports = {
    /**
     * Inicializar módulo
     */
    init(database, notificationService, app) {
        try {
            console.log('💊 [E-PRESCRIPTION MODULE] Inicializando módulo...');

            // 1. Crear instancia del servicio
            const prescriptionService = new ElectronicPrescriptionService(database, notificationService);

            // 2. Registrar rutas
            const prescriptionRoutes = routes(database, notificationService);
            app.use('/api/prescriptions/electronic', prescriptionRoutes);

            console.log('✅ [E-PRESCRIPTION MODULE] Rutas configuradas: /api/prescriptions/electronic/*');

            // 3. Configurar event listeners (si existe EventBus)
            if (global.EventBus) {
                this.setupEventListeners(prescriptionService, database);
            }

            // 4. Auto-registro en ModuleRegistry (si existe)
            if (global.ModuleRegistry) {
                this.registerInModuleRegistry(prescriptionService);
            }

            console.log('✅ [E-PRESCRIPTION MODULE] Módulo inicializado correctamente');

            return prescriptionService;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION MODULE] Error inicializando módulo:', error);
            throw error;
        }
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners(prescriptionService, database) {
        try {
            // Escuchar evento de diagnóstico médico
            // Si se crea un diagnóstico con medicamentos, auto-generar receta
            global.EventBus.on('medical:diagnosis:created', async (data) => {
                try {
                    if (data.medications && data.medications.length > 0) {
                        console.log('📢 [E-PRESCRIPTION] Diagnóstico con medicamentos detectado, evaluando recetas...');

                        // Aquí podría auto-generar recetas si el diagnóstico incluye medicamentos
                        // Por ahora solo registramos el evento
                    }
                } catch (error) {
                    console.error('❌ [E-PRESCRIPTION] Error procesando diagnóstico:', error);
                }
            });

            // Escuchar cierre de caso médico
            // Marcar recetas relacionadas como expiradas si el caso se cierra
            global.EventBus.on('medical:case:closed', async (data) => {
                try {
                    if (data.medicalCaseId) {
                        console.log('📢 [E-PRESCRIPTION] Caso médico cerrado, verificando recetas asociadas...');

                        // Obtener recetas del caso
                        const prescriptions = await database.ElectronicPrescription.findAll({
                            where: {
                                medical_case_id: data.medicalCaseId,
                                status: ['pending', 'signed']
                            }
                        });

                        // Marcar como expiradas
                        for (const prescription of prescriptions) {
                            if (prescription.status !== 'dispensed') {
                                await prescription.update({
                                    status: 'expired',
                                    metadata: {
                                        ...prescription.metadata,
                                        expired_reason: 'Caso médico cerrado',
                                        expired_at: new Date()
                                    }
                                });

                                console.log(`⏰ [E-PRESCRIPTION] Receta ${prescription.prescription_number} marcada como expirada`);
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ [E-PRESCRIPTION] Error procesando cierre de caso:', error);
                }
            });

            console.log('✅ [E-PRESCRIPTION] Event listeners configurados');

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error configurando event listeners:', error);
        }
    },

    /**
     * Auto-registro en ModuleRegistry
     */
    registerInModuleRegistry(prescriptionService) {
        try {
            global.ModuleRegistry.register('electronic-prescriptions', {
                name: 'Recetas Electrónicas',
                version: '1.0.0',
                type: 'premium', // Módulo premium
                category: 'medical',
                description: 'Recetas electrónicas multi-país con firma digital',

                // Dependencias
                dependencies: {
                    required: ['medical-dashboard', 'partners-medical'],
                    optional: ['dms-dashboard']
                },

                // Servicios que provee
                provides: ['prescription_service', 'digital_signature', 'qr_generation'],

                // Plan requerido
                plan: 'premium',

                // Servicio
                service: prescriptionService,

                // Rutas
                routes: '/api/prescriptions/electronic',

                // Modelos
                models: ['ElectronicPrescription'],

                // Configuración por país
                countries: ['AR', 'BR', 'MX', 'US'],

                // Normativas
                regulations: {
                    'AR': 'Resolución 1560/2011 (ANMAT)',
                    'BR': 'Portaria 344/1998 (ANVISA)',
                    'MX': 'NOM-072-SSA1-2012 (COFEPRIS)',
                    'US': 'e-Prescribing (DEA)'
                },

                // Feature flags
                features: {
                    digital_signature: true,
                    qr_code: true,
                    controlled_substances: true,
                    multi_country: true,
                    pharmacy_dispensing: true
                },

                // Metadata
                metadata: {
                    icon: '💊',
                    color: '#28a745',
                    enabled: true,
                    visible_in_marketplace: true
                }
            });

            console.log('✅ [E-PRESCRIPTION] Módulo registrado en ModuleRegistry');

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error registrando en ModuleRegistry:', error);
        }
    }
};
