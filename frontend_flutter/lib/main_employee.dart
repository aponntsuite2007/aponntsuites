/*
 * 📱 EMPLOYEE APP - MAIN ENTRY POINT
 * ====================================
 * Entry point para la APK del EMPLEADO
 *
 * Compilar con:
 *   flutter build apk --target=lib/main_employee.dart
 *
 * Fecha: 2025-12-08
 * Versión: 2.0.0
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/config_service.dart';
import 'employee_app/screens/employee_main_navigation.dart';
import 'screens/login_screen.dart';
import 'screens/config_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configurar orientación preferida
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final prefs = await SharedPreferences.getInstance();
  runApp(EmployeeApp(prefs: prefs));
}

class EmployeeApp extends StatelessWidget {
  final SharedPreferences prefs;

  const EmployeeApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => EmployeeAppProvider(prefs),
      child: MaterialApp(
        title: 'App Empleado - Sistema de Asistencia',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          primaryColor: const Color(0xFF1976D2),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF1976D2),
            brightness: Brightness.light,
          ),
          visualDensity: VisualDensity.adaptivePlatformDensity,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF1976D2),
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          cardTheme: const CardThemeData(
            elevation: 2,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        home: EmployeeStartupScreen(),
      ),
    );
  }
}

/// Provider específico para la App del Empleado
class EmployeeAppProvider with ChangeNotifier {
  final SharedPreferences _prefs;

  String? _serverUrl;
  String? _companyId;
  String? _authToken;
  String? _employeeId;
  String? _employeeName;

  EmployeeAppProvider(this._prefs) {
    _loadConfig();
  }

  String? get serverUrl => _serverUrl;
  String? get companyId => _companyId;
  String? get authToken => _authToken;
  String? get employeeId => _employeeId;
  String? get employeeName => _employeeName;

  bool get isConfigured => _prefs.getBool('config_is_configured') ?? false;
  bool get isAuthenticated => _authToken != null && _companyId != null;

  void _loadConfig() {
    _serverUrl = _prefs.getString('server_url');
    _companyId = _prefs.getString('config_company_id');
    _authToken = _prefs.getString('auth_token');
    _employeeId = _prefs.getString('employee_id');
    _employeeName = _prefs.getString('employee_name');
    notifyListeners();
  }

  Future<void> setEmployeeData({
    required String employeeId,
    required String employeeName,
  }) async {
    await _prefs.setString('employee_id', employeeId);
    await _prefs.setString('employee_name', employeeName);
    _employeeId = employeeId;
    _employeeName = employeeName;
    notifyListeners();
  }

  Future<void> logout() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('employee_id');
    await _prefs.remove('employee_name');
    _authToken = null;
    _employeeId = null;
    _employeeName = null;
    notifyListeners();
  }
}

/// Pantalla de inicio - Decide si mostrar configuración, login o navegación principal
class EmployeeStartupScreen extends StatefulWidget {
  @override
  _EmployeeStartupScreenState createState() => _EmployeeStartupScreenState();
}

class _EmployeeStartupScreenState extends State<EmployeeStartupScreen> {
  @override
  void initState() {
    super.initState();
    _checkConfigurationAndNavigate();
  }

  Future<void> _checkConfigurationAndNavigate() async {
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Verificar si hay servidor configurado
      final isConfigured = await ConfigService.isConfigured();

      if (!isConfigured) {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => ConfigScreen()),
          );
        }
        return;
      }

      // 2. Verificar si tiene token de autenticación
      final authToken = prefs.getString('auth_token');
      final companyId = prefs.getString('config_company_id');

      if (authToken == null || companyId == null) {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => NewLoginScreen()),
          );
        }
        return;
      }

      // 3. Si tiene todo, ir a la navegación principal
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const EmployeeMainNavigation()),
        );
      }

    } catch (e) {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => ConfigScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1976D2),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: const Icon(
                Icons.person_outline,
                size: 60,
                color: Color(0xFF1976D2),
              ),
            ),

            const SizedBox(height: 30),

            // App name
            const Text(
              'App del Empleado',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'Sistema de Asistencia',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w300,
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),

            const SizedBox(height: 50),

            // Loading indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),

            const SizedBox(height: 20),

            Text(
              'Iniciando...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.8),
              ),
            ),

            const SizedBox(height: 100),

            Text(
              'v2.0.0 - Employee',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
