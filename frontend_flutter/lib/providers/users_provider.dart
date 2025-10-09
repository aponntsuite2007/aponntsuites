import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class UsersProvider extends ChangeNotifier {
  final ApiService _apiService;
  
  List<User> _users = [];
  bool _isLoading = false;
  String? _error;
  
  // Paginación
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;
  
  UsersProvider(this._apiService);
  
  // Getters
  List<User> get users => List.unmodifiable(_users);
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  bool get hasMore => _hasMore;
  
  /// Cargar lista de usuarios
  Future<void> loadUsers({
    int page = 1,
    int limit = 20,
    String? search,
    String? role,
    bool? isActive,
    bool append = false,
  }) async {
    if (!append) {
      _setLoading(true);
      _currentPage = 1;
    }
    
    try {
      // Por ahora simulamos la carga ya que no tenemos la ruta implementada en el backend
      // En una implementación real, haríamos la llamada a la API
      
      await Future.delayed(Duration(milliseconds: 500)); // Simular carga
      
      // Simular datos de usuarios
      if (page == 1 && !append) {
        _users = _generateMockUsers();
        _totalPages = 3;
        _hasMore = true;
      } else if (append && _currentPage < _totalPages) {
        _users.addAll(_generateMockUsers(page: page));
        _currentPage++;
        _hasMore = _currentPage < _totalPages;
      } else {
        _hasMore = false;
      }
      
      _clearError();
    } catch (e) {
      _setError('Error cargando usuarios: $e');
    } finally {
      if (!append) {
        _setLoading(false);
      }
    }
  }
  
  /// Buscar usuarios
  Future<void> searchUsers(String query) async {
    _setLoading(true);
    
    try {
      await Future.delayed(Duration(milliseconds: 300));
      
      if (query.isEmpty) {
        await loadUsers();
      } else {
        final allUsers = _generateMockUsers();
        _users = allUsers.where((user) =>
          user.firstName.toLowerCase().contains(query.toLowerCase()) ||
          user.lastName.toLowerCase().contains(query.toLowerCase()) ||
          user.legajo.toLowerCase().contains(query.toLowerCase()) ||
          user.email.toLowerCase().contains(query.toLowerCase())
        ).toList();
        
        _clearError();
      }
    } catch (e) {
      _setError('Error buscando usuarios: $e');
    } finally {
      _setLoading(false);
    }
  }
  
  /// Obtener usuario por ID
  User? getUserById(String id) {
    try {
      return _users.firstWhere((user) => user.user_id == id);
    } catch (e) {
      return null;
    }
  }
  
  /// Filtrar usuarios por rol
  List<User> getUsersByRole(String role) {
    return _users.where((user) => user.role == role).toList();
  }
  
  /// Obtener usuarios activos
  List<User> get activeUsers {
    return _users.where((user) => user.isActive).toList();
  }
  
  /// Actualizar usuario en la lista local
  void updateUserInList(User updatedUser) {
    final index = _users.indexWhere((user) => user.user_id == updatedUser.id);
    if (index >= 0) {
      _users[index] = updatedUser;
      notifyListeners();
    }
  }
  
  /// Agregar usuario a la lista
  void addUser(User newUser) {
    _users.insert(0, newUser);
    notifyListeners();
  }
  
  /// Remover usuario de la lista
  void removeUser(String userId) {
    _users.removeWhere((user) => user.user_id == userId);
    notifyListeners();
  }
  
  /// Limpiar datos
  void clear() {
    _users.clear();
    _currentPage = 1;
    _totalPages = 1;
    _hasMore = true;
    _error = null;
    notifyListeners();
  }
  
  /// Refrescar lista
  Future<void> refresh() async {
    await loadUsers();
  }

  /// Crear nuevo usuario
  Future<bool> createUser(Map<String, dynamic> userData) async {
    _setLoading(true);
    
    try {
      // Simular llamada a API
      await Future.delayed(Duration(milliseconds: 800));
      
      // En una implementación real, haríamos:
      // final response = await _apiService.createUser(userData);
      
      // Simular creación exitosa
      final newUser = User.fromJson({
        'id': 'user_${DateTime.now().millisecondsSinceEpoch}',
        ...userData,
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      });
      
      addUser(newUser);
      _clearError();
      return true;
      
    } catch (e) {
      _setError('Error creando usuario: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Actualizar usuario existente
  Future<bool> updateUser(String userId, Map<String, dynamic> userData) async {
    _setLoading(true);
    
    try {
      // Simular llamada a API
      await Future.delayed(Duration(milliseconds: 600));
      
      // En una implementación real, haríamos:
      // final response = await _apiService.updateUser(userId, userData);
      
      // Buscar y actualizar usuario local
      final userIndex = _users.indexWhere((user) => user.user_id == userId);
      if (userIndex >= 0) {
        final currentUser = _users[userIndex];
        final updatedUserData = currentUser.toJson();
        updatedUserData.addAll(userData);
        updatedUserData['updatedAt'] = DateTime.now().toIso8601String();
        
        final updatedUser = User.fromJson(updatedUserData);
        _users[userIndex] = updatedUser;
        notifyListeners();
      }
      
      _clearError();
      return true;
      
    } catch (e) {
      _setError('Error actualizando usuario: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Cambiar estado activo/inactivo del usuario
  Future<bool> toggleUserStatus(String userId, bool isActive) async {
    try {
      // Simular llamada a API
      await Future.delayed(Duration(milliseconds: 400));
      
      // En una implementación real, haríamos:
      // final response = await _apiService.toggleUserStatus(userId, isActive);
      
      // Actualizar usuario local
      final userIndex = _users.indexWhere((user) => user.user_id == userId);
      if (userIndex >= 0) {
        final currentUser = _users[userIndex];
        final updatedUser = currentUser.copyWith(
          isActive: isActive,
          updatedAt: DateTime.now(),
        );
        _users[userIndex] = updatedUser;
        notifyListeners();
      }
      
      _clearError();
      return true;
      
    } catch (e) {
      _setError('Error cambiando estado del usuario: $e');
      return false;
    }
  }

  /// Eliminar usuario
  Future<bool> deleteUser(String userId) async {
    try {
      // Simular llamada a API
      await Future.delayed(Duration(milliseconds: 500));
      
      // En una implementación real, haríamos:
      // final response = await _apiService.deleteUser(userId);
      
      // Remover usuario de la lista local
      removeUser(userId);
      _clearError();
      return true;
      
    } catch (e) {
      _setError('Error eliminando usuario: $e');
      return false;
    }
  }

  /// Obtener estadísticas de usuarios
  Map<String, int> getUsersStats() {
    return {
      'total': _users.length,
      'active': activeUsers.length,
      'inactive': _users.where((user) => !user.isActive).length,
      'admins': getUsersByRole('admin').length,
      'supervisors': getUsersByRole('supervisor').length,
      'employees': getUsersByRole('employee').length,
    };
  }
  
  /// Generar usuarios de prueba
  List<User> _generateMockUsers({int page = 1}) {
    final baseUsers = [
      {
        'id': 'user_001',
        'legajo': 'EMP001',
        'firstName': 'Juan',
        'lastName': 'Pérez',
        'dni': '12345678',
        'email': 'juan.perez@empresa.com',
        'phone': '+54 9 11 1234-5678',
        'role': 'employee',
        'isActive': true,
        'position': 'Desarrollador',
        'department': 'IT',
        'createdAt': DateTime.now().subtract(Duration(days: 30)).toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
      {
        'id': 'user_002',
        'legajo': 'SUP001',
        'firstName': 'María',
        'lastName': 'González',
        'dni': '87654321',
        'email': 'maria.gonzalez@empresa.com',
        'phone': '+54 9 11 8765-4321',
        'role': 'supervisor',
        'isActive': true,
        'position': 'Supervisora',
        'department': 'Recursos Humanos',
        'createdAt': DateTime.now().subtract(Duration(days: 60)).toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
      {
        'id': 'user_003',
        'legajo': 'EMP002',
        'firstName': 'Carlos',
        'lastName': 'Rodríguez',
        'dni': '11223344',
        'email': 'carlos.rodriguez@empresa.com',
        'phone': '+54 9 11 1122-3344',
        'role': 'employee',
        'isActive': true,
        'position': 'Analista',
        'department': 'Finanzas',
        'createdAt': DateTime.now().subtract(Duration(days: 15)).toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
      {
        'id': 'user_004',
        'legajo': 'EMP003',
        'firstName': 'Ana',
        'lastName': 'Martínez',
        'dni': '44332211',
        'email': 'ana.martinez@empresa.com',
        'phone': '+54 9 11 4433-2211',
        'role': 'employee',
        'isActive': false,
        'position': 'Diseñadora',
        'department': 'Marketing',
        'createdAt': DateTime.now().subtract(Duration(days: 45)).toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
      {
        'id': 'user_005',
        'legajo': 'ADMIN001',
        'firstName': 'Admin',
        'lastName': 'Sistema',
        'dni': '00000000',
        'email': 'admin@sistema.com',
        'role': 'admin',
        'isActive': true,
        'position': 'Administrador',
        'department': 'Sistema',
        'createdAt': DateTime.now().subtract(Duration(days: 90)).toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      },
    ];
    
    return baseUsers.map((userData) => User.fromJson(userData)).toList();
  }
  
  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    if (loading) _error = null;
    notifyListeners();
  }
  
  void _setError(String error) {
    _error = error;
    _isLoading = false;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  @override
  void dispose() {
    _users.clear();
    super.dispose();
  }
}