const express = require("express");
const { z } = require("zod");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const sendSchema = z.object({
  agentId: z.string().min(1),
  message: z.string().trim().min(1, "Mensagem vazia.").max(4000),
  topic: z.string().max(100).optional(),
});

// GET /api/chat/:agentId — histórico do usuário com um agente
router.get("/:agentId", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT role, message, topic, created_at FROM chat_messages
       WHERE user_id = $1 AND agent_id = $2 ORDER BY created_at ASC`,
      [req.user.id, req.params.agentId]
    );
    return res.json({ messages: result.rows });
  } catch (err) {
    console.error("[chat/history]", err);
    return res.status(500).json({ error: "Falha ao carregar histórico." });
  }
});

// POST /api/chat/send — envia mensagem e retorna a resposta do agente (via Claude API)
router.post("/send", requireAuth, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { agentId, message, topic } = parsed.data;

  try {
    const agentResult = await pool.query("SELECT * FROM agents WHERE agent_id = $1", [agentId]);
    const agent = agentResult.rows[0];
    if (!agent) return res.status(404).json({ error: "Agente não encontrado." });

    // grava a mensagem do usuário
    await pool.query(
      `INSERT INTO chat_messages (user_id, agent_id, role, message, topic) VALUES ($1, $2, 'user', $3, $4)`,
      [req.user.id, agentId, message, topic || null]
    );

    // recupera histórico recente para dar contexto ao modelo (últimas 20 mensagens)
    const historyResult = await pool.query(
      `SELECT role, message FROM chat_messages
       WHERE user_id = $1 AND agent_id = $2
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.id, agentId]
    );
    const history = historyResult.rows.reverse().map((m) => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.message,
    }));

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "ANTHROPIC_API_KEY não configurada no servidor." });
    }

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: agent.system_prompt,
        messages: history,
      }),
    });

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text();
      console.error("[chat/send] erro Claude API:", apiResponse.status, errBody);
      return res.status(502).json({ error: "Falha na comunicação com o serviço de IA." });
    }

    const data = await apiResponse.json();
    const agentText = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n") || "(sem resposta)";

    await pool.query(
      `INSERT INTO chat_messages (user_id, agent_id, role, message, topic) VALUES ($1, $2, 'agent', $3, $4)`,
      [req.user.id, agentId, agentText, topic || null]
    );

    return res.json({
      agent: { id: agent.agent_id, name: agent.name, role: agent.role },
      reply: agentText,
    });
  } catch (err) {
    console.error("[chat/send]", err);
    return res.status(500).json({ error: "Falha ao processar a mensagem." });
  }
});

module.exports = router;
