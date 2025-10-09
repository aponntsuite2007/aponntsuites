import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';

// Providers
import '../../providers/enhanced_auth_provider.dart';
import '../../providers/medical_documents_provider.dart';

// Models
import '../../models/medical_document_model.dart';
import '../../models/document_request_model.dart';

// Services
import '../../services/api_service.dart';

class MedicalDocumentsScreen extends StatefulWidget {
  @override
  _MedicalDocumentsScreenState createState() => _MedicalDocumentsScreenState();
}

class _MedicalDocumentsScreenState extends State<MedicalDocumentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;

  final Map<String, String> documentTypeNames = {
    'certificates': 'Certificados Médicos',
    'recipes': 'Recetas Médicas',
    'studies': 'Estudios Médicos',
    'photos': 'Fotos Médicas'
  };

  final Map<String, IconData> documentTypeIcons = {
    'certificates': Icons.medical_services,
    'recipes': Icons.medication,
    'studies': Icons.science,
    'photos': Icons.camera_alt
  };

  final Map<String, Color> documentTypeColors = {
    'certificates': Colors.green,
    'recipes': Colors.blue,
    'studies': Colors.orange,
    'photos': Colors.purple
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);
    try {
      final provider = Provider.of<MedicalDocumentsProvider>(context, listen: false);
      await provider.loadDocuments();
      await provider.loadPendingRequests();
    } catch (e) {
      _showMessage('Error al cargar documentos: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Documentos Médicos'),
        backgroundColor: Colors.red[700],
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: documentTypeNames.entries
              .map((entry) => Tab(
                    icon: Icon(documentTypeIcons[entry.key]),
                    text: entry.value,
                  ))
              .toList(),
        ),
      ),
      body: Consumer<MedicalDocumentsProvider>(
        builder: (context, provider, child) {
          if (_isLoading) {
            return Center(child: CircularProgressIndicator());
          }

          return TabBarView(
            controller: _tabController,
            children: documentTypeNames.keys
                .map((type) => _buildDocumentTypeTab(type, provider))
                .toList(),
          );
        },
      ),
    );
  }

  Widget _buildDocumentTypeTab(String documentType, MedicalDocumentsProvider provider) {
    final documents = provider.getDocumentsByType(documentType);
    final requests = provider.getPendingRequestsByType(documentType);

    return RefreshIndicator(
      onRefresh: _loadDocuments,
      child: SingleChildScrollView(
        physics: AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Alertas de solicitudes pendientes
            if (requests.isNotEmpty) ...[
              _buildPendingRequestsSection(requests, documentType),
              SizedBox(height: 20),
            ],

            // Botón para subir nuevo documento
            _buildUploadButton(documentType),
            SizedBox(height: 20),

            // Lista de documentos existentes
            _buildDocumentsSection(documents, documentType),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingRequestsSection(List<DocumentRequest> requests, String documentType) {
    return Card(
      color: Colors.red[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.red, size: 24),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '¡Solicitudes Pendientes!',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red[700],
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.notifications_active, color: Colors.red),
                  onPressed: () => _showRequestDetails(requests),
                ),
              ],
            ),
            SizedBox(height: 12),
            ...requests.map((request) => _buildRequestItem(request)).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildRequestItem(DocumentRequest request) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.left(width: 4, color: Colors.red),
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
              SizedBox(width: 4),
              Text(
                'Solicitado: ${_formatDate(request.requestDate)}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              Spacer(),
              Text(
                'Vence: ${_formatDate(request.dueDate)}',
                style: TextStyle(
                  fontSize: 12,
                  color: request.isOverdue ? Colors.red : Colors.orange,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          SizedBox(height: 4),
          Text(
            request.description ?? 'Solicitud de ${documentTypeNames[request.documentType]}',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          if (request.notes != null) ...[
            SizedBox(height: 4),
            Text(
              'Notas: ${request.notes}',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildUploadButton(String documentType) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => _uploadDocument(documentType),
        icon: Icon(Icons.upload_file),
        label: Text('Subir ${documentTypeNames[documentType]}'),
        style: ElevatedButton.styleFrom(
          backgroundColor: documentTypeColors[documentType],
          foregroundColor: Colors.white,
          padding: EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentsSection(List<MedicalDocument> documents, String documentType) {
    if (documents.isEmpty) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(
                documentTypeIcons[documentType],
                size: 64,
                color: Colors.grey[400],
              ),
              SizedBox(height: 16),
              Text(
                'No hay ${documentTypeNames[documentType]?.toLowerCase()} subidos',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 8),
              Text(
                'Usa el botón "Subir" para agregar tus documentos',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[500],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Documentos Subidos (${documents.length})',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.grey[700],
          ),
        ),
        SizedBox(height: 12),
        ...documents.map((doc) => _buildDocumentItem(doc)).toList(),
      ],
    );
  }

  Widget _buildDocumentItem(MedicalDocument document) {
    return Card(
      margin: EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: documentTypeColors[document.documentType],
          child: Icon(
            documentTypeIcons[document.documentType],
            color: Colors.white,
          ),
        ),
        title: Text(
          document.fileName,
          style: TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Subido: ${_formatDate(document.uploadDate)}'),
            Row(
              children: [
                _buildStatusChip(document.status),
                SizedBox(width: 8),
                if (document.fileSize != null)
                  Text(
                    _formatFileSize(document.fileSize!),
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton(
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'view',
              child: ListTile(
                leading: Icon(Icons.visibility),
                title: Text('Ver'),
                dense: true,
              ),
            ),
            PopupMenuItem(
              value: 'download',
              child: ListTile(
                leading: Icon(Icons.download),
                title: Text('Descargar'),
                dense: true,
              ),
            ),
            if (document.status == 'pending')
              PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  leading: Icon(Icons.delete, color: Colors.red),
                  title: Text('Eliminar', style: TextStyle(color: Colors.red)),
                  dense: true,
                ),
              ),
          ],
          onSelected: (value) => _handleDocumentAction(document, value.toString()),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    String text;
    IconData icon;

    switch (status) {
      case 'approved':
        color = Colors.green;
        text = 'Aprobado';
        icon = Icons.check_circle;
        break;
      case 'rejected':
        color = Colors.red;
        text = 'Rechazado';
        icon = Icons.cancel;
        break;
      case 'pending':
        color = Colors.orange;
        text = 'Pendiente';
        icon = Icons.schedule;
        break;
      default:
        color = Colors.grey;
        text = 'Desconocido';
        icon = Icons.help;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        border: Border.all(color: color, width: 1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _uploadDocument(String documentType) async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
        allowMultiple: false,
      );

      if (result != null) {
        PlatformFile file = result.files.first;
        
        // Mostrar diálogo de confirmación con detalles del archivo
        bool? shouldUpload = await _showUploadConfirmation(file, documentType);
        
        if (shouldUpload == true) {
          setState(() => _isLoading = true);
          
          final provider = Provider.of<MedicalDocumentsProvider>(context, listen: false);
          await provider.uploadDocument(file, documentType);
          
          _showMessage('Documento subido exitosamente');
          await _loadDocuments();
        }
      }
    } catch (e) {
      _showMessage('Error al subir documento: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<bool?> _showUploadConfirmation(PlatformFile file, String documentType) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Confirmar Subida'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Subir este documento como ${documentTypeNames[documentType]}?'),
            SizedBox(height: 12),
            Text('Archivo: ${file.name}', style: TextStyle(fontWeight: FontWeight.w500)),
            Text('Tamaño: ${_formatFileSize(file.size)}'),
            if (file.extension != null)
              Text('Tipo: ${file.extension?.toUpperCase()}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: documentTypeColors[documentType],
            ),
            child: Text('Subir'),
          ),
        ],
      ),
    );
  }

  void _handleDocumentAction(MedicalDocument document, String action) {
    switch (action) {
      case 'view':
        _viewDocument(document);
        break;
      case 'download':
        _downloadDocument(document);
        break;
      case 'delete':
        _deleteDocument(document);
        break;
    }
  }

  void _viewDocument(MedicalDocument document) {
    // Implementar visualización del documento
    _showMessage('Función de visualización en desarrollo');
  }

  void _downloadDocument(MedicalDocument document) {
    // Implementar descarga del documento
    _showMessage('Función de descarga en desarrollo');
  }

  void _deleteDocument(MedicalDocument document) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Eliminar Documento'),
        content: Text('¿Estás seguro de que quieres eliminar "${document.fileName}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              try {
                final provider = Provider.of<MedicalDocumentsProvider>(context, listen: false);
                await provider.deleteDocument(document.id);
                _showMessage('Documento eliminado');
                await _loadDocuments();
              } catch (e) {
                _showMessage('Error al eliminar: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  void _showRequestDetails(List<DocumentRequest> requests) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Solicitudes Pendientes'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: requests
                .map((request) => _buildRequestItem(request))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}