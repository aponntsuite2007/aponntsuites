class FaceAnalysisResult {
  final bool faceDetected;
  final double? confidence;
  final String? qualityScore;
  final bool? isLivePerson;
  final Map<String, dynamic>? biometricData;
  final String? message;

  FaceAnalysisResult({
    required this.faceDetected,
    this.confidence,
    this.qualityScore,
    this.isLivePerson,
    this.biometricData,
    this.message,
  });

  factory FaceAnalysisResult.success({
    double? confidence,
    String? qualityScore,
    bool? isLivePerson,
    Map<String, dynamic>? biometricData,
  }) {
    return FaceAnalysisResult(
      faceDetected: true,
      confidence: confidence,
      qualityScore: qualityScore,
      isLivePerson: isLivePerson,
      biometricData: biometricData,
      message: 'Rostro detectado exitosamente',
    );
  }

  factory FaceAnalysisResult.failure(String message) {
    return FaceAnalysisResult(
      faceDetected: false,
      message: message,
    );
  }

  factory FaceAnalysisResult.fromJson(Map<String, dynamic> json) {
    return FaceAnalysisResult(
      faceDetected: json['faceDetected'] ?? false,
      confidence: json['confidence']?.toDouble(),
      qualityScore: json['qualityScore'],
      isLivePerson: json['isLivePerson'],
      biometricData: json['biometricData'],
      message: json['message'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'faceDetected': faceDetected,
      'confidence': confidence,
      'qualityScore': qualityScore,
      'isLivePerson': isLivePerson,
      'biometricData': biometricData,
      'message': message,
    };
  }
}