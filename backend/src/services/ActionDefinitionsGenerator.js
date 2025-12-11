/**
 * ============================================================================
 * ACTION DEFINITIONS GENERATOR - Generador Automático de Definiciones
 * ============================================================================
 *
 * Este servicio GENERA AUTOMÁTICAMENTE las definiciones de:
 * - Prerequisites para ContextValidator
 * - Process Chains para ProcessChainGenerator
 *
 * Basándose en PATRONES INTELIGENTES, no hardcoding manual.
 *
 * Esto permite escalar a 109+ acciones sin escribir manualmente cada una.
 *
 * @version 1.0.0
 * @date 2025-12-10
 * ============================================================================
 */

const actionsMap = require('../auditor/registry/process-chain-actions-map.json');

class ActionDefinitionsGenerator {
    constructor() {
        // PATRONES DE PREREQUISITOS POR TIPO DE ACCIÓN
        this.prerequisitePatterns = {
            // RRHH - Requieren datos organizacionales completos
            rrhh: [
                { entity: 'company', field: 'id', description: 'Empresa activa' },
                { entity: 'branch', field: 'id', description: 'Sucursal asignada', table: 'branches', userField: 'branch_id' },
                { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                { entity: 'organizational_position', field: 'id', description: 'Posición en organigrama', table: 'organizational_structure', userField: 'position_id' }
            ],

            // SHIFTS - Requieren datos de turno
            shifts: [
                { entity: 'company', field: 'id', description: 'Empresa activa' },
                { entity: 'branch', field: 'id', description: 'Sucursal asignada', table: 'branches', userField: 'branch_id' },
                { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' },
                { entity: 'sector', field: 'id', description: 'Sector asignado', table: 'sectors', userField: 'sector_id' },
                { entity: 'shift', field: 'id', description: 'Turno asignado', table: 'shifts', userField: 'shift_id' }
            ],

            // BASIC - Solo requieren empresa y departamento
            basic: [
                { entity: 'company', field: 'id', description: 'Empresa activa' },
                { entity: 'department', field: 'id', description: 'Departamento asignado', table: 'departments', userField: 'department_id' }
            ],

            // MINIMAL - Solo requieren empresa
            minimal: [
                { entity: 'company', field: 'id', description: 'Empresa activa' }
            ]
        };

        // MAPEO DE MÓDULO → PATRÓN DE PREREQUISITOS
        this.moduleToPattern = {
            'shifts': 'shifts',
            'vacation': 'rrhh',
            'overtime-management': 'shifts',
            'medical': 'basic',
            'attendance': 'shifts',
            'time-off-requests': 'rrhh',
            'payroll-liquidation': 'rrhh',
            'job-postings': 'minimal',
            'training-management': 'basic',
            'performance-evaluations': 'rrhh',
            'career-development': 'rrhh',
            'asset-management': 'basic',
            'expense-reimbursement': 'basic',
            'project-management': 'basic',
            'remote-work-management': 'rrhh',
            'it-support': 'minimal',
            'legal-labor-compliance': 'rrhh',
            'incident-management': 'basic',
            'notifications-enterprise': 'minimal',
            'notification-center': 'minimal',
            'departments': 'minimal',
            'organizational-structure': 'rrhh',
            'branches': 'minimal',
            'real-biometric-enterprise': 'minimal',
            'security-access-control': 'basic',
            'kiosks-professional': 'minimal',
            'room-booking': 'minimal',
            'parking-management': 'minimal',
            'wellness-programs': 'minimal',
            'benefits-administration': 'rrhh',
            'dms-dashboard': 'basic',
            'applicant-tracking': 'rrhh',
            'users': 'minimal'
        };
    }

    /**
     * Genera TODAS las definiciones de prerequisitos para ContextValidator
     */
    generatePrerequisites() {
        const definitions = {};

        Object.keys(actionsMap.actions_by_module).forEach(moduleId => {
            const actions = actionsMap.actions_by_module[moduleId];
            const pattern = this.moduleToPattern[moduleId] || 'basic';

            actions.forEach(actionKey => {
                definitions[actionKey] = this.generatePrerequisiteForAction(
                    actionKey,
                    moduleId,
                    pattern
                );
            });
        });

        return definitions;
    }

    /**
     * Genera prerequisitos para UNA acción específica
     */
    generatePrerequisiteForAction(actionKey, moduleId, patternName) {
        const pattern = this.prerequisitePatterns[patternName];

        // Generar nombre human-readable
        const name = this.actionKeyToName(actionKey);

        // Determinar módulos requeridos
        const requiredModules = this.getRequiredModules(actionKey, moduleId);

        return {
            name,
            requiredChain: [...pattern], // Clonar array
            requiredModules,
            alternativeModules: this.getAlternativeModules(actionKey, moduleId)
        };
    }

    /**
     * Convierte action-key → Nombre Legible
     */
    actionKeyToName(key) {
        return key
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Determina qué módulos son requeridos para una acción
     */
    getRequiredModules(actionKey, moduleId) {
        const modules = [moduleId];

        // Agregar módulos adicionales basándose en keywords
        if (actionKey.includes('shift')) modules.push('shifts');
        if (actionKey.includes('vacation')) modules.push('vacation');
        if (actionKey.includes('medical')) modules.push('medical');
        if (actionKey.includes('attendance')) modules.push('attendance');
        if (actionKey.includes('overtime')) modules.push('overtime-management');
        if (actionKey.includes('biometric')) modules.push('real-biometric-enterprise');

        // Remover duplicados
        return [...new Set(modules)];
    }

    /**
     * Determina si hay módulos alternativos disponibles
     */
    getAlternativeModules(actionKey, moduleId) {
        // Si el módulo no es core, ofrecer notifications como alternativa
        const coreModules = ['users', 'attendance', 'dashboard', 'settings', 'companies'];

        if (!coreModules.includes(moduleId)) {
            return {
                fallback: 'notifications-enterprise',
                message: `Su empresa no tiene contratado el módulo ${moduleId}. Puede usar el sistema de Notificaciones para enviar su solicitud.`
            };
        }

        return null;
    }

    /**
     * Genera TODOS los procesos (process chains) para ProcessChainGenerator
     */
    generateProcessDefinitions() {
        const definitions = {};

        Object.keys(actionsMap.actions_by_module).forEach(moduleId => {
            const actions = actionsMap.actions_by_module[moduleId];

            actions.forEach(actionKey => {
                definitions[actionKey] = this.generateProcessForAction(actionKey, moduleId);
            });
        });

        return definitions;
    }

    /**
     * Genera un proceso (cadena de pasos) para UNA acción
     */
    generateProcessForAction(actionKey, moduleId) {
        const name = this.actionKeyToName(actionKey);

        // Generar pasos basándose en PATRONES
        const steps = this.generateStepsForAction(actionKey, moduleId);

        return {
            name,
            module: moduleId,
            steps,
            estimatedTimeMinutes: this.estimateTime(actionKey, steps.length),
            requiresApproval: this.requiresApproval(actionKey),
            autoRouteable: true
        };
    }

    /**
     * Genera pasos para una acción basándose en patrones inteligentes
     */
    generateStepsForAction(actionKey, moduleId) {
        const steps = [];
        let stepNumber = 1;

        // PASO 1: Navegación al módulo
        steps.push({
            step: stepNumber++,
            action: 'navigate',
            module: moduleId,
            description: `Ir a Módulo de ${this.moduleIdToName(moduleId)}`
        });

        // PASO 2: Acción específica basada en keywords
        if (actionKey.includes('create')) {
            steps.push({
                step: stepNumber++,
                action: 'click',
                target: 'create-button',
                description: 'Click en botón "Crear"'
            });
        } else if (actionKey.includes('request')) {
            steps.push({
                step: stepNumber++,
                action: 'click',
                target: 'request-button',
                description: 'Click en "Nueva Solicitud"'
            });
        } else if (actionKey.includes('view') || actionKey.includes('download')) {
            steps.push({
                step: stepNumber++,
                action: 'select',
                description: `Seleccionar ${this.actionKeyToName(actionKey)}`
            });
        }

        // PASO 3: Completar formulario (si corresponde)
        if (!actionKey.includes('view') && !actionKey.includes('download') && !actionKey.includes('cancel')) {
            steps.push({
                step: stepNumber++,
                action: 'fill-form',
                description: 'Completar formulario con datos requeridos',
                validation: 'Todos los campos obligatorios deben estar completos'
            });
        }

        // PASO 4: Envío/Aprobación (si requiere)
        if (this.requiresApproval(actionKey)) {
            steps.push({
                step: stepNumber++,
                action: 'submit',
                description: 'Enviar solicitud para aprobación',
                routingType: 'hierarchical'
            });

            steps.push({
                step: stepNumber++,
                action: 'wait-approval',
                description: 'Esperar aprobación',
                estimatedTime: '2-3 días hábiles'
            });
        } else {
            steps.push({
                step: stepNumber++,
                action: 'save',
                description: 'Guardar cambios'
            });
        }

        return steps;
    }

    /**
     * Convierte module-id → Nombre Legible
     */
    moduleIdToName(moduleId) {
        return moduleId
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Determina si una acción requiere aprobación
     */
    requiresApproval(actionKey) {
        const requiresApprovalKeywords = [
            'request',
            'apply',
            'submit',
            'escalate',
            'dispute',
            'claim'
        ];

        return requiresApprovalKeywords.some(kw => actionKey.includes(kw));
    }

    /**
     * Estima tiempo de proceso en minutos
     */
    estimateTime(actionKey, stepsCount) {
        // Base time: 2 min por paso
        let minutes = stepsCount * 2;

        // Si requiere aprobación, agregar tiempo de espera
        if (this.requiresApproval(actionKey)) {
            minutes += (2 * 24 * 60); // 2 días en minutos
        }

        return minutes;
    }

    /**
     * Convierte minutos a string legible
     */
    minutesToReadable(minutes) {
        if (minutes < 60) return `${minutes} minutos`;
        if (minutes < 24 * 60) {
            const hours = Math.round(minutes / 60);
            return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
        const days = Math.round(minutes / (24 * 60));
        return `${days} ${days === 1 ? 'día hábil' : 'días hábiles'}`;
    }

    /**
     * Exporta TODAS las definiciones a archivos JSON
     */
    exportDefinitions() {
        const fs = require('fs');
        const path = require('path');

        // Generar prerequisitos
        const prerequisites = this.generatePrerequisites();
        const prerequisitesPath = path.join(__dirname, '../auditor/registry/action-prerequisites.json');
        fs.writeFileSync(prerequisitesPath, JSON.stringify({
            generated_at: new Date().toISOString(),
            total_actions: Object.keys(prerequisites).length,
            prerequisites
        }, null, 2));

        // Generar procesos
        const processes = this.generateProcessDefinitions();
        const processesPath = path.join(__dirname, '../auditor/registry/action-processes.json');
        fs.writeFileSync(processesPath, JSON.stringify({
            generated_at: new Date().toISOString(),
            total_actions: Object.keys(processes).length,
            processes
        }, null, 2));

        return {
            prerequisitesPath,
            processesPath,
            totalActions: Object.keys(prerequisites).length
        };
    }
}

module.exports = ActionDefinitionsGenerator;
