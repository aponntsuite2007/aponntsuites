/**
 * ============================================================================
 * LegalJurisdictionService - Servicio Multi-Jurisdiccional para Sistema Legal
 * ============================================================================
 *
 * Patrón basado en ConsentRegionService - Detección automática de jurisdicción
 * y normativa laboral aplicable según país de la sucursal/empresa.
 *
 * Enfoque híbrido:
 * 1. Si el país tiene config en BD → usar esa configuración
 * 2. Si no → detectar región automáticamente y aplicar defaults
 *
 * SSOT: La jurisdicción se determina desde la tabla payroll_countries
 *       vinculada a company_branches.country_id
 *
 * @version 1.0.0
 * @date 2025-12-03
 * ============================================================================
 */

// ============================================================================
// MARCOS LEGALES POR PAÍS (Derecho Laboral)
// ============================================================================
const LABOR_LAW_BY_COUNTRY = {
    // === LATINOAMÉRICA ===
    'ARG': {
        name: 'Ley de Contrato de Trabajo',
        code: 'LCT',
        fullName: 'Ley 20.744 - Régimen de Contrato de Trabajo',
        disciplinaryArticles: 'Arts. 67, 68, 218-223',
        dismissalArticles: 'Arts. 231-255',
        sanctionsArticles: 'Art. 67 (suspensiones disciplinarias hasta 30 días/año)',
        authority: 'Ministerio de Trabajo, Empleo y Seguridad Social',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 2, // días hábiles para descargo
            maxSuspensionDays: 30 // por año
        }
    },
    'BRA': {
        name: 'Consolidação das Leis do Trabalho',
        code: 'CLT',
        fullName: 'Decreto-Lei nº 5.452/1943 - CLT',
        disciplinaryArticles: 'Arts. 482, 483',
        dismissalArticles: 'Arts. 477-486',
        sanctionsArticles: 'Art. 474 (suspensão até 30 dias)',
        authority: 'Ministério do Trabalho e Previdência',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 0,
            maxSuspensionDays: 30
        }
    },
    'MEX': {
        name: 'Ley Federal del Trabajo',
        code: 'LFT',
        fullName: 'Ley Federal del Trabajo (DOF 01-04-1970)',
        disciplinaryArticles: 'Arts. 47, 48',
        dismissalArticles: 'Arts. 46-52',
        sanctionsArticles: 'Art. 47 (causales de rescisión)',
        authority: 'Secretaría del Trabajo y Previsión Social',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 5,
            maxSuspensionDays: 8
        }
    },
    'CHL': {
        name: 'Código del Trabajo',
        code: 'CT',
        fullName: 'Código del Trabajo de Chile',
        disciplinaryArticles: 'Arts. 160, 161',
        dismissalArticles: 'Arts. 159-171',
        sanctionsArticles: 'Reglamento interno de empresa',
        authority: 'Dirección del Trabajo',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 3,
            maxSuspensionDays: 0 // No permite suspensiones
        }
    },
    'COL': {
        name: 'Código Sustantivo del Trabajo',
        code: 'CST',
        fullName: 'Código Sustantivo del Trabajo',
        disciplinaryArticles: 'Arts. 62, 63',
        dismissalArticles: 'Arts. 61-66',
        sanctionsArticles: 'Art. 112 (suspensiones hasta 8 días)',
        authority: 'Ministerio del Trabajo',
        requirements: {
            writtenNotice: true,
            witnessRequired: true,
            responseDeadline: 5,
            maxSuspensionDays: 8
        }
    },
    'PER': {
        name: 'Ley de Productividad y Competitividad Laboral',
        code: 'LPCL',
        fullName: 'D.S. 003-97-TR - LPCL',
        disciplinaryArticles: 'Arts. 23-31',
        dismissalArticles: 'Arts. 22-42',
        sanctionsArticles: 'Arts. 23-31',
        authority: 'Ministerio de Trabajo y Promoción del Empleo',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 6,
            maxSuspensionDays: 30
        }
    },
    'URY': {
        name: 'Leyes Laborales Uruguay',
        code: 'LLU',
        fullName: 'Normativa Laboral Uruguaya',
        disciplinaryArticles: 'Convenios colectivos aplicables',
        dismissalArticles: 'Ley 10.489 y decretos',
        sanctionsArticles: 'Según convenio colectivo',
        authority: 'Ministerio de Trabajo y Seguridad Social',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 3,
            maxSuspensionDays: 30
        }
    },

    // === EUROPA (GDPR + Derecho Laboral Local) ===
    'ESP': {
        name: 'Estatuto de los Trabajadores',
        code: 'ET',
        fullName: 'Real Decreto Legislativo 2/2015 - Estatuto de los Trabajadores',
        disciplinaryArticles: 'Arts. 54, 58',
        dismissalArticles: 'Arts. 51-56',
        sanctionsArticles: 'Art. 58 (sanciones según convenio)',
        authority: 'Ministerio de Trabajo y Economía Social',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 20,
            maxSuspensionDays: 60
        }
    },
    'FRA': {
        name: 'Code du Travail',
        code: 'CT-FR',
        fullName: 'Code du Travail Français',
        disciplinaryArticles: 'Arts. L1331-1 à L1334-1',
        dismissalArticles: 'Arts. L1231-1 à L1238-5',
        sanctionsArticles: 'Art. L1332-1 et suivants',
        authority: 'Ministère du Travail',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 5,
            maxSuspensionDays: 0 // Mise à pied conservatoire
        }
    },
    'DEU': {
        name: 'Arbeitsrecht',
        code: 'AR-DE',
        fullName: 'Kündigungsschutzgesetz (KSchG)',
        disciplinaryArticles: 'BGB § 626',
        dismissalArticles: 'KSchG §§ 1-14',
        sanctionsArticles: 'Abmahnung (amonestación previa)',
        authority: 'Bundesministerium für Arbeit und Soziales',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 7,
            maxSuspensionDays: 0
        }
    },
    'GBR': {
        name: 'Employment Rights Act',
        code: 'ERA',
        fullName: 'Employment Rights Act 1996',
        disciplinaryArticles: 'ACAS Code of Practice',
        dismissalArticles: 'ERA 1996, Part X',
        sanctionsArticles: 'ACAS Code of Practice on Disciplinary',
        authority: 'Employment Tribunals',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 5,
            maxSuspensionDays: 0
        }
    },
    'ITA': {
        name: 'Statuto dei Lavoratori',
        code: 'SDL',
        fullName: 'Legge 20 maggio 1970, n. 300',
        disciplinaryArticles: 'Art. 7',
        dismissalArticles: 'Legge 604/1966, Art. 18 Statuto',
        sanctionsArticles: 'Art. 7 (procedura disciplinare)',
        authority: 'Ispettorato Nazionale del Lavoro',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 5,
            maxSuspensionDays: 10
        }
    },

    // === ESTADOS UNIDOS ===
    'USA': {
        name: 'At-Will Employment',
        code: 'AWE',
        fullName: 'Employment-at-Will Doctrine',
        disciplinaryArticles: 'Company Policy / Employee Handbook',
        dismissalArticles: 'State-specific statutes',
        sanctionsArticles: 'Company disciplinary policy',
        authority: 'Department of Labor / EEOC',
        requirements: {
            writtenNotice: false, // At-will, pero recomendado
            witnessRequired: false,
            responseDeadline: 0,
            maxSuspensionDays: 0 // Sin límite legal federal
        }
    },

    // === ASIA ===
    'JPN': {
        name: 'Labor Standards Act',
        code: 'LSA-JP',
        fullName: '労働基準法 (Rōdō Kijun Hō)',
        disciplinaryArticles: 'Arts. 89-93',
        dismissalArticles: 'Arts. 19-22',
        sanctionsArticles: 'Work Rules (就業規則)',
        authority: 'Ministry of Health, Labour and Welfare',
        requirements: {
            writtenNotice: true,
            witnessRequired: false,
            responseDeadline: 30,
            maxSuspensionDays: 7
        }
    }
};

// ============================================================================
// REGIONES Y DEFAULTS
// ============================================================================
const REGION_DEFAULTS = {
    LATAM: {
        defaultLaw: 'Legislación laboral local',
        defaultResponseDays: 5,
        defaultMaxSuspension: 30
    },
    EUROPE: {
        defaultLaw: 'Directivas UE + Legislación nacional',
        defaultResponseDays: 10,
        defaultMaxSuspension: 30
    },
    NORTH_AMERICA: {
        defaultLaw: 'Employment Law',
        defaultResponseDays: 5,
        defaultMaxSuspension: 0
    },
    ASIA: {
        defaultLaw: 'Labor Standards Act',
        defaultResponseDays: 14,
        defaultMaxSuspension: 7
    },
    GLOBAL: {
        defaultLaw: 'International Labour Standards (ILO)',
        defaultResponseDays: 7,
        defaultMaxSuspension: 30
    }
};

// Sets de países por región
const LATAM_COUNTRIES = new Set(['ARG', 'BRA', 'MEX', 'CHL', 'COL', 'PER', 'URY', 'ECU', 'VEN', 'BOL', 'PRY', 'PAN', 'CRI', 'GTM', 'HND', 'SLV', 'NIC', 'DOM', 'CUB']);
const EUROPE_COUNTRIES = new Set(['ESP', 'FRA', 'DEU', 'GBR', 'ITA', 'PRT', 'NLD', 'BEL', 'AUT', 'CHE', 'POL', 'CZE', 'ROU', 'HUN', 'GRC', 'SWE', 'NOR', 'DNK', 'FIN', 'IRL']);
const NORTH_AMERICA_COUNTRIES = new Set(['USA', 'CAN']);
const ASIA_COUNTRIES = new Set(['JPN', 'KOR', 'CHN', 'TWN', 'HKG', 'SGP', 'THA', 'VNM', 'MYS', 'IDN', 'PHL', 'IND']);

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================
class LegalJurisdictionService {

    /**
     * Detecta la región de un país por su código ISO-3
     */
    static detectRegion(countryCode) {
        if (!countryCode) return 'GLOBAL';
        const code = countryCode.toUpperCase();

        if (LATAM_COUNTRIES.has(code)) return 'LATAM';
        if (EUROPE_COUNTRIES.has(code)) return 'EUROPE';
        if (NORTH_AMERICA_COUNTRIES.has(code)) return 'NORTH_AMERICA';
        if (ASIA_COUNTRIES.has(code)) return 'ASIA';
        return 'GLOBAL';
    }

    /**
     * Obtiene el marco legal aplicable para un país
     * @param {string} countryCode - Código ISO-3 del país
     * @returns {object} Marco legal con artículos y requisitos
     */
    static getLaborLaw(countryCode) {
        if (!countryCode) {
            return {
                region: 'GLOBAL',
                law: REGION_DEFAULTS.GLOBAL,
                source: 'default'
            };
        }

        const code = countryCode.toUpperCase();
        const specificLaw = LABOR_LAW_BY_COUNTRY[code];

        if (specificLaw) {
            return {
                countryCode: code,
                region: this.detectRegion(code),
                law: specificLaw,
                source: 'specific'
            };
        }

        // Usar default de región
        const region = this.detectRegion(code);
        return {
            countryCode: code,
            region: region,
            law: {
                name: REGION_DEFAULTS[region].defaultLaw,
                code: region,
                fullName: `Legislación laboral de ${code}`,
                disciplinaryArticles: 'Según legislación local',
                dismissalArticles: 'Según legislación local',
                sanctionsArticles: 'Según legislación local',
                authority: 'Autoridad laboral local',
                requirements: {
                    writtenNotice: true,
                    witnessRequired: false,
                    responseDeadline: REGION_DEFAULTS[region].defaultResponseDays,
                    maxSuspensionDays: REGION_DEFAULTS[region].defaultMaxSuspension
                }
            },
            source: 'region_default'
        };
    }

    /**
     * Obtiene la jurisdicción para un empleado específico
     * Busca el país de la sucursal del usuario
     */
    static async getJurisdictionForEmployee(sequelize, employeeId) {
        try {
            const result = await sequelize.query(`
                SELECT
                    pc.country_code,
                    pc.country_name,
                    cb.name as branch_name,
                    c.name as company_name
                FROM users u
                LEFT JOIN company_branches cb ON cb.company_id = u.company_id AND cb.is_active = true
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                LEFT JOIN companies c ON c.company_id = u.company_id
                WHERE u.user_id = :employeeId
                LIMIT 1
            `, {
                replacements: { employeeId },
                type: sequelize.QueryTypes.SELECT
            });

            if (result.length > 0 && result[0].country_code) {
                const { country_code, country_name, branch_name, company_name } = result[0];
                const laborLaw = this.getLaborLaw(country_code);

                return {
                    ...laborLaw,
                    countryName: country_name,
                    branchName: branch_name,
                    companyName: company_name,
                    source: laborLaw.source
                };
            }

            // Sin país configurado
            return {
                region: 'GLOBAL',
                law: REGION_DEFAULTS.GLOBAL,
                countryCode: null,
                countryName: null,
                source: 'fallback'
            };

        } catch (err) {
            console.warn(`[LegalJurisdiction] Error: ${err.message}`);
            return {
                region: 'GLOBAL',
                law: REGION_DEFAULTS.GLOBAL,
                countryCode: null,
                countryName: null,
                source: 'error'
            };
        }
    }

    /**
     * Obtiene la jurisdicción para una empresa
     */
    static async getJurisdictionForCompany(sequelize, companyId) {
        try {
            const result = await sequelize.query(`
                SELECT
                    pc.country_code,
                    pc.country_name,
                    cb.name as branch_name,
                    c.name as company_name
                FROM companies c
                LEFT JOIN company_branches cb ON cb.company_id = c.company_id AND cb.is_main = true
                LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                WHERE c.company_id = :companyId
                LIMIT 1
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });

            if (result.length > 0 && result[0].country_code) {
                const { country_code, country_name, company_name } = result[0];
                const laborLaw = this.getLaborLaw(country_code);

                return {
                    ...laborLaw,
                    countryName: country_name,
                    companyName: company_name
                };
            }

            return this.getLaborLaw(null);
        } catch (err) {
            console.warn(`[LegalJurisdiction] Error: ${err.message}`);
            return this.getLaborLaw(null);
        }
    }

    /**
     * Genera el texto de base legal para una comunicación
     */
    static generateLegalBasisText(laborLaw, communicationType) {
        if (!laborLaw || !laborLaw.law) return 'Según legislación laboral aplicable';

        const law = laborLaw.law;
        let text = `${law.fullName || law.name}`;

        switch (communicationType) {
            case 'disciplinaria':
            case 'apercibimiento':
            case 'suspension':
                text += ` - ${law.disciplinaryArticles || 'Artículos disciplinarios aplicables'}`;
                break;
            case 'despido':
            case 'despido_causa':
            case 'despido_sin_causa':
                text += ` - ${law.dismissalArticles || 'Artículos de despido aplicables'}`;
                break;
            default:
                text += ` - ${law.sanctionsArticles || law.disciplinaryArticles || 'Según normativa'}`;
        }

        if (law.authority) {
            text += `. Autoridad competente: ${law.authority}`;
        }

        return text;
    }

    /**
     * Lista todos los marcos legales disponibles (para documentación/admin)
     */
    static getAllLaborLaws() {
        return LABOR_LAW_BY_COUNTRY;
    }

    /**
     * Lista países por región
     */
    static getCountriesByRegion() {
        return {
            LATAM: Array.from(LATAM_COUNTRIES),
            EUROPE: Array.from(EUROPE_COUNTRIES),
            NORTH_AMERICA: Array.from(NORTH_AMERICA_COUNTRIES),
            ASIA: Array.from(ASIA_COUNTRIES)
        };
    }
}

module.exports = LegalJurisdictionService;
