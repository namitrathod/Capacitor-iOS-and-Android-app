## SplitKit — simplified Splitwise-style app

Full-stack template reworked into a **bill-splitting** app: **Angular + Material** frontend, **FastAPI + SQLModel** backend, **PostgreSQL**.

### What you can do

- **Register / log in**
- **Create groups** (trip, apartment, etc.) and **invite members by email** (they must already have an account)
- **Add expenses**: who paid, amount, description, **split evenly** among selected members
- See **balances** (who is up/down) and **suggested settlements** (minimum transfers)

### Project layout

- **`dxweb/`** — Angular app (brand: **SplitKit**). API URL: `src/environments/environment.ts` (`apiUrl`, e.g. `http://localhost:8000/api/v1`). For a physical device, use your PC’s LAN IP and ensure the backend allows CORS / runs with `ENVIRONMENT=local` for dev.
- **`dxbackend/`** — FastAPI app (`app/main.py`). Main API under `/api/v1`: `login`, `users`, **`groups`** (split groups & expenses).

### Backend dev

From `dxbackend/` (with venv and dependencies installed per your team’s setup):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Configure `.env` (see backend template) including `FIRST_SUPERUSER`, database URLs, and optionally `USERS_OPEN_REGISTRATION=true` for open signup.

New DB tables: `split_group`, `group_member`, `expense`, `expenseshare`. Alembic revision `f7a2b9c1d4e5` replaces the old `item` (and `sale` if present) schema; fresh installs also get tables via `SQLModel.metadata.create_all` in `init_db`.

### Frontend dev

From `dxweb/`:

```bash
npm install
ng serve
```

Sign in, then open **Groups** to use the app.

UI is **mobile-first**: safe-area insets, full-width content on phones (nav is a slide-over drawer), `100dvh` on auth, 16px base text on small screens.

### Local demo users (PostgreSQL)

When `ENVIRONMENT=local` and `SEED_DEMO_USERS=true` (default), the API creates **four test accounts** on startup if they don’t exist yet:

| Email | Display name | Password (all the same) |
|-------|----------------|-------------------------|
| `split1@splitkit.test` | Alex | `Test1234!` |
| `split2@splitkit.test` | Blake | `Test1234!` |
| `split3@splitkit.test` | Casey | `Test1234!` |
| `split4@splitkit.test` | Dana | `Test1234!` |

**Try it:** log in as `split1@splitkit.test`, create a group, and in “Add people by email” paste `split2@splitkit.test`, `split3@splitkit.test`, etc. (comma or newline). Then add expenses and open **Balances**.

To disable seeding, set `SEED_DEMO_USERS=false` in `dxbackend/.env`.

### Legacy

The previous starter (users CRUD, products/items, sales) has been **removed** in favor of the split-expense domain.
