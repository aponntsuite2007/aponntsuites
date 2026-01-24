# Flutter-specific ProGuard rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Keep Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Keep Google ML Kit
-keep class com.google.mlkit.** { *; }

# Keep Camera (plugin + Android camera2 API)
-keep class io.flutter.plugins.camera.** { *; }
-keep class androidx.camera.** { *; }
-keep class android.hardware.camera2.** { *; }
-keep class android.media.Image { *; }
-keep class android.media.ImageReader { *; }

# Google Play Core (referenced by Flutter deferred components - not used but needed by R8)
-dontwarn com.google.android.play.core.splitcompat.**
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**

# Prevent obfuscation of model classes used with Gson/JSON
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
