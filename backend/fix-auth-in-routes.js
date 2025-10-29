/**
 * SCRIPT: Agregar función authenticateToken a archivos de rutas
 */

const fs = require('fs');
const path = require('path');

const JWT_SECRET_CONST = `
const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui';

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}
`;

const files = [
    'src/routes/userProfileRoutes.js',
    'src/routes/userMedicalRoutes.js',
    'src/routes/userAdminRoutes.js'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);

    if (!fs.existsSync(filePath)) {
        console.log(`❌ Archivo no encontrado: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    // Verificar si ya tiene la función authenticateToken
    if (content.includes('async function authenticateToken')) {
        console.log(`✓ ${file} ya tiene authenticateToken`);
        return;
    }

    // Agregar import de jwt en la línea 4
    const jwtImport = "const jwt = require('jsonwebtoken');\n";

    // Buscar la línea después del router
    const routerLine = "const router = express.Router();";
    const authImportLine = "const { authenticateToken } = require('../middleware/auth');";

    // Eliminar el import incorrecto
    content = content.replace(authImportLine, '');

    // Agregar jwt y la función authenticateToken después del router
    content = content.replace(
        routerLine,
        routerLine + '\n' + jwtImport + JWT_SECRET_CONST
    );

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file} actualizado`);
});

console.log('\n✅ Todos los archivos actualizados!\n');
