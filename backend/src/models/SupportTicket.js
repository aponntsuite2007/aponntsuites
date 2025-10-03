const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SupportTicket = sequelize.define('SupportTicket', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ticketNumber: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            comment: 'Número único e inequívoco para rastreabilidad'
        },
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Usuario de la empresa que generó el ticket'
        },
        vendorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor responsable de la empresa'
        },
        supportVendorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Vendedor que brinda el soporte (puede ser diferente al vendedor original)'
        },
        priority: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            defaultValue: 'medium'
        },
        category: {
            type: DataTypes.ENUM('technical', 'billing', 'training', 'configuration', 'general'),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('sent', 'received', 'pending', 'in_progress', 'waiting_client', 'resolved', 'closed'),
            defaultValue: 'sent'
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        vendorSummary: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Resumen obligatorio del vendedor sobre lo que hizo'
        },
        clientSummary: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Resumen opcional del cliente'
        },
        resolution: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Timestamps para tracking de tiempo de respuesta
        sentAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        receivedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        firstResponseAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        inProgressAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        resolvedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        closedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Métricas de tiempo calculadas automáticamente
        responseTimeMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Tiempo de primera respuesta en minutos'
        },
        resolutionTimeHours: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: true,
            comment: 'Tiempo total de resolución en horas'
        },

        // Puntuaciones automáticas
        responseTimeScore: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            comment: 'Puntuación automática por tiempo de respuesta (1-5)'
        },
        resolutionTimeScore: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            comment: 'Puntuación automática por tiempo de resolución (1-5)'
        },

        // Calificación del cliente
        clientRating: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: true,
            validate: {
                min: 1.0,
                max: 5.0
            }
        },
        clientFeedback: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Archivos adjuntos
        attachments: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Array de archivos adjuntos'
        },

        // Transferencias de ticket
        transferHistory: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Historial de transferencias entre vendedores'
        },

        isEscalated: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        escalatedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        escalationReason: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'support_tickets',
        timestamps: true,
        paranoid: false,
        indexes: [
            {
                fields: ['ticketNumber']
            },
            {
                fields: ['companyId']
            },
            {
                fields: ['userId']
            },
            {
                fields: ['vendorId']
            },
            {
                fields: ['supportVendorId']
            },
            {
                fields: ['status']
            },
            {
                fields: ['priority']
            },
            {
                fields: ['category']
            },
            {
                fields: ['sentAt']
            }
        ]
    });

    // Método para generar número de ticket único
    SupportTicket.generateTicketNumber = function() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `TK-${timestamp}-${random}`.toUpperCase();
    };

    // Métodos para calcular puntuaciones automáticas
    SupportTicket.prototype.calculateResponseTimeScore = function() {
        if (!this.responseTimeMinutes) return 5.0;

        // Puntuación basada en tiempo de respuesta
        if (this.responseTimeMinutes <= 15) return 5.0;
        if (this.responseTimeMinutes <= 30) return 4.5;
        if (this.responseTimeMinutes <= 60) return 4.0;
        if (this.responseTimeMinutes <= 120) return 3.5;
        if (this.responseTimeMinutes <= 240) return 3.0;
        if (this.responseTimeMinutes <= 480) return 2.5;
        if (this.responseTimeMinutes <= 720) return 2.0;
        return 1.0;
    };

    SupportTicket.prototype.calculateResolutionTimeScore = function() {
        if (!this.resolutionTimeHours) return 5.0;

        // Puntuación basada en tiempo de resolución
        if (this.resolutionTimeHours <= 2) return 5.0;
        if (this.resolutionTimeHours <= 4) return 4.5;
        if (this.resolutionTimeHours <= 8) return 4.0;
        if (this.resolutionTimeHours <= 24) return 3.5;
        if (this.resolutionTimeHours <= 48) return 3.0;
        if (this.resolutionTimeHours <= 72) return 2.5;
        if (this.resolutionTimeHours <= 168) return 2.0;
        return 1.0;
    };

    // Hooks para cálculos automáticos
    SupportTicket.beforeCreate((ticket) => {
        if (!ticket.ticketNumber) {
            ticket.ticketNumber = SupportTicket.generateTicketNumber();
        }
    });

    SupportTicket.beforeUpdate((ticket) => {
        const now = new Date();

        // Calcular tiempos cuando cambia el status
        if (ticket.changed('status')) {
            switch (ticket.status) {
                case 'received':
                    if (!ticket.receivedAt) ticket.receivedAt = now;
                    break;
                case 'in_progress':
                    if (!ticket.inProgressAt) ticket.inProgressAt = now;
                    if (!ticket.firstResponseAt) {
                        ticket.firstResponseAt = now;
                        if (ticket.sentAt) {
                            ticket.responseTimeMinutes = Math.round((now - ticket.sentAt) / (1000 * 60));
                            ticket.responseTimeScore = ticket.calculateResponseTimeScore();
                        }
                    }
                    break;
                case 'resolved':
                case 'closed':
                    if (!ticket.resolvedAt) ticket.resolvedAt = now;
                    if (ticket.sentAt) {
                        ticket.resolutionTimeHours = ((now - ticket.sentAt) / (1000 * 60 * 60)).toFixed(2);
                        ticket.resolutionTimeScore = ticket.calculateResolutionTimeScore();
                    }
                    break;
            }
        }
    });

    return SupportTicket;
};