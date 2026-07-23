import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

// ---------------------------------------------------------------------------
// EPC CONTROL CENTER — app unificado (frontend servido pelo próprio backend,
// mesma origem: sem CORS, sem configuração de URL de API)
// ---------------------------------------------------------------------------

const AGENT_META = {
  "GP-01": { name: "Ana Torres", role: "Gerente de Planejamento", accent: "#4FA8D8", creds: ["MBA Gestão de Projetos", "PMP", "PMI-RMP"], blurb: "Governança, PMBOK 7ª ed., matriz de riscos quantitativa (AACE RP 18R-97)." },
  "CP-02": { name: "Rafael Costa", role: "Coordenador de Planejamento", accent: "#5FB489", creds: ["PMP", "Primavera P6 Certified"], blurb: "WBS (PMI), EVM (ANSI/EIA-748), curva S baseline vs. real." },
  "PL-03": { name: "João Silva", role: "Planejador", accent: "#8F8FE0", creds: ["Primavera P6 Certified", "PMI-SP (em curso)"], blurb: "Rede CPM, caminho crítico, auditoria DCMA 14-Point." },
  "TP-04": { name: "Camila Duarte", role: "Técnico de Planejamento", accent: "#D89B3D", creds: ["Téc. Edificações", "Excel Avançado"], blurb: "Apontamento as-built, QA de dado de campo, curva S." },
  "CO-05": { name: "Bruno Almeida", role: "Coordenador de Operações", accent: "#C4574A", creds: ["Lean Six Sigma GB", "Last Planner (LCI)"], blurb: "Last Planner System, PPC, remoção de restrições." },
  "CS-06": { name: "Luiza Rocha", role: "Coordenador de Suprimentos", accent: "#E0A9D0", creds: ["CPSM (ISM)", "MBA Supply Chain"], blurb: "Matriz de Kraljic, lead time crítico, scorecards de fornecedor." },
  "CE-07": { name: "Carlos Mendes", role: "Coordenador de Engenharia", accent: "#4FC0C0", creds: ["PMI-SP", "BIM Management (ISO 19650)"], blurb: "Federação de modelos, clash detection, maturidade IFC/IFA." },
};
const AGENT_IDS = Object.keys(AGENT_META);

const CURVE_DATA = [
  { mes: "Jan", baselineFis: 4, realFis: 3, baselineFin: 5, realFin: 4 },
  { mes: "Fev", baselineFis: 10, realFis: 8, baselineFin: 11, realFin: 9 },
  { mes: "Mar", baselineFis: 18, realFis: 15, baselineFin: 19, realFin: 16 },
  { mes: "Abr", baselineFis: 28, realFis: 24, baselineFin: 29, realFin: 25 },
  { mes: "Mai", baselineFis: 39, realFis: 34, baselineFin: 40, realFin: 35 },
  { mes: "Jun", baselineFis: 51, realFis: 45, baselineFin: 52, realFin: 46 },
  { mes: "Jul", baselineFis: 63, realFis: 55, baselineFin: 64, realFin: 57 },
];

const SUPPLY_STATUS = [
  { pacote: "Equip. Rotativos", prazo: 92 },
  { pacote: "Estruturas Metálicas", prazo: 78 },
  { pacote: "Instrumentação", prazo: 55 },
  { pacote: "Elétrica MT/BT", prazo: 88 },
];

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });
  const persist = (v) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {
      console.error("Erro ao salvar localStorage", e);
    }
  };
  return [value, persist];
}

function inputStyle(extra) {
  return {
    width: "100%", boxSizing: "border-box", background: "#0F1A20",
    border: "1px solid #243642", borderRadius: 6, padding: "10px 12px",
    color: "#E7EEF2", fontSize: 13, outline: "none", ...extra,
  };
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", identifier: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { identifier: form.identifier, password: form.password }
        : { fullName: form.fullName, username: form.username, email: form.email, password: form.password, inviteCode: form.inviteCode || undefined };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Falha na autenticação.");
        setLoading(false);
        return;
      }
      onAuthenticated(data.token, data.user);
    } catch (e) {
      setError("Não foi possível contatar o servidor. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#0B1418", fontFamily: "'Inter', sans-serif",
      backgroundImage: "linear-gradient(#1A2831 1px, transparent 1px), linear-gradient(90deg, #1A2831 1px, transparent 1px)",
      backgroundSize: "28px 28px", gap: 16, padding: 16,
    }}>
      <div style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 10, padding: 32, width: "min(360px, 100%)" }}>
        <div style={{ color: "#4FA8D8", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>
          EPC CONTROL CENTER
        </div>
        <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          {mode === "login" ? "Acesso ao ambiente" : "Cadastro de usuário"}
        </div>

        <div style={{ display: "flex", marginBottom: 18, borderBottom: "1px solid #243642" }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, background: "none", border: "none", padding: "8px 0", cursor: "pointer",
                color: mode === m ? "#4FA8D8" : "#7C93A0",
                borderBottom: mode === m ? "2px solid #4FA8D8" : "2px solid transparent",
                fontSize: 13, fontWeight: 600,
              }}>
              {m === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        {mode === "register" && (
          <>
            <input placeholder="Nome completo" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} style={inputStyle({ marginBottom: 10 })} />
            <input placeholder="Usuário (login)" value={form.username} onChange={(e) => update("username", e.target.value)} style={inputStyle({ marginBottom: 10 })} />
            <input placeholder="E-mail corporativo" value={form.email} onChange={(e) => update("email", e.target.value)} style={inputStyle({ marginBottom: 10 })} />
            <input placeholder="Senha (mín. 8, letra + número)" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} style={inputStyle({ marginBottom: 10 })} />
            <input placeholder="Código de convite (se exigido)" value={form.inviteCode} onChange={(e) => update("inviteCode", e.target.value)} style={inputStyle({ marginBottom: 16 })} />
          </>
        )}

        {mode === "login" && (
          <>
            <input placeholder="Usuário ou e-mail" value={form.identifier} onChange={(e) => update("identifier", e.target.value)} style={inputStyle({ marginBottom: 10 })} />
            <input placeholder="Senha" type="password" value={form.password} onChange={(e) => update("password", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} style={inputStyle({ marginBottom: 16 })} />
          </>
        )}

        {error && <div style={{ color: "#C4574A", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}

        <button onClick={submit} disabled={loading}
          style={{ width: "100%", background: "#4FA8D8", color: "#0B1418", border: "none", borderRadius: 6, padding: "11px 0", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div style={{ color: "#7C93A0", fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
          Autenticação real via JWT. Equipe virtual de 7 especialistas EPC.
        </div>
      </div>
    </div>
  );
}

function Badge({ agentId, active, onClick }) {
  const meta = AGENT_META[agentId];
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      padding: "10px 12px", marginBottom: 6, borderRadius: 6,
      border: `1px solid ${active ? meta.accent : "#243642"}`,
      background: active ? "rgba(255,255,255,0.04)" : "transparent",
      cursor: "pointer", transition: "border-color .15s, background .15s",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 4, background: meta.accent, color: "#0B1418",
        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 11,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {agentId.split("-")[0]}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#E7EEF2", fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>{meta.name}</div>
        <div style={{ color: "#7C93A0", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>{agentId} · {meta.role}</div>
      </div>
    </button>
  );
}

function ChatPanel({ token, agentId }) {
  const meta = AGENT_META[agentId];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setError("");
    fetch(`/api/chat/${agentId}`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setMessages((data.messages || []).map((m) => ({ role: m.role, text: m.message, ts: m.created_at }))); })
      .catch(() => { if (!cancelled) setError("Falha ao carregar histórico."); })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, token]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text, ts: new Date().toISOString() }]);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ agentId, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Falha ao obter resposta do agente.");
      else setMessages((m) => [...m, { role: "agent", text: data.reply, ts: new Date().toISOString() }]);
    } catch (e) {
      setError("Não foi possível contatar o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #243642" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent }} />
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#E7EEF2", fontWeight: 600, fontSize: 14 }}>
            {meta.name} <span style={{ color: "#7C93A0", fontWeight: 400 }}>— {meta.role}</span>
          </div>
        </div>
        <div style={{ color: "#7C93A0", fontSize: 11, marginTop: 4 }}>{meta.blurb}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loadingHistory && <div style={{ color: "#7C93A0", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>carregando histórico...</div>}
        {!loadingHistory && messages.length === 0 && (
          <div style={{ color: "#7C93A0", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>[ log vazio ] — inicie a comunicação com {agentId}.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%",
            background: m.role === "user" ? "#1A2831" : "rgba(255,255,255,0.03)",
            border: `1px solid ${m.role === "user" ? "#243642" : meta.accent + "55"}`,
            borderRadius: 6, padding: "8px 12px",
          }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#7C93A0", marginBottom: 4 }}>
              {new Date(m.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {m.role === "user" ? "VOCÊ" : agentId}
            </div>
            <div style={{ color: "#E7EEF2", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {busy && <div style={{ color: meta.accent, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{agentId} está respondendo…</div>}
        {error && <div style={{ color: "#C4574A", fontSize: 12 }}>{error}</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #243642", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={`Pergunte a ${meta.name.split(" ")[0]} sobre ${meta.role.toLowerCase()}...`}
          style={inputStyle({ flex: 1, marginBottom: 0 })} />
        <button onClick={send} disabled={busy}
          style={{ background: meta.accent, color: "#0B1418", border: "none", borderRadius: 6, padding: "0 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          Enviar
        </button>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 8, padding: 16, flex: 1, minWidth: 140 }}>
      <div style={{ color: "#7C93A0", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: color || "#E7EEF2", fontSize: 26, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: "#7C93A0", fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Dashboards() {
  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <div style={{ color: "#7C93A0", fontSize: 11, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
        Dados de amostra — integração com parsing real de .xer/.mpp fica como próxima evolução do backend.
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Kpi label="SPI (Prazo)" value="0.87" sub="Atraso acumulado" color="#D89B3D" />
        <Kpi label="CPI (Custo)" value="0.96" sub="Levemente acima do orçado" color="#5FB489" />
        <Kpi label="Avanço Físico" value="55%" sub="Baseline: 63%" />
        <Kpi label="Avanço Financeiro" value="57%" sub="Baseline: 64%" />
      </div>
      <div style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Curva S — Avanço Físico</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={CURVE_DATA}>
            <CartesianGrid stroke="#1E2E38" />
            <XAxis dataKey="mes" stroke="#7C93A0" fontSize={11} />
            <YAxis stroke="#7C93A0" fontSize={11} unit="%" />
            <Tooltip contentStyle={{ background: "#0F1A20", border: "1px solid #243642", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="baselineFis" name="Baseline Física" stroke="#7C93A0" strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="realFis" name="Real Física" stroke="#4FA8D8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Curva S — Avanço Financeiro</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={CURVE_DATA}>
            <CartesianGrid stroke="#1E2E38" />
            <XAxis dataKey="mes" stroke="#7C93A0" fontSize={11} />
            <YAxis stroke="#7C93A0" fontSize={11} unit="%" />
            <Tooltip contentStyle={{ background: "#0F1A20", border: "1px solid #243642", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="baselineFin" name="Baseline Financeira" stroke="#7C93A0" strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="realFin" name="Real Financeira" stroke="#5FB489" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 8, padding: 16 }}>
        <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Status de Suprimentos — Pacotes Críticos</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={SUPPLY_STATUS}>
            <CartesianGrid stroke="#1E2E38" />
            <XAxis dataKey="pacote" stroke="#7C93A0" fontSize={10} />
            <YAxis stroke="#7C93A0" fontSize={11} unit="%" />
            <Tooltip contentStyle={{ background: "#0F1A20", border: "1px solid #243642", fontSize: 12 }} />
            <Bar dataKey="prazo" fill="#4FA8D8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Documentos({ token }) {
  const [docs, setDocs] = useState([]);
  const [category, setCategory] = useState("Planejamento");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadDocs = useCallback(() => {
    setLoading(true);
    fetch("/api/documents", { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => setDocs(data.documents || []))
      .catch(() => setError("Falha ao carregar documentos."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function upload() {
    if (!file) { setError("Selecione um arquivo (.mpp, .xer, .xlsx ou .pdf)."); return; }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      const res = await fetch("/api/documents", { method: "POST", headers: authHeaders, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Falha no upload.");
      else { setFile(null); loadDocs(); }
    } catch (e) {
      setError("Não foi possível contatar o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept=".mpp,.xer,.xlsx,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ color: "#E7EEF2", fontSize: 13 }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ background: "#0F1A20", border: "1px solid #243642", borderRadius: 6, padding: "10px 12px", color: "#E7EEF2", fontSize: 13 }}>
          {["Engenharia", "Suprimentos", "Operações", "Planejamento"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={upload} disabled={busy}
          style={{ background: "#4FA8D8", color: "#0B1418", border: "none", borderRadius: 6, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Enviando..." : "Enviar Arquivo"}
        </button>
      </div>
      {error && <div style={{ color: "#C4574A", fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "#7C93A0", fontSize: 13 }}>carregando...</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #243642" }}>
              {["Arquivo", "Categoria", "Versão", "Data"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 6px", color: "#7C93A0", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.document_id} style={{ borderBottom: "1px solid #1A2831" }}>
                <td style={{ padding: "10px 6px", color: "#E7EEF2", fontSize: 13 }}>{d.file_name}</td>
                <td style={{ padding: "10px 6px", color: "#7C93A0", fontSize: 13 }}>{d.category}</td>
                <td style={{ padding: "10px 6px", color: "#7C93A0", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>v{d.version}</td>
                <td style={{ padding: "10px 6px", color: "#7C93A0", fontSize: 13 }}>{new Date(d.upload_date).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={4} style={{ padding: 16, color: "#7C93A0", fontSize: 13 }}>Nenhum documento registrado.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EquipeInfo() {
  return (
    <div style={{ padding: 20, overflowY: "auto", height: "100%" }}>
      <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
        Equipe Virtual de Planejamento EPC
      </div>
      <div style={{ color: "#7C93A0", fontSize: 12, marginBottom: 18 }}>
        7 especialistas, cada um fundamentado em padrões técnicos reais (PMBOK 7ª ed., AACE International, EVMS ANSI/EIA-748, Last Planner System/LCI, CPSM/ISM, PMI-SP, BIM ISO 19650).
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {AGENT_IDS.map((id) => {
          const meta = AGENT_META[id];
          return (
            <div key={id} style={{ background: "#121D24", border: "1px solid #243642", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent }} />
                <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13 }}>{meta.name}</div>
              </div>
              <div style={{ color: "#7C93A0", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>{id} · {meta.role}</div>
              <div style={{ color: "#E7EEF2", fontSize: 12, marginBottom: 8, lineHeight: 1.4 }}>{meta.blurb}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {meta.creds.map((c) => (
                  <span key={c} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${meta.accent}55`, borderRadius: 3, padding: "2px 6px", fontSize: 10, color: meta.accent }}>{c}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useLocalStorage("epc:session", null);
  const [tab, setTab] = useState("chat");
  const [selectedAgent, setSelectedAgent] = useState(AGENT_IDS[0]);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!session?.token) { setCheckingSession(false); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSession({ token: session.token, user: data.user }))
      .catch(() => setSession(null))
      .finally(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() { setSession(null); }

  if (checkingSession) {
    return <div style={{ minHeight: "100vh", background: "#0B1418", display: "flex", alignItems: "center", justifyContent: "center", color: "#7C93A0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>carregando ambiente...</div>;
  }

  if (!session?.token) {
    return <AuthScreen onAuthenticated={(token, user) => setSession({ token, user })} />;
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0B1418", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #243642", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, background: "#4FA8D8" }} />
          <div style={{ color: "#E7EEF2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>EPC CONTROL CENTER</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: "#7C93A0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>{session.user?.fullName || session.user?.username}</div>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #243642", borderRadius: 4, color: "#7C93A0", fontSize: 11, padding: "5px 10px", cursor: "pointer" }}>Sair</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ width: 220, borderRight: "1px solid #243642", padding: 14, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ color: "#7C93A0", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Equipe Virtual</div>
          {AGENT_IDS.map((id) => (
            <Badge key={id} agentId={id} active={id === selectedAgent && tab === "chat"} onClick={() => { setSelectedAgent(id); setTab("chat"); }} />
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", borderBottom: "1px solid #243642", padding: "0 16px", flexShrink: 0 }}>
            {[["chat", "Chat"], ["dashboards", "Dashboards"], ["docs", "Documentos"], ["equipe", "Equipe"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  background: "none", border: "none", padding: "12px 14px", cursor: "pointer",
                  color: tab === key ? "#4FA8D8" : "#7C93A0",
                  borderBottom: tab === key ? "2px solid #4FA8D8" : "2px solid transparent",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
                }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === "chat" && <ChatPanel token={session.token} agentId={selectedAgent} />}
            {tab === "dashboards" && <Dashboards />}
            {tab === "docs" && <Documentos token={session.token} />}
            {tab === "equipe" && <EquipeInfo />}
          </div>
        </div>
      </div>
    </div>
  );
}
