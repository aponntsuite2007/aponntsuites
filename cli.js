import fs from "fs";
import path from "path";
import readline from "readline";
import dotenv from "dotenv";
import { OpenAI } from "openai";

// Cargar variables de entorno desde .env
dotenv.config();
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("ERROR: No se encontró OPENAI_API_KEY en el entorno.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: API_KEY });
const BASE_DIR = path.resolve("./");
const LOG_FILE = path.resolve("log.json");

// Cargar log previo
let log = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, "utf-8")) : {};

// --- Funciones auxiliares ---

// Obtener todos los archivos JS recursivamente
function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  list.forEach((file) => {
    const fullPath = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else if (file.isFile() && fullPath.endsWith(".js")) {
      results.push(fullPath);
    }
  });
  return results;
}

// Filtrar archivos según palabras clave del prompt
function filterFilesByPrompt(files, prompt) {
  const keywords = prompt.toLowerCase().match(/\b\w+\b/g).filter((w) => w.length > 2);
  return files.filter((file) => {
    const content = fs.readFileSync(file, "utf-8").toLowerCase();
    return keywords.some((kw) => content.includes(kw) || file.toLowerCase().includes(kw));
  });
}

// Analizar un solo archivo
async function analyzeFile(file, prompt) {
  if (log[file]) return; // ya analizado
  console.log(`⏳ Procesando ${file}...`);

  const content = fs.readFileSync(file, "utf-8");
  try {
    const response = await client.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: "Sos un asistente experto en programación. Detectá errores, dependencias y completá/corregí código si es necesario." },
        { role: "user", content: `Prompt: ${prompt}\nArchivo: ${file}\nContenido:\n${content}` },
      ],
      max_completion_tokens: 3000,
    });

    const result = response.choices[0].message.content;
    console.log(result.substring(0, 500) + "\n..."); // preview parcial
    log[file] = { prompt, timestamp: Date.now(), analysis: result };
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), "utf-8");
  } catch (err) {
    console.error(`❌ Error procesando ${file}:`, err.message);
  }
}

// Analizar archivos en lotes
async function analyzeFilesInBatches(files, prompt, batchSize = 3) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map((file) => analyzeFile(file, prompt)));
  }
}

// --- Modo chat interactivo ---
async function chatInteractive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("💬 Modo chat interactivo iniciado. Escribí tu pregunta o 'salir' para terminar.");

  const ask = () =>
    rl.question("Pregunta: ", async (question) => {
      if (question.toLowerCase() === "salir") {
        rl.close();
        return;
      }

      const allFiles = getAllFiles(BASE_DIR);
      const relevantFiles = filterFilesByPrompt(allFiles, question);

      let context = "";
      relevantFiles.forEach((file) => {
        const content = fs.readFileSync(file, "utf-8");
        context += `Archivo: ${file}\nContenido:\n${content}\n\n`;
      });

      // agregar log previo
      context += "\nHistorial de análisis previo:\n";
      for (const f in log) {
        context += `Archivo: ${f}\nAnálisis previo:\n${log[f].analysis || ""}\n\n`;
      }

      try {
        const response = await client.chat.completions.create({
          model: "gpt-5",
          messages: [
            { role: "system", content: "Sos un asistente experto en programación. Respondé usando archivos y log previo." },
            { role: "user", content: question + "\n\nContexto:\n" + context },
          ],
          max_completion_tokens: 3000,
        });

        const answer = response.choices[0].message.content;
        console.log("\n📝 Respuesta:\n", answer, "\n");
      } catch (err) {
        console.error("❌ Error en chat:", err.message);
      }

      ask();
    });

  ask();
}

// --- CLI principal ---
const rlMain = readline.createInterface({ input: process.stdin, output: process.stdout });
rlMain.question("Elegí modo (1=análisis, 2=chat interactivo): ", async (mode) => {
  rlMain.close();

  if (mode === "1") {
    const promptRl = readline.createInterface({ input: process.stdin, output: process.stdout });
    promptRl.question("Ingresa tu prompt de análisis: ", async (prompt) => {
      promptRl.close();
      const allFiles = getAllFiles(BASE_DIR);
      const relevantFiles = filterFilesByPrompt(allFiles, prompt);

      if (relevantFiles.length === 0) {
        console.log("No se encontraron archivos relevantes para ese prompt.");
        return;
      }

      analyzeFilesInBatches(relevantFiles, prompt, 3);
      console.log("✅ Análisis en curso. Podés abrir otro CLI para hacer preguntas mientras se procesa.");
    });
  } else if (mode === "2") {
    await chatInteractive();
  } else {
    console.log("Modo no válido.");
  }
});