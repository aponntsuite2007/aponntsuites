import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../models/medical_photo.dart';
import '../../widgets/common/loading_overlay.dart';
import 'photo_upload_screen.dart';

class MedicalPhotoRequestsScreen extends StatefulWidget {
  @override
  _MedicalPhotoRequestsScreenState createState() => _MedicalPhotoRequestsScreenState();
}

class _MedicalPhotoRequestsScreenState extends State<MedicalPhotoRequestsScreen> {
  List<MedicalPhoto> _photoRequests = [];
  bool _isLoading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadPhotoRequests();
  }

  Future<void> _loadPhotoRequests() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.get('/medical/photos/employee');
      
      if (response.isSuccess) {
        setState(() {
          _photoRequests = (response.data as List)
              .map((json) => MedicalPhoto.fromJson(json))
              .toList();
        });
      } else {
        throw Exception(response.error ?? 'Error cargando solicitudes');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<MedicalPhoto> get _filteredRequests {
    switch (_filter) {
      case 'pending':
        return _photoRequests.where((req) => req.isPending).toList();
      case 'uploaded':
        return _photoRequests.where((req) => req.isUploaded).toList();
      case 'reviewed':
        return _photoRequests.where((req) => req.isReviewed).toList();
      default:
        return _photoRequests;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Solicitudes de Fotos Médicas'),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadPhotoRequests,
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Column(
          children: [
            _buildFilterChips(),
            Expanded(
              child: _filteredRequests.isEmpty
                  ? _buildEmptyState()
                  : _buildPhotoRequestsList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: EdgeInsets.all(16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterChip('all', 'Todas', Icons.list),
            SizedBox(width: 8),
            _buildFilterChip('pending', 'Pendientes', Icons.pending_actions),
            SizedBox(width: 8),
            _buildFilterChip('uploaded', 'Subidas', Icons.cloud_upload),
            SizedBox(width: 8),
            _buildFilterChip('reviewed', 'Revisadas', Icons.check_circle),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, IconData icon) {
    final isSelected = _filter == value;
    return FilterChip(
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _filter = value;
        });
      },
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: isSelected ? Colors.white : Colors.grey[700],
          ),
          SizedBox(width: 4),
          Text(label),
        ],
      ),
      selectedColor: Colors.blue[600],
      checkmarkColor: Colors.white,
    );
  }

  Widget _buildEmptyState() {
    String message;
    IconData icon;

    switch (_filter) {
      case 'pending':
        message = 'No tienes solicitudes pendientes';
        icon = Icons.pending_actions;
        break;
      case 'uploaded':
        message = 'No has subido fotos aún';
        icon = Icons.cloud_upload;
        break;
      case 'reviewed':
        message = 'No tienes fotos revisadas';
        icon = Icons.check_circle;
        break;
      default:
        message = 'No tienes solicitudes de fotos médicas';
        icon = Icons.photo_camera;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 64,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoRequestsList() {
    return RefreshIndicator(
      onRefresh: _loadPhotoRequests,
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: _filteredRequests.length,
        itemBuilder: (context, index) {
          final request = _filteredRequests[index];
          return _buildPhotoRequestCard(request);
        },
      ),
    );
  }

  Widget _buildPhotoRequestCard(MedicalPhoto request) {
    return Card(
      margin: EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: InkWell(
        onTap: () => _handleRequestTap(request),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          request.photoTypeText,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          request.bodyPart,
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                        if (request.bodyPartDetail != null) ...[
                          SizedBox(height: 2),
                          Text(
                            request.bodyPartDetail!,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  _buildStatusChip(request),
                ],
              ),
              SizedBox(height: 12),
              
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Motivo:',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      request.requestReason,
                      style: TextStyle(fontSize: 14),
                    ),
                    if (request.requestInstructions != null) ...[
                      SizedBox(height: 8),
                      Text(
                        'Instrucciones:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        request.requestInstructions!,
                        style: TextStyle(
                          fontSize: 14,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              SizedBox(height: 12),
              
              Row(
                children: [
                  Icon(Icons.schedule, size: 16, color: Colors.grey[600]),
                  SizedBox(width: 4),
                  Text(
                    'Solicitado: ${_formatDate(request.requestDate)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                  if (request.isRequired) ...[
                    SizedBox(width: 16),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red[100],
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'OBLIGATORIA',
                        style: TextStyle(
                          color: Colors.red[700],
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              
              if (request.isUploaded && request.photoDate != null) ...[
                SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.cloud_upload, size: 16, color: Colors.green[600]),
                    SizedBox(width: 4),
                    Text(
                      'Subida: ${_formatDate(request.photoDate!)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.green[600],
                      ),
                    ),
                  ],
                ),
              ],

              if (request.isReviewed) ...[
                SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.medical_services, size: 16, color: Colors.blue[700]),
                          SizedBox(width: 4),
                          Text(
                            'Revisión Médica',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.blue[700],
                            ),
                          ),
                        ],
                      ),
                      if (request.medicalReview != null) ...[
                        SizedBox(height: 8),
                        Text(
                          request.medicalReview!,
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                      if (request.reviewedAt != null) ...[
                        SizedBox(height: 4),
                        Text(
                          'Revisado: ${_formatDate(request.reviewedAt!)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(MedicalPhoto request) {
    Color color;
    IconData icon;

    if (request.isRequested) {
      color = Colors.orange;
      icon = Icons.photo_camera;
    } else if (request.isUploaded) {
      color = Colors.blue;
      icon = Icons.cloud_upload;
    } else if (request.isReviewed) {
      color = Colors.green;
      icon = Icons.check_circle;
    } else if (request.isRejected) {
      color = Colors.red;
      icon = Icons.cancel;
    } else {
      color = Colors.grey;
      icon = Icons.help;
    }

    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color[700]),
          SizedBox(width: 4),
          Text(
            request.statusText,
            style: TextStyle(
              color: color[700],
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  void _handleRequestTap(MedicalPhoto request) {
    if (request.isRequested) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PhotoUploadScreen(photoRequest: request),
        ),
      ).then((result) {
        if (result == true) {
          _loadPhotoRequests();
        }
      });
    } else {
      _showPhotoRequestDetails(request);
    }
  }

  void _showPhotoRequestDetails(MedicalPhoto request) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Detalles de la Solicitud'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('Tipo:', request.photoTypeText),
              _buildDetailRow('Parte del cuerpo:', request.bodyPart),
              if (request.bodyPartDetail != null)
                _buildDetailRow('Detalle:', request.bodyPartDetail!),
              _buildDetailRow('Estado:', request.statusText),
              _buildDetailRow('Solicitado:', _formatDate(request.requestDate)),
              if (request.photoDate != null)
                _buildDetailRow('Subida:', _formatDate(request.photoDate!)),
              if (request.reviewedAt != null)
                _buildDetailRow('Revisada:', _formatDate(request.reviewedAt!)),
              SizedBox(height: 12),
              Text(
                'Motivo:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 4),
              Text(request.requestReason),
              if (request.requestInstructions != null) ...[
                SizedBox(height: 12),
                Text(
                  'Instrucciones:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(request.requestInstructions!),
              ],
              if (request.employeeNotes != null) ...[
                SizedBox(height: 12),
                Text(
                  'Tus notas:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(request.employeeNotes!),
              ],
              if (request.medicalReview != null) ...[
                SizedBox(height: 12),
                Text(
                  'Revisión médica:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 4),
                Text(request.medicalReview!),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}