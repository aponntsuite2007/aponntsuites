/*
 * 👔 ADMIN APP - MAIN ENTRY POINT
 * ================================
 * Entry point para la APK del ADMINISTRADOR
 *
 * Compilar con:
 *   flutter build apk --flavor admin --target=lib/main_admin.dart
 *
 * Fecha: 2025-12-09
 * Versión: 2.0.0
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/config_service.dart';
import 'screens/login_screen.dart';
import 'screens/config_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configurar orientación preferida
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  final prefs = await SharedPreferences.getInstance();
  runApp(AdminApp(prefs: prefs));
}

class AdminApp extends StatelessWidget {
  final SharedPreferences prefs;

  const AdminApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AdminAppProvider(prefs),
      child: MaterialApp(
        title: 'Aponnt Ecosistema Inteligente - Administrador',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          primaryColor: const Color(0xFF1976D2),
          scaffoldBackgroundColor: const Color(0xFFF5F5F5),
          visualDensity: VisualDensity.adaptivePlatformDensity,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF1976D2),
            elevation: 0,
            centerTitle: true,
            iconTheme: IconThemeData(color: Colors.white),
            titleTextStyle: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1976D2),
              foregroundColor: Colors.white,
              elevation: 2,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          cardTheme: CardThemeData(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        home: AdminStartupScreen(prefs: prefs),
      ),
    );
  }
}

class AdminAppProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  String? _token;
  Map<String, dynamic>? _userData;

  AdminAppProvider(this._prefs) {
    _loadUserData();
  }

  String? get token => _token;
  Map<String, dynamic>? get userData => _userData;
  bool get isAuthenticated => _token != null;

  void _loadUserData() {
    _token = _prefs.getString('auth_token');
    final userDataString = _prefs.getString('user_data');
    if (userDataString != null) {
      try {
        // Parse user data from JSON if needed
        _userData = {};
      } catch (e) {
        print('Error loading user data: $e');
      }
    }
    notifyListeners();
  }

  Future<void> setAuthData(String token, Map<String, dynamic> userData) async {
    _token = token;
    _userData = userData;
    await _prefs.setString('auth_token', token);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _userData = null;
    await _prefs.remove('auth_token');
    await _prefs.remove('user_data');
    notifyListeners();
  }
}

class AdminStartupScreen extends StatefulWidget {
  final SharedPreferences prefs;

  const AdminStartupScreen({Key? key, required this.prefs}) : super(key: key);

  @override
  _AdminStartupScreenState createState() => _AdminStartupScreenState();
}

class _AdminStartupScreenState extends State<AdminStartupScreen> {
  @override
  void initState() {
    super.initState();
    _checkConfigAndNavigate();
  }

  Future<void> _checkConfigAndNavigate() async {
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
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

      final authToken = widget.prefs.getString('auth_token');

      if (authToken == null) {
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => NewLoginScreen()),
          );
        }
        return;
      }

      // TODO: Navegar a pantalla principal de admin
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => AdminDashboardPlaceholder()),
        );
      }

    } catch (e) {
      print('❌ [ADMIN STARTUP] Error: $e');
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
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: const Icon(
                Icons.admin_panel_settings,
                size: 60,
                color: Color(0xFF1976D2),
              ),
            ),

            const SizedBox(height: 30),

            const Text(
              'Aponnt Ecosistema Inteligente',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'Administrador',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w300,
                color: Colors.white.withOpacity(0.9),
              ),
            ),

            const SizedBox(height: 50),

            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),

            const SizedBox(height: 20),

            Text(
              'Iniciando sistema...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.8),
              ),
            ),

            const SizedBox(height: 100),

            Text(
              'v2.0.0 - Admin Pro',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Pantalla placeholder para el dashboard de admin
class AdminDashboardPlaceholder extends StatelessWidget {
  const AdminDashboardPlaceholder({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de Administrador'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(
              Icons.admin_panel_settings,
              size: 100,
              color: Color(0xFF1976D2),
            ),
            SizedBox(height: 20),
            Text(
              'Panel de Administrador',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 10),
            Text(
              'Funcionalidad en desarrollo',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
