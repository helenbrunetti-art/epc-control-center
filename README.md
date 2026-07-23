# EPC Control Center — App Unificado

Sistema completo de planejamento EPC com equipe virtual de 7 especialistas.
**Um único serviço** — o Express serve a API e o frontend React (buildado)
na mesma origem. Sem CORS entre serviços, sem duas URLs, um único deploy.

## O que mudou em relação às versões anteriores

Antes: `epc-backend` (Render) + `epc-frontend` (Vercel), duas URLs, exigindo
configurar `CORS_ORIGIN` e `VITE_API_BASE_URL` para se falarem.

Agora: **um projeto só**. `npm install` já builda o frontend automaticamente
(via `postinstall`) e o `server.js` serve tudo — API em `/api/*`, app React
em qualquer outra rota. Um único deploy, uma única URL, uma única variável
de ambiente a menos para errar.

## Equipe virtual — fundamentação técnica

Os 7 agentes foram aprofundados com padrões reais de mercado, não apenas
nomes de metodologia soltos:

| Agente | Papel | Base técnica |
|---|---|---|
| Ana Torres (GP-01) | Gerente de Planejamento | PMBOK 7ª ed., ISO 21502, AACE RP 18R-97, PMI-RMP |
| Rafael Costa (CP-02) | Coord. de Planejamento | WBS (PMI), EVMS ANSI/EIA-748, AACE RP 10S-90 |
| João Silva (PL-03) | Planejador | CPM, DCMA 14-Point Assessment, PMI-SP |
| Camila Duarte (TP-04) | Técnico de Planejamento | Apontamento as-built, QA de dado de campo |
| Bruno Almeida (CO-05) | Coord. de Operações | Last Planner System (LCI), PPC, Lean Six Sigma |
| Luiza Rocha (CS-06) | Coord. de Suprimentos | CPSM (ISM), matriz de Kraljic, gestão de lead time |
| Carlos Mendes (CE-07) | Coord. de Engenharia | BIM ISO 19650, clash detection, PMI-SP |

Cada um responde no chat com a profundidade técnica correspondente — não é
personagem raso, é fundamentado em padrão real citável.

## Rodando localmente

```bash
npm install              # instala backend E builda o frontend (postinstall)
cp .env.example .env      # preencha DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run migrate           # cria as tabelas + os 7 agentes no banco
npm start                 # http://localhost:4000 — API e app juntos
```

Para desenvolver o frontend com hot-reload separado (opcional):
```bash
npm start                          # backend em outro terminal, porta 4000
cd frontend && npm run dev         # frontend em localhost:5173, com proxy /api → :4000
```

## Deploy em produção (um único serviço)

1. **Banco**: crie um PostgreSQL gratuito no [Neon](https://neon.tech), copie a `DATABASE_URL`.
2. **Serviço**: no [Render](https://render.com) (ou Railway, Fly.io), "New Web Service" apontando para este repositório.
   - Build command: `npm install`
   - Start command: `npm start`
   - Variáveis: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY` (o `CORS_ORIGIN` pode ficar em branco/`*`, já não é crítico)
3. Depois do primeiro deploy, na aba "Shell": `npm run migrate` (uma vez só).
4. Pronto — a URL que o Render der (`https://seu-app.onrender.com`) já é o app completo: login, chat, dashboards, documentos.

Não há mais um passo de "fechar CORS" nem uma segunda plataforma (Vercel) —
o build do frontend acontece dentro do mesmo `npm install`, e o mesmo
processo Node serve as duas coisas.

## Estrutura

```
epc-unified/
├── package.json          # scripts orquestram build do frontend
├── src/
│   ├── server.js          # API + serve frontend/dist (mesma origem)
│   ├── db.js
│   ├── migrate.js
│   ├── middleware/auth.js
│   └── routes/ (auth, agents, chat, documents, reports)
├── sql/schema.sql         # tabelas + seed dos 7 agentes aprofundados
└── frontend/
    ├── src/App.jsx        # toda a interface, chamadas relativas /api/*
    └── ... (Vite, manifest PWA, service worker)
```

## Instalar como app no celular/tablet

Mesmo mecanismo de antes (PWA): abra a URL publicada → "Adicionar à tela
inicial" (Android/Chrome) ou "Adicionar à Tela de Início" (iPhone/Safari).
