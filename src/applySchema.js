const fs = require("fs");
const path = require("path");

async function applySchema(pool) {
  const sqlPath = path.join(__dirname, "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
}

module.exports = { applySchema };
