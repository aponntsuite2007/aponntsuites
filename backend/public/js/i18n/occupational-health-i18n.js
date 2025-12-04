/**
 * OH-V6-12: MULTI-LANGUAGE SUPPORT (i18n)
 * Sistema de internacionalización para Occupational Health Enterprise
 *
 * Idiomas soportados: English (EN), Español (ES), Português (PT)
 * @version 6.0.0
 */

// ============================================================================
// TRADUCCIONES COMPLETAS - OCCUPATIONAL HEALTH MODULE
// ============================================================================

const OHTranslations = {
    en: {
        // ===== NAVIGATION =====
        nav: {
            dashboard: 'Dashboard',
            preEmployment: 'Pre-Employment Screening',
            workersCompensation: 'Workers\' Compensation',
            certifications: 'Certification Alerts',
            analytics: 'Analytics',
            settings: 'Settings'
        },

        // ===== PRE-EMPLOYMENT SCREENING =====
        preEmployment: {
            title: 'Pre-Employment Screening',
            subtitle: 'Multi-country pre-employment health screenings (Medical, Background, Drug Testing)',
            newScreening: 'New Screening',
            viewDetails: 'View Details',

            // Status
            status: {
                pending: 'Pending',
                in_progress: 'In Progress',
                completed: 'Completed',
                failed: 'Failed',
                cancelled: 'Cancelled'
            },

            // Results
            results: {
                fit: 'Fit for Work',
                conditional: 'Conditional Fit',
                unfit: 'Unfit for Work',
                pending: 'Pending Review'
            },

            // Table Headers
            table: {
                applicantName: 'Applicant Name',
                applicantId: 'Applicant ID',
                country: 'Country',
                screeningType: 'Screening Type',
                scheduledDate: 'Scheduled Date',
                status: 'Status',
                overallResult: 'Result',
                actions: 'Actions'
            },

            // Filters
            filters: {
                allStatuses: 'All Statuses',
                allCountries: 'All Countries',
                allResults: 'All Results',
                dateFrom: 'Date From',
                dateTo: 'Date To',
                search: 'Search applicants...',
                reset: 'Reset Filters'
            },

            // Modal Create/Edit
            modal: {
                create: 'New Pre-Employment Screening',
                edit: 'Edit Screening',
                applicantInfo: 'Applicant Information',
                applicantName: 'Applicant Name',
                applicantId: 'Applicant ID',
                applicantEmail: 'Email Address',
                applicantPhone: 'Phone Number',
                country: 'Country',
                screeningDetails: 'Screening Details',
                screeningType: 'Screening Type',
                scheduledDate: 'Scheduled Date',
                status: 'Current Status',
                medicalTests: 'Medical Tests & Procedures',
                overallResult: 'Overall Result',
                notes: 'Additional Notes',
                cancel: 'Cancel',
                create: 'Create Screening',
                update: 'Update Screening'
            }
        },

        // ===== WORKERS' COMPENSATION =====
        workersCompensation: {
            title: 'Workers\' Compensation Claims',
            subtitle: 'Multi-country work accident & injury claims management (OSHA, ART, IMSS)',
            newClaim: 'New Claim',
            viewDetails: 'View Details',

            // Status
            status: {
                reported: 'Reported',
                under_review: 'Under Review',
                approved: 'Approved',
                denied: 'Denied',
                closed: 'Closed'
            },

            // Table Headers
            table: {
                claimNumber: 'Claim Number',
                employeeId: 'Employee ID',
                incidentDate: 'Incident Date',
                claimType: 'Claim Type',
                country: 'Country',
                status: 'Status',
                workDaysLost: 'Days Lost',
                actions: 'Actions'
            },

            // Filters
            filters: {
                allStatuses: 'All Statuses',
                allCountries: 'All Countries',
                dateFrom: 'Date From',
                dateTo: 'Date To',
                search: 'Search claims...',
                reset: 'Reset Filters'
            },

            // Modal
            modal: {
                create: 'New Workers\' Compensation Claim',
                edit: 'Edit Claim',
                employeeInfo: 'Employee Information',
                employeeId: 'Employee ID',
                incidentDetails: 'Incident Details',
                incidentDate: 'Incident Date',
                incidentTime: 'Incident Time',
                incidentLocation: 'Incident Location',
                department: 'Department',
                supervisorName: 'Supervisor Name',
                claimType: 'Claim Type',
                country: 'Country',
                medicalTreatment: 'Medical Treatment',
                medicalRequired: 'Medical Treatment Required',
                workDaysLost: 'Work Days Lost',
                injuryDescription: 'Injury Description',
                treatmentDetails: 'Treatment Details',
                statusResolution: 'Status & Resolution',
                currentStatus: 'Current Status',
                resolutionDate: 'Resolution Date',
                resolutionNotes: 'Resolution Notes',
                notes: 'Additional Notes',
                cancel: 'Cancel',
                create: 'Create Claim',
                update: 'Update Claim'
            }
        },

        // ===== CERTIFICATION ALERTS =====
        certifications: {
            title: 'Certification Alerts',
            subtitle: 'Automated employee certification tracking with expiration alerts',
            newCertification: 'New Certification',
            viewDetails: 'View Details',
            alertConfig: 'Alert Configuration',
            manualCheck: 'Run Manual Check',

            // Status
            status: {
                active: 'Active',
                expiring_soon: 'Expiring Soon',
                expired: 'Expired',
                revoked: 'Revoked',
                renewed: 'Renewed'
            },

            // Categories
            categories: {
                safety: 'Safety',
                medical: 'Medical',
                professional: 'Professional',
                technical: 'Technical',
                compliance: 'Compliance'
            },

            // Table Headers
            table: {
                employeeId: 'Employee ID',
                employeeName: 'Employee Name',
                certificationType: 'Certification Type',
                category: 'Category',
                issueDate: 'Issue Date',
                expirationDate: 'Expiration Date',
                daysRemaining: 'Days Remaining',
                status: 'Status',
                actions: 'Actions'
            },

            // Filters
            filters: {
                allStatuses: 'All Statuses',
                allCategories: 'All Categories',
                employee: 'Employee ID',
                department: 'Department',
                dateFrom: 'Expiring From',
                dateTo: 'Expiring To',
                search: 'Search certifications...',
                reset: 'Reset Filters'
            },

            // Modal
            modal: {
                create: 'New Employee Certification',
                edit: 'Edit Certification',
                employeeInfo: 'Employee Information',
                employeeId: 'Employee ID',
                employeeName: 'Employee Name',
                employeeEmail: 'Email Address',
                department: 'Department',
                certificationDetails: 'Certification Details',
                certificationType: 'Certification Type',
                certificationNumber: 'Certification Number',
                issueDate: 'Issue Date',
                expirationDate: 'Expiration Date',
                alertConfig: 'Alert Configuration',
                alertDaysBefore: 'Alert Days Before Expiration',
                issuingAuthority: 'Issuing Authority',
                issuingCountry: 'Issuing Country',
                document: 'Document',
                uploadDocument: 'Upload Document',
                notes: 'Additional Notes',
                cancel: 'Cancel',
                create: 'Create Certification',
                update: 'Update Certification'
            },

            // Details Panel Tabs
            details: {
                information: 'Information',
                alertHistory: 'Alert History',
                document: 'Document',
                noAlerts: 'No alerts sent yet',
                noDocument: 'No document uploaded'
            }
        },

        // ===== COMMON =====
        common: {
            loading: 'Loading...',
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            view: 'View',
            close: 'Close',
            search: 'Search',
            filter: 'Filter',
            reset: 'Reset',
            export: 'Export',
            import: 'Import',
            refresh: 'Refresh',
            pagination: {
                showing: 'Showing',
                of: 'of',
                results: 'results'
            },
            confirm: {
                delete: 'Are you sure you want to delete this record?',
                cancel: 'Are you sure you want to cancel?',
                yes: 'Yes',
                no: 'No'
            },
            notifications: {
                success: 'Operation completed successfully',
                error: 'An error occurred',
                created: 'Record created successfully',
                updated: 'Record updated successfully',
                deleted: 'Record deleted successfully'
            }
        }
    },

    es: {
        // ===== NAVEGACIÓN =====
        nav: {
            dashboard: 'Panel Principal',
            preEmployment: 'Exámenes Pre-ocupacionales',
            workersCompensation: 'Reclamos Laborales',
            certifications: 'Alertas de Certificaciones',
            analytics: 'Analíticas',
            settings: 'Configuración'
        },

        // ===== EXÁMENES PRE-OCUPACIONALES =====
        preEmployment: {
            title: 'Exámenes Pre-ocupacionales',
            subtitle: 'Exámenes de salud pre-ocupacionales multi-país (Médico, Antecedentes, Drogas)',
            newScreening: 'Nuevo Examen',
            viewDetails: 'Ver Detalles',

            // Estados
            status: {
                pending: 'Pendiente',
                in_progress: 'En Progreso',
                completed: 'Completado',
                failed: 'Fallido',
                cancelled: 'Cancelado'
            },

            // Resultados
            results: {
                fit: 'Apto para Trabajar',
                conditional: 'Apto Condicional',
                unfit: 'No Apto',
                pending: 'Pendiente Revisión'
            },

            // Encabezados de Tabla
            table: {
                applicantName: 'Nombre Postulante',
                applicantId: 'ID Postulante',
                country: 'País',
                screeningType: 'Tipo de Examen',
                scheduledDate: 'Fecha Programada',
                status: 'Estado',
                overallResult: 'Resultado',
                actions: 'Acciones'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos los Estados',
                allCountries: 'Todos los Países',
                allResults: 'Todos los Resultados',
                dateFrom: 'Fecha Desde',
                dateTo: 'Fecha Hasta',
                search: 'Buscar postulantes...',
                reset: 'Restablecer Filtros'
            },

            // Modal Crear/Editar
            modal: {
                create: 'Nuevo Examen Pre-ocupacional',
                edit: 'Editar Examen',
                applicantInfo: 'Información del Postulante',
                applicantName: 'Nombre del Postulante',
                applicantId: 'ID del Postulante',
                applicantEmail: 'Correo Electrónico',
                applicantPhone: 'Teléfono',
                country: 'País',
                screeningDetails: 'Detalles del Examen',
                screeningType: 'Tipo de Examen',
                scheduledDate: 'Fecha Programada',
                status: 'Estado Actual',
                medicalTests: 'Pruebas y Procedimientos Médicos',
                overallResult: 'Resultado General',
                notes: 'Notas Adicionales',
                cancel: 'Cancelar',
                create: 'Crear Examen',
                update: 'Actualizar Examen'
            }
        },

        // ===== RECLAMOS LABORALES =====
        workersCompensation: {
            title: 'Reclamos de Compensación Laboral',
            subtitle: 'Gestión multi-país de accidentes de trabajo y reclamos (OSHA, ART, IMSS)',
            newClaim: 'Nuevo Reclamo',
            viewDetails: 'Ver Detalles',

            // Estados
            status: {
                reported: 'Reportado',
                under_review: 'En Revisión',
                approved: 'Aprobado',
                denied: 'Denegado',
                closed: 'Cerrado'
            },

            // Encabezados de Tabla
            table: {
                claimNumber: 'Número de Reclamo',
                employeeId: 'ID Empleado',
                incidentDate: 'Fecha Incidente',
                claimType: 'Tipo de Reclamo',
                country: 'País',
                status: 'Estado',
                workDaysLost: 'Días Perdidos',
                actions: 'Acciones'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos los Estados',
                allCountries: 'Todos los Países',
                dateFrom: 'Fecha Desde',
                dateTo: 'Fecha Hasta',
                search: 'Buscar reclamos...',
                reset: 'Restablecer Filtros'
            },

            // Modal
            modal: {
                create: 'Nuevo Reclamo de Compensación Laboral',
                edit: 'Editar Reclamo',
                employeeInfo: 'Información del Empleado',
                employeeId: 'ID del Empleado',
                incidentDetails: 'Detalles del Incidente',
                incidentDate: 'Fecha del Incidente',
                incidentTime: 'Hora del Incidente',
                incidentLocation: 'Ubicación del Incidente',
                department: 'Departamento',
                supervisorName: 'Nombre del Supervisor',
                claimType: 'Tipo de Reclamo',
                country: 'País',
                medicalTreatment: 'Tratamiento Médico',
                medicalRequired: 'Requiere Tratamiento Médico',
                workDaysLost: 'Días de Trabajo Perdidos',
                injuryDescription: 'Descripción de la Lesión',
                treatmentDetails: 'Detalles del Tratamiento',
                statusResolution: 'Estado y Resolución',
                currentStatus: 'Estado Actual',
                resolutionDate: 'Fecha de Resolución',
                resolutionNotes: 'Notas de Resolución',
                notes: 'Notas Adicionales',
                cancel: 'Cancelar',
                create: 'Crear Reclamo',
                update: 'Actualizar Reclamo'
            }
        },

        // ===== ALERTAS DE CERTIFICACIONES =====
        certifications: {
            title: 'Alertas de Certificaciones',
            subtitle: 'Seguimiento automático de certificaciones de empleados con alertas de vencimiento',
            newCertification: 'Nueva Certificación',
            viewDetails: 'Ver Detalles',
            alertConfig: 'Configuración de Alertas',
            manualCheck: 'Ejecutar Verificación Manual',

            // Estados
            status: {
                active: 'Activa',
                expiring_soon: 'Próxima a Vencer',
                expired: 'Vencida',
                revoked: 'Revocada',
                renewed: 'Renovada'
            },

            // Categorías
            categories: {
                safety: 'Seguridad',
                medical: 'Médica',
                professional: 'Profesional',
                technical: 'Técnica',
                compliance: 'Cumplimiento'
            },

            // Encabezados de Tabla
            table: {
                employeeId: 'ID Empleado',
                employeeName: 'Nombre Empleado',
                certificationType: 'Tipo de Certificación',
                category: 'Categoría',
                issueDate: 'Fecha de Emisión',
                expirationDate: 'Fecha de Vencimiento',
                daysRemaining: 'Días Restantes',
                status: 'Estado',
                actions: 'Acciones'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos los Estados',
                allCategories: 'Todas las Categorías',
                employee: 'ID Empleado',
                department: 'Departamento',
                dateFrom: 'Vence Desde',
                dateTo: 'Vence Hasta',
                search: 'Buscar certificaciones...',
                reset: 'Restablecer Filtros'
            },

            // Modal
            modal: {
                create: 'Nueva Certificación de Empleado',
                edit: 'Editar Certificación',
                employeeInfo: 'Información del Empleado',
                employeeId: 'ID del Empleado',
                employeeName: 'Nombre del Empleado',
                employeeEmail: 'Correo Electrónico',
                department: 'Departamento',
                certificationDetails: 'Detalles de la Certificación',
                certificationType: 'Tipo de Certificación',
                certificationNumber: 'Número de Certificación',
                issueDate: 'Fecha de Emisión',
                expirationDate: 'Fecha de Vencimiento',
                alertConfig: 'Configuración de Alertas',
                alertDaysBefore: 'Días de Alerta Antes del Vencimiento',
                issuingAuthority: 'Autoridad Emisora',
                issuingCountry: 'País Emisor',
                document: 'Documento',
                uploadDocument: 'Subir Documento',
                notes: 'Notas Adicionales',
                cancel: 'Cancelar',
                create: 'Crear Certificación',
                update: 'Actualizar Certificación'
            },

            // Tabs del Panel de Detalles
            details: {
                information: 'Información',
                alertHistory: 'Historial de Alertas',
                document: 'Documento',
                noAlerts: 'No se han enviado alertas aún',
                noDocument: 'No hay documento cargado'
            }
        },

        // ===== COMÚN =====
        common: {
            loading: 'Cargando...',
            save: 'Guardar',
            cancel: 'Cancelar',
            delete: 'Eliminar',
            edit: 'Editar',
            view: 'Ver',
            close: 'Cerrar',
            search: 'Buscar',
            filter: 'Filtrar',
            reset: 'Restablecer',
            export: 'Exportar',
            import: 'Importar',
            refresh: 'Actualizar',
            pagination: {
                showing: 'Mostrando',
                of: 'de',
                results: 'resultados'
            },
            confirm: {
                delete: '¿Está seguro de que desea eliminar este registro?',
                cancel: '¿Está seguro de que desea cancelar?',
                yes: 'Sí',
                no: 'No'
            },
            notifications: {
                success: 'Operación completada exitosamente',
                error: 'Ocurrió un error',
                created: 'Registro creado exitosamente',
                updated: 'Registro actualizado exitosamente',
                deleted: 'Registro eliminado exitosamente'
            }
        }
    },

    pt: {
        // ===== NAVEGAÇÃO =====
        nav: {
            dashboard: 'Painel Principal',
            preEmployment: 'Exames Pré-Admissionais',
            workersCompensation: 'Reivindicações Trabalhistas',
            certifications: 'Alertas de Certificações',
            analytics: 'Análise',
            settings: 'Configurações'
        },

        // ===== EXAMES PRÉ-ADMISSIONAIS =====
        preEmployment: {
            title: 'Exames Pré-Admissionais',
            subtitle: 'Exames de saúde pré-admissionais multi-país (Médico, Antecedentes, Drogas)',
            newScreening: 'Novo Exame',
            viewDetails: 'Ver Detalhes',

            // Estados
            status: {
                pending: 'Pendente',
                in_progress: 'Em Progresso',
                completed: 'Concluído',
                failed: 'Falhou',
                cancelled: 'Cancelado'
            },

            // Resultados
            results: {
                fit: 'Apto para Trabalhar',
                conditional: 'Apto Condicional',
                unfit: 'Não Apto',
                pending: 'Revisão Pendente'
            },

            // Cabeçalhos da Tabela
            table: {
                applicantName: 'Nome do Candidato',
                applicantId: 'ID do Candidato',
                country: 'País',
                screeningType: 'Tipo de Exame',
                scheduledDate: 'Data Agendada',
                status: 'Status',
                overallResult: 'Resultado',
                actions: 'Ações'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos os Status',
                allCountries: 'Todos os Países',
                allResults: 'Todos os Resultados',
                dateFrom: 'Data De',
                dateTo: 'Data Até',
                search: 'Buscar candidatos...',
                reset: 'Redefinir Filtros'
            },

            // Modal Criar/Editar
            modal: {
                create: 'Novo Exame Pré-Admissional',
                edit: 'Editar Exame',
                applicantInfo: 'Informações do Candidato',
                applicantName: 'Nome do Candidato',
                applicantId: 'ID do Candidato',
                applicantEmail: 'Email',
                applicantPhone: 'Telefone',
                country: 'País',
                screeningDetails: 'Detalhes do Exame',
                screeningType: 'Tipo de Exame',
                scheduledDate: 'Data Agendada',
                status: 'Status Atual',
                medicalTests: 'Testes e Procedimentos Médicos',
                overallResult: 'Resultado Geral',
                notes: 'Notas Adicionais',
                cancel: 'Cancelar',
                create: 'Criar Exame',
                update: 'Atualizar Exame'
            }
        },

        // ===== REIVINDICAÇÕES TRABALHISTAS =====
        workersCompensation: {
            title: 'Reivindicações de Compensação de Trabalhadores',
            subtitle: 'Gestão multi-país de acidentes de trabalho e reivindicações (OSHA, ART, IMSS)',
            newClaim: 'Nova Reivindicação',
            viewDetails: 'Ver Detalhes',

            // Estados
            status: {
                reported: 'Relatado',
                under_review: 'Em Revisão',
                approved: 'Aprovado',
                denied: 'Negado',
                closed: 'Fechado'
            },

            // Cabeçalhos da Tabela
            table: {
                claimNumber: 'Número da Reivindicação',
                employeeId: 'ID do Funcionário',
                incidentDate: 'Data do Incidente',
                claimType: 'Tipo de Reivindicação',
                country: 'País',
                status: 'Status',
                workDaysLost: 'Dias Perdidos',
                actions: 'Ações'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos os Status',
                allCountries: 'Todos os Países',
                dateFrom: 'Data De',
                dateTo: 'Data Até',
                search: 'Buscar reivindicações...',
                reset: 'Redefinir Filtros'
            },

            // Modal
            modal: {
                create: 'Nova Reivindicação de Compensação de Trabalhadores',
                edit: 'Editar Reivindicação',
                employeeInfo: 'Informações do Funcionário',
                employeeId: 'ID do Funcionário',
                incidentDetails: 'Detalhes do Incidente',
                incidentDate: 'Data do Incidente',
                incidentTime: 'Hora do Incidente',
                incidentLocation: 'Local do Incidente',
                department: 'Departamento',
                supervisorName: 'Nome do Supervisor',
                claimType: 'Tipo de Reivindicação',
                country: 'País',
                medicalTreatment: 'Tratamento Médico',
                medicalRequired: 'Tratamento Médico Necessário',
                workDaysLost: 'Dias de Trabalho Perdidos',
                injuryDescription: 'Descrição da Lesão',
                treatmentDetails: 'Detalhes do Tratamento',
                statusResolution: 'Status e Resolução',
                currentStatus: 'Status Atual',
                resolutionDate: 'Data de Resolução',
                resolutionNotes: 'Notas de Resolução',
                notes: 'Notas Adicionais',
                cancel: 'Cancelar',
                create: 'Criar Reivindicação',
                update: 'Atualizar Reivindicação'
            }
        },

        // ===== ALERTAS DE CERTIFICAÇÕES =====
        certifications: {
            title: 'Alertas de Certificações',
            subtitle: 'Rastreamento automático de certificações de funcionários com alertas de expiração',
            newCertification: 'Nova Certificação',
            viewDetails: 'Ver Detalhes',
            alertConfig: 'Configuração de Alertas',
            manualCheck: 'Executar Verificação Manual',

            // Estados
            status: {
                active: 'Ativa',
                expiring_soon: 'Expirando em Breve',
                expired: 'Expirada',
                revoked: 'Revogada',
                renewed: 'Renovada'
            },

            // Categorias
            categories: {
                safety: 'Segurança',
                medical: 'Médica',
                professional: 'Profissional',
                technical: 'Técnica',
                compliance: 'Conformidade'
            },

            // Cabeçalhos da Tabela
            table: {
                employeeId: 'ID do Funcionário',
                employeeName: 'Nome do Funcionário',
                certificationType: 'Tipo de Certificação',
                category: 'Categoria',
                issueDate: 'Data de Emissão',
                expirationDate: 'Data de Expiração',
                daysRemaining: 'Dias Restantes',
                status: 'Status',
                actions: 'Ações'
            },

            // Filtros
            filters: {
                allStatuses: 'Todos os Status',
                allCategories: 'Todas as Categorias',
                employee: 'ID do Funcionário',
                department: 'Departamento',
                dateFrom: 'Expira De',
                dateTo: 'Expira Até',
                search: 'Buscar certificações...',
                reset: 'Redefinir Filtros'
            },

            // Modal
            modal: {
                create: 'Nova Certificação de Funcionário',
                edit: 'Editar Certificação',
                employeeInfo: 'Informações do Funcionário',
                employeeId: 'ID do Funcionário',
                employeeName: 'Nome do Funcionário',
                employeeEmail: 'Email',
                department: 'Departamento',
                certificationDetails: 'Detalhes da Certificação',
                certificationType: 'Tipo de Certificação',
                certificationNumber: 'Número da Certificação',
                issueDate: 'Data de Emissão',
                expirationDate: 'Data de Expiração',
                alertConfig: 'Configuração de Alertas',
                alertDaysBefore: 'Dias de Alerta Antes da Expiração',
                issuingAuthority: 'Autoridade Emissora',
                issuingCountry: 'País Emissor',
                document: 'Documento',
                uploadDocument: 'Enviar Documento',
                notes: 'Notas Adicionais',
                cancel: 'Cancelar',
                create: 'Criar Certificação',
                update: 'Atualizar Certificação'
            },

            // Tabs do Painel de Detalhes
            details: {
                information: 'Informação',
                alertHistory: 'Histórico de Alertas',
                document: 'Documento',
                noAlerts: 'Nenhum alerta enviado ainda',
                noDocument: 'Nenhum documento enviado'
            }
        },

        // ===== COMUM =====
        common: {
            loading: 'Carregando...',
            save: 'Salvar',
            cancel: 'Cancelar',
            delete: 'Excluir',
            edit: 'Editar',
            view: 'Ver',
            close: 'Fechar',
            search: 'Buscar',
            filter: 'Filtrar',
            reset: 'Redefinir',
            export: 'Exportar',
            import: 'Importar',
            refresh: 'Atualizar',
            pagination: {
                showing: 'Mostrando',
                of: 'de',
                results: 'resultados'
            },
            confirm: {
                delete: 'Tem certeza de que deseja excluir este registro?',
                cancel: 'Tem certeza de que deseja cancelar?',
                yes: 'Sim',
                no: 'Não'
            },
            notifications: {
                success: 'Operação concluída com sucesso',
                error: 'Ocorreu um erro',
                created: 'Registro criado com sucesso',
                updated: 'Registro atualizado com sucesso',
                deleted: 'Registro excluído com sucesso'
            }
        }
    }
};

// ============================================================================
// I18N SERVICE - Servicio de Internacionalización
// ============================================================================

class OHI18n {
    constructor() {
        this.currentLocale = this.detectLocale();
        this.translations = OHTranslations;
    }

    // Detectar idioma del navegador o localStorage
    detectLocale() {
        const saved = localStorage.getItem('oh_locale');
        if (saved && this.translations[saved]) {
            return saved;
        }

        const browserLang = navigator.language || navigator.userLanguage;
        const lang = browserLang.split('-')[0]; // 'en-US' -> 'en'

        return this.translations[lang] ? lang : 'en';
    }

    // Cambiar idioma
    setLocale(locale) {
        if (!this.translations[locale]) {
            console.warn(`[OHI18n] Locale '${locale}' not supported, using 'en'`);
            locale = 'en';
        }

        this.currentLocale = locale;
        localStorage.setItem('oh_locale', locale);

        // Recargar vista actual
        if (typeof OHViews !== 'undefined' && OHState.currentView) {
            OHViews.switchView(OHState.currentView);
        }
    }

    // Obtener traducción por key path
    t(keyPath) {
        const keys = keyPath.split('.');
        let value = this.translations[this.currentLocale];

        for (const key of keys) {
            if (value && typeof value === 'object') {
                value = value[key];
            } else {
                console.warn(`[OHI18n] Translation key not found: ${keyPath}`);
                return keyPath; // Retornar el key si no se encuentra
            }
        }

        return value || keyPath;
    }

    // Helper: Traducir nombre JSONB (name_i18n)
    translateJSONB(jsonbField, fallback = '') {
        if (!jsonbField) return fallback;

        if (typeof jsonbField === 'string') {
            try {
                jsonbField = JSON.parse(jsonbField);
            } catch (e) {
                return jsonbField;
            }
        }

        return jsonbField[this.currentLocale] || jsonbField['en'] || fallback;
    }

    // Helper: Obtener idiomas disponibles
    getAvailableLocales() {
        return Object.keys(this.translations);
    }

    // Helper: Obtener nombre del idioma
    getLocaleName(locale) {
        const names = {
            en: 'English',
            es: 'Español',
            pt: 'Português'
        };
        return names[locale] || locale;
    }
}

// Instancia global
const ohI18n = new OHI18n();

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OHI18n, ohI18n, OHTranslations };
}

console.log(`%c [i18n] Occupational Health - Locale: ${ohI18n.currentLocale} `, 'background: #4ade80; color: #1a1a2e; padding: 4px 8px; border-radius: 3px;');
