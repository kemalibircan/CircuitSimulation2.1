# CircuitAI Backend

Production-style Python/FastAPI backend for the AI-powered analog circuit design platform.

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.110 + Uvicorn |
| Database | PostgreSQL 16 + SQLAlchemy 2 (async) |
| Queue | Redis 7 + Celery 5 |
| LLM | OpenAI API (GPT-4o) |
| Simulation | Xyce inside Docker (mock runner included) |
| Migrations | Alembic |
| Schemas | Pydantic v2 |

---

## Quick Start (Local Dev)

### Prerequisites
- Docker + Docker Compose
- Python 3.11+

### 1. Copy environment file

```bash
cd backend/
cp .env.example .env
# Edit .env — set your OPENAI_API_KEY at minimum
```

### 2. Start services

```bash
docker compose up -d postgres redis
```

### 3. Install Python dependencies

```bash
pip install -e ".[dev]"
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the API server

```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Start the Celery worker

```bash
celery -A app.workers.celery_app worker --loglevel=info -Q default,simulation,monte_carlo
```

### 7. Open Swagger docs

→ http://localhost:8000/docs

---

## Running with Docker Compose (full stack)

```bash
docker compose up --build
```

Services started:
- **API**: http://localhost:8000
- **Swagger**: http://localhost:8000/docs
- **Flower** (task monitor): http://localhost:5555
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## Running Tests

```bash
pip install -e ".[dev]"
pytest tests/ -v
```

---

## API Reference

### Runs

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/runs` | Create a design run |
| `GET` | `/api/v1/runs` | List all runs |
| `GET` | `/api/v1/runs/{id}` | Full run detail |
| `GET` | `/api/v1/runs/{id}/status` | Lightweight status poll |
| `GET` | `/api/v1/runs/{id}/timeline` | Step-by-step progress |
| `GET` | `/api/v1/runs/{id}/iterations` | All iterations |
| `GET` | `/api/v1/runs/{id}/netlist` | Generated SPICE netlist |
| `GET` | `/api/v1/runs/{id}/results` | Simulation metrics + charts |
| `GET` | `/api/v1/runs/{id}/messages` | Agent message history |
| `POST` | `/api/v1/runs/{id}/retry` | Retry a failed run |
| `GET` | `/api/v1/runs/{id}/stream` | SSE real-time updates |

### Playground

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/playground/validate` | Validate canvas circuit |
| `POST` | `/api/v1/playground/netlist` | Canvas → SPICE netlist |
| `POST` | `/api/v1/playground/simulate` | Queue canvas simulation |
| `POST` | `/api/v1/playground/chat-command` | NL command → canvas patches |
| `POST` | `/api/v1/playground/apply-command` | Apply canvas patches |
| `GET` | `/api/v1/playground/{session_id}` | Get session state |
| `PATCH` | `/api/v1/playground/{session_id}` | Update session canvas state |

---

## Frontend Integration

The frontend Next.js app is at `../` (one level up). To connect:

1. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` in the frontend `.env.local`
2. Replace mock data imports with `fetch` calls to the endpoints above
3. All response shapes exactly match the TypeScript interfaces in `../types/circuit.ts` and `../types/playground.ts`

### Create Run (POST /api/v1/runs)

```typescript
const response = await fetch(`${API_URL}/runs`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    natural_language_prompt: prompt,
    category: category,
    supply_voltage: 1.8,
    technology: 'TSMC 180nm',
    temperature: 27,
    constraints: metrics.map(m => ({
      metric: m.label,
      target: parseFloat(m.value),
      unit: m.unit,
      priority: m.priority,
    })),
  }),
});
const { id } = await response.json();
```

### Poll Status (GET /api/v1/runs/{id}/status)

```typescript
const { status, current_step, progress_percent } = await fetch(`${API_URL}/runs/${runId}/status`).then(r => r.json());
```

### Real-time Updates (SSE)

```typescript
const source = new EventSource(`${API_URL}/runs/${runId}/stream`);
source.onmessage = (e) => {
  const update = JSON.parse(e.data);
  // update.status, update.current_step
};
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory
│   ├── api/v1/
│   │   ├── runs.py          # /runs endpoints
│   │   └── playground.py    # /playground endpoints
│   ├── core/                # Config, logging, security, errors
│   ├── db/                  # SQLAlchemy engine + session
│   ├── models/              # ORM models (10 tables)
│   ├── schemas/             # Pydantic v2 I/O schemas
│   ├── services/
│   │   ├── openai/          # LLM client, prompts, task dispatch
│   │   ├── netlist/         # Generator + validator
│   │   ├── simulation/      # Xyce Docker runner + mock
│   │   ├── analysis/        # Output parser + metrics extractor
│   │   ├── optimization/    # Iterative loop coordinator
│   │   └── playground/      # Canvas-to-netlist converter
│   ├── tasks/               # Celery tasks
│   │   └── orchestration.py # Main 8-step pipeline task
│   ├── workers/
│   │   └── celery_app.py    # Celery app factory
│   └── utils/               # ID helpers, artifact storage
├── alembic/                 # Database migrations
├── docker/                  # Dockerfiles (api, worker, xyce)
├── tests/                   # pytest test suite
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

---

## Xyce Integration

The backend uses a **mock Xyce runner** by default (`USE_MOCK_XYCE=true`).

To use real Xyce:
1. Build a Docker image with Xyce installed and tag it `xyce:latest`
2. Set `USE_MOCK_XYCE=false` in `.env`
3. The `XyceRunner` in `app/services/simulation/runner.py` will use Docker SDK to run it in an isolated container with the netlist mounted

---

## Environment Variables

See [.env.example](.env.example) for the full reference.

Key variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `DATABASE_URL` | PostgreSQL async connection string |
| `REDIS_URL` | Redis connection for pub/sub |
| `USE_MOCK_XYCE` | `true` = use mock runner, `false` = real Docker Xyce |
| `MAX_OPTIMIZATION_ITERATIONS` | Max optimization loop iterations (default: 5) |
| `MC_SAMPLE_COUNT` | Monte Carlo sample count (default: 200) |
