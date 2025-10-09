import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/smart_auth_provider.dart';
import 'screens/auth/smart_login_screen.dart';
import 'screens/attendance/smart_attendance_screen.dart';
import 'config/app_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    final prefs = await SharedPreferences.getInstance();
    runApp(SmartAttendanceApp(prefs: prefs));
  } catch (e) {
    print('Error inicializando la aplicación: $e');
    runApp(SmartAttendanceApp(prefs: null));
  }
}

class SmartAttendanceApp extends StatelessWidget {
  final SharedPreferences? prefs;

  const SmartAttendanceApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Si no hay preferencias disponibles, mostrar error
    if (prefs == null) {
      return MaterialApp(
        title: AppConfig.appName,
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error, size: 64, color: Colors.red),
                SizedBox(height: 16),
                Text('Error inicializando la aplicación'),
                ElevatedButton(
                  onPressed: () => main(),
                  child: Text('Reintentar'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ChangeNotifierProvider(
      create: (_) => SmartAuthProvider(prefs!),
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          appBarTheme: AppBarTheme(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          cardTheme: CardTheme(
            elevation: 3,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        ),
        home: Consumer<SmartAuthProvider>(
          builder: (context, auth, _) {
            if (auth.isAuthenticated) {
              return SmartAttendanceScreen();
            } else {
              return SmartLoginScreen();
            }
          },
        ),
      ),
    );
  }
}