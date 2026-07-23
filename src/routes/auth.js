const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------
// Validação de payloads
// ---------------------------------------------------------------
const registerSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo.").max(150),
  username: z
    .string()
    .trim()
    .min(3, "Usuário deve ter ao menos 3 caracteres.")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Usuário deve conter apenas letras, números, ponto, hífen ou underline."),
  email: z.string().trim().email("E-mail inválido.").max(150),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra.")
    .regex(/[0-9]/, "A senha deve conter ao menos um número."),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Informe usuário ou e-mail."), // username ou email
  password: z.string().min(1, "Informe a senha."),
});

// ---------------------------------------------------------------
// Limite de tentativas — protege login e cadastro contra força bruta
// ---------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
});

function signToken(user) {
  return jwt.sign(
    { sub: user.user_id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

function publicUser(user) {
  return {
    id: user.user_id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
  };
}

// ---------------------------------------------------------------
// POST /api/auth/register — cadastro de novo usuário
// ---------------------------------------------------------------
router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { fullName, username, email, password, inviteCode } = parsed.data;

  const requiredInvite = process.env.REGISTRATION_INVITE_CODE;
  if (requiredInvite && inviteCode !== requiredInvite) {
    return res.status(403).json({ error: "Código de convite inválido. Solicite o código ao administrador." });
  }

  try {
    const existing = await pool.query(
      "SELECT user_id FROM users WHERE username = $1 OR email = $2",
      [username, email.toLowerCase()]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Usuário ou e-mail já cadastrado." });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING user_id, full_name, username, email, role, created_at`,
      [fullName, username, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ error: "Falha ao concluir o cadastro. Tente novamente." });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { identifier, password } = parsed.data;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [identifier.toLowerCase()]
    );
    const user = result.rows[0];

    // Mensagem genérica — nunca revelar se foi o usuário ou a senha que falhou.
    const invalidCredentialsMsg = { error: "Usuário ou senha inválidos." };

    if (!user) return res.status(401).json(invalidCredentialsMsg);
    if (!user.is_active) return res.status(403).json({ error: "Conta desativada. Contate o administrador." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json(invalidCredentialsMsg);

    await pool.query("UPDATE users SET last_login_at = now() WHERE user_id = $1", [user.user_id]);

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("[auth/login]", err);
    return res.status(500).json({ error: "Falha ao autenticar. Tente novamente." });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/me — dados do usuário autenticado
// ---------------------------------------------------------------
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, full_name, username, email, role, created_at, last_login_at FROM users WHERE user_id = $1",
      [req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error("[auth/me]", err);
    return res.status(500).json({ error: "Falha ao buscar usuário." });
  }
});

module.exports = router;
