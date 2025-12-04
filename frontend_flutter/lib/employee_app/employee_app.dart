/*
 * 📱 EMPLOYEE APP - EXPORTS
 * ==========================
 * Archivo de exportación principal para la APP DEL EMPLEADO
 *
 * Uso:
 * import 'package:attendance_system/employee_app/employee_app.dart';
 *
 * Fecha: 2025-11-30
 * Versión: 2.0.0
 *
 * ⚠️ MÓDULO INDEPENDIENTE - NO AFECTA AL KIOSK
 */

// ====== SERVICIOS ======
export 'services/employee_biometric_capture_service.dart';
export 'services/employee_websocket_service.dart';
export 'services/employee_notification_service.dart';
export 'services/employee_liveness_service.dart';
export 'services/employee_api_service.dart';

// ====== PANTALLAS PRINCIPALES ======
export 'screens/employee_biometric_screen.dart';
export 'screens/employee_medical_dashboard.dart';
export 'screens/employee_main_navigation.dart';

// ====== PANTALLAS DE GESTIÓN ======
export 'screens/employee_profile_screen.dart';
export 'screens/employee_documents_screen.dart';
export 'screens/employee_payslips_screen.dart';
export 'screens/employee_vacations_screen.dart';
export 'screens/employee_sanctions_screen.dart';
export 'screens/employee_trainings_screen.dart';
export 'screens/employee_tasks_screen.dart';
export 'screens/employee_permissions_screen.dart';
