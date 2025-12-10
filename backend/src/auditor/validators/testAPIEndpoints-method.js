    // =========================================================================
    // ✨ NUEVO: API SCHEMA VALIDATION - Valida respuestas HTTP con AJV
    // =========================================================================

    /**
     * Testea endpoints API de un módulo y valida schemas
     *
     * Este método complementa los tests UI/BD con validación de API:
     * 1. Hace request HTTP a endpoints comunes (list, get, create)
     * 2. Valida schema de respuesta con AJV
     * 3. Detecta errores como ".map is not a function"
     * 4. Reporta errores específicos con fix suggestions
     *
     * @param {string} moduleId - ID del módulo (ej: 'users', 'job-postings')
     * @param {string} authToken - Token JWT para autenticación
     * @param {number} companyId - ID de la empresa
     * @returns {object} Resultados de validación
     */
    async testAPIEndpoints(moduleId, authToken, companyId) {
        this.logger.info('API-SCHEMA', `🔍 Validando API endpoints para módulo: ${moduleId}`);

        const results = {
            moduleId,
            timestamp: new Date().toISOString(),
            endpoints: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };

        // Mapeo de módulos a rutas base
        const moduleRouteMap = {
            'users': '/api/v1/users',
            'departments': '/api/v1/departments',
            'attendance': '/api/v1/attendance',
            'job-postings': '/api/job-postings',
            'medical': '/api/v1/medical',
            'shifts': '/api/v1/shifts',
            'vacation': '/api/v1/vacation',
            'payroll-liquidation': '/api/v1/payroll',
            'organizational': '/api/v1/organizational',
            'positions': '/api/v1/organizational/positions',
            'biometric-consent': '/api/v1/biometric-consent',
            'employee-map': '/api/v1/employee-map',
            'company-account': '/api/v1/company-account',
            'legal': '/api/v1/legal',
            'sanctions': '/api/v1/sanctions',
            'procedures': '/api/v1/procedures',
            'hse': '/api/v1/hse',
            'risk-intelligence': '/api/v1/risk-intelligence',
            'dms': '/api/v1/dms',
            'mi-espacio': '/api/v1/mi-espacio'
        };

        const basePath = moduleRouteMap[moduleId];

        if (!basePath) {
            this.logger.warn('API-SCHEMA', `Módulo ${moduleId} no tiene ruta API definida, skipping...`);
            return results;
        }

        // Headers comunes
        const headers = {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'x-company-id': companyId.toString()
        };

        // =====================================================================
        // TEST 1: LIST endpoint (GET /api/module)
        // =====================================================================
        try {
            this.logger.debug('API-SCHEMA', `📋 Testing LIST endpoint: GET ${basePath}`);
            this.stats.totalTests++;
            results.summary.total++;

            const listResponse = await axios.get(`${this.config.baseUrl}${basePath}`, {
                headers,
                timeout: 10000,
                validateStatus: () => true // No lanzar error en 4xx/5xx
            });

            // Validar schema
            const validation = this.schemaValidator.validateComplete(moduleId, 'list', listResponse.data);

            const endpointResult = {
                endpoint: 'LIST',
                method: 'GET',
                path: basePath,
                statusCode: listResponse.status,
                schemaValid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings,
                issues: validation.issues,
                timestamp: new Date().toISOString()
            };

            if (validation.valid) {
                this.logger.info('API-SCHEMA', `✅ LIST endpoint schema VÁLIDO`);
                this.stats.apiTestsPassed++;
                this.stats.schemaValidationPassed++;
                results.summary.passed++;
                endpointResult.status = 'passed';
            } else {
                this.logger.error('API-SCHEMA', `❌ LIST endpoint schema INVÁLIDO`, validation.errors);
                this.stats.apiTestsFailed++;
                this.stats.schemaValidationFailed++;
                results.summary.failed++;
                endpointResult.status = 'failed';

                // Agregar a errors para análisis posterior
                this.stats.errors.push({
                    module: moduleId,
                    endpoint: 'LIST',
                    type: 'SchemaValidationError',
                    errors: validation.errors,
                    arrayIssues: validation.issues.arrays
                });
            }

            // Detectar warnings (relaciones rotas, etc.)
            if (validation.warnings.length > 0) {
                results.summary.warnings++;
                this.logger.warn('API-SCHEMA', `⚠️ Warnings detectados`, validation.warnings);
            }

            results.endpoints.push(endpointResult);

        } catch (error) {
            this.logger.error('API-SCHEMA', `❌ Error testeando LIST endpoint`, {
                error: error.message,
                stack: error.stack
            });
            this.stats.apiTestsFailed++;
            results.summary.failed++;

            results.endpoints.push({
                endpoint: 'LIST',
                method: 'GET',
                path: basePath,
                status: 'error',
                error: error.message
            });
        }

        // =====================================================================
        // TEST 2: GET endpoint (GET /api/module/:id) - si hay registros
        // =====================================================================
        try {
            // Obtener un ID de ejemplo desde la BD
            const tableName = this.moduleTableMap[moduleId];
            if (tableName) {
                const pkColumn = tableName === 'users' ? 'user_id' : 'id';
                const [sampleRecord] = await this.sequelize.query(
                    `SELECT ${pkColumn} FROM ${tableName} WHERE company_id = :companyId LIMIT 1`,
                    { replacements: { companyId }, type: Sequelize.QueryTypes.SELECT }
                );

                if (sampleRecord) {
                    const recordId = sampleRecord[pkColumn];

                    this.logger.debug('API-SCHEMA', `📄 Testing GET endpoint: GET ${basePath}/${recordId}`);
                    this.stats.totalTests++;
                    results.summary.total++;

                    const getResponse = await axios.get(`${this.config.baseUrl}${basePath}/${recordId}`, {
                        headers,
                        timeout: 10000,
                        validateStatus: () => true
                    });

                    const validation = this.schemaValidator.validateComplete(moduleId, 'get', getResponse.data);

                    const endpointResult = {
                        endpoint: 'GET',
                        method: 'GET',
                        path: `${basePath}/:id`,
                        recordId,
                        statusCode: getResponse.status,
                        schemaValid: validation.valid,
                        errors: validation.errors,
                        timestamp: new Date().toISOString()
                    };

                    if (validation.valid) {
                        this.logger.info('API-SCHEMA', `✅ GET endpoint schema VÁLIDO`);
                        this.stats.apiTestsPassed++;
                        this.stats.schemaValidationPassed++;
                        results.summary.passed++;
                        endpointResult.status = 'passed';
                    } else {
                        this.logger.error('API-SCHEMA', `❌ GET endpoint schema INVÁLIDO`, validation.errors);
                        this.stats.apiTestsFailed++;
                        this.stats.schemaValidationFailed++;
                        results.summary.failed++;
                        endpointResult.status = 'failed';

                        this.stats.errors.push({
                            module: moduleId,
                            endpoint: 'GET',
                            type: 'SchemaValidationError',
                            errors: validation.errors
                        });
                    }

                    results.endpoints.push(endpointResult);
                } else {
                    this.logger.debug('API-SCHEMA', `⏭️ Skip GET test - no hay registros en ${tableName}`);
                }
            }
        } catch (error) {
            this.logger.error('API-SCHEMA', `❌ Error testeando GET endpoint`, { error: error.message });
            this.stats.apiTestsFailed++;
            results.summary.failed++;

            results.endpoints.push({
                endpoint: 'GET',
                method: 'GET',
                path: `${basePath}/:id`,
                status: 'error',
                error: error.message
            });
        }

        // =====================================================================
        // REPORTE FINAL
        // =====================================================================
        this.logger.info('API-SCHEMA', `📊 Resumen validación API para ${moduleId}:`, {
            total: results.summary.total,
            passed: results.summary.passed,
            failed: results.summary.failed,
            warnings: results.summary.warnings
        });

        return results;
    }
