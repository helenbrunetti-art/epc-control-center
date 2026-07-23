require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

async function migrate() {
  const sqlPath = path.join(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log("[migrate] aplicando schema.sql...");
  try {
    await pool.query(sql);
    console.log("[migrate] schema aplicado com sucesso.");
  } catch (err) {
    console.error("[migrate] falha ao aplicar schema:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
