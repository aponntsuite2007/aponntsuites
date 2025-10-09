import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Providers
import 'providers/enhanced_auth_provider.dart';
import 'providers/attendance_provider.dart';
import 'providers/medical_absence_provider.dart';
import 'providers/medical_documents_provider.dart';
import 'providers/users_provider.dart';
import 'providers/config_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/websocket_provider.dart';

// Services
import 'services/api_service.dart';
import 'services/notification_service.dart';
import 'services/medical_notification_service.dart';

// Screens
import 'screens/splash/splash_screen.dart';
import 'screens/auth/enhanced_login_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar dependencias
  final prefs = await SharedPreferences.getInstance();
  final apiService = ApiService();
  
  // Inicializar servicios de notificación
  final notificationService = NotificationService();
  await notificationService.initialize();
  
  final medicalNotificationService = MedicalNotificationService();
  await medicalNotificationService.initialize(
    apiService: apiService,
    notificationService: notificationService,
  );
  
  runApp(AttendanceApp(
    prefs: prefs,
    apiService: apiService,
  ));
}

class AttendanceApp extends StatelessWidget {
  final SharedPreferences prefs;
  final ApiService apiService;
  
  AttendanceApp({
    required this.prefs,
    required this.apiService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Providers principales
        ChangeNotifierProvider(
          create: (_) => EnhancedAuthProvider(apiService, prefs),
        ),
        ChangeNotifierProvider(
          create: (_) => ConfigProvider(apiService, prefs),
        ),
        
        // Providers dependientes de autenticación
        ChangeNotifierProxyProvider<EnhancedAuthProvider, AttendanceProvider>(
          create: (_) => AttendanceProvider(apiService),
          update: (_, auth, previous) => previous ?? AttendanceProvider(apiService),
        ),
        ChangeNotifierProxyProvider<EnhancedAuthProvider, MedicalAbsenceProvider>(
          create: (_) => MedicalAbsenceProvider(apiService),
          update: (_, auth, previous) => previous ?? MedicalAbsenceProvider(apiService),
        ),
        ChangeNotifierProxyProvider<EnhancedAuthProvider, MedicalDocumentsProvider>(
          create: (_) => MedicalDocumentsProvider(apiService),
          update: (_, auth, previous) => previous ?? MedicalDocumentsProvider(apiService),
        ),
        ChangeNotifierProxyProvider<EnhancedAuthProvider, UsersProvider>(
          create: (_) => UsersProvider(apiService),
          update: (_, auth, previous) => previous ?? UsersProvider(apiService),
        ),
        ChangeNotifierProxyProvider<EnhancedAuthProvider, NotificationProvider>(
          create: (_) => NotificationProvider(apiService),
          update: (_, auth, previous) => previous ?? NotificationProvider(apiService),
        ),
        ChangeNotifierProxyProvider<EnhancedAuthProvider, WebsocketProvider>(
          create: (_) => WebsocketProvider(apiService),
          update: (_, auth, previous) => previous ?? WebsocketProvider(apiService),
        ),
      ],
      child: Consumer<ConfigProvider>(
        builder: (context, configProvider, child) {
          return MaterialApp(
            title: 'Sistema de Asistencia Biométrico',
            debugShowCheckedModeBanner: false,
            theme: _buildTheme(configProvider),
            home: AppNavigator(),
            builder: (context, child) {
              return MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaleFactor: 1.0),
                child: child!,
              );
            },
          );
        },
      ),
    );
  }

  ThemeData _buildTheme(ConfigProvider configProvider) {
    return ThemeData(
      primarySwatch: Colors.red,
      primaryColor: Colors.red[700],
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.red[700]!,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.red[700],
        foregroundColor: Colors.white,
        elevation: 2,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red[700],
          foregroundColor: Colors.white,
          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Colors.red[700]!, width: 2),
        ),
      ),
    );
  }
}

class AppNavigator extends StatefulWidget {
  @override
  _AppNavigatorState createState() => _AppNavigatorState();
}

class _AppNavigatorState extends State<AppNavigator> {
  bool _isInitializing = true;
  
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }
  
  Future<void> _initializeApp() async {
    // Simular carga inicial
    await Future.delayed(Duration(seconds: 2));
    
    if (mounted) {
      setState(() {
        _isInitializing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isInitializing) {
      return SplashScreen();
    }

    return Consumer<EnhancedAuthProvider>(
      builder: (context, authProvider, child) {
        // Mostrar splash mientras se carga la autenticación
        if (authProvider.isLoading && !authProvider.isAuthenticated) {
          return SplashScreen();
        }

        // Si no está autenticado, mostrar login
        if (!authProvider.isAuthenticated) {
          return EnhancedLoginScreen();
        }

        // Si está autenticado pero necesita re-autenticación biométrica
        if (authProvider.needsReAuthentication()) {
          return AuthenticationGate();
        }

        // Usuario completamente autenticado
        return MainNavigationScreen();
      },
    );
  }
}

class AuthenticationGate extends StatefulWidget {
  @override
  _AuthenticationGateState createState() => _AuthenticationGateState();
}

class _AuthenticationGateState extends State<AuthenticationGate> {
  bool _isAuthenticating = false;
  
  @override
  void initState() {
    super.initState();
    _performSessionAuthentication();
  }
  
  Future<void> _performSessionAuthentication() async {
    setState(() {
      _isAuthenticating = true;
    });
    
    final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
    final success = await authProvider.performSessionAuthentication();
    
    if (!success && mounted) {
      // Si falla la autenticación automática, mostrar opciones manuales
      _showManualAuthenticationDialog();
    }
    
    setState(() {
      _isAuthenticating = false;
    });
  }
  
  void _showManualAuthenticationDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AuthenticationDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.red[700]!,
              Colors.red[900]!,
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.fingerprint,
                  size: 120,
                  color: Colors.white,
                ),
                SizedBox(height: 32),
                Text(
                  'Verificación de Identidad',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 16),
                Text(
                  'Verifica tu identidad para continuar',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 48),
                if (_isAuthenticating)
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  )
                else
                  ElevatedButton.icon(
                    onPressed: _performSessionAuthentication,
                    icon: Icon(Icons.fingerprint),
                    label: Text('Verificar Identidad'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.red[700],
                      padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    ),
                  ),
                SizedBox(height: 24),
                TextButton(
                  onPressed: () {
                    _showManualAuthenticationDialog();
                  },
                  child: Text(
                    'Otras opciones de acceso',
                    style: TextStyle(
                      color: Colors.white70,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AuthenticationDialog extends StatefulWidget {
  @override
  _AuthenticationDialogState createState() => _AuthenticationDialogState();
}

class _AuthenticationDialogState extends State<AuthenticationDialog> {
  final _pinController = TextEditingController();
  bool _isLoading = false;
  
  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Verificación de Identidad'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Ingresa tu PIN para continuar'),
          SizedBox(height: 16),
          TextField(
            controller: _pinController,
            obscureText: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: InputDecoration(
              labelText: 'PIN',
              border: OutlineInputBorder(),
              counterText: '',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.pop(context);
            // Redirigir a login completo
            final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
            authProvider.clearAuth();
          },
          child: Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _authenticateWithPIN,
          child: _isLoading 
            ? SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Text('Verificar'),
        ),
      ],
    );
  }
  
  Future<void> _authenticateWithPIN() async {
    if (_pinController.text.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('El PIN debe tener al menos 4 dígitos'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
    final success = await authProvider.loginWithPIN(_pinController.text);
    
    setState(() {
      _isLoading = false;
    });
    
    if (success) {
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Error de autenticación'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
  
  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }
}