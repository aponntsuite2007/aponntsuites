/**
 * HolidayApiService - Integración con Nager.Date API
 *
 * API Externa: https://date.nager.at/Api
 * - 100% GRATIS
 * - Sin rate limit
 * - 100+ países incluyendo toda Latinoamérica
 * - Alta disponibilidad (open source)
 *
 * @author Sistema de Asistencia Biométrico
 * @version 1.0.0
 */

const https = require('https');

class HolidayApiService {
    constructor() {
        this.baseUrl = 'date.nager.at';
        this.apiVersion = 'v3';

        // Mapeo de código ISO → nombre completo (para compatibilidad con tabla holidays)
        this.countryMap = {
            'AR': 'Argentina',
            'BO': 'Bolivia',
            'BR': 'Brasil',
            'CL': 'Chile',
            'CO': 'Colombia',
            'CR': 'Costa Rica',
            'CU': 'Cuba',
            'DO': 'República Dominicana',
            'EC': 'Ecuador',
            'SV': 'El Salvador',
            'GT': 'Guatemala',
            'HN': 'Honduras',
            'MX': 'México',
            'NI': 'Nicaragua',
            'PA': 'Panamá',
            'PY': 'Paraguay',
            'PE': 'Perú',
            'PR': 'Puerto Rico',
            'UY': 'Uruguay',
            'VE': 'Venezuela'
        };

        // Cache para reducir llamadas a API
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas
    }

    /**
     * Hacer request HTTPS a Nager.Date API
     */
    async _makeRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: `/api/${this.apiVersion}${endpoint}`,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'BiometricAttendanceSystem/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Error parsing JSON: ${e.message}`));
                        }
                    } else if (res.statusCode === 404) {
                        resolve([]); // País no encontrado
                    } else {
                        reject(new Error(`API returned status ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`Request failed: ${e.message}`));
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Obtener lista de países disponibles en la API
     * @returns {Promise<Array>} Lista de países con código y nombre
     */
    async getAvailableCountries() {
        const cacheKey = 'available_countries';

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const countries = await this._makeRequest('/AvailableCountries');
            this.cache.set(cacheKey, { data: countries, timestamp: Date.now() });
            return countries;
        } catch (error) {
            console.error('[HOLIDAY-API] Error obteniendo países:', error.message);
            return [];
        }
    }

    /**
     * Obtener feriados públicos de un país para un año específico
     * @param {string} countryCode - Código ISO del país (AR, PE, CL, etc.)
     * @param {number} year - Año (ej: 2025)
     * @returns {Promise<Array>} Lista de feriados
     */
    async getPublicHolidays(countryCode, year) {
        const cacheKey = `holidays_${countryCode}_${year}`;

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`[HOLIDAY-API] Cache hit: ${countryCode}/${year}`);
                return cached.data;
            }
        }

        try {
            console.log(`[HOLIDAY-API] Fetching holidays: ${countryCode}/${year}`);
            const holidays = await this._makeRequest(`/PublicHolidays/${year}/${countryCode.toUpperCase()}`);
            this.cache.set(cacheKey, { data: holidays, timestamp: Date.now() });
            return holidays;
        } catch (error) {
            console.error(`[HOLIDAY-API] Error obteniendo feriados ${countryCode}/${year}:`, error.message);
            return [];
        }
    }

    /**
     * Verificar si un país está disponible en la API
     * @param {string} countryCode - Código ISO del país
     * @returns {Promise<boolean>}
     */
    async isCountrySupported(countryCode) {
        const countries = await this.getAvailableCountries();
        return countries.some(c => c.countryCode === countryCode.toUpperCase());
    }

    /**
     * Convertir código ISO a nombre completo
     * @param {string} countryCode - Código ISO (AR, PE, CL)
     * @returns {string} Nombre completo (Argentina, Perú, Chile)
     */
    getCountryName(countryCode) {
        return this.countryMap[countryCode.toUpperCase()] || countryCode;
    }

    /**
     * Convertir nombre completo a código ISO
     * @param {string} countryName - Nombre completo (Argentina, Perú)
     * @returns {string|null} Código ISO o null si no se encuentra
     */
    getCountryCode(countryName) {
        const entry = Object.entries(this.countryMap).find(([code, name]) =>
            name.toLowerCase() === countryName.toLowerCase()
        );
        return entry ? entry[0] : null;
    }

    /**
     * Transformar feriado de API a formato de BD
     * @param {Object} apiHoliday - Feriado de Nager.Date API
     * @param {string} countryCode - Código ISO del país
     * @returns {Object} Feriado en formato de tabla holidays
     */
    transformToDbFormat(apiHoliday, countryCode) {
        const date = new Date(apiHoliday.date);
        return {
            country: this.getCountryName(countryCode),
            state_province: apiHoliday.counties ? apiHoliday.counties[0] : null,
            date: apiHoliday.date, // Ya viene en formato YYYY-MM-DD
            name: apiHoliday.localName || apiHoliday.name,
            is_national: apiHoliday.global === true,
            is_provincial: apiHoliday.counties !== null && apiHoliday.counties.length > 0,
            year: date.getFullYear(),
            description: apiHoliday.name !== apiHoliday.localName ? apiHoliday.name : null
        };
    }

    /**
     * Sincronizar feriados de un país a la base de datos
     * @param {Object} Holiday - Modelo Sequelize de Holiday
     * @param {string} countryCode - Código ISO del país
     * @param {number} year - Año a sincronizar
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<Object>} Resultado de la sincronización
     */
    async syncHolidaysToDb(Holiday, countryCode, year, options = {}) {
        const { replaceExisting = false, onlyNational = false } = options;

        console.log(`[HOLIDAY-API] Sincronizando feriados: ${countryCode}/${year}`);

        // 1. Obtener feriados de la API
        const apiHolidays = await this.getPublicHolidays(countryCode, year);

        if (!apiHolidays || apiHolidays.length === 0) {
            return {
                success: false,
                message: `No se encontraron feriados para ${countryCode}/${year}`,
                inserted: 0,
                updated: 0,
                skipped: 0
            };
        }

        // 2. Filtrar si solo queremos nacionales
        let holidaysToSync = apiHolidays;
        if (onlyNational) {
            holidaysToSync = apiHolidays.filter(h => h.global === true);
        }

        // 3. Transformar a formato de BD
        const countryName = this.getCountryName(countryCode);
        const dbHolidays = holidaysToSync.map(h => this.transformToDbFormat(h, countryCode));

        // 4. Insertar/actualizar en BD
        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        for (const holiday of dbHolidays) {
            try {
                // Buscar si ya existe
                const existing = await Holiday.findOne({
                    where: {
                        country: holiday.country,
                        date: holiday.date,
                        name: holiday.name
                    }
                });

                if (existing) {
                    if (replaceExisting) {
                        await existing.update(holiday);
                        updated++;
                    } else {
                        skipped++;
                    }
                } else {
                    await Holiday.create(holiday);
                    inserted++;
                }
            } catch (error) {
                console.error(`[HOLIDAY-API] Error insertando feriado ${holiday.name}:`, error.message);
                skipped++;
            }
        }

        console.log(`[HOLIDAY-API] Sincronización completada: ${inserted} insertados, ${updated} actualizados, ${skipped} omitidos`);

        return {
            success: true,
            country: countryName,
            countryCode,
            year,
            total: holidaysToSync.length,
            inserted,
            updated,
            skipped
        };
    }

    /**
     * Sincronizar feriados para múltiples años
     * @param {Object} Holiday - Modelo Sequelize
     * @param {string} countryCode - Código ISO
     * @param {number} startYear - Año inicial
     * @param {number} endYear - Año final
     * @returns {Promise<Array>} Resultados por año
     */
    async syncMultipleYears(Holiday, countryCode, startYear, endYear, options = {}) {
        const results = [];

        for (let year = startYear; year <= endYear; year++) {
            const result = await this.syncHolidaysToDb(Holiday, countryCode, year, options);
            results.push(result);

            // Pequeño delay para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return results;
    }

    /**
     * Obtener feriados próximos
     * @param {string} countryCode - Código ISO
     * @param {number} days - Días hacia adelante (default: 30)
     * @returns {Promise<Array>} Feriados próximos
     */
    async getUpcomingHolidays(countryCode, days = 30) {
        const today = new Date();
        const year = today.getFullYear();

        // Obtener feriados del año actual y siguiente
        const currentYearHolidays = await this.getPublicHolidays(countryCode, year);
        const nextYearHolidays = await this.getPublicHolidays(countryCode, year + 1);

        const allHolidays = [...currentYearHolidays, ...nextYearHolidays];

        // Filtrar próximos X días
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days);

        return allHolidays.filter(h => {
            const holidayDate = new Date(h.date);
            return holidayDate >= today && holidayDate <= endDate;
        }).map(h => this.transformToDbFormat(h, countryCode));
    }

    /**
     * Verificar si una fecha es feriado (usando API directamente)
     * @param {string} countryCode - Código ISO
     * @param {string|Date} date - Fecha a verificar
     * @returns {Promise<Object|null>} Feriado encontrado o null
     */
    async checkIfHoliday(countryCode, date) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const dateStr = dateObj.toISOString().split('T')[0];

        const holidays = await this.getPublicHolidays(countryCode, year);
        return holidays.find(h => h.date === dateStr) || null;
    }

    /**
     * Obtener estadísticas de feriados por país
     * @param {string} countryCode - Código ISO
     * @param {number} year - Año
     * @returns {Promise<Object>} Estadísticas
     */
    async getHolidayStats(countryCode, year) {
        const holidays = await this.getPublicHolidays(countryCode, year);

        const national = holidays.filter(h => h.global === true);
        const regional = holidays.filter(h => h.counties !== null);

        // Calcular feriados por mes
        const byMonth = {};
        holidays.forEach(h => {
            const month = new Date(h.date).getMonth() + 1;
            byMonth[month] = (byMonth[month] || 0) + 1;
        });

        return {
            country: this.getCountryName(countryCode),
            countryCode,
            year,
            total: holidays.length,
            national: national.length,
            regional: regional.length,
            byMonth,
            holidays: holidays.map(h => ({
                date: h.date,
                name: h.localName,
                isNational: h.global
            }))
        };
    }

    /**
     * Limpiar cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[HOLIDAY-API] Cache limpiado');
    }

    /**
     * Obtener países LATAM soportados
     * @returns {Array} Lista de países latinoamericanos
     */
    getLatamCountries() {
        return Object.entries(this.countryMap).map(([code, name]) => ({
            code,
            name
        }));
    }
}

// Singleton
const holidayApiService = new HolidayApiService();

module.exports = holidayApiService;
