import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import '../models/medical_document_model.dart';
import '../models/document_request_model.dart';
import '../services/api_service.dart';

class MedicalDocumentsProvider with ChangeNotifier {
  final ApiService _apiService;
  
  List<MedicalDocument> _documents = [];
  List<DocumentRequest> _pendingRequests = [];
  bool _isLoading = false;

  MedicalDocumentsProvider(this._apiService);

  // Getters
  List<MedicalDocument> get documents => _documents;
  List<DocumentRequest> get pendingRequests => _pendingRequests;
  bool get isLoading => _isLoading;

  // Filtros por tipo de documento
  List<MedicalDocument> getDocumentsByType(String documentType) {
    return _documents.where((doc) => doc.documentType == documentType).toList();
  }

  List<DocumentRequest> getPendingRequestsByType(String documentType) {
    return _pendingRequests
        .where((req) => req.documentType == documentType && req.isPending)
        .toList();
  }

  // Obtener alertas de documentos vencidos o por vencer
  List<DocumentRequest> getUrgentRequests() {
    return _pendingRequests
        .where((req) => req.isOverdue || req.isDueSoon)
        .toList();
  }

  int getUnreadNotificationsCount() {
    return _pendingRequests.where((req) => req.isPending).length;
  }

  // Cargar documentos del usuario
  Future<void> loadDocuments() async {
    _setLoading(true);
    try {
      // Cargar certificados
      final certificates = await _apiService.getMyCertificates();
      final certDocs = certificates.map((cert) => MedicalDocument(
        id: cert['id'],
        fileName: cert['attachments']?.first ?? 'Certificado_${cert['id']}.pdf',
        documentType: 'certificates',
        fileUrl: cert['attachments']?.first ?? '',
        status: cert['status'] ?? 'pending',
        uploadDate: DateTime.parse(cert['createdAt']),
        description: cert['symptoms'],
      )).toList();

      // Cargar recetas
      final recipes = await _apiService.getMyPrescriptions();
      final recipeDocs = recipes.map((recipe) => MedicalDocument(
        id: recipe['id'],
        fileName: recipe['fileName'] ?? 'Receta_${recipe['id']}.pdf',
        documentType: 'recipes',
        fileUrl: recipe['fileUrl'] ?? '',
        status: recipe['status'] ?? 'pending',
        uploadDate: DateTime.parse(recipe['createdAt']),
        description: recipe['medications']?.toString(),
      )).toList();

      // Cargar estudios
      final studies = await _apiService.getMyStudies();
      final studyDocs = studies.map((study) => MedicalDocument(
        id: study['id'],
        fileName: study['originalFileName'] ?? 'Estudio_${study['id']}.pdf',
        documentType: 'studies',
        fileUrl: study['mainFileUrl'] ?? '',
        status: study['status'] ?? 'pending',
        uploadDate: DateTime.parse(study['createdAt']),
        fileSize: study['fileSize'],
        description: study['studyName'],
      )).toList();

      // Cargar fotos médicas
      final photos = await _apiService.getMyPhotoRequests();
      final photoDocs = photos.where((photo) => photo['photoUrl'] != null).map((photo) => MedicalDocument(
        id: photo['id'],
        fileName: photo['originalFileName'] ?? 'Foto_${photo['id']}.jpg',
        documentType: 'photos',
        fileUrl: photo['photoUrl'],
        status: photo['status'] ?? 'pending',
        uploadDate: DateTime.parse(photo['photoDate'] ?? photo['createdAt']),
        fileSize: photo['fileSize'],
        description: '${photo['bodyPart']} - ${photo['photoType']}',
      )).toList();

      _documents = [...certDocs, ...recipeDocs, ...studyDocs, ...photoDocs];
      notifyListeners();
    } catch (e) {
      print('Error loading documents: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  // Cargar solicitudes pendientes del servidor
  Future<void> loadPendingRequests() async {
    try {
      // Esta sería una nueva API call para obtener las solicitudes fehacientes
      final response = await _apiService.getPendingDocumentRequests();
      _pendingRequests = response.map<DocumentRequest>((req) => DocumentRequest.fromJson(req)).toList();
      notifyListeners();
    } catch (e) {
      print('Error loading pending requests: $e');
      // Por ahora crear solicitudes de ejemplo basadas en comunicaciones fehacientes
      _pendingRequests = _createSampleRequests();
      notifyListeners();
    }
  }

  // Subir documento
  Future<void> uploadDocument(PlatformFile file, String documentType) async {
    _setLoading(true);
    try {
      Map<String, dynamic> result;
      
      switch (documentType) {
        case 'certificates':
          result = await _apiService.uploadCertificate(file);
          break;
        case 'recipes':
          result = await _apiService.uploadPrescription(file);
          break;
        case 'studies':
          result = await _apiService.uploadStudy(file);
          break;
        case 'photos':
          result = await _apiService.uploadPhoto(file);
          break;
        default:
          throw Exception('Tipo de documento no soportado');
      }

      // Actualizar lista de documentos
      await loadDocuments();
      
      // Marcar solicitudes relacionadas como cumplidas
      await _markRelatedRequestsAsFulfilled(documentType);
      
    } catch (e) {
      print('Error uploading document: $e');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  // Eliminar documento
  Future<void> deleteDocument(String documentId) async {
    try {
      final document = _documents.firstWhere((doc) => doc.id == documentId);
      
      switch (document.documentType) {
        case 'certificates':
          await _apiService.deleteCertificate(documentId);
          break;
        case 'recipes':
          await _apiService.deletePrescription(documentId);
          break;
        case 'studies':
          await _apiService.deleteStudy(documentId);
          break;
        case 'photos':
          await _apiService.deletePhoto(documentId);
          break;
      }

      _documents.removeWhere((doc) => doc.id == documentId);
      notifyListeners();
    } catch (e) {
      print('Error deleting document: $e');
      rethrow;
    }
  }

  // Marcar solicitud como leída
  Future<void> markRequestAsRead(String requestId) async {
    try {
      final request = _pendingRequests.firstWhere((req) => req.id == requestId);
      // Aquí iría la llamada a la API para marcar como leída
      // await _apiService.markCommunicationAsRead(requestId);
      
      _pendingRequests.removeWhere((req) => req.id == requestId);
      notifyListeners();
    } catch (e) {
      print('Error marking request as read: $e');
    }
  }

  // Marcar solicitudes relacionadas como cumplidas
  Future<void> _markRelatedRequestsAsFulfilled(String documentType) async {
    try {
      final relatedRequests = _pendingRequests
          .where((req) => req.documentType == documentType && req.isPending)
          .toList();

      for (final request in relatedRequests) {
        // Llamar al endpoint para marcar como cumplida
        await _apiService.markRequestAsFulfilled(request.id);
      }

      // Remover de la lista local
      _pendingRequests.removeWhere((req) => 
          req.documentType == documentType && req.isPending);
      
      notifyListeners();
    } catch (e) {
      print('Error marking requests as fulfilled: $e');
    }
  }

  // Crear solicitudes de ejemplo (temporal)
  List<DocumentRequest> _createSampleRequests() {
    final now = DateTime.now();
    return [
      DocumentRequest(
        id: 'req-1',
        documentType: 'certificates',
        requestDate: now.subtract(Duration(days: 2)),
        dueDate: now.add(Duration(days: 5)),
        description: 'Certificado médico solicitado por el área médica',
        notes: 'Requerido para justificar ausencia del 01/09/2025',
        status: 'requested',
        requestedBy: 'Dr. María González',
        urgency: 'normal',
      ),
      DocumentRequest(
        id: 'req-2',
        documentType: 'studies',
        requestDate: now.subtract(Duration(days: 1)),
        dueDate: now.add(Duration(days: 3)),
        description: 'Estudios de laboratorio solicitados',
        notes: 'Análisis de sangre completo realizado el 28/08/2025',
        status: 'requested',
        requestedBy: 'Dr. Carlos Ruiz',
        urgency: 'high',
      ),
    ];
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  // Limpiar datos
  void clear() {
    _documents.clear();
    _pendingRequests.clear();
    notifyListeners();
  }
}