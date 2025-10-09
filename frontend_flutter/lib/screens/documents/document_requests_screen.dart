import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import '../../providers/enhanced_auth_provider.dart';
import '../../services/api_service.dart';

class DocumentRequestsScreen extends StatefulWidget {
  @override
  _DocumentRequestsScreenState createState() => _DocumentRequestsScreenState();
}

class _DocumentRequestsScreenState extends State<DocumentRequestsScreen> {
  List<Map<String, dynamic>> _documentRequests = [];
  List<Map<String, dynamic>> _myDocuments = [];
  bool _isLoading = true;
  int _selectedTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    
    try {
      await Future.wait([
        _loadDocumentRequests(),
        _loadMyDocuments(),
      ]);
    } catch (e) {
      print('Error loading data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadDocumentRequests() async {
    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.getDocumentRequests();
      
      if (response['success']) {
        setState(() {
          _documentRequests = List<Map<String, dynamic>>.from(response['data']);
        });
      }
    } catch (e) {
      print('Error loading document requests: $e');
    }
  }

  Future<void> _loadMyDocuments() async {
    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.getMyDocuments();
      
      if (response['success']) {
        setState(() {
          _myDocuments = List<Map<String, dynamic>>.from(response['data']);
        });
      }
    } catch (e) {
      print('Error loading my documents: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      initialIndex: _selectedTabIndex,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Documentos Médicos'),
          backgroundColor: Colors.red[700],
          foregroundColor: Colors.white,
          bottom: const TabBar(
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(
                icon: Icon(Icons.assignment),
                text: 'Solicitudes',
              ),
              Tab(
                icon: Icon(Icons.folder),
                text: 'Mis Documentos',
              ),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildRequestsTab(),
            _buildMyDocumentsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestsTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_documentRequests.isEmpty) {
      return _buildEmptyState(
        icon: Icons.assignment,
        title: 'No hay solicitudes de documentos',
        subtitle: 'Las solicitudes de documentos médicos aparecerán aquí',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadDocumentRequests,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _documentRequests.length,
        itemBuilder: (context, index) {
          final request = _documentRequests[index];
          return _buildRequestCard(request);
        },
      ),
    );
  }

  Widget _buildMyDocumentsTab() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadMyDocuments,
      child: Column(
        children: [
          // Upload button
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: ElevatedButton.icon(
              onPressed: _showUploadDialog,
              icon: const Icon(Icons.cloud_upload),
              label: const Text('Subir Nuevo Documento'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[700],
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ),
          
          // Documents list
          Expanded(
            child: _myDocuments.isEmpty
                ? _buildEmptyState(
                    icon: Icons.folder,
                    title: 'No tienes documentos subidos',
                    subtitle: 'Sube tus documentos médicos para mantenerlos organizados',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _myDocuments.length,
                    itemBuilder: (context, index) {
                      final document = _myDocuments[index];
                      return _buildDocumentCard(document);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> request) {
    final status = request['status'] ?? 'pending';
    final type = request['type'] ?? '';
    final description = request['description'] ?? 'Sin descripción';
    final deadline = request['deadline'] != null 
        ? DateTime.parse(request['deadline']) 
        : null;
    final isUrgent = deadline != null && 
        deadline.difference(DateTime.now()).inDays <= 3;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with type and status
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getTypeColor(type).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    _getTypeLabel(type),
                    style: TextStyle(
                      color: _getTypeColor(type),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
                const Spacer(),
                _buildStatusChip(status, isUrgent),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Description
            Text(
              description,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            
            const SizedBox(height: 8),
            
            // Deadline
            if (deadline != null) ...[
              Row(
                children: [
                  Icon(
                    Icons.schedule, 
                    size: 16, 
                    color: isUrgent ? Colors.red : Colors.grey[600],
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Vence: ${_formatDate(deadline)}',
                    style: TextStyle(
                      color: isUrgent ? Colors.red : Colors.grey[600],
                      fontWeight: isUrgent ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            
            // Actions
            if (status == 'pending') ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _uploadDocumentForRequest(request),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Tomar Foto'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _uploadDocumentForRequest(request, fromFile: true),
                      icon: const Icon(Icons.attach_file),
                      label: const Text('Subir Archivo'),
                    ),
                  ),
                ],
              ),
            ] else if (status == 'completed') ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green[700], size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Documento entregado correctamente',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentCard(Map<String, dynamic> document) {
    final type = document['type'] ?? '';
    final filename = document['filename'] ?? 'Documento';
    final uploadDate = document['uploadedAt'] != null
        ? DateTime.parse(document['uploadedAt'])
        : DateTime.now();
    final status = document['status'] ?? 'uploaded';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getTypeColor(type).withOpacity(0.1),
          child: Icon(
            _getDocumentIcon(filename),
            color: _getTypeColor(type),
          ),
        ),
        title: Text(filename),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_getTypeLabel(type)),
            Text(
              'Subido: ${_formatDate(uploadDate)}',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
        trailing: PopupMenuButton(
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'view',
              child: Row(
                children: [
                  Icon(Icons.visibility),
                  SizedBox(width: 8),
                  Text('Ver'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'share',
              child: Row(
                children: [
                  Icon(Icons.share),
                  SizedBox(width: 8),
                  Text('Compartir'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Eliminar', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
          onSelected: (value) => _handleDocumentAction(value.toString(), document),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status, bool isUrgent) {
    Color color;
    String label;
    IconData icon;

    switch (status) {
      case 'completed':
        color = Colors.green;
        label = 'Completado';
        icon = Icons.check_circle;
        break;
      case 'expired':
        color = Colors.red;
        label = 'Vencido';
        icon = Icons.error;
        break;
      default:
        color = isUrgent ? Colors.red : Colors.orange;
        label = isUrgent ? 'Urgente' : 'Pendiente';
        icon = isUrgent ? Icons.priority_high : Icons.schedule;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  void _showUploadDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Subir Documento'),
        content: const Text('¿Cómo deseas subir el documento?'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _uploadDocument(fromCamera: true);
            },
            child: const Text('Tomar Foto'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _uploadDocument(fromFile: true);
            },
            child: const Text('Seleccionar Archivo'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadDocument({
    bool fromCamera = false,
    bool fromFile = false,
  }) async {
    File? file;

    try {
      if (fromCamera) {
        final picker = ImagePicker();
        final image = await picker.pickImage(source: ImageSource.camera);
        if (image != null) {
          file = File(image.path);
        }
      } else if (fromFile) {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        );
        if (result != null && result.files.single.path != null) {
          file = File(result.files.single.path!);
        }
      }

      if (file == null) return;

      // Show upload dialog
      _showUploadProgressDialog();

      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.uploadDocument(
        file: file,
        type: 'general',
        category: 'medical',
      );

      Navigator.of(context).pop(); // Close progress dialog

      if (response['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documento subido correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        _loadMyDocuments();
      } else {
        throw Exception(response['message'] ?? 'Error subiendo documento');
      }
    } catch (e) {
      Navigator.of(context).pop(); // Close progress dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _uploadDocumentForRequest(
    Map<String, dynamic> request, {
    bool fromFile = false,
  }) async {
    File? file;

    try {
      if (fromFile) {
        final result = await FilePicker.platform.pickFiles(
          type: FileType.custom,
          allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        );
        if (result != null && result.files.single.path != null) {
          file = File(result.files.single.path!);
        }
      } else {
        final picker = ImagePicker();
        final image = await picker.pickImage(source: ImageSource.camera);
        if (image != null) {
          file = File(image.path);
        }
      }

      if (file == null) return;

      _showUploadProgressDialog();

      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.uploadDocumentForRequest(
        file: file,
        requestId: request['id'],
        type: request['type'],
      );

      Navigator.of(context).pop();

      if (response['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documento enviado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        _loadData();
      } else {
        throw Exception(response['message'] ?? 'Error enviando documento');
      }
    } catch (e) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showUploadProgressDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Subiendo documento...'),
          ],
        ),
      ),
    );
  }

  void _handleDocumentAction(String action, Map<String, dynamic> document) {
    switch (action) {
      case 'view':
        // TODO: Implement document viewer
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Visualización de documentos próximamente')),
        );
        break;
      case 'share':
        // TODO: Implement document sharing
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Compartir documento próximamente')),
        );
        break;
      case 'delete':
        _confirmDeleteDocument(document);
        break;
    }
  }

  void _confirmDeleteDocument(Map<String, dynamic> document) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Documento'),
        content: Text('¿Estás seguro de que quieres eliminar "${document['filename']}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteDocument(document);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteDocument(Map<String, dynamic> document) async {
    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.deleteDocument(document['id']);

      if (response['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documento eliminado'),
            backgroundColor: Colors.green,
          ),
        );
        _loadMyDocuments();
      } else {
        throw Exception(response['message'] ?? 'Error eliminando documento');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'certificates':
        return Colors.blue;
      case 'medical_reports':
        return Colors.green;
      case 'lab_results':
        return Colors.purple;
      case 'prescriptions':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getTypeLabel(String type) {
    switch (type.toLowerCase()) {
      case 'certificates':
        return 'Certificados';
      case 'medical_reports':
        return 'Informes Médicos';
      case 'lab_results':
        return 'Resultados de Laboratorio';
      case 'prescriptions':
        return 'Recetas';
      default:
        return 'Documento';
    }
  }

  IconData _getDocumentIcon(String filename) {
    final extension = filename.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return Icons.image;
      case 'doc':
      case 'docx':
        return Icons.description;
      default:
        return Icons.attach_file;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}