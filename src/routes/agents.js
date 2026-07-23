const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT agent_id, name, role, specialty, tools_mastered FROM agents ORDER BY agent_id"
    );
    return res.json({ agents: result.rows });
  } catch (err) {
    console.error("[agents/list]", err);
    return res.status(500).json({ error: "Falha ao carregar a equipe virtual." });
  }
});

module.exports = router;
