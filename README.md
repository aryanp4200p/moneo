# Personal Finance Management System with AI Advisor

Core MVP (~40% scope) — working end-to-end. See `Documentation/API_CONTRACTS.md`
for exact request/response shapes.

## What's built (demoable now)

- **Auth** — register/login with JWT (`api/routers/auth.py`)
- **Manual transaction entry** — amount, type, date, note, merchant (`ExpenseForm.jsx`)
- **Categorization flow** — pending queue + "what was this for?" picker (`CategorizePrompt.jsx`)
- **Monthly comparison logic** — plain SQL aggregation + % change, no ML (`services/monthly_comparison.py`)
- **Dashboard** — category pie chart, monthly trend line, insights (`DashboardPage.jsx`)
- **AI advisor** — comparison numbers → natural-language tip via Ollama/OpenAI, with a template fallback if the AI call fails (`services/ai_advisor.py`)

This has been tested end-to-end: register → add transaction → categorize →
monthly comparison → AI advice card, all working against a live backend.

## What's deferred (not built — do not claim as done)

OCR receipts, Android SMS auto-detection, CSV/PDF statement upload,
investment recommender, financial health score, PDF reports. Placeholder
component files exist in the architecture (`InvestmentSuggestionCard.jsx`,
`FinancialHealthScore.jsx`) but are intentionally not wired up yet.

## Run it locally

### Option A — Docker (easiest for a demo)
```bash
docker compose up --build
```
- API: http://localhost:8000 (docs at `/docs`)
- Client: http://localhost:5173
- Postgres: localhost:5432

### Option B — manual

**Backend**
```bash
cd api
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL if not using Docker's Postgres
uvicorn main:app --reload
```
On startup the app auto-creates tables from the SQLAlchemy models (fine for
a demo; swap to `alembic upgrade head` for anything longer-lived).

**Frontend**
```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL should point at the API above
npm run dev
```

### AI advisor note
`AI_PROVIDER` in `api/.env` controls which backend generates tips:
- `ollama` (default) — needs a local Ollama server running (`ollama serve`,
  with `ollama pull llama3.2` or whatever `OLLAMA_MODEL` you set)
- `openai` — set `OPENAI_API_KEY`

If neither is reachable, `ai_advisor.py` falls back to a template sentence
so the feature still demos correctly — this is intentional, not a bug.

## Project layout
See `Documentation/API_CONTRACTS.md` for endpoint contracts and the original
handoff doc for the full architecture and team split.
