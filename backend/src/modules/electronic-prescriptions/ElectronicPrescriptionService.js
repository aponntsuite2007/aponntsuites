/**
 * ========================================================================
 * SERVICIO: Recetas Electrónicas Multi-País
 * ========================================================================
 * Gestión completa de recetas electrónicas con normativas específicas:
 * - Argentina: Resolución 1560/2011 (ANMAT) + Firma Digital AFIP
 * - Brasil: Portaria 344/1998 (ANVISA) + ICP-Brasil
 * - México: NOM-072-SSA1-2012 (COFEPRIS) + FIEL
 * - USA: e-Prescribing (DEA)
 *
 * Integración SSOT:
 * - NotificationEnterpriseService para notificaciones
 * - EventBus para comunicación con otros módulos
 * - Manual de Procedimientos para workflows
 *
 * @version 1.0.0
 * ========================================================================
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

class ElectronicPrescriptionService {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;

        console.log('💊 [E-PRESCRIPTION] Servicio de Recetas Electrónicas inicializado');
    }

    /**
     * Configuración por país
     */
    getCountryConfig(country) {
        const configs = {
            'AR': {
                name: 'Argentina',
                regulation: 'Resolución 1560/2011',
                regulatory_body: 'ANMAT',
                signature_type: 'afip',
                requires_digital_signature: true,
                validity_days: {
                    normal: 30,
                    controlled: 30,
                    chronic: 90
                },
                prescription_format: 'AR-EP-{company_id}-{sequence}-{year}',
                controlled_levels: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5']
            },
            'BR': {
                name: 'Brasil',
                regulation: 'Portaria 344/1998',
                regulatory_body: 'ANVISA',
                signature_type: 'icp_brasil',
                requires_digital_signature: true,
                validity_days: {
                    normal: 30,
                    controlled: 30,
                    notificacao_b: 30
                },
                prescription_format: 'BR-RX-{company_id}-{sequence}-{year}',
                controlled_levels: ['level_1', 'level_2', 'level_3']
            },
            'MX': {
                name: 'México',
                regulation: 'NOM-072-SSA1-2012',
                regulatory_body: 'COFEPRIS',
                signature_type: 'fiel_mexico',
                requires_digital_signature: true,
                validity_days: {
                    normal: 30,
                    controlled: 30,
                    psychotropic: 30
                },
                prescription_format: 'MX-PR-{company_id}-{sequence}-{year}',
                controlled_levels: ['level_1', 'level_2', 'level_3']
            },
            'US': {
                name: 'United States',
                regulation: 'e-Prescribing (DEA)',
                regulatory_body: 'DEA',
                signature_type: 'dea_usa',
                requires_digital_signature: true,
                validity_days: {
                    normal: 365,
                    schedule_ii: 90,
                    schedule_iii_iv: 180,
                    schedule_v: 180
                },
                prescription_format: 'US-EP-{company_id}-{sequence}-{year}',
                controlled_levels: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'] // Schedule I-V
            }
        };

        return configs[country] || configs['AR']; // Default Argentina
    }

    /**
     * Crear receta electrónica
     */
    async createPrescription(data) {
        try {
            console.log(`💊 [E-PRESCRIPTION] Creando receta para empleado ${data.employee_id}...`);

            // 1. Validar datos básicos
            this.validatePrescriptionData(data);

            // 2. Obtener configuración del país
            const countryConfig = this.getCountryConfig(data.country);

            // 3. Generar número de receta único
            const prescriptionNumber = await this.generatePrescriptionNumber(data.country, data.company_id);

            // 4. Calcular fecha de validez según país y tipo de medicamento
            const validUntil = this.calculateValidityDate(data.country, data.is_controlled, data.control_level);

            // 5. Validar medicamento controlado si aplica
            if (data.is_controlled) {
                await this.validateControlledSubstance(data, countryConfig);
            }

            // 6. Crear registro en BD
            const prescription = await this.database.ElectronicPrescription.create({
                employee_id: data.employee_id,
                doctor_id: data.doctor_id,
                company_id: data.company_id,
                medical_case_id: data.medical_case_id || null,

                // Medicamento
                medication_name: data.medication_name,
                medication_type: data.medication_type || 'generic',
                active_ingredient: data.active_ingredient || null,
                dosage: data.dosage,
                quantity: data.quantity,
                duration_days: data.duration_days,
                instructions: data.instructions || null,

                // Clasificación
                is_controlled: data.is_controlled || false,
                control_level: data.control_level || 'none',

                // País y normativa
                country: data.country,
                regulation: countryConfig.regulation,
                prescription_number: prescriptionNumber,

                // Firma (inicialmente pendiente)
                signature_type: countryConfig.signature_type,

                // Validez
                valid_from: new Date(),
                valid_until: validUntil,
                status: 'pending', // Requiere firma

                // Registros específicos por país
                anmat_registration: data.anmat_registration || null,
                anvisa_registration: data.anvisa_registration || null,
                notification_b: data.notification_b || false,
                cofepris_registration: data.cofepris_registration || null,
                dea_number: data.dea_number || null,

                metadata: {
                    country_config: countryConfig.name,
                    regulatory_body: countryConfig.regulatory_body,
                    created_by: data.created_by || 'system'
                }
            });

            console.log(`✅ [E-PRESCRIPTION] Receta creada: ${prescriptionNumber}`);

            // 7. Emitir evento (para integración con otros módulos)
            this.emitEvent('prescription:created', {
                prescriptionId: prescription.id,
                prescriptionNumber: prescription.prescription_number,
                employeeId: data.employee_id,
                doctorId: data.doctor_id,
                companyId: data.company_id,
                isControlled: data.is_controlled,
                country: data.country,
                requiresSignature: true
            });

            // 8. Notificar al empleado (SSOT)
            await this.notifyPrescriptionCreated(prescription);

            return prescription;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error creando receta:', error);
            throw error;
        }
    }

    /**
     * Firmar receta digitalmente
     */
    async signPrescription(prescriptionId, signatureData) {
        try {
            console.log(`🔐 [E-PRESCRIPTION] Firmando receta ${prescriptionId}...`);

            // 1. Obtener receta
            const prescription = await this.database.ElectronicPrescription.findByPk(prescriptionId);
            if (!prescription) {
                throw new Error('Receta no encontrada');
            }

            if (prescription.status !== 'pending') {
                throw new Error(`Receta ya está en estado: ${prescription.status}`);
            }

            // 2. Validar firma según país
            const countryConfig = this.getCountryConfig(prescription.country);
            this.validateDigitalSignature(signatureData, countryConfig);

            // 3. Generar hash de firma
            const signatureHash = this.generateSignatureHash(prescription, signatureData);

            // 4. Generar QR Code
            const qrCodeData = await this.generateQRCode(prescription);

            // 5. Generar Barcode (opcional)
            const barcode = this.generateBarcode(prescription.prescription_number);

            // 6. Actualizar receta
            await prescription.update({
                digital_signature: signatureHash,
                signature_timestamp: new Date(),
                qr_code: qrCodeData,
                barcode: barcode,
                status: 'signed'
            });

            console.log(`✅ [E-PRESCRIPTION] Receta firmada: ${prescription.prescription_number}`);

            // 7. Emitir evento
            this.emitEvent('prescription:signed', {
                prescriptionId: prescription.id,
                prescriptionNumber: prescription.prescription_number,
                signatureType: countryConfig.signature_type,
                country: prescription.country
            });

            // 8. Notificar (SSOT)
            await this.notifyPrescriptionSigned(prescription);

            return prescription;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error firmando receta:', error);
            throw error;
        }
    }

    /**
     * Dispensar receta (farmacia)
     */
    async dispensePrescription(prescriptionId, dispensingData) {
        try {
            console.log(`💊 [E-PRESCRIPTION] Dispensando receta ${prescriptionId}...`);

            const prescription = await this.database.ElectronicPrescription.findByPk(prescriptionId);
            if (!prescription) {
                throw new Error('Receta no encontrada');
            }

            if (prescription.status !== 'signed') {
                throw new Error('Receta debe estar firmada para dispensar');
            }

            // Verificar validez
            if (new Date() > new Date(prescription.valid_until)) {
                throw new Error('Receta expirada');
            }

            // Actualizar
            await prescription.update({
                status: 'dispensed',
                pharmacy_id: dispensingData.pharmacy_id || null,
                dispensed_at: new Date(),
                dispensed_by: dispensingData.dispensed_by || null
            });

            console.log(`✅ [E-PRESCRIPTION] Receta dispensada: ${prescription.prescription_number}`);

            // Emitir evento
            this.emitEvent('prescription:dispensed', {
                prescriptionId: prescription.id,
                prescriptionNumber: prescription.prescription_number,
                pharmacyId: dispensingData.pharmacy_id
            });

            // Notificar
            await this.notifyPrescriptionDispensed(prescription);

            return prescription;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error dispensando receta:', error);
            throw error;
        }
    }

    /**
     * Cancelar receta
     */
    async cancelPrescription(prescriptionId, reason) {
        try {
            const prescription = await this.database.ElectronicPrescription.findByPk(prescriptionId);
            if (!prescription) {
                throw new Error('Receta no encontrada');
            }

            if (prescription.status === 'dispensed') {
                throw new Error('No se puede cancelar receta ya dispensada');
            }

            await prescription.update({
                status: 'cancelled',
                metadata: {
                    ...prescription.metadata,
                    cancellation_reason: reason,
                    cancelled_at: new Date()
                }
            });

            console.log(`❌ [E-PRESCRIPTION] Receta cancelada: ${prescription.prescription_number}`);

            this.emitEvent('prescription:cancelled', {
                prescriptionId: prescription.id,
                prescriptionNumber: prescription.prescription_number,
                reason: reason
            });

            return prescription;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error cancelando receta:', error);
            throw error;
        }
    }

    /**
     * Obtener recetas de un empleado
     */
    async getEmployeePrescriptions(employeeId, filters = {}) {
        try {
            const where = { employee_id: employeeId };

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.is_controlled !== undefined) {
                where.is_controlled = filters.is_controlled;
            }

            if (filters.country) {
                where.country = filters.country;
            }

            const prescriptions = await this.database.ElectronicPrescription.findAll({
                where,
                include: [
                    { model: this.database.Partner, as: 'doctor', attributes: ['id', 'firstName', 'lastName', 'specialty'] },
                    { model: this.database.Company, as: 'company', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']]
            });

            return prescriptions;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error obteniendo recetas:', error);
            throw error;
        }
    }

    /**
     * Obtener recetas de un médico
     */
    async getDoctorPrescriptions(doctorId, filters = {}) {
        try {
            const where = { doctor_id: doctorId };

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.date_from) {
                where.created_at = { [this.sequelize.Sequelize.Op.gte]: filters.date_from };
            }

            const prescriptions = await this.database.ElectronicPrescription.findAll({
                where,
                include: [
                    { model: this.database.User, as: 'employee', attributes: ['id', 'firstName', 'lastName'] },
                    { model: this.database.Company, as: 'company', attributes: ['id', 'name'] }
                ],
                order: [['created_at', 'DESC']],
                limit: filters.limit || 100
            });

            return prescriptions;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error obteniendo recetas del médico:', error);
            throw error;
        }
    }

    // ========================================================================
    // MÉTODOS AUXILIARES
    // ========================================================================

    /**
     * Validar datos de receta
     */
    validatePrescriptionData(data) {
        const required = ['employee_id', 'doctor_id', 'company_id', 'medication_name', 'dosage', 'quantity', 'duration_days', 'country'];

        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Campo requerido: ${field}`);
            }
        }

        // Validar país soportado
        const supportedCountries = ['AR', 'BR', 'MX', 'US'];
        if (!supportedCountries.includes(data.country)) {
            throw new Error(`País no soportado: ${data.country}`);
        }

        // Validar medicamento controlado
        if (data.is_controlled && !data.control_level) {
            throw new Error('Debe especificar control_level para medicamentos controlados');
        }
    }

    /**
     * Generar número de receta único
     */
    async generatePrescriptionNumber(country, companyId) {
        const year = new Date().getFullYear();

        // Obtener última secuencia del año
        const [result] = await this.sequelize.query(`
            SELECT COALESCE(MAX(
                CAST(
                    SUBSTRING(prescription_number FROM 'AR-EP-${companyId}-(\\d+)-${year}')
                    AS INTEGER
                )
            ), 0) + 1 AS next_sequence
            FROM electronic_prescriptions
            WHERE country = :country
              AND company_id = :companyId
              AND prescription_number LIKE :pattern
        `, {
            replacements: {
                country,
                companyId,
                pattern: `${country}%-${companyId}%${year}`
            },
            type: this.sequelize.QueryTypes.SELECT
        });

        const sequence = result[0].next_sequence || 1;
        const prefix = country === 'AR' ? 'AR-EP' :
                      country === 'BR' ? 'BR-RX' :
                      country === 'MX' ? 'MX-PR' : 'US-EP';

        return `${prefix}-${companyId}-${String(sequence).padStart(6, '0')}-${year}`;
    }

    /**
     * Calcular fecha de validez según país y tipo
     */
    calculateValidityDate(country, isControlled, controlLevel) {
        const config = this.getCountryConfig(country);
        let validityDays = config.validity_days.normal;

        if (isControlled) {
            if (country === 'AR') {
                validityDays = config.validity_days.controlled;
            } else if (country === 'BR' && controlLevel === 'level_1') {
                validityDays = config.validity_days.notificacao_b || 30;
            } else if (country === 'US') {
                if (controlLevel === 'level_1') validityDays = config.validity_days.schedule_ii;
                else if (['level_2', 'level_3'].includes(controlLevel)) validityDays = config.validity_days.schedule_iii_iv;
                else validityDays = config.validity_days.schedule_v;
            }
        }

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validityDays);
        return validUntil;
    }

    /**
     * Validar sustancia controlada
     */
    async validateControlledSubstance(data, countryConfig) {
        // Validar que el nivel de control sea válido para el país
        if (!countryConfig.controlled_levels.includes(data.control_level)) {
            throw new Error(`Nivel de control inválido para ${countryConfig.name}: ${data.control_level}`);
        }

        // Argentina: Requiere registro ANMAT
        if (data.country === 'AR' && !data.anmat_registration) {
            console.warn('⚠️ [E-PRESCRIPTION] Medicamento controlado en Argentina sin registro ANMAT');
        }

        // Brasil: Notificação de Receita B
        if (data.country === 'BR' && data.control_level === 'level_1') {
            if (!data.notification_b) {
                throw new Error('Medicamentos Lista B1/B2 requieren Notificação de Receita B');
            }
        }

        // USA: Requiere DEA number del médico
        if (data.country === 'US' && !data.dea_number) {
            throw new Error('Medicamentos controlados en USA requieren DEA number del médico');
        }
    }

    /**
     * Validar firma digital
     */
    validateDigitalSignature(signatureData, countryConfig) {
        if (countryConfig.requires_digital_signature && !signatureData.signature) {
            throw new Error(`${countryConfig.name} requiere firma digital (${countryConfig.signature_type})`);
        }

        // Aquí iría la validación específica de cada tipo de firma
        // Por ahora solo verificamos que exista
        if (!signatureData.signature || !signatureData.certificate) {
            throw new Error('Firma digital incompleta');
        }
    }

    /**
     * Generar hash de firma
     */
    generateSignatureHash(prescription, signatureData) {
        const dataToSign = `${prescription.prescription_number}|${prescription.medication_name}|${prescription.dosage}|${signatureData.certificate}`;
        return crypto.createHash('sha256').update(dataToSign).digest('hex');
    }

    /**
     * Generar QR Code
     */
    async generateQRCode(prescription) {
        try {
            const qrData = {
                prescription_number: prescription.prescription_number,
                country: prescription.country,
                medication: prescription.medication_name,
                dosage: prescription.dosage,
                quantity: prescription.quantity,
                valid_until: prescription.valid_until,
                is_controlled: prescription.is_controlled,
                verification_url: `https://verify.prescriptions.com/${prescription.prescription_number}`
            };

            const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 1,
                width: 300
            });

            return qrCodeDataURL;

        } catch (error) {
            console.error('❌ [E-PRESCRIPTION] Error generando QR Code:', error);
            return null;
        }
    }

    /**
     * Generar Barcode
     */
    generateBarcode(prescriptionNumber) {
        // Convertir número de receta a código numérico simple
        return prescriptionNumber.replace(/[^0-9]/g, '').substring(0, 13);
    }

    /**
     * Emitir evento (EventBus integration)
     */
    emitEvent(eventName, data) {
        try {
            // Si existe EventBus global, usarlo
            if (global.EventBus) {
                global.EventBus.emit(`medical:${eventName}`, data);
            }
            console.log(`📢 [E-PRESCRIPTION] Evento emitido: medical:${eventName}`);
        } catch (error) {
            console.error('⚠️ [E-PRESCRIPTION] Error emitiendo evento:', error.message);
        }
    }

    // ========================================================================
    // NOTIFICACIONES (SSOT)
    // ========================================================================

    async notifyPrescriptionCreated(prescription) {
        try {
            await this.notificationService.createNotification({
                companyId: prescription.company_id.toString(),
                fromModule: 'medical',
                fromUserId: prescription.doctor_id.toString(),
                toUserId: prescription.employee_id.toString(),
                toRole: 'employee',
                notificationType: 'medical_document',
                title: '💊 Nueva Receta Médica Electrónica',
                message: `Se ha emitido una receta electrónica para ${prescription.medication_name}. Pendiente de firma digital.`,
                priority: 'medium',
                channels: ['internal', 'email'],
                metadata: {
                    type: 'prescription_created',
                    prescriptionId: prescription.id,
                    prescriptionNumber: prescription.prescription_number,
                    medicationName: prescription.medication_name,
                    isControlled: prescription.is_controlled,
                    requiresSignature: true
                },
                requiresResponse: false
            });
        } catch (error) {
            console.error('⚠️ [E-PRESCRIPTION] Error enviando notificación:', error.message);
        }
    }

    async notifyPrescriptionSigned(prescription) {
        try {
            await this.notificationService.createNotification({
                companyId: prescription.company_id.toString(),
                fromModule: 'medical',
                fromUserId: prescription.doctor_id.toString(),
                toUserId: prescription.employee_id.toString(),
                toRole: 'employee',
                notificationType: 'medical_document',
                title: '✅ Receta Médica Firmada Digitalmente',
                message: `Su receta electrónica ${prescription.prescription_number} ha sido firmada. Válida hasta ${new Date(prescription.valid_until).toLocaleDateString('es-AR')}`,
                priority: 'high',
                channels: ['internal', 'email'],
                metadata: {
                    type: 'prescription_signed',
                    prescriptionId: prescription.id,
                    prescriptionNumber: prescription.prescription_number,
                    validUntil: prescription.valid_until,
                    hasQRCode: !!prescription.qr_code
                },
                requiresResponse: false
            });
        } catch (error) {
            console.error('⚠️ [E-PRESCRIPTION] Error enviando notificación:', error.message);
        }
    }

    async notifyPrescriptionDispensed(prescription) {
        try {
            await this.notificationService.createNotification({
                companyId: prescription.company_id.toString(),
                fromModule: 'medical',
                fromUserId: null,
                toUserId: prescription.employee_id.toString(),
                toRole: 'employee',
                notificationType: 'medical_alert',
                title: '💊 Receta Dispensada',
                message: `La receta ${prescription.prescription_number} ha sido dispensada en farmacia.`,
                priority: 'low',
                channels: ['internal'],
                metadata: {
                    type: 'prescription_dispensed',
                    prescriptionId: prescription.id,
                    prescriptionNumber: prescription.prescription_number,
                    dispensedAt: prescription.dispensed_at
                },
                requiresResponse: false
            });
        } catch (error) {
            console.error('⚠️ [E-PRESCRIPTION] Error enviando notificación:', error.message);
        }
    }
}

module.exports = ElectronicPrescriptionService;
