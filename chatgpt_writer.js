import fs from "fs";
import path from "path";
import OpenAI from "openai";
import 'dotenv/config'; // carga automáticamente el .env

// --- Cliente OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // toma la clave del .env
});

// --- Función principal: generar código por archivo ---
export async function generateCodeForFile(prompt, filePath) {
  try {
    // Crear carpeta si no existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Leer contenido actual si existe
    let currentContent = "";
    if (fs.existsSync(filePath)) {
      currentContent = fs.readFileSync(filePath, "utf-8");
    }

    console.log(`⏳ Generando código para ${filePath}...`);

    // Llamada a OpenAI GPT-5
    const response = await openai.chat.completions.create({
      model: "gpt-5", // modelo más potente
      messages: [
        {
          role: "system",
          content: "Sos un asistente que genera código para un proyecto existente. Solo modificá lo necesario.",
        },
        {
          role: "user",
          content: `Archivo: ${filePath}\nContenido actual:\n${currentContent}\n\n${prompt}`,
        },
      ],
      max_completion_tokens: 3000,
    });

    const code = response.choices[0].message.content;

    // Guardar código en el archivo
    fs.writeFileSync(filePath, code, "utf-8");
    console.log(`✅ Código generado y guardado en ${filePath}`);

  } catch (err) {
    console.error("❌ Error generando código:", err);
  }
}

// --- Función auxiliar: listar todos los archivos .js de un directorio ---
export function listAllJSFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(listAllJSFiles(filePath));
    } else if (file.endsWith(".js")) {
      results.push(filePath);
    }
  });
  return results;
}