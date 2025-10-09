import { generateCode } from "./chatgpt_writer.js";

async function run() {
  await generateCode(
    "Generame un endpoint en Express que devuelva una lista de usuarios desde PostgreSQL.",
    "routes/users.js"
  );
}

run();