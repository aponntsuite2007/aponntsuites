import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Providers
import '../providers/enhanced_auth_provider.dart';
import '../providers/medical_absence_provider.dart';

// Screens
import 'attendance/attendance_screen.dart';
import 'medical/medical_absence_screen.dart';
import 'medical/medical_certificates_list_screen.dart';
import 'medical/medical_panel_screen.dart';
import 'employee/employee_portal.dart';
import 'employee/medical_photo_requests_screen.dart';
import 'medical/medical_documents_screen.dart';
import 'documents/document_requests_screen.dart';
import 'absence/absence_notification_screen.dart';
import 'admin/admin_dashboard.dart';
import 'admin/questionnaire_config_screen.dart';
import 'profile/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  @override
  _MainNavigationScreenState createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;
  
  @override
  Widget build(BuildContext context) {
    return Consumer<EnhancedAuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.currentUser!;
        
        // Configurar las pestañas según el rol del usuario
        final List<NavigationItem> navigationItems = _buildNavigationItems(authProvider);
        
        return Scaffold(
          body: IndexedStack(
            index: _selectedIndex,
            children: navigationItems.map((item) => item.screen).toList(),
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  offset: Offset(0, -2),
                  blurRadius: 4,
                ),
              ],
            ),
            child: SafeArea(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: navigationItems.asMap().entries.map((entry) {
                    int index = entry.key;
                    NavigationItem item = entry.value;
                    bool isSelected = _selectedIndex == index;
                    
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedIndex = index;
                        });
                      },
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.red[700] : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              item.icon,
                              color: isSelected ? Colors.white : Colors.grey[600],
                              size: 20, // Achicar ícono de 24 a 20
                            ),
                            SizedBox(height: 2), // Reducir espacio
                            Text(
                              item.label,
                              style: TextStyle(
                                color: isSelected ? Colors.white : Colors.grey[600],
                                fontSize: 10, // Achicar texto de 12 a 10
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
  
  List<NavigationItem> _buildNavigationItems(EnhancedAuthProvider authProvider) {
    List<NavigationItem> items = [];
    
    // Fichaje - Disponible para todos
    items.add(NavigationItem(
      icon: Icons.access_time,
      label: 'Fichaje',
      screen: AttendanceScreen(),
    ));
    
    // Ausencias Médicas - Disponible para todos
    items.add(NavigationItem(
      icon: Icons.medical_services,
      label: 'Médico',
      screen: MedicalMainScreen(authProvider: authProvider),
    ));
    
    // Portal del Empleado - Disponible para todos
    items.add(NavigationItem(
      icon: Icons.person,
      label: 'Mi Portal',
      screen: EmployeePortal(),
    ));
    
    // Panel Admin - Solo para administradores y supervisores
    if (authProvider.hasPermission('admin') || authProvider.hasPermission('supervisor')) {
      items.add(NavigationItem(
        icon: Icons.admin_panel_settings,
        label: 'Admin',
        screen: AdminDashboard(),
      ));
    }
    
    // Perfil - Disponible para todos
    items.add(NavigationItem(
      icon: Icons.account_circle,
      label: 'Perfil',
      screen: ProfileScreen(),
    ));
    
    return items;
  }
}

class NavigationItem {
  final IconData icon;
  final String label;
  final Widget screen;
  
  NavigationItem({
    required this.icon,
    required this.label,
    required this.screen,
  });
}

class MedicalMainScreen extends StatelessWidget {
  final EnhancedAuthProvider authProvider;

  MedicalMainScreen({required this.authProvider});

  @override
  Widget build(BuildContext context) {
    // Determinar tabs según el rol del usuario
    final tabs = _buildTabs();
    final screens = _buildScreens();

    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Sistema Médico'),
          backgroundColor: Colors.red[700],
          foregroundColor: Colors.white,
          bottom: TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: tabs,
          ),
        ),
        body: TabBarView(
          children: screens,
        ),
      ),
    );
  }

  List<Tab> _buildTabs() {
    List<Tab> tabs = [];
    
    // Para empleados: notificar inasistencia
    tabs.add(Tab(
      icon: Icon(Icons.notification_important),
      text: 'Notificar Inasistencia',
    ));
    
    // Para empleados: reportar ausencias y ver solicitudes de fotos
    tabs.add(Tab(
      icon: Icon(Icons.add_circle),
      text: 'Nueva Ausencia',
    ));
    
    tabs.add(Tab(
      icon: Icon(Icons.list),
      text: 'Mis Certificados',
    ));

    tabs.add(Tab(
      icon: Icon(Icons.photo_camera),
      text: 'Fotos Médicas',
    ));

    tabs.add(Tab(
      icon: Icon(Icons.folder_open),
      text: 'Documentos',
    ));

    // Para personal médico: panel médico
    if (authProvider.currentUser?.role == 'medical' || authProvider.hasPermission('admin')) {
      tabs.add(Tab(
        icon: Icon(Icons.medical_services),
        text: 'Panel Médico',
      ));
    }

    // Para administradores: configuración de cuestionarios
    if (authProvider.hasPermission('admin')) {
      tabs.add(Tab(
        icon: Icon(Icons.quiz),
        text: 'Cuestionarios',
      ));
    }

    return tabs;
  }

  List<Widget> _buildScreens() {
    List<Widget> screens = [];
    
    // Para empleados
    screens.add(AbsenceNotificationScreen());
    screens.add(MedicalAbsenceFormScreen());
    screens.add(MedicalCertificatesListScreen());
    screens.add(MedicalPhotoRequestsScreen());
    screens.add(DocumentRequestsScreen());

    // Para personal médico
    if (authProvider.currentUser?.role == 'medical' || authProvider.hasPermission('admin')) {
      screens.add(MedicalPanelScreen());
    }

    // Para administradores
    if (authProvider.hasPermission('admin')) {
      screens.add(QuestionnaireConfigScreen());
    }

    return screens;
  }
}

class MedicalAbsenceFormScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info, color: Colors.blue[600]),
                      SizedBox(width: 8),
                      Text(
                        'Reporte de Ausencia Médica',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Complete el formulario para reportar una ausencia por motivos médicos. '
                    'Su solicitud será revisada por el personal médico autorizado.',
                    style: TextStyle(
                      color: Colors.grey[700],
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                  SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ChangeNotifierProvider(
                              create: (_) => MedicalAbsenceProvider(
                                Provider.of<EnhancedAuthProvider>(context, listen: false).apiService,
                              ),
                              child: MedicalAbsenceScreen(),
                            ),
                          ),
                        );
                      },
                      icon: Icon(Icons.medical_services),
                      label: Text('Reportar Nueva Ausencia'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[700],
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          
          // Información adicional
          Card(
            color: Colors.orange[50],
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.lightbulb, color: Colors.orange[700]),
                      SizedBox(width: 8),
                      Text(
                        'Información Importante',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange[700],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  ...([
                    '• Complete el formulario tan pronto como sea posible',
                    '• Proporcione información veraz y completa',
                    '• Adjunte certificados médicos si los tiene',
                    '• Recibirá notificaciones sobre el estado de su solicitud',
                    '• Puede ser requerido para una auditoría médica',
                  ]).map((text) => Padding(
                    padding: EdgeInsets.only(bottom: 4),
                    child: Text(
                      text,
                      style: TextStyle(
                        color: Colors.orange[800],
                        fontSize: 13,
                      ),
                    ),
                  )).toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Extensión para acceder al API service desde el auth provider
extension AuthProviderExtension on EnhancedAuthProvider {
  ApiService get apiService => _apiService;
}

// Como no podemos modificar el provider directamente, usaremos un workaround
class MedicalAbsenceProviderFactory {
  static MedicalAbsenceProvider create(BuildContext context) {
    final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
    // Aquí necesitaríamos acceso al ApiService desde el AuthProvider
    // Por ahora, crearemos una nueva instancia
    return MedicalAbsenceProvider(ApiService());
  }
}