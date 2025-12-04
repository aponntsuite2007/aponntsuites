/**
 * ConsentRegionService - Servicio de detección automática de región para consentimientos
 *
 * Enfoque híbrido:
 * 1. Si el país tiene consent_renewal_months en BD → usar ese valor
 * 2. Si no → detectar región automáticamente y aplicar default
 *
 * Regiones y períodos:
 * - GDPR (EU/EEA + UK + Suiza) → 12 meses
 * - LATAM → 24 meses
 * - USA/Territorios → 36 meses
 * - Asia-Pacífico → 24 meses
 * - Default global → 24 meses
 */

// Países de la Unión Europea + EEA + asociados GDPR
const GDPR_COUNTRIES = new Set([
    // EU-27
    'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
    'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD',
    'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
    // EEA (no EU)
    'ISL', 'LIE', 'NOR',
    // UK (UK GDPR post-Brexit)
    'GBR',
    // Suiza (equivalente GDPR)
    'CHE',
    // Andorra, Mónaco, San Marino (aplican GDPR por proximidad)
    'AND', 'MCO', 'SMR', 'VAT'
]);

// Países de Latinoamérica
const LATAM_COUNTRIES = new Set([
    'ARG', 'BOL', 'BRA', 'CHL', 'COL', 'CRI', 'CUB', 'DOM', 'ECU', 'SLV',
    'GTM', 'HND', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'URY', 'VEN'
]);

// USA y territorios
const USA_TERRITORIES = new Set([
    'USA', 'PRI', 'VIR', 'GUM', 'ASM', 'MNP'
]);

// Asia-Pacífico con regulaciones estrictas (similar a GDPR)
const ASIA_STRICT = new Set([
    'KOR', 'JPN', 'TWN'  // Corea del Sur, Japón, Taiwán tienen leyes más estrictas
]);

class ConsentRegionService {

    /**
     * Detecta la región de un país por su código ISO-3
     * @param {string} countryCode - Código ISO-3 del país (ej: 'ARG', 'DEU', 'USA')
     * @returns {object} { region: string, defaultMonths: number, regulation: string }
     */
    static detectRegion(countryCode) {
        if (!countryCode) {
            return {
                region: 'UNKNOWN',
                defaultMonths: 24,
                regulation: 'Default (sin país configurado)'
            };
        }

        const code = countryCode.toUpperCase();

        // 1. GDPR (más estricto: 12 meses)
        if (GDPR_COUNTRIES.has(code)) {
            return {
                region: 'GDPR',
                defaultMonths: 12,
                regulation: 'GDPR / Reglamento General de Protección de Datos'
            };
        }

        // 2. Asia estricta (12 meses)
        if (ASIA_STRICT.has(code)) {
            return {
                region: 'ASIA_STRICT',
                defaultMonths: 12,
                regulation: code === 'KOR' ? 'PIPA (Korea)' :
                           code === 'JPN' ? 'APPI (Japan)' :
                           'PDPA (Taiwan)'
            };
        }

        // 3. USA y territorios (más permisivo: 36 meses)
        if (USA_TERRITORIES.has(code)) {
            return {
                region: 'USA',
                defaultMonths: 36,
                regulation: 'CCPA/BIPA (USA)'
            };
        }

        // 4. LATAM (24 meses)
        if (LATAM_COUNTRIES.has(code)) {
            const regulations = {
                'ARG': 'Ley 25.326',
                'BRA': 'LGPD',
                'MEX': 'LFPDPPP',
                'COL': 'Ley 1581',
                'CHL': 'Ley 19.628',
                'PER': 'Ley 29733',
                'URY': 'Ley 18.331',
                'ECU': 'LOPDP',
                'PAN': 'Ley 81',
                'CRI': 'Ley 8968'
            };
            return {
                region: 'LATAM',
                defaultMonths: 24,
                regulation: regulations[code] || 'Regulación LATAM'
            };
        }

        // 5. Default global (24 meses - conservador)
        return {
            region: 'GLOBAL',
            defaultMonths: 24,
            regulation: 'Default internacional'
        };
    }

    /**
     * Obtiene el período de renovación para un país
     * Prioridad: BD > Detección automática > Default
     *
     * @param {object} sequelize - Instancia de Sequelize
     * @param {string} countryCode - Código ISO-3 del país
     * @returns {Promise<object>} { months: number, source: string, region: string, regulation: string }
     */
    static async getRenewalPeriod(sequelize, countryCode) {
        // 1. Primero intentar obtener de la BD
        if (countryCode) {
            try {
                const result = await sequelize.query(`
                    SELECT country_code, country_name, consent_renewal_months
                    FROM payroll_countries
                    WHERE country_code = :code
                    LIMIT 1
                `, {
                    replacements: { code: countryCode.toUpperCase() },
                    type: sequelize.QueryTypes.SELECT
                });

                if (result.length > 0 && result[0].consent_renewal_months) {
                    return {
                        months: result[0].consent_renewal_months,
                        source: 'database',
                        region: 'CONFIGURED',
                        regulation: `Configurado en BD para ${result[0].country_name}`,
                        countryName: result[0].country_name
                    };
                }
            } catch (err) {
                console.warn(`⚠️ [ConsentRegion] Error consultando BD: ${err.message}`);
            }
        }

        // 2. Detección automática por región
        const detection = this.detectRegion(countryCode);

        return {
            months: detection.defaultMonths,
            source: 'auto-detection',
            region: detection.region,
            regulation: detection.regulation,
            countryName: null
        };
    }

    /**
     * Obtiene el período de renovación para un usuario específico
     * Busca el país de la sucursal del usuario
     *
     * @param {object} sequelize - Instancia de Sequelize
     * @param {string} userId - ID del usuario
     * @returns {Promise<object>}
     */
    static async getRenewalPeriodForUser(sequelize, userId) {
        try {
            // Buscar país del usuario a través de su sucursal/empresa
            const result = await sequelize.query(`
                SELECT pc.country_code, pc.country_name, pc.consent_renewal_months
                FROM users u
                LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_active = true
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE u.user_id = :userId
                LIMIT 1
            `, {
                replacements: { userId },
                type: sequelize.QueryTypes.SELECT
            });

            if (result.length > 0 && result[0].country_code) {
                const { country_code, country_name, consent_renewal_months } = result[0];

                // Si tiene valor en BD, usar ese
                if (consent_renewal_months) {
                    return {
                        months: consent_renewal_months,
                        source: 'database',
                        region: 'CONFIGURED',
                        regulation: `Configurado para ${country_name}`,
                        countryCode: country_code,
                        countryName: country_name
                    };
                }

                // Si no, detectar automáticamente
                const detection = this.detectRegion(country_code);
                return {
                    months: detection.defaultMonths,
                    source: 'auto-detection',
                    region: detection.region,
                    regulation: detection.regulation,
                    countryCode: country_code,
                    countryName: country_name
                };
            }

            // Usuario sin país configurado
            return {
                months: 24,
                source: 'default',
                region: 'UNKNOWN',
                regulation: 'Default (usuario sin país)',
                countryCode: null,
                countryName: null
            };

        } catch (err) {
            console.warn(`⚠️ [ConsentRegion] Error obteniendo país del usuario: ${err.message}`);
            return {
                months: 24,
                source: 'fallback',
                region: 'ERROR',
                regulation: 'Default por error',
                countryCode: null,
                countryName: null
            };
        }
    }

    /**
     * Información de debug sobre un país
     * @param {string} countryCode
     */
    static getCountryInfo(countryCode) {
        const detection = this.detectRegion(countryCode);
        return {
            countryCode: countryCode?.toUpperCase() || 'N/A',
            isGDPR: GDPR_COUNTRIES.has(countryCode?.toUpperCase()),
            isLATAM: LATAM_COUNTRIES.has(countryCode?.toUpperCase()),
            isUSA: USA_TERRITORIES.has(countryCode?.toUpperCase()),
            isAsiaStrict: ASIA_STRICT.has(countryCode?.toUpperCase()),
            ...detection
        };
    }

    /**
     * Lista todos los países conocidos por región (para documentación/debug)
     */
    static getAllRegions() {
        return {
            GDPR: {
                countries: Array.from(GDPR_COUNTRIES),
                defaultMonths: 12,
                description: 'Unión Europea, EEA, UK, Suiza y asociados'
            },
            LATAM: {
                countries: Array.from(LATAM_COUNTRIES),
                defaultMonths: 24,
                description: 'Latinoamérica'
            },
            USA: {
                countries: Array.from(USA_TERRITORIES),
                defaultMonths: 36,
                description: 'Estados Unidos y territorios'
            },
            ASIA_STRICT: {
                countries: Array.from(ASIA_STRICT),
                defaultMonths: 12,
                description: 'Asia con regulaciones estrictas'
            },
            GLOBAL: {
                countries: ['Todos los demás'],
                defaultMonths: 24,
                description: 'Default internacional'
            }
        };
    }
}

module.exports = ConsentRegionService;
