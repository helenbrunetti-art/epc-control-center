const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = { ".mpp": "mpp", ".xer": "xer", ".xlsx": "xlsx", ".pdf": "pdf" };
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 25);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = crypto.randomUUID();
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT[ext]) {
      return cb(new Error("Tipo de arquivo não suportado. Use .mpp, .xer, .xlsx ou .pdf."));
    }
    cb(null, true);
  },
});

const VALID_CATEGORIES = ["Engenharia", "Suprimentos", "Operações", "Planejamento"];

// POST /api/documents — upload de um novo documento
router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

    const category = req.body.category;
    if (!VALID_CATEGORIES.includes(category)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: `Categoria inválida. Use uma de: ${VALID_CATEGORIES.join(", ")}.` });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ALLOWED_EXT[ext];

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

      const existingVersion = await pool.query(
        "SELECT COALESCE(MAX(version), 0) AS max_version FROM documents WHERE user_id = $1 AND file_name = $2",
        [req.user.id, req.file.originalname]
      );
      const nextVersion = Number(existingVersion.rows[0].max_version) + 1;

      const result = await pool.query(
        `INSERT INTO documents (user_id, file_name, file_type, category, version, storage_path, checksum_sha256)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING document_id, file_name, file_type, category, version, upload_date`,
        [req.user.id, req.file.originalname, fileType, category, nextVersion, req.file.path, checksum]
      );

      return res.status(201).json({ document: result.rows[0] });
    } catch (dbErr) {
      console.error("[documents/upload]", dbErr);
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: "Falha ao registrar documento." });
    }
  });
});

// GET /api/documents — lista documentos do usuário autenticado
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT document_id, file_name, file_type, category, version, upload_date
       FROM documents WHERE user_id = $1 ORDER BY upload_date DESC`,
      [req.user.id]
    );
    return res.json({ documents: result.rows });
  } catch (err) {
    console.error("[documents/list]", err);
    return res.status(500).json({ error: "Falha ao listar documentos." });
  }
});

module.exports = router;
