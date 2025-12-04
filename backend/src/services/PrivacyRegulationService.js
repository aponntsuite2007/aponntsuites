/**
 * PrivacyRegulationService - Servicio de Regulaciones de Privacidad Multi-País
 * Sistema de Asistencia Biométrico v3.0
 *
 * Patrón Enterprise: Workday/SAP SuccessFactors style
 *
 * Este servicio:
 * - Obtiene la configuración de privacidad del país de la empresa/sucursal
 * - Genera textos de consentimiento localizados
 * - Valida cumplimiento según jurisdicción
 * - Integra con ConsentManagementService existente
 */

const { PayrollCountry, Company, CompanyBranch } = require('../config/database');
const { Op } = require('sequelize');

class PrivacyRegulationService {

    /**
     * Cache de configuraciones de privacidad por país
     * Evita consultas repetidas a BD
     */
    static privacyCache = new Map();
    static CACHE_TTL = 60 * 60 * 1000; // 1 hora

    /**
     * Obtiene la configuración de privacidad para una empresa
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Configuración de privacidad del país
     */
    static async getPrivacyConfigForCompany(companyId) {
        try {
            // Buscar empresa
            const company = await Company.findByPk(companyId, {
                include: [{
                    model: CompanyBranch,
                    as: 'branches',
                    where: { is_active: true },
                    required: false,
                    limit: 1
                }]
            });

            if (!company) {
                console.warn(`[PRIVACY] Empresa ${companyId} no encontrada, usando config por defecto (ARG)`);
                return await this.getPrivacyConfigByCountryCode('ARG');
            }

            // Determinar país: primero de sucursal, luego de empresa
            let countryCode = 'ARG'; // Default

            if (company.branches && company.branches.length > 0) {
                const branch = company.branches[0];
                if (branch.country_id) {
                    const country = await PayrollCountry.findByPk(branch.country_id);
                    if (country) {
                        countryCode = country.country_code;
                    }
                }
            } else if (company.country) {
                // Intentar mapear el nombre del país al código
                countryCode = this.mapCountryNameToCode(company.country);
            }

            return await this.getPrivacyConfigByCountryCode(countryCode);

        } catch (error) {
            console.error('[PRIVACY] Error obteniendo config para empresa:', error);
            return await this.getPrivacyConfigByCountryCode('ARG');
        }
    }

    /**
     * Obtiene la configuración de privacidad por código de país
     * @param {string} countryCode - Código ISO del país (ARG, ESP, MEX, etc.)
     * @returns {Object} Configuración de privacidad completa
     */
    static async getPrivacyConfigByCountryCode(countryCode) {
        try {
            // Verificar cache
            const cacheKey = `privacy_${countryCode}`;
            const cached = this.privacyCache.get(cacheKey);
            if (cached && cached.timestamp > Date.now() - this.CACHE_TTL) {
                return cached.data;
            }

            // Buscar en BD
            const country = await PayrollCountry.findOne({
                where: {
                    country_code: countryCode,
                    is_active: true
                }
            });

            if (!country) {
                console.warn(`[PRIVACY] País ${countryCode} no encontrado, usando ARG`);
                if (countryCode !== 'ARG') {
                    return await this.getPrivacyConfigByCountryCode('ARG');
                }
                return this.getDefaultPrivacyConfig();
            }

            const config = this.buildPrivacyConfig(country);

            // Guardar en cache
            this.privacyCache.set(cacheKey, {
                data: config,
                timestamp: Date.now()
            });

            return config;

        } catch (error) {
            console.error('[PRIVACY] Error obteniendo config por país:', error);
            return this.getDefaultPrivacyConfig();
        }
    }

    /**
     * Construye objeto de configuración de privacidad desde modelo
     * @param {Object} country - Instancia de PayrollCountry
     * @returns {Object} Configuración estructurada
     */
    static buildPrivacyConfig(country) {
        return {
            // Información del país
            country: {
                code: country.country_code,
                name: country.country_name,
                currency: country.currency_code
            },

            // Ley de privacidad
            law: {
                name: country.privacy_law_name || 'Ley de Protección de Datos',
                reference: country.privacy_law_reference,
                version: country.privacy_law_version
            },

            // Autoridad de protección
            authority: {
                name: country.data_protection_authority,
                contactUrl: country.dpa_contact_url
            },

            // Textos de consentimiento (localizados)
            consentTexts: {
                intro: country.consent_intro_text,
                biometric: country.consent_biometric_text,
                emotional: country.consent_emotional_text,
                dataSharing: country.consent_data_sharing_text,
                rights: country.consent_rights_text,
                revocation: country.consent_revocation_text,
                footer: country.consent_footer_text
            },

            // Derechos del titular
            dataSubjectRights: {
                rights: country.data_subject_rights || [],
                exerciseUrl: country.rights_exercise_url,
                responseDays: country.rights_response_days || 30
            },

            // Retención de datos
            retention: {
                biometricDays: country.biometric_data_retention_days || 90,
                emotionalDays: country.emotional_data_retention_days || 365,
                attendanceYears: country.attendance_data_retention_years || 5
            },

            // Requisitos especiales
            requirements: {
                explicitConsent: country.requires_explicit_consent !== false,
                dpia: country.requires_dpia || false,
                dpo: country.requires_dpo || false,
                allowsBiometric: country.allows_biometric_for_attendance !== false,
                allowsEmotional: country.allows_emotional_analysis !== false
            },

            // Sanciones
            penalties: {
                maxAmount: country.max_penalty_amount,
                calculationMethod: country.penalty_calculation_method
            },

            // Transferencias internacionales
            internationalTransfer: {
                allowed: country.allows_international_transfer || false,
                mechanisms: country.transfer_mechanisms || [],
                adequateCountries: country.adequate_countries || []
            },

            // Notificación de brechas
            breachNotification: {
                hours: country.breach_notification_hours || 72,
                authority: country.breach_notification_authority
            },

            // Metadatos
            metadata: {
                configVersion: country.privacy_config_version || 1,
                lastReview: country.last_privacy_review,
                nextReview: country.next_privacy_review
            }
        };
    }

    /**
     * Genera documento de consentimiento completo para un empleado
     * @param {number} companyId - ID de la empresa
     * @param {Object} options - Opciones adicionales
     * @returns {Object} Documento de consentimiento estructurado
     */
    static async generateConsentDocument(companyId, options = {}) {
        const config = await this.getPrivacyConfigForCompany(companyId);
        const {
            includeEmotional = true,
            includeDataSharing = false,
            employeeName = '[Nombre del Empleado]',
            companyName = '[Nombre de la Empresa]'
        } = options;

        // Construir documento
        const sections = [];

        // Sección 1: Introducción
        if (config.consentTexts.intro) {
            sections.push({
                id: 'intro',
                title: 'Información sobre Tratamiento de Datos',
                content: this.replacePlaceholders(config.consentTexts.intro, {
                    employeeName,
                    companyName,
                    lawName: config.law.name
                }),
                required: true
            });
        }

        // Sección 2: Datos Biométricos
        if (config.consentTexts.biometric) {
            sections.push({
                id: 'biometric',
                title: 'Consentimiento para Datos Biométricos',
                content: this.replacePlaceholders(config.consentTexts.biometric, {
                    retentionDays: config.retention.biometricDays
                }),
                required: true,
                consentType: 'BIOMETRIC_DATA'
            });
        }

        // Sección 3: Análisis Emocional (opcional)
        if (includeEmotional && config.requirements.allowsEmotional && config.consentTexts.emotional) {
            sections.push({
                id: 'emotional',
                title: 'Consentimiento para Análisis Emocional',
                content: this.replacePlaceholders(config.consentTexts.emotional, {
                    retentionDays: config.retention.emotionalDays
                }),
                required: false,
                consentType: 'EMOTIONAL_ANALYSIS'
            });
        }

        // Sección 4: Compartición de Datos (opcional)
        if (includeDataSharing && config.consentTexts.dataSharing) {
            sections.push({
                id: 'dataSharing',
                title: 'Compartición de Datos con Terceros',
                content: config.consentTexts.dataSharing,
                required: false,
                consentType: 'DATA_SHARING'
            });
        }

        // Sección 5: Derechos
        if (config.consentTexts.rights) {
            sections.push({
                id: 'rights',
                title: 'Sus Derechos como Titular de Datos',
                content: config.consentTexts.rights,
                rightsList: config.dataSubjectRights.rights,
                required: true
            });
        }

        // Sección 6: Revocación
        if (config.consentTexts.revocation) {
            sections.push({
                id: 'revocation',
                title: 'Revocación del Consentimiento',
                content: config.consentTexts.revocation,
                required: true
            });
        }

        // Sección 7: Pie de documento
        if (config.consentTexts.footer) {
            sections.push({
                id: 'footer',
                title: 'Información de Contacto',
                content: this.replacePlaceholders(config.consentTexts.footer, {
                    authorityName: config.authority.name,
                    authorityUrl: config.authority.contactUrl
                }),
                required: true
            });
        }

        return {
            country: config.country,
            law: config.law,
            sections,
            requirements: config.requirements,
            generatedAt: new Date().toISOString(),
            validUntil: this.calculateValidityDate(config),
            checksums: this.generateDocumentChecksums(sections)
        };
    }

    /**
     * Valida si un empleado puede usar análisis biométrico/emocional
     * @param {number} companyId - ID de la empresa
     * @param {string} analysisType - Tipo: 'biometric' | 'emotional'
     * @returns {Object} Resultado de validación
     */
    static async validateAnalysisPermission(companyId, analysisType) {
        const config = await this.getPrivacyConfigForCompany(companyId);

        if (analysisType === 'biometric') {
            return {
                allowed: config.requirements.allowsBiometric,
                requiresConsent: config.requirements.explicitConsent,
                retentionDays: config.retention.biometricDays,
                law: config.law.name,
                message: config.requirements.allowsBiometric
                    ? `Análisis biométrico permitido bajo ${config.law.name}`
                    : `Análisis biométrico NO permitido en ${config.country.name}`
            };
        }

        if (analysisType === 'emotional') {
            return {
                allowed: config.requirements.allowsEmotional,
                requiresConsent: true, // Siempre requiere consentimiento
                retentionDays: config.retention.emotionalDays,
                law: config.law.name,
                requiresDPIA: config.requirements.dpia,
                message: config.requirements.allowsEmotional
                    ? `Análisis emocional permitido bajo ${config.law.name}${config.requirements.dpia ? ' (requiere DPIA)' : ''}`
                    : `Análisis emocional NO permitido en ${config.country.name}`
            };
        }

        return {
            allowed: false,
            message: 'Tipo de análisis no reconocido'
        };
    }

    /**
     * Obtiene resumen de cumplimiento para dashboard
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Resumen de cumplimiento
     */
    static async getComplianceSummary(companyId) {
        const config = await this.getPrivacyConfigForCompany(companyId);

        return {
            country: config.country.name,
            law: config.law.name,
            complianceItems: [
                {
                    item: 'Consentimiento Explícito',
                    required: config.requirements.explicitConsent,
                    description: 'Consentimiento informado y específico del empleado'
                },
                {
                    item: 'Evaluación de Impacto (DPIA)',
                    required: config.requirements.dpia,
                    description: 'Evaluación de riesgos para datos biométricos'
                },
                {
                    item: 'Delegado de Protección de Datos',
                    required: config.requirements.dpo,
                    description: 'Designación de DPO/DPD'
                },
                {
                    item: 'Notificación de Brechas',
                    required: true,
                    description: `Notificar en ${config.breachNotification.hours}h a ${config.breachNotification.authority || 'autoridad competente'}`
                }
            ],
            dataRetention: {
                biometric: `${config.retention.biometricDays} días`,
                emotional: `${config.retention.emotionalDays} días`,
                attendance: `${config.retention.attendanceYears} años`
            },
            dataSubjectRights: config.dataSubjectRights.rights,
            authority: config.authority.name,
            penalties: config.penalties.maxAmount
                ? `Hasta ${config.country.currency} ${config.penalties.maxAmount}`
                : 'Según legislación vigente'
        };
    }

    /**
     * Lista todos los países configurados con regulaciones de privacidad
     * @returns {Array} Lista de países con sus leyes
     */
    static async listConfiguredCountries() {
        try {
            const countries = await PayrollCountry.findAll({
                where: {
                    is_active: true,
                    privacy_law_name: { [Op.ne]: null }
                },
                attributes: [
                    'id', 'country_code', 'country_name',
                    'privacy_law_name', 'privacy_law_version',
                    'data_protection_authority', 'requires_dpia',
                    'allows_biometric_for_attendance', 'allows_emotional_analysis'
                ],
                order: [['country_name', 'ASC']]
            });

            return countries.map(c => ({
                id: c.id,
                code: c.country_code,
                name: c.country_name,
                law: c.privacy_law_name,
                lawVersion: c.privacy_law_version,
                authority: c.data_protection_authority,
                features: {
                    biometric: c.allows_biometric_for_attendance !== false,
                    emotional: c.allows_emotional_analysis !== false,
                    requiresDPIA: c.requires_dpia || false
                }
            }));

        } catch (error) {
            console.error('[PRIVACY] Error listando países:', error);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS AUXILIARES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Mapea nombre de país a código ISO
     */
    static mapCountryNameToCode(countryName) {
        const mapping = {
            'argentina': 'ARG',
            'españa': 'ESP',
            'spain': 'ESP',
            'mexico': 'MEX',
            'méxico': 'MEX',
            'brasil': 'BRA',
            'brazil': 'BRA',
            'chile': 'CHL',
            'colombia': 'COL',
            'estados unidos': 'USA',
            'united states': 'USA',
            'usa': 'USA',
            'peru': 'PER',
            'perú': 'PER',
            'uruguay': 'URY',
            'ecuador': 'ECU',
            'venezuela': 'VEN'
        };

        const normalized = (countryName || '').toLowerCase().trim();
        return mapping[normalized] || 'ARG';
    }

    /**
     * Reemplaza placeholders en textos
     */
    static replacePlaceholders(text, values) {
        if (!text) return '';

        let result = text;
        for (const [key, value] of Object.entries(values)) {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(regex, value || '');
        }
        return result;
    }

    /**
     * Calcula fecha de validez del documento
     */
    static calculateValidityDate(config) {
        const now = new Date();
        // El documento es válido hasta la próxima revisión o 1 año
        if (config.metadata.nextReview) {
            return config.metadata.nextReview;
        }
        now.setFullYear(now.getFullYear() + 1);
        return now.toISOString();
    }

    /**
     * Genera checksums para integridad del documento
     */
    static generateDocumentChecksums(sections) {
        const crypto = require('crypto');
        const content = sections.map(s => s.content).join('|');
        return {
            sha256: crypto.createHash('sha256').update(content).digest('hex'),
            version: '1.0',
            algorithm: 'SHA-256'
        };
    }

    /**
     * Retorna configuración por defecto (Argentina)
     */
    static getDefaultPrivacyConfig() {
        return {
            country: { code: 'ARG', name: 'Argentina', currency: 'ARS' },
            law: { name: 'Ley 25.326', reference: 'https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm' },
            authority: { name: 'Agencia de Acceso a la Información Pública (AAIP)', contactUrl: 'https://www.argentina.gob.ar/aaip' },
            consentTexts: {
                intro: 'En cumplimiento de la Ley 25.326 de Protección de Datos Personales, le informamos sobre el tratamiento de sus datos.',
                biometric: 'Sus datos biométricos serán utilizados exclusivamente para control de asistencia.',
                emotional: 'El análisis emocional es opcional y requiere su consentimiento expreso.',
                rights: 'Usted tiene derecho a acceder, rectificar y suprimir sus datos personales.',
                revocation: 'Puede revocar este consentimiento en cualquier momento.',
                footer: 'Para consultas contacte al responsable de protección de datos de la empresa.'
            },
            dataSubjectRights: { rights: ['acceso', 'rectificación', 'supresión', 'oposición'], responseDays: 10 },
            retention: { biometricDays: 90, emotionalDays: 365, attendanceYears: 5 },
            requirements: { explicitConsent: true, dpia: false, dpo: false, allowsBiometric: true, allowsEmotional: true },
            penalties: { maxAmount: null, calculationMethod: 'Multas según Ley 25.326' },
            internationalTransfer: { allowed: true, mechanisms: ['Consentimiento', 'País adecuado'], adequateCountries: [] },
            breachNotification: { hours: 72, authority: 'AAIP' },
            metadata: { configVersion: 1 }
        };
    }

    /**
     * Limpia cache de configuraciones
     */
    static clearCache() {
        this.privacyCache.clear();
        console.log('[PRIVACY] Cache limpiado');
    }

    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE DETECCIÓN POR SUCURSAL DEL EMPLEADO
    // ═══════════════════════════════════════════════════════════════

    /**
     * Obtiene la regulación aplicable a un empleado específico
     * basándose en la sucursal donde trabaja
     * @param {string} employeeId - ID del empleado
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Regulación aplicable con país detectado
     */
    static async getEmployeeRegulation(employeeId, companyId) {
        try {
            const { sequelize } = require('../config/database');

            // Buscar empleado con su sucursal y país
            const [results] = await sequelize.query(`
                SELECT
                    u.id as user_id,
                    u.first_name,
                    u.last_name,
                    u.default_branch_id,
                    cb.id as branch_id,
                    cb.branch_name,
                    cb.country_id,
                    pc.country_code,
                    pc.country_name,
                    pc.privacy_law_name,
                    pc.data_protection_authority
                FROM users u
                LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_active = true
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE u.id = :employeeId AND u.company_id = :companyId
                LIMIT 1
            `, {
                replacements: { employeeId, companyId }
            });

            const employee = results[0];

            if (!employee) {
                return {
                    detected: false,
                    countryCode: 'ARG',
                    countryName: 'Argentina',
                    source: 'default',
                    message: 'Empleado no encontrado, usando regulación por defecto',
                    regulation: await this.getPrivacyConfigByCountryCode('ARG')
                };
            }

            // Si tiene país de sucursal
            if (employee.country_code) {
                return {
                    detected: true,
                    employeeId: employee.user_id,
                    employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                    branchId: employee.branch_id,
                    branchName: employee.branch_name,
                    countryCode: employee.country_code,
                    countryName: employee.country_name,
                    lawName: employee.privacy_law_name,
                    authority: employee.data_protection_authority,
                    source: 'branch_country',
                    message: `Regulación de ${employee.country_name} aplicable por sucursal ${employee.branch_name}`,
                    regulation: await this.getPrivacyConfigByCountryCode(employee.country_code)
                };
            }

            // Fallback a configuración de empresa
            const config = await this.getPrivacyConfigForCompany(companyId);
            return {
                detected: true,
                employeeId: employee.user_id,
                employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                countryCode: config.country.code,
                countryName: config.country.name,
                lawName: config.law.name,
                source: 'company_default',
                message: `Regulación por defecto de la empresa (${config.country.name})`,
                regulation: config
            };

        } catch (error) {
            console.error('[PRIVACY] Error obteniendo regulación de empleado:', error);
            return {
                detected: false,
                countryCode: 'ARG',
                countryName: 'Argentina',
                source: 'error_fallback',
                message: 'Error detectando regulación, usando Argentina por defecto',
                regulation: await this.getPrivacyConfigByCountryCode('ARG')
            };
        }
    }

    /**
     * Obtiene las sucursales de una empresa agrupadas por país
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Sucursales agrupadas por país con regulación aplicable
     */
    static async getBranchesByCountry(companyId) {
        try {
            const { sequelize } = require('../config/database');

            const [branches] = await sequelize.query(`
                SELECT
                    cb.id as branch_id,
                    cb.branch_code,
                    cb.branch_name,
                    cb.city,
                    cb.state_province,
                    cb.is_headquarters,
                    pc.id as country_id,
                    pc.country_code,
                    pc.country_name,
                    pc.privacy_law_name,
                    pc.requires_dpia,
                    pc.requires_dpo,
                    (SELECT COUNT(*) FROM users u WHERE u.company_id = cb.company_id AND u.is_active = true) as employee_count
                FROM company_branches cb
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE cb.company_id = :companyId AND cb.is_active = true
                ORDER BY pc.country_name, cb.branch_name
            `, {
                replacements: { companyId }
            });

            // Agrupar por país
            const byCountry = {};

            for (const branch of branches) {
                const countryCode = branch.country_code || 'UNKNOWN';
                const countryName = branch.country_name || 'Sin país asignado';

                if (!byCountry[countryCode]) {
                    byCountry[countryCode] = {
                        countryCode,
                        countryName,
                        lawName: branch.privacy_law_name || 'Sin ley configurada',
                        requiresDPIA: branch.requires_dpia || false,
                        requiresDPO: branch.requires_dpo || false,
                        branches: [],
                        totalEmployees: 0
                    };
                }

                byCountry[countryCode].branches.push({
                    id: branch.branch_id,
                    code: branch.branch_code,
                    name: branch.branch_name,
                    city: branch.city,
                    stateProvince: branch.state_province,
                    isHeadquarters: branch.is_headquarters
                });
            }

            // Obtener conteo real de empleados por sucursal si hay datos
            const [employeeCounts] = await sequelize.query(`
                SELECT
                    cb.id as branch_id,
                    COUNT(u.id) as employee_count
                FROM company_branches cb
                LEFT JOIN users u ON u.default_branch_id = cb.id::text AND u.is_active = true
                WHERE cb.company_id = :companyId AND cb.is_active = true
                GROUP BY cb.id
            `, {
                replacements: { companyId }
            });

            // Actualizar conteos
            const countMap = {};
            for (const ec of employeeCounts) {
                countMap[ec.branch_id] = parseInt(ec.employee_count) || 0;
            }

            for (const country of Object.values(byCountry)) {
                for (const branch of country.branches) {
                    branch.employeeCount = countMap[branch.id] || 0;
                    country.totalEmployees += branch.employeeCount;
                }
            }

            return {
                countries: Object.values(byCountry),
                totalBranches: branches.length,
                countriesCount: Object.keys(byCountry).length
            };

        } catch (error) {
            console.error('[PRIVACY] Error obteniendo sucursales por país:', error);
            return { countries: [], totalBranches: 0, countriesCount: 0 };
        }
    }

    /**
     * Obtiene empleados agrupados por la regulación que les aplica
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Empleados agrupados por regulación/país
     */
    static async getEmployeesByRegulation(companyId) {
        try {
            const { sequelize } = require('../config/database');

            const [employees] = await sequelize.query(`
                SELECT
                    u.id as user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.default_branch_id,
                    cb.branch_name,
                    COALESCE(pc.country_code, 'ARG') as country_code,
                    COALESCE(pc.country_name, 'Argentina') as country_name,
                    COALESCE(pc.privacy_law_name, 'Ley 25.326') as privacy_law_name
                FROM users u
                LEFT JOIN company_branches cb ON cb.id::text = u.default_branch_id AND cb.is_active = true
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE u.company_id = :companyId AND u.is_active = true
                ORDER BY pc.country_name, u.last_name, u.first_name
            `, {
                replacements: { companyId }
            });

            // Agrupar por país/regulación
            const byRegulation = {};

            for (const emp of employees) {
                const key = emp.country_code;

                if (!byRegulation[key]) {
                    byRegulation[key] = {
                        countryCode: emp.country_code,
                        countryName: emp.country_name,
                        lawName: emp.privacy_law_name,
                        employees: [],
                        count: 0
                    };
                }

                byRegulation[key].employees.push({
                    id: emp.user_id,
                    name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                    email: emp.email,
                    branchName: emp.branch_name || 'Sin sucursal'
                });
                byRegulation[key].count++;
            }

            return {
                regulations: Object.values(byRegulation),
                totalEmployees: employees.length,
                regulationsCount: Object.keys(byRegulation).length,
                summary: Object.values(byRegulation).map(r => ({
                    country: r.countryName,
                    law: r.lawName,
                    employees: r.count
                }))
            };

        } catch (error) {
            console.error('[PRIVACY] Error obteniendo empleados por regulación:', error);
            return { regulations: [], totalEmployees: 0, regulationsCount: 0, summary: [] };
        }
    }
}

module.exports = PrivacyRegulationService;
