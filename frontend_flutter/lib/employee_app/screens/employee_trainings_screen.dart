/*
 * 📚 EMPLOYEE TRAININGS SCREEN
 * =============================
 * Pantalla de capacitaciones del empleado
 *
 * Características:
 * - Ver capacitaciones asignadas
 * - Completar capacitaciones desde la app
 * - Ver progreso
 * - Certificados de capacitación
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de capacitación
class Training {
  final String id;
  final String title;
  final String description;
  final String type;
  final String? category;
  final int durationHours;
  final int progressPercentage;
  final String status;
  final DateTime? dueDate;
  final DateTime? completedDate;
  final int? score;
  final String? certificateUrl;
  final List<TrainingModule> modules;

  Training({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.category,
    required this.durationHours,
    required this.progressPercentage,
    required this.status,
    this.dueDate,
    this.completedDate,
    this.score,
    this.certificateUrl,
    this.modules = const [],
  });

  factory Training.fromJson(Map<String, dynamic> json) {
    final modulesList = (json['modules'] as List<dynamic>?)
            ?.map((m) => TrainingModule.fromJson(m))
            .toList() ??
        [];

    return Training(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['titulo'] ?? '',
      description: json['description'] ?? json['descripcion'] ?? '',
      type: json['type'] ?? json['tipo'] ?? 'course',
      category: json['category'] ?? json['categoria'],
      durationHours: json['duration_hours'] ?? json['duracion'] ?? 0,
      progressPercentage: json['progress_percentage'] ?? json['progreso'] ?? 0,
      status: json['status'] ?? 'pending',
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date'].toString())
          : null,
      completedDate: json['completed_date'] != null
          ? DateTime.tryParse(json['completed_date'].toString())
          : null,
      score: json['score'] ?? json['puntaje'],
      certificateUrl: json['certificate_url'],
      modules: modulesList,
    );
  }

  bool get isPending => status == 'pending' || status == 'pendiente';
  bool get isInProgress => status == 'in_progress' || status == 'en_progreso';
  bool get isCompleted => status == 'completed' || status == 'completado';
  bool get isOverdue => dueDate != null && dueDate!.isBefore(DateTime.now()) && !isCompleted;

  Color get statusColor {
    if (isCompleted) return Colors.green;
    if (isOverdue) return Colors.red;
    if (isInProgress) return Colors.cyan;
    return Colors.amber;
  }

  String get statusText {
    if (isCompleted) return 'Completado';
    if (isOverdue) return 'Vencido';
    if (isInProgress) return 'En progreso';
    return 'Pendiente';
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'video':
        return Icons.play_circle;
      case 'document':
      case 'reading':
        return Icons.menu_book;
      case 'quiz':
      case 'exam':
        return Icons.quiz;
      case 'workshop':
        return Icons.groups;
      default:
        return Icons.school;
    }
  }
}

/// 📦 Módulo de capacitación
class TrainingModule {
  final String id;
  final String title;
  final int order;
  final bool completed;
  final String type;

  TrainingModule({
    required this.id,
    required this.title,
    required this.order,
    required this.completed,
    required this.type,
  });

  factory TrainingModule.fromJson(Map<String, dynamic> json) {
    return TrainingModule(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      order: json['order'] ?? 0,
      completed: json['completed'] ?? false,
      type: json['type'] ?? 'lesson',
    );
  }
}

/// 📚 EMPLOYEE TRAININGS SCREEN
class EmployeeTrainingsScreen extends StatefulWidget {
  const EmployeeTrainingsScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeTrainingsScreen> createState() => _EmployeeTrainingsScreenState();
}

class _EmployeeTrainingsScreenState extends State<EmployeeTrainingsScreen>
    with SingleTickerProviderStateMixin {
  final EmployeeApiService _api = EmployeeApiService();

  late TabController _tabController;

  List<Training> _trainings = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadTrainings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTrainings() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.getMyTrainings();

      if (response.isSuccess && response.data != null) {
        final List<dynamic> list = response.data is List ? response.data : [];
        setState(() {
          _trainings = list.map((t) => Training.fromJson(t)).toList();
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error al cargar capacitaciones';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pending = _trainings.where((t) => t.isPending || t.isInProgress || t.isOverdue).toList();
    final completed = _trainings.where((t) => t.isCompleted).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Capacitaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTrainings,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.cyan,
          tabs: [
            Tab(text: 'Pendientes (${pending.length})'),
            Tab(text: 'Completadas (${completed.length})'),
            const Tab(text: 'Todas'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    // Resumen
                    _buildSummary(),

                    // Tabs
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildTrainingsList(pending),
                          _buildTrainingsList(completed),
                          _buildTrainingsList(_trainings),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(_error!, style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _loadTrainings,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummary() {
    final overdue = _trainings.where((t) => t.isOverdue).length;
    final inProgress = _trainings.where((t) => t.isInProgress).length;
    final completed = _trainings.where((t) => t.isCompleted).length;
    final total = _trainings.length;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem('Vencidas', overdue, Colors.red),
              _buildSummaryItem('En curso', inProgress, Colors.cyan),
              _buildSummaryItem('Completadas', completed, Colors.green),
              _buildSummaryItem('Total', total, Colors.white70),
            ],
          ),
          if (total > 0) ...[
            const SizedBox(height: 12),
            // Barra de progreso general
            Row(
              children: [
                const Text(
                  'Progreso general:',
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: LinearProgressIndicator(
                    value: completed / total,
                    backgroundColor: Colors.white12,
                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${(completed / total * 100).toInt()}%',
                  style: const TextStyle(color: Colors.green, fontSize: 12),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            color: color,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white54, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildTrainingsList(List<Training> trainings) {
    if (trainings.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.school, size: 64, color: Colors.grey.shade600),
            const SizedBox(height: 16),
            const Text(
              'No hay capacitaciones',
              style: TextStyle(color: Colors.white70, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadTrainings,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: trainings.length,
        itemBuilder: (context, index) {
          return _buildTrainingCard(trainings[index]);
        },
      ),
    );
  }

  Widget _buildTrainingCard(Training training) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: training.isOverdue
            ? Border.all(color: Colors.red.withOpacity(0.5), width: 2)
            : null,
      ),
      child: InkWell(
        onTap: () => _showTrainingDetail(training),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: training.statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      training.typeIcon,
                      color: training.statusColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          training.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Row(
                          children: [
                            Icon(Icons.timer, size: 12, color: Colors.white54),
                            const SizedBox(width: 4),
                            Text(
                              '${training.durationHours}h',
                              style: const TextStyle(
                                color: Colors.white54,
                                fontSize: 12,
                              ),
                            ),
                            if (training.dueDate != null) ...[
                              const SizedBox(width: 12),
                              Icon(Icons.event, size: 12, color: training.isOverdue ? Colors.red : Colors.white54),
                              const SizedBox(width: 4),
                              Text(
                                _formatDate(training.dueDate!),
                                style: TextStyle(
                                  color: training.isOverdue ? Colors.red : Colors.white54,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: training.statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      training.statusText,
                      style: TextStyle(
                        color: training.statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Barra de progreso
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: training.progressPercentage / 100,
                        backgroundColor: Colors.white12,
                        valueColor: AlwaysStoppedAnimation<Color>(training.statusColor),
                        minHeight: 6,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${training.progressPercentage}%',
                    style: TextStyle(
                      color: training.statusColor,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),

              // Score si está completado
              if (training.isCompleted && training.score != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.star, size: 16, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      'Puntaje: ${training.score}/100',
                      style: const TextStyle(color: Colors.amber, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showTrainingDetail(Training training) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white30,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Header
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: training.statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      training.typeIcon,
                      color: training.statusColor,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          training.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (training.category != null)
                          Text(
                            training.category!,
                            style: const TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Progreso
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: training.statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            training.statusText,
                            style: TextStyle(
                              color: training.statusColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: training.progressPercentage / 100,
                              backgroundColor: Colors.white12,
                              valueColor: AlwaysStoppedAnimation<Color>(training.statusColor),
                              minHeight: 8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      '${training.progressPercentage}%',
                      style: TextStyle(
                        color: training.statusColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Descripción
              const Text(
                'DESCRIPCIÓN',
                style: TextStyle(
                  color: Colors.cyan,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                training.description,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 16),

              // Detalles
              _buildDetailRow('Duración', '${training.durationHours} horas'),
              if (training.dueDate != null)
                _buildDetailRow('Fecha límite', _formatDate(training.dueDate!)),
              if (training.completedDate != null)
                _buildDetailRow('Completado', _formatDate(training.completedDate!)),
              if (training.score != null)
                _buildDetailRow('Puntaje', '${training.score}/100'),

              // Módulos
              if (training.modules.isNotEmpty) ...[
                const SizedBox(height: 24),
                const Text(
                  'MÓDULOS',
                  style: TextStyle(
                    color: Colors.cyan,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 8),
                ...training.modules.map((m) => _buildModuleItem(m)),
              ],

              const SizedBox(height: 24),

              // Acciones
              if (!training.isCompleted)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _startTraining(training),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.cyan,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: Icon(training.isInProgress ? Icons.play_arrow : Icons.play_circle),
                    label: Text(training.isInProgress ? 'Continuar' : 'Comenzar'),
                  ),
                ),

              if (training.isCompleted && training.certificateUrl != null)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _downloadCertificate(training),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.green,
                      side: const BorderSide(color: Colors.green),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    icon: const Icon(Icons.download),
                    label: const Text('Descargar Certificado'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleItem(TrainingModule module) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            module.completed ? Icons.check_circle : Icons.radio_button_unchecked,
            color: module.completed ? Colors.green : Colors.white38,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              '${module.order}. ${module.title}',
              style: TextStyle(
                color: module.completed ? Colors.white54 : Colors.white,
                decoration: module.completed ? TextDecoration.lineThrough : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startTraining(Training training) async {
    Navigator.pop(context);
    // TODO: Abrir vista de capacitación
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Abriendo "${training.title}"...'),
        backgroundColor: Colors.cyan,
      ),
    );
  }

  void _downloadCertificate(Training training) {
    // TODO: Implementar descarga
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Descargando certificado...')),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
