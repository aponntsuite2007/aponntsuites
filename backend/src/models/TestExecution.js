/**
 * TEST EXECUTION MODEL
 * Modelo Sequelize para persistir ejecuciones de tests E2E
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const TestExecution = sequelize.define('TestExecution', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        execution_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            defaultValue: DataTypes.UUIDV4
        },
        environment: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['local', 'staging', 'production']]
            }
        },
        module: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        company_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'companies',
                key: 'company_id'
            },
            onDelete: 'CASCADE'
        },
        company_name: {
            type: DataTypes.STRING(255)
        },

        // Configuración
        cycles: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        slow_mo: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 50
        },
        base_url: {
            type: DataTypes.STRING(500)
        },

        // Estado
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'starting', 'running', 'completed', 'failed', 'killed', 'error']]
            }
        },

        // Resultados
        total_tests: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        ui_tests_passed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        ui_tests_failed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        db_tests_passed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        db_tests_failed: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        success_rate: {
            type: DataTypes.DECIMAL(5, 2)
        },

        // Tiempos
        start_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        end_time: {
            type: DataTypes.DATE
        },
        duration_seconds: {
            type: DataTypes.DECIMAL(10, 2)
        },

        // Detalles
        errors: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        tickets: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        logs: {
            type: DataTypes.JSONB,
            defaultValue: []
        }
    }, {
        tableName: 'test_executions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',

        indexes: [
            { fields: ['execution_id'] },
            { fields: ['company_id'] },
            { fields: ['status'] },
            { fields: ['environment'] },
            { fields: ['module'] },
            { fields: ['created_at'] }
        ],

        hooks: {
            beforeUpdate: (testExecution) => {
                // Calcular success_rate si se actualizan los tests
                if (testExecution.total_tests > 0) {
                    const passedTests = (testExecution.ui_tests_passed || 0) + (testExecution.db_tests_passed || 0);
                    testExecution.success_rate = ((passedTests / testExecution.total_tests) * 100).toFixed(2);
                }

                // Calcular duración si se setea end_time
                if (testExecution.end_time && !testExecution.duration_seconds) {
                    const durationMs = new Date(testExecution.end_time) - new Date(testExecution.start_time);
                    testExecution.duration_seconds = (durationMs / 1000).toFixed(2);
                }
            }
        }
    });

    // Métodos de instancia
    TestExecution.prototype.addLog = function(type, message) {
        const currentLogs = this.logs || [];
        currentLogs.push({
            timestamp: new Date().toISOString(),
            type,
            message
        });
        this.logs = currentLogs;
        return this.save();
    };

    TestExecution.prototype.markCompleted = function(results) {
        this.status = 'completed';
        this.end_time = new Date();
        this.total_tests = results.total || 0;
        this.ui_tests_passed = results.ui_tests_passed || 0;
        this.ui_tests_failed = results.ui_tests_failed || 0;
        this.db_tests_passed = results.db_tests_passed || 0;
        this.db_tests_failed = results.db_tests_failed || 0;
        this.tickets = results.tickets || [];
        return this.save();
    };

    TestExecution.prototype.markFailed = function(errorMessage) {
        this.status = 'failed';
        this.end_time = new Date();
        const currentErrors = this.errors || [];
        currentErrors.push({
            timestamp: new Date().toISOString(),
            message: errorMessage
        });
        this.errors = currentErrors;
        return this.save();
    };

    // Métodos estáticos
    TestExecution.getMetrics = async function(filters = {}) {
        const { company_id, environment, module, days = 30 } = filters;

        const where = {
            created_at: {
                [sequelize.Sequelize.Op.gte]: new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
            }
        };

        if (company_id) where.company_id = company_id;
        if (environment) where.environment = environment;
        if (module) where.module = module;

        const executions = await TestExecution.findAll({ where });

        const metrics = {
            total_executions: executions.length,
            successful_executions: executions.filter(e => e.status === 'completed' && e.success_rate >= 80).length,
            failed_executions: executions.filter(e => e.status === 'failed' || e.status === 'error' || e.success_rate < 80).length,
            avg_success_rate: executions.reduce((sum, e) => sum + (parseFloat(e.success_rate) || 0), 0) / executions.length || 0,
            avg_duration: executions.reduce((sum, e) => sum + (parseFloat(e.duration_seconds) || 0), 0) / executions.length || 0,
            total_tests: executions.reduce((sum, e) => sum + (e.total_tests || 0), 0),
            total_errors: executions.reduce((sum, e) => sum + ((e.errors || []).length), 0),
            total_tickets: executions.reduce((sum, e) => sum + ((e.tickets || []).length), 0)
        };

        return metrics;
    };

    TestExecution.cleanupOld = async function(daysOld = 30) {
        const result = await TestExecution.destroy({
            where: {
                created_at: {
                    [sequelize.Sequelize.Op.lt]: new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000))
                },
                status: {
                    [sequelize.Sequelize.Op.in]: ['completed', 'failed', 'killed', 'error']
                }
            }
        });

        return result;
    };

    return TestExecution;
};
