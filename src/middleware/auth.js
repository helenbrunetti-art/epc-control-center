const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token de acesso ausente. Faça login novamente." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado. Faça login novamente." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
