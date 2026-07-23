require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const agentsRoutes = require("./routes/agents");
const documentsRoutes = require("./routes/documents");
const chatRoutes = require("./routes/chat");
const reportsRoutes = require("./routes/reports");

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[server] variável de ambiente obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

const app = express();
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");
const HAS_FRONTEND_BUILD = fs.existsSync(path.join(FRONTEND_DIST, "index.html"));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "1mb" }));

// limite geral de requisições por IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString(), frontend: HAS_FRONTEND_BUILD }));

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportsRoutes);

// ---------------------------------------------------------------
// Serve o frontend (React/Vite) buildado, na mesma origem da API.
// Isso elimina CORS entre dois serviços separados: um único deploy,
// uma única URL. Precisa rodar `npm run build:frontend` antes.
// ---------------------------------------------------------------
if (HAS_FRONTEND_BUILD) {
  app.use(express.static(FRONTEND_DIST));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  console.warn("[server] build do frontend não encontrado em frontend/dist — rode `npm run build:frontend`. Servindo apenas a API.");
}

// 404 (só chega aqui pra rotas /api/* não mapeadas, já que o catch-all acima cobre o resto)
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// handler de erro genérico
app.use((err, req, res, next) => {
  console.error("[server] erro não tratado:", err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] EPC Control Center rodando na porta ${PORT} — frontend ${HAS_FRONTEND_BUILD ? "servido" : "AUSENTE"}`);
});
