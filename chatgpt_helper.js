import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config(); // carga variables del .env

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askChatGPT(prompt) {
  const response = await client.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: "Sos un asistente experto en desarrollo fullstack con Node.js, React y PostgreSQL." },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0].message.content;
}