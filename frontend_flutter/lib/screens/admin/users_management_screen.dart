import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/users_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/user.dart';
import '../../config/theme.dart';
import 'user_detail_screen.dart';
import 'add_user_screen.dart';

class UsersManagementScreen extends StatefulWidget {
  @override
  _UsersManagementScreenState createState() => _UsersManagementScreenState();
}

class _UsersManagementScreenState extends State<UsersManagementScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _selectedRole = 'all';
  bool _showActiveOnly = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadUsers();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _loadUsers() {
    final usersProvider = Provider.of<UsersProvider>(context, listen: false);
    usersProvider.loadUsers();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Gestión de Usuarios'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'TODOS'),
            Tab(text: 'ADMIN'),
            Tab(text: 'SUPERVISOR'),
            Tab(text: 'EMPLEADOS'),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.search),
            onPressed: _showSearchDialog,
          ),
          IconButton(
            icon: Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadUsers,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildUsersList('all'),
                _buildUsersList('admin'),
                _buildUsersList('supervisor'),
                _buildUsersList('employee'),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addNewUser,
        child: Icon(Icons.person_add),
        backgroundColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Buscar usuarios...',
          prefixIcon: Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(25),
          ),
          filled: true,
          fillColor: Colors.grey[100],
        ),
        onChanged: (value) => setState(() {}),
      ),
    );
  }

  Widget _buildUsersList(String roleFilter) {
    return Consumer<UsersProvider>(
      builder: (context, usersProvider, child) {
        if (usersProvider.isLoading && usersProvider.users.isEmpty) {
          return Center(child: CircularProgressIndicator());
        }

        List<User> filteredUsers = usersProvider.users.where((user) {
          // Filtrar por rol
          bool roleMatch = roleFilter == 'all' || user.role == roleFilter;
          
          // Filtrar por estado activo
          bool statusMatch = !_showActiveOnly || user.isActive;
          
          // Filtrar por búsqueda
          bool searchMatch = _searchController.text.isEmpty ||
              user.fullName.toLowerCase().contains(_searchController.text.toLowerCase()) ||
              user.legajo.toLowerCase().contains(_searchController.text.toLowerCase()) ||
              user.email.toLowerCase().contains(_searchController.text.toLowerCase()) ||
              user.dni.contains(_searchController.text);

          return roleMatch && statusMatch && searchMatch;
        }).toList();

        if (filteredUsers.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.people_outline,
                  size: 64,
                  color: AppTheme.textSecondary,
                ),
                SizedBox(height: 16),
                Text(
                  'No se encontraron usuarios',
                  style: AppTheme.subtitleStyle.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                if (_searchController.text.isNotEmpty || !_showActiveOnly)
                  TextButton(
                    onPressed: () {
                      _searchController.clear();
                      setState(() {
                        _showActiveOnly = true;
                      });
                    },
                    child: Text('Limpiar filtros'),
                  ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => _loadUsers(),
          child: ListView.builder(
            padding: EdgeInsets.all(8),
            itemCount: filteredUsers.length,
            itemBuilder: (context, index) {
              final user = filteredUsers[index];
              return _buildUserCard(user);
            },
          ),
        );
      },
    );
  }

  Widget _buildUserCard(User user) {
    return Card(
      margin: EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: ListTile(
        leading: CircleAvatar(
          radius: 25,
          backgroundColor: _getRoleColor(user.role),
          backgroundImage: user.profilePhoto != null
              ? NetworkImage(user.profilePhoto!)
              : null,
          child: user.profilePhoto == null
              ? Text(
                  user.firstName[0].toUpperCase(),
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                )
              : null,
        ),
        title: Text(
          user.fullName,
          style: AppTheme.titleStyle.copyWith(fontSize: 16),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${user.legajo} • ${user.displayRole}'),
            Text(user.email),
            SizedBox(height: 4),
            Row(
              children: [
                _buildStatusChip(user.isActive),
                SizedBox(width: 8),
                if (user.lastLogin != null)
                  Text(
                    'Último acceso: ${_formatDate(user.lastLogin!)}',
                    style: AppTheme.captionStyle.copyWith(
                      color: AppTheme.textSecondary,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) => _handleUserAction(value, user),
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'view',
              child: ListTile(
                leading: Icon(Icons.visibility),
                title: Text('Ver detalles'),
                dense: true,
              ),
            ),
            PopupMenuItem(
              value: 'edit',
              child: ListTile(
                leading: Icon(Icons.edit),
                title: Text('Editar'),
                dense: true,
              ),
            ),
            PopupMenuItem(
              value: user.isActive ? 'deactivate' : 'activate',
              child: ListTile(
                leading: Icon(
                  user.isActive ? Icons.block : Icons.check_circle,
                  color: user.isActive ? AppTheme.errorColor : AppTheme.successColor,
                ),
                title: Text(user.isActive ? 'Desactivar' : 'Activar'),
                dense: true,
              ),
            ),
            if (user.role != 'admin') // No permitir eliminar admins
              PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete, color: AppTheme.errorColor),
                  title: Text('Eliminar', style: TextStyle(color: AppTheme.errorColor)),
                  dense: true,
                ),
              ),
          ],
        ),
        onTap: () => _viewUserDetail(user),
      ),
    );
  }

  Widget _buildStatusChip(bool isActive) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: (isActive ? AppTheme.successColor : AppTheme.errorColor).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? AppTheme.successColor : AppTheme.errorColor,
          width: 1,
        ),
      ),
      child: Text(
        isActive ? 'Activo' : 'Inactivo',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: isActive ? AppTheme.successColor : AppTheme.errorColor,
        ),
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'admin':
        return AppTheme.errorColor;
      case 'supervisor':
        return AppTheme.warningColor;
      case 'employee':
        return AppTheme.primaryColor;
      default:
        return AppTheme.textSecondary;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date).inDays;
    
    if (diff == 0) return 'Hoy';
    if (diff == 1) return 'Ayer';
    if (diff < 7) return 'Hace $diff días';
    
    return '${date.day}/${date.month}/${date.year}';
  }

  void _handleUserAction(String action, User user) {
    switch (action) {
      case 'view':
        _viewUserDetail(user);
        break;
      case 'edit':
        _editUser(user);
        break;
      case 'activate':
      case 'deactivate':
        _toggleUserStatus(user);
        break;
      case 'delete':
        _deleteUser(user);
        break;
    }
  }

  void _viewUserDetail(User user) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => UserDetailScreen(user: user),
      ),
    );
  }

  void _editUser(User user) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddUserScreen(user: user),
      ),
    ).then((_) => _loadUsers());
  }

  void _addNewUser() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddUserScreen(),
      ),
    ).then((_) => _loadUsers());
  }

  void _toggleUserStatus(User user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(user.isActive ? 'Desactivar Usuario' : 'Activar Usuario'),
        content: Text(
          user.isActive
              ? '¿Estás seguro de que deseas desactivar a ${user.fullName}? No podrá acceder al sistema.'
              : '¿Estás seguro de que deseas activar a ${user.fullName}? Podrá acceder al sistema nuevamente.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              final usersProvider = Provider.of<UsersProvider>(context, listen: false);
              usersProvider.toggleUserStatus(user.user_id, !user.isActive);
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    user.isActive
                        ? 'Usuario desactivado correctamente'
                        : 'Usuario activado correctamente',
                  ),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: user.isActive ? AppTheme.errorColor : AppTheme.successColor,
            ),
            child: Text(user.isActive ? 'Desactivar' : 'Activar'),
          ),
        ],
      ),
    );
  }

  void _deleteUser(User user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Eliminar Usuario'),
        content: Text(
          '¿Estás seguro de que deseas eliminar a ${user.fullName}? Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              final usersProvider = Provider.of<UsersProvider>(context, listen: false);
              usersProvider.deleteUser(user.user_id);
              
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Usuario eliminado correctamente'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Buscar Usuarios'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Buscar por nombre, legajo, email o DNI',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (value) => setState(() {}),
            ),
            SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedRole,
              decoration: InputDecoration(
                labelText: 'Filtrar por rol',
                prefixIcon: Icon(Icons.people),
              ),
              items: [
                DropdownMenuItem(value: 'all', child: Text('Todos los roles')),
                DropdownMenuItem(value: 'admin', child: Text('Administrador')),
                DropdownMenuItem(value: 'supervisor', child: Text('Supervisor')),
                DropdownMenuItem(value: 'employee', child: Text('Empleado')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedRole = value!;
                });
              },
            ),
            SizedBox(height: 16),
            CheckboxListTile(
              title: Text('Solo usuarios activos'),
              value: _showActiveOnly,
              onChanged: (value) {
                setState(() {
                  _showActiveOnly = value!;
                });
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              _searchController.clear();
              setState(() {
                _selectedRole = 'all';
                _showActiveOnly = true;
              });
              Navigator.pop(context);
            },
            child: Text('Limpiar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Aplicar'),
          ),
        ],
      ),
    );
  }

  void _showFilterDialog() {
    _showSearchDialog();
  }
}