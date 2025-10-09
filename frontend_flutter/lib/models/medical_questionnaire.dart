class MedicalQuestionnaire {
  final String id;
  final String name;
  final String? description;
  final String version;
  final String? branchId;
  final List<QuestionnaireQuestion> questions;
  final bool isActive;
  final bool isDefault;
  final String createdBy;
  final String? lastModifiedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicalQuestionnaire({
    required this.id,
    required this.name,
    this.description,
    required this.version,
    this.branchId,
    required this.questions,
    required this.isActive,
    required this.isDefault,
    required this.createdBy,
    this.lastModifiedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicalQuestionnaire.fromJson(Map<String, dynamic> json) {
    return MedicalQuestionnaire(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      version: json['version'],
      branchId: json['branchId'],
      questions: (json['questions'] as List)
          .map((q) => QuestionnaireQuestion.fromJson(q))
          .toList(),
      isActive: json['isActive'] ?? true,
      isDefault: json['isDefault'] ?? false,
      createdBy: json['createdBy'],
      lastModifiedBy: json['lastModifiedBy'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'version': version,
      'branchId': branchId,
      'questions': questions.map((q) => q.toJson()).toList(),
      'isActive': isActive,
      'isDefault': isDefault,
      'createdBy': createdBy,
      'lastModifiedBy': lastModifiedBy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class QuestionnaireQuestion {
  final String id;
  final String text;
  final String type; // 'boolean', 'text', 'number', 'select', 'multiselect', 'date'
  final bool required;
  final List<String>? options; // Para select y multiselect
  final Map<String, dynamic>? validation; // Reglas de validación
  final String? helpText;
  final int order;
  final Map<String, dynamic>? conditionalLogic; // Lógica condicional

  QuestionnaireQuestion({
    required this.id,
    required this.text,
    required this.type,
    required this.required,
    this.options,
    this.validation,
    this.helpText,
    required this.order,
    this.conditionalLogic,
  });

  factory QuestionnaireQuestion.fromJson(Map<String, dynamic> json) {
    return QuestionnaireQuestion(
      id: json['id'],
      text: json['text'],
      type: json['type'],
      required: json['required'] ?? false,
      options: json['options'] != null 
          ? List<String>.from(json['options'])
          : null,
      validation: json['validation'] != null 
          ? Map<String, dynamic>.from(json['validation'])
          : null,
      helpText: json['helpText'],
      order: json['order'] ?? 0,
      conditionalLogic: json['conditionalLogic'] != null 
          ? Map<String, dynamic>.from(json['conditionalLogic'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'type': type,
      'required': required,
      'options': options,
      'validation': validation,
      'helpText': helpText,
      'order': order,
      'conditionalLogic': conditionalLogic,
    };
  }

  // Helper methods
  bool get isBoolean => type == 'boolean';
  bool get isText => type == 'text';
  bool get isNumber => type == 'number';
  bool get isSelect => type == 'select';
  bool get isMultiselect => type == 'multiselect';
  bool get isDate => type == 'date';

  /// Validar una respuesta para esta pregunta
  bool validateAnswer(dynamic answer) {
    // Si es requerida y no hay respuesta
    if (required && (answer == null || answer.toString().trim().isEmpty)) {
      return false;
    }

    // Si no hay respuesta pero no es requerida, es válida
    if (answer == null || answer.toString().trim().isEmpty) {
      return true;
    }

    // Validaciones específicas por tipo
    switch (type) {
      case 'boolean':
        return answer is bool;
      
      case 'number':
        if (answer is! num && !RegExp(r'^-?\d+\.?\d*$').hasMatch(answer.toString())) {
          return false;
        }
        
        // Validaciones numéricas adicionales
        if (validation != null) {
          final numValue = double.tryParse(answer.toString());
          if (numValue != null) {
            if (validation!['min'] != null && numValue < validation!['min']) {
              return false;
            }
            if (validation!['max'] != null && numValue > validation!['max']) {
              return false;
            }
          }
        }
        break;
      
      case 'text':
        if (validation != null) {
          final textValue = answer.toString();
          if (validation!['minLength'] != null && textValue.length < validation!['minLength']) {
            return false;
          }
          if (validation!['maxLength'] != null && textValue.length > validation!['maxLength']) {
            return false;
          }
          if (validation!['pattern'] != null) {
            final pattern = RegExp(validation!['pattern']);
            if (!pattern.hasMatch(textValue)) {
              return false;
            }
          }
        }
        break;
      
      case 'select':
        if (options != null && !options!.contains(answer.toString())) {
          return false;
        }
        break;
      
      case 'multiselect':
        if (answer is! List) return false;
        final selectedOptions = List<String>.from(answer);
        if (options != null) {
          for (String selected in selectedOptions) {
            if (!options!.contains(selected)) {
              return false;
            }
          }
        }
        break;
      
      case 'date':
        try {
          DateTime.parse(answer.toString());
        } catch (e) {
          return false;
        }
        break;
    }

    return true;
  }

  /// Obtener el mensaje de error para una respuesta inválida
  String getValidationError(dynamic answer) {
    if (required && (answer == null || answer.toString().trim().isEmpty)) {
      return 'Esta pregunta es obligatoria';
    }

    switch (type) {
      case 'number':
        if (validation != null) {
          final numValue = double.tryParse(answer?.toString() ?? '');
          if (numValue != null) {
            if (validation!['min'] != null && numValue < validation!['min']) {
              return 'El valor debe ser mayor o igual a ${validation!['min']}';
            }
            if (validation!['max'] != null && numValue > validation!['max']) {
              return 'El valor debe ser menor o igual a ${validation!['max']}';
            }
          } else {
            return 'Debe ingresar un número válido';
          }
        }
        break;
      
      case 'text':
        if (validation != null) {
          final textValue = answer?.toString() ?? '';
          if (validation!['minLength'] != null && textValue.length < validation!['minLength']) {
            return 'Debe tener al menos ${validation!['minLength']} caracteres';
          }
          if (validation!['maxLength'] != null && textValue.length > validation!['maxLength']) {
            return 'No puede tener más de ${validation!['maxLength']} caracteres';
          }
        }
        break;
      
      case 'select':
        return 'Debe seleccionar una opción válida';
      
      case 'date':
        return 'Debe ingresar una fecha válida';
    }

    return 'Respuesta inválida';
  }
}