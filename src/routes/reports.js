const express = require("express");
const { z } = require("zod");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const createSchema = z.object({
  agentId: z.string().optional(),
  title: z.string().trim().min(3).max(255),
  content: z.string().trim().min(1),
  status: z.enum(["em andamento", "concluído"]).optional(),
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT report_id, agent_id, title, status, created_at
       FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ reports: result.rows });
  } catch (err) {
    console.error("[reports/list]", err);
    return res.status(500).json({ error: "Falha ao listar relatórios." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { agentId, title, content, status } = parsed.data;
  try {
    const result = await pool.query(
      `INSERT INTO reports (user_id, agent_id, title, content, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'em andamento'))
       RETURNING report_id, title, status, created_at`,
      [req.user.id, agentId || null, title, content, status || null]
    );
    return res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    console.error("[reports/create]", err);
    return res.status(500).json({ error: "Falha ao criar relatório." });
  }
});

module.exports = router;
