/**
 * Script para construir APK Flutter y sincronizar
 *
 * Uso:
 *   node scripts/build-apk-and-sync.js [release|debug]
 *
 * Requisitos:
 *   - Flutter SDK instalado
 *   - Android SDK configurado
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FLUTTER_PROJECT_PATH = path.join(__dirname, '..', '..', 'frontend_flutter');
const APK_OUTPUT_PATH = path.join(__dirname, '..', 'public', 'downloads');
const BUILD_TYPE = process.argv[2] || 'release';

async function main() {
    console.log('🚀 Build APK Flutter - Sistema de Asistencia Biométrico');
    console.log('═'.repeat(60));
    console.log(`📁 Proyecto Flutter: ${FLUTTER_PROJECT_PATH}`);
    console.log(`📦 Tipo de build: ${BUILD_TYPE}`);
    console.log('');

    // Verificar que existe el proyecto Flutter
    if (!fs.existsSync(path.join(FLUTTER_PROJECT_PATH, 'pubspec.yaml'))) {
        console.error('❌ No se encontró el proyecto Flutter en:', FLUTTER_PROJECT_PATH);
        process.exit(1);
    }

    // Crear directorio de salida si no existe
    if (!fs.existsSync(APK_OUTPUT_PATH)) {
        fs.mkdirSync(APK_OUTPUT_PATH, { recursive: true });
        console.log(`📁 Creado directorio: ${APK_OUTPUT_PATH}`);
    }

    try {
        // 1. Limpiar build anterior
        console.log('\n🧹 Limpiando builds anteriores...');
        execSync('flutter clean', {
            cwd: FLUTTER_PROJECT_PATH,
            stdio: 'inherit'
        });

        // 2. Obtener dependencias
        console.log('\n📦 Obteniendo dependencias...');
        execSync('flutter pub get', {
            cwd: FLUTTER_PROJECT_PATH,
            stdio: 'inherit'
        });

        // 3. Construir APK
        console.log(`\n🔨 Construyendo APK (${BUILD_TYPE})...`);
        const buildCommand = BUILD_TYPE === 'release'
            ? 'flutter build apk --release --split-per-abi'
            : 'flutter build apk --debug';

        execSync(buildCommand, {
            cwd: FLUTTER_PROJECT_PATH,
            stdio: 'inherit'
        });

        // 4. Copiar APK al directorio público
        console.log('\n📋 Copiando APK al servidor...');

        const apkSourceDir = BUILD_TYPE === 'release'
            ? path.join(FLUTTER_PROJECT_PATH, 'build', 'app', 'outputs', 'flutter-apk')
            : path.join(FLUTTER_PROJECT_PATH, 'build', 'app', 'outputs', 'flutter-apk');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // Buscar APKs generados
        if (fs.existsSync(apkSourceDir)) {
            const apkFiles = fs.readdirSync(apkSourceDir).filter(f => f.endsWith('.apk'));

            for (const apkFile of apkFiles) {
                const sourcePath = path.join(apkSourceDir, apkFile);
                const destName = `siac-attendance-${BUILD_TYPE}-${timestamp}-${apkFile}`;
                const destPath = path.join(APK_OUTPUT_PATH, destName);

                fs.copyFileSync(sourcePath, destPath);
                console.log(`  ✅ ${destName}`);

                // También crear un link "latest"
                const latestName = `siac-attendance-${BUILD_TYPE}-latest.apk`;
                const latestPath = path.join(APK_OUTPUT_PATH, latestName);
                fs.copyFileSync(sourcePath, latestPath);
                console.log(`  ✅ ${latestName} (latest)`);
            }
        }

        // 5. Generar info de versión
        const versionInfo = {
            buildDate: new Date().toISOString(),
            buildType: BUILD_TYPE,
            version: getFlutterVersion(),
            downloadUrl: `/downloads/siac-attendance-${BUILD_TYPE}-latest.apk`,
            changelog: 'Ver panel-empresa.html para changelog completo'
        };

        fs.writeFileSync(
            path.join(APK_OUTPUT_PATH, 'version.json'),
            JSON.stringify(versionInfo, null, 2)
        );
        console.log('\n📄 version.json actualizado');

        console.log('\n' + '═'.repeat(60));
        console.log('✅ BUILD COMPLETADO');
        console.log('═'.repeat(60));
        console.log(`\n📥 APK disponible en:`);
        console.log(`   http://localhost:9998/downloads/siac-attendance-${BUILD_TYPE}-latest.apk`);
        console.log(`   https://www.aponnt.com/downloads/siac-attendance-${BUILD_TYPE}-latest.apk`);

    } catch (error) {
        console.error('\n❌ Error durante el build:', error.message);
        process.exit(1);
    }
}

function getFlutterVersion() {
    try {
        const pubspec = fs.readFileSync(
            path.join(FLUTTER_PROJECT_PATH, 'pubspec.yaml'),
            'utf-8'
        );
        const match = pubspec.match(/version:\s*(\d+\.\d+\.\d+)/);
        return match ? match[1] : 'unknown';
    } catch {
        return 'unknown';
    }
}

main();
