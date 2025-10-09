import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../providers/medical_absence_provider.dart';
import '../../models/medical_certificate.dart';
import '../../models/employee_medical_record.dart';
import '../../models/medical_history.dart';
import '../../widgets/common/loading_overlay.dart';
import '../../widgets/common/error_banner.dart';
import 'employee_medical_history_screen.dart';
import 'photo_request_screen.dart';

class MedicalPanelScreen extends StatefulWidget {
  @override
  _MedicalPanelScreenState createState() => _MedicalPanelScreenState();
}

class _MedicalPanelScreenState extends State<MedicalPanelScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  List<MedicalCertificate> _pendingCertificates = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPendingCertificates();
  }

  Future<void> _loadPendingCertificates() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.get('/medical/certificates?status=pending');
      
      if (response.isSuccess) {
        setState(() {
          _pendingCertificates = (response.data as List)
              .map((json) => MedicalCertificate.fromJson(json))
              .toList();
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error cargando certificados';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error inesperado: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<EnhancedAuthProvider>(
      builder: (context, authProvider, child) {
        if (!authProvider.hasPermission('medical')) {
          return Scaffold(
            appBar: AppBar(
              title: Text('Panel Médico'),
              backgroundColor: Colors.blue[700],
            ),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock, size: 64, color: Colors.grey[400]),
                  SizedBox(height: 16),
                  Text(
                    'Acceso Restringido',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[700],
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'No tiene permisos para acceder al panel médico',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text('Panel Médico'),
            backgroundColor: Colors.blue[700],
            foregroundColor: Colors.white,
            bottom: TabBar(
              controller: _tabController,
              indicatorColor: Colors.white,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              tabs: [
                Tab(
                  icon: Icon(Icons.pending_actions),
                  text: 'Pendientes',
                ),
                Tab(
                  icon: Icon(Icons.search),
                  text: 'Buscar Empleado',
                ),
                Tab(
                  icon: Icon(Icons.analytics),
                  text: 'Estadísticas',
                ),
              ],
            ),
          ),
          body: LoadingOverlay(
            isLoading: _isLoading,
            child: Column(
              children: [
                if (_error != null)
                  ErrorBanner(
                    message: _error!,
                    onDismiss: () => setState(() => _error = null),
                    onRetry: _loadPendingCertificates,
                  ),
                
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildPendingTab(),
                      _buildSearchTab(),
                      _buildStatisticsTab(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPendingTab() {
    if (_pendingCertificates.isEmpty && !_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, size: 80, color: Colors.green[400]),
            SizedBox(height: 16),
            Text(
              'No hay solicitudes pendientes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Todas las solicitudes han sido revisadas',
              style: TextStyle(color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPendingCertificates,
      child: ListView.builder(
        padding: EdgeInsets.all(16),
        itemCount: _pendingCertificates.length,
        itemBuilder: (context, index) {
          final certificate = _pendingCertificates[index];
          return Card(
            margin: EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: () => _showCertificateDetails(certificate),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.blue[100],
                          child: Icon(Icons.person, color: Colors.blue[700]),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Empleado #${certificate.userId.substring(0, 8)}',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                'Solicitud: ${DateFormat('dd/MM/yyyy HH:mm').format(certificate.createdAt)}',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.orange[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'PENDIENTE',
                            style: TextStyle(
                              color: Colors.orange[800],
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                        SizedBox(width: 4),
                        Text(
                          'Desde: ${DateFormat('dd/MM/yyyy').format(certificate.startDate)}',
                          style: TextStyle(fontSize: 14),
                        ),
                        SizedBox(width: 16),
                        Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                        SizedBox(width: 4),
                        Text(
                          '${certificate.requestedDays} días',
                          style: TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                    
                    if (certificate.symptoms != null) ...[
                      SizedBox(height: 8),
                      Text(
                        'Síntomas: ${certificate.symptoms}',
                        style: TextStyle(
                          color: Colors.grey[700],
                          fontSize: 13,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    
                    SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton.icon(
                          onPressed: () => _showEmployeeMedicalHistory(certificate.userId),
                          icon: Icon(Icons.history, size: 16),
                          label: Text('Historial'),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.blue[700],
                          ),
                        ),
                        SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: () => _showCertificateDetails(certificate),
                          icon: Icon(Icons.medical_services, size: 16),
                          label: Text('Revisar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue[700],
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSearchTab() {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.search, color: Colors.blue[700]),
                      SizedBox(width: 8),
                      Text(
                        'Buscar Empleado',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  TextField(
                    decoration: InputDecoration(
                      labelText: 'DNI, Legajo o Nombre del empleado',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.search),
                    ),
                    onSubmitted: _searchEmployee,
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.qr_code, color: Colors.blue[700]),
                      SizedBox(width: 8),
                      Text(
                        'Escanear QR del Empleado',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Escanee el código QR del empleado para acceder rápidamente a su ficha médica',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _scanEmployeeQR,
                      icon: Icon(Icons.qr_code_scanner),
                      label: Text('Escanear Código QR'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue[700],
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatisticsTab() {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Pendientes',
                  _pendingCertificates.length.toString(),
                  Icons.pending_actions,
                  Colors.orange,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Este Mes',
                  '0', // TODO: Implementar estadísticas reales
                  Icons.calendar_month,
                  Colors.blue,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Aprobados',
                  '0', // TODO: Implementar estadísticas reales
                  Icons.check_circle,
                  Colors.green,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Rechazados',
                  '0', // TODO: Implementar estadísticas reales
                  Icons.cancel,
                  Colors.red,
                ),
              ),
            ],
          ),
          SizedBox(height: 24),
          
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Diagnósticos Más Frecuentes',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'No hay datos suficientes para mostrar estadísticas',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _searchEmployee(String query) {
    // TODO: Implementar búsqueda de empleados
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Búsqueda: $query'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _scanEmployeeQR() {
    // TODO: Implementar escáner QR
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Función de escaneo QR próximamente'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  void _showEmployeeMedicalHistory(String employeeId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EmployeeMedicalHistoryScreen(employeeId: employeeId),
      ),
    );
  }

  void _showCertificateDetails(MedicalCertificate certificate) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => MedicalCertificateReviewSheet(
        certificate: certificate,
        onUpdated: () {
          _loadPendingCertificates();
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}

class MedicalCertificateReviewSheet extends StatefulWidget {
  final MedicalCertificate certificate;
  final VoidCallback onUpdated;

  MedicalCertificateReviewSheet({
    required this.certificate,
    required this.onUpdated,
  });

  @override
  _MedicalCertificateReviewSheetState createState() => _MedicalCertificateReviewSheetState();
}

class _MedicalCertificateReviewSheetState extends State<MedicalCertificateReviewSheet> {
  final _responseController = TextEditingController();
  final _approvedDaysController = TextEditingController();
  bool _isJustified = true;
  bool _needsAudit = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _approvedDaysController.text = widget.certificate.requestedDays.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.medical_services, color: Colors.blue[700]),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Revisión Médica',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: Icon(Icons.close),
              ),
            ],
          ),
          SizedBox(height: 16),
          
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Información del empleado y solicitud
                  _buildInfoSection(),
                  SizedBox(height: 16),
                  
                  // Opciones de solicitud de fotos
                  _buildPhotoRequestSection(),
                  SizedBox(height: 16),
                  
                  // Revisión médica
                  _buildReviewSection(),
                ],
              ),
            ),
          ),
          
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancelar'),
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitReview,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[700],
                    foregroundColor: Colors.white,
                  ),
                  child: _isLoading 
                    ? SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text('Enviar Respuesta'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información de la Solicitud',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 12),
            _buildInfoRow('Fecha de solicitud', 
              DateFormat('dd/MM/yyyy HH:mm').format(widget.certificate.createdAt)),
            _buildInfoRow('Fecha de inicio', 
              DateFormat('dd/MM/yyyy').format(widget.certificate.startDate)),
            _buildInfoRow('Días solicitados', '${widget.certificate.requestedDays} días'),
            if (widget.certificate.symptoms != null)
              _buildInfoRow('Síntomas', widget.certificate.symptoms!),
            if (widget.certificate.hasVisitedDoctor) ...[
              if (widget.certificate.medicalCenter != null)
                _buildInfoRow('Centro médico', widget.certificate.medicalCenter!),
              if (widget.certificate.attendingPhysician != null)
                _buildInfoRow('Médico tratante', widget.certificate.attendingPhysician!),
              if (widget.certificate.diagnosis != null)
                _buildInfoRow('Diagnóstico', widget.certificate.diagnosis!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoRequestSection() {
    return Card(
      color: Colors.orange[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.camera_alt, color: Colors.orange[700]),
                SizedBox(width: 8),
                Text(
                  'Solicitar Foto Médica',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              '¿Necesita que el empleado envíe fotos de la lesión o área afectada?',
              style: TextStyle(color: Colors.orange[800]),
            ),
            SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _showPhotoRequestDialog(),
                icon: Icon(Icons.add_a_photo),
                label: Text('Solicitar Foto'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange[600],
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Decisión Médica',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: RadioListTile<bool>(
                    title: Text('Justificado'),
                    value: true,
                    groupValue: _isJustified,
                    onChanged: (value) {
                      setState(() {
                        _isJustified = value ?? true;
                      });
                    },
                    activeColor: Colors.green,
                  ),
                ),
                Expanded(
                  child: RadioListTile<bool>(
                    title: Text('No Justificado'),
                    value: false,
                    groupValue: _isJustified,
                    onChanged: (value) {
                      setState(() {
                        _isJustified = value ?? true;
                      });
                    },
                    activeColor: Colors.red,
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 16),
            
            TextFormField(
              controller: _approvedDaysController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Días aprobados',
                border: OutlineInputBorder(),
                hintText: 'Ingrese los días aprobados',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) return 'Campo obligatorio';
                final days = int.tryParse(value);
                if (days == null || days < 0) return 'Debe ser un número válido';
                return null;
              },
            ),
            
            SizedBox(height: 16),
            
            CheckboxListTile(
              title: Text('Requiere auditoría adicional'),
              value: _needsAudit,
              onChanged: (value) {
                setState(() {
                  _needsAudit = value ?? false;
                });
              },
              activeColor: Colors.blue[700],
            ),
            
            SizedBox(height: 16),
            
            TextFormField(
              controller: _responseController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Observaciones médicas *',
                border: OutlineInputBorder(),
                hintText: 'Ingrese sus observaciones y recomendaciones...',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Las observaciones son obligatorias';
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
                fontSize: 12,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  void _showPhotoRequestDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PhotoRequestScreen(
          certificateId: widget.certificate.id,
        ),
      ),
    );
  }

  Future<void> _submitReview() async {
    if (_responseController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Las observaciones son obligatorias'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.post(
        '/medical/certificates/${widget.certificate.id}/respond',
        {
          'isJustified': _isJustified,
          'approvedDays': int.parse(_approvedDaysController.text),
          'needsAudit': _needsAudit,
          'auditorResponse': _responseController.text,
        },
      );

      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Respuesta enviada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        widget.onUpdated();
      } else {
        throw Exception(response.error ?? 'Error enviando respuesta');
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

  @override
  void dispose() {
    _responseController.dispose();
    _approvedDaysController.dispose();
    super.dispose();
  }
}