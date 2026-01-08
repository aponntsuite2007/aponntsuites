/**
 * ATTENDANCE - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module attendance-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class AttendanceNotifications {

    /**
     * Autorización de Llegada Tardía - Aprobada
     * Workflow: attendance.late_arrival_approved
     */
    static async notifyArrivalApproved({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance.late_arrival_approved',
                recipientType: 'user',
                recipientId,
                title: 'Autorización de Llegada Tardía - Aprobada',
                message: data.message || 'Autorización de ingreso concedida',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance.late',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance.late_arrival_approved`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyArrivalApproved:`, error);
        }
    }

    /**
     * Autorización de Llegada Tardía - Solicitud
     * Workflow: attendance.late_arrival_authorization_request
     */
    static async notifyArrivalAuthorizationRequest({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance.late_arrival_authorization_request',
                recipientType: 'user',
                recipientId,
                title: 'Autorización de Llegada Tardía - Solicitud',
                message: data.message || 'Empleado llega tarde, solicita autorización desde kiosk',
                priority: 'high',
                channels: ["email","push","inbox","websocket"],
                originType: 'attendance_attendance.late',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: true,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance.late_arrival_authorization_request`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyArrivalAuthorizationRequest:`, error);
        }
    }

    /**
     * Autorización de Llegada Tardía - Procesada (Informativo)
     * Workflow: attendance.late_arrival_processed
     */
    static async notifyArrivalProcessed({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance.late_arrival_processed',
                recipientType: 'user',
                recipientId,
                title: 'Autorización de Llegada Tardía - Procesada (Informativo)',
                message: data.message || 'Notificación informativa a RRHH',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance.late',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance.late_arrival_processed`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyArrivalProcessed:`, error);
        }
    }

    /**
     * Autorización de Llegada Tardía - Rechazada
     * Workflow: attendance.late_arrival_rejected
     */
    static async notifyArrivalRejected({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance.late_arrival_rejected',
                recipientType: 'user',
                recipientId,
                title: 'Autorización de Llegada Tardía - Rechazada',
                message: data.message || 'Autorización denegada',
                priority: 'high',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance.late',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance.late_arrival_rejected`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyArrivalRejected:`, error);
        }
    }

    /**
     * Ausencia no justificada
     * Workflow: attendance_absence
     */
    static async notifyAbsence({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance_absence',
                recipientType: 'user',
                recipientId,
                title: 'Ausencia no justificada',
                message: data.message || 'Notificación de ausencia',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance_absence`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyAbsence:`, error);
        }
    }

    /**
     * Justificativo aprobado
     * Workflow: attendance_justification_approved
     */
    static async notifyJustificationApproved({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance_justification_approved',
                recipientType: 'user',
                recipientId,
                title: 'Justificativo aprobado',
                message: data.message || 'Notificación de justificativo aprobado',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance_justification_approved`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyJustificationApproved:`, error);
        }
    }

    /**
     * Justificativo rechazado
     * Workflow: attendance_justification_rejected
     */
    static async notifyJustificationRejected({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance_justification_rejected',
                recipientType: 'user',
                recipientId,
                title: 'Justificativo rechazado',
                message: data.message || 'Notificación de justificativo rechazado',
                priority: 'high',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance_justification_rejected`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyJustificationRejected:`, error);
        }
    }

    /**
     * Llegada tardía
     * Workflow: attendance_late_arrival
     */
    static async notifyLateArrival({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance_late_arrival',
                recipientType: 'user',
                recipientId,
                title: 'Llegada tardía',
                message: data.message || 'Notificación de llegada tardía',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance_late_arrival`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyLateArrival:`, error);
        }
    }

    /**
     * Reporte mensual de asistencia
     * Workflow: attendance_monthly_report
     */
    static async notifyMonthlyReport({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: 'attendance',
                workflowKey: 'attendance_monthly_report',
                recipientType: 'user',
                recipientId,
                title: 'Reporte mensual de asistencia',
                message: data.message || 'Reporte ejecutivo mensual',
                priority: 'normal',
                channels: ["email","inbox","websocket"],
                originType: 'attendance_attendance',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: false,
                metadata: data
            });
            console.log(`✅ [ATTENDANCE] Notificación enviada: attendance_monthly_report`);
        } catch (error) {
            console.error(`❌ [ATTENDANCE] Error en notifyMonthlyReport:`, error);
        }
    }

}

module.exports = AttendanceNotifications;
