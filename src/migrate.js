require("dotenv").config();
const { pool } = require("./db");
const { applySchema } = require("./applySchema");

async function migrate() {
  console.log("[migrate] aplicando schema.sql...");
  try {
    await applySchema(pool);
    console.log("[migrate] schema aplicado com sucesso.");
  } catch (err) {
    console.error("[migrate] falha ao aplicar schema:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
