/*
 * ✅ EMPLOYEE TASKS SCREEN
 * =========================
 * Pantalla de tareas asignadas del empleado
 *
 * Características:
 * - Ver tareas asignadas
 * - Actualizar progreso
 * - Marcar como completadas
 * - Filtrar por estado
 *
 * Fecha: 2025-11-30
 * Versión: 1.0.0
 */

import 'package:flutter/material.dart';
import '../services/employee_api_service.dart';

/// 📦 Modelo de tarea
class EmployeeTask {
  final String id;
  final String title;
  final String description;
  final String priority;
  final String status;
  final int progress;
  final DateTime? dueDate;
  final DateTime? createdAt;
  final String? assignedBy;

  EmployeeTask({
    required this.id,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.progress,
    this.dueDate,
    this.createdAt,
    this.assignedBy,
  });

  factory EmployeeTask.fromJson(Map<String, dynamic> json) {
    return EmployeeTask(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? json['titulo'] ?? '',
      description: json['description'] ?? json['descripcion'] ?? '',
      priority: json['priority'] ?? json['prioridad'] ?? 'normal',
      status: json['status'] ?? 'pending',
      progress: json['progress'] ?? json['progreso'] ?? 0,
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      assignedBy: json['assigned_by'] ?? json['asignado_por'],
    );
  }

  bool get isPending => status == 'pending' || status == 'pendiente';
  bool get isInProgress => status == 'in_progress' || status == 'en_progreso';
  bool get isCompleted => status == 'completed' || status == 'completada';
  bool get isOverdue => dueDate != null && dueDate!.isBefore(DateTime.now()) && !isCompleted;

  Color get statusColor {
    if (isCompleted) return Colors.green;
    if (isOverdue) return Colors.red;
    if (isInProgress) return Colors.cyan;
    return Colors.amber;
  }

  Color get priorityColor {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'alta':
        return Colors.red;
      case 'medium':
      case 'media':
        return Colors.orange;
      case 'low':
      case 'baja':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String get priorityLabel {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'alta':
        return 'Alta';
      case 'medium':
      case 'media':
        return 'Media';
      case 'low':
      case 'baja':
        return 'Baja';
      default:
        return 'Normal';
    }
  }
}

/// ✅ EMPLOYEE TASKS SCREEN
class EmployeeTasksScreen extends StatefulWidget {
  const EmployeeTasksScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeTasksScreen> createState() => _EmployeeTasksScreenState();
}

class _EmployeeTasksScreenState extends State<EmployeeTasksScreen> {
  final EmployeeApiService _api = EmployeeApiService();

  List<EmployeeTask> _tasks = [];
  bool _isLoading = true;
  String? _error;

  String _filterStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _api.getMyTasks();

      if (response.isSuccess && response.data != null) {
        final List<dynamic> list = response.data is List ? response.data : [];
        setState(() {
          _tasks = list.map((t) => EmployeeTask.fromJson(t)).toList();
          _tasks.sort((a, b) {
            // Ordenar: overdue primero, luego pending, luego in_progress, luego completed
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            if (a.dueDate != null && b.dueDate != null) {
              return a.dueDate!.compareTo(b.dueDate!);
            }
            return 0;
          });
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = response.error ?? 'Error al cargar tareas';
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

  List<EmployeeTask> get _filteredTasks {
    if (_filterStatus == 'all') return _tasks;
    if (_filterStatus == 'pending') return _tasks.where((t) => t.isPending).toList();
    if (_filterStatus == 'in_progress') return _tasks.where((t) => t.isInProgress).toList();
    if (_filterStatus == 'completed') return _tasks.where((t) => t.isCompleted).toList();
    if (_filterStatus == 'overdue') return _tasks.where((t) => t.isOverdue).toList();
    return _tasks;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1B2A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1B263B),
        elevation: 0,
        title: const Text('Mis Tareas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyan))
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    // Filtros
                    _buildFilters(),

                    // Lista
                    Expanded(
                      child: _filteredTasks.isEmpty
                          ? _buildEmptyState()
                          : RefreshIndicator(
                              onRefresh: _loadTasks,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredTasks.length,
                                itemBuilder: (context, index) {
                                  return _buildTaskCard(_filteredTasks[index]);
                                },
                              ),
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
            onPressed: _loadTasks,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    final overdue = _tasks.where((t) => t.isOverdue).length;

    return Container(
      padding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterChip('Todas', 'all', _tasks.length, null),
            const SizedBox(width: 8),
            if (overdue > 0) ...[
              _buildFilterChip('Vencidas', 'overdue', overdue, Colors.red),
              const SizedBox(width: 8),
            ],
            _buildFilterChip('Pendientes', 'pending',
                _tasks.where((t) => t.isPending).length, Colors.amber),
            const SizedBox(width: 8),
            _buildFilterChip('En progreso', 'in_progress',
                _tasks.where((t) => t.isInProgress).length, Colors.cyan),
            const SizedBox(width: 8),
            _buildFilterChip('Completadas', 'completed',
                _tasks.where((t) => t.isCompleted).length, Colors.green),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, int count, Color? color) {
    final isSelected = _filterStatus == value;

    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (color != null) ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text('$label ($count)'),
        ],
      ),
      selected: isSelected,
      selectedColor: Colors.cyan.withOpacity(0.3),
      backgroundColor: const Color(0xFF1B263B),
      labelStyle: TextStyle(
        color: isSelected ? Colors.cyan : Colors.white70,
      ),
      onSelected: (_) {
        setState(() => _filterStatus = value);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.task_alt, size: 64, color: Colors.grey.shade600),
          const SizedBox(height: 16),
          const Text(
            'No hay tareas',
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            _filterStatus == 'all'
                ? 'No tiene tareas asignadas'
                : 'No hay tareas con este estado',
            style: const TextStyle(color: Colors.white54, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(EmployeeTask task) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1B263B),
        borderRadius: BorderRadius.circular(12),
        border: task.isOverdue
            ? Border.all(color: Colors.red.withOpacity(0.5), width: 2)
            : null,
      ),
      child: InkWell(
        onTap: () => _showTaskDetail(task),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Checkbox
                  Checkbox(
                    value: task.isCompleted,
                    onChanged: task.isCompleted ? null : (value) => _toggleComplete(task),
                    activeColor: Colors.green,
                    side: BorderSide(color: task.statusColor),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                            decoration: task.isCompleted ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            // Prioridad
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: task.priorityColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                task.priorityLabel,
                                style: TextStyle(
                                  color: task.priorityColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (task.dueDate != null) ...[
                              const SizedBox(width: 8),
                              Icon(
                                Icons.event,
                                size: 12,
                                color: task.isOverdue ? Colors.red : Colors.white54,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _formatDate(task.dueDate!),
                                style: TextStyle(
                                  color: task.isOverdue ? Colors.red : Colors.white54,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Estado
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: task.statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      task.isOverdue
                          ? 'Vencida'
                          : task.isCompleted
                              ? 'Completada'
                              : task.isInProgress
                                  ? 'En progreso'
                                  : 'Pendiente',
                      style: TextStyle(
                        color: task.statusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              // Progreso
              if (!task.isCompleted) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: task.progress / 100,
                          backgroundColor: Colors.white12,
                          valueColor: AlwaysStoppedAnimation<Color>(task.statusColor),
                          minHeight: 6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${task.progress}%',
                      style: TextStyle(
                        color: task.statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
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

  void _showTaskDetail(EmployeeTask task) {
    final progressController = TextEditingController(text: task.progress.toString());

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1B263B),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: task.statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      task.isCompleted
                          ? Icons.check_circle
                          : task.isInProgress
                              ? Icons.pending
                              : Icons.assignment,
                      color: task.statusColor,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              margin: const EdgeInsets.only(top: 4, right: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: task.priorityColor.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                task.priorityLabel,
                                style: TextStyle(
                                  color: task.priorityColor,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Descripción
              if (task.description.isNotEmpty) ...[
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
                  task.description,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 16),
              ],

              // Detalles
              if (task.dueDate != null) _buildDetailRow('Fecha límite', _formatDate(task.dueDate!)),
              if (task.assignedBy != null) _buildDetailRow('Asignada por', task.assignedBy!),

              // Actualizar progreso
              if (!task.isCompleted) ...[
                const SizedBox(height: 24),
                const Text(
                  'ACTUALIZAR PROGRESO',
                  style: TextStyle(
                    color: Colors.cyan,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Slider(
                        value: double.parse(progressController.text),
                        min: 0,
                        max: 100,
                        divisions: 20,
                        label: '${progressController.text}%',
                        activeColor: Colors.cyan,
                        onChanged: (value) {
                          setSheetState(() {
                            progressController.text = value.toInt().toString();
                          });
                        },
                      ),
                    ),
                    SizedBox(
                      width: 60,
                      child: Text(
                        '${progressController.text}%',
                        style: const TextStyle(
                          color: Colors.cyan,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Botones
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _updateProgress(
                          task,
                          int.parse(progressController.text),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.cyan,
                          side: const BorderSide(color: Colors.cyan),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Guardar Progreso'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _markComplete(task),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('Marcar Completada'),
                      ),
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

  Future<void> _toggleComplete(EmployeeTask task) async {
    await _markComplete(task);
  }

  Future<void> _updateProgress(EmployeeTask task, int progress) async {
    Navigator.pop(context);

    final response = await _api.updateTaskProgress(
      task.id,
      status: progress >= 100 ? 'completed' : 'in_progress',
      progress: progress,
    );

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Progreso actualizado'),
          backgroundColor: Colors.green,
        ),
      );
      _loadTasks();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${response.error}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _markComplete(EmployeeTask task) async {
    if (Navigator.canPop(context)) Navigator.pop(context);

    final response = await _api.updateTaskProgress(
      task.id,
      status: 'completed',
      progress: 100,
    );

    if (response.isSuccess) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Tarea completada'),
          backgroundColor: Colors.green,
        ),
      );
      _loadTasks();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${response.error}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
