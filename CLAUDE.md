# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

AWS Memo — a Markdown memo app. React + TypeScript frontend, FastAPI backend, RDS PostgreSQL, Cognito auth, deployed on ECS Fargate behind CloudFront/S3, provisioned via CloudFormation.

## Common commands

### Local development (Docker)

```bash
cp .env.example .env       # set env vars first
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- DB: localhost:5433 (postgres/postgres)

### Backend (from `backend/`)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload           # run API locally (needs DATABASE_URL, COGNITO_* env vars)
pytest tests/ -v                        # run all tests
pytest tests/test_memos.py -v           # run a single test file
pytest tests/test_memos.py::test_name -v  # run a single test
```

Tests use SQLite (`test.db`) and override both `get_db` and `get_current_user` (see `tests/conftest.py`), so no live DB or Cognito connection is needed to run them.

### Frontend (from `frontend/`)

```bash
npm install
npm run dev        # Vite dev server, proxies /api to API_TARGET (default http://localhost:8000)
npm run build       # tsc typecheck + vite build
npm run preview
```

## Architecture

**Request flow (prod):** CloudFront serves the built React app from S3 and also proxies `/api/*` to an ALB in front of ECS Fargate (running the FastAPI container), which talks to RDS PostgreSQL. Cognito issues the JWT used for API auth. This is why the frontend backend calls use relative paths (`/api/...`) instead of an absolute base URL — both prod (CloudFront) and local dev (Vite proxy in `vite.config.ts`, target `API_TARGET`) route `/api` to the backend transparently.

**Backend (`backend/app/`):**
- `main.py` — FastAPI app setup, CORS, mounts `routers/memos.py` under `/api/memos`, `Base.metadata.create_all` runs on startup (no migration tool — schema changes are applied directly via SQLAlchemy models).
- `auth.py` — `get_current_user` dependency: fetches Cognito JWKS, verifies the bearer JWT, returns the Cognito `sub` as the user id. Every memo endpoint depends on this, and every query is scoped by `user_id` — there is no admin/cross-user access.
- `models.py` / `schemas.py` — single `Memo` SQLAlchemy model; Pydantic schemas split into `MemoCreate`/`MemoUpdate`/`MemoResponse`.
- `config.py` — `pydantic-settings` `Settings`, reads from `.env` (`database_url`, `cognito_user_pool_id`, `cognito_client_id`, `cognito_region`). Required at import time — the app will fail to start without them (tests set these as env vars before import, see `conftest.py`).
- `routers/memos.py` — CRUD for memos, all filtered by the authenticated `user_id`.

**Frontend (`frontend/src/`):**
- `contexts/AuthContext.tsx` — wraps `amazon-cognito-identity-js` directly (no Amplify). Owns the Cognito `CognitoUserPool`, session/token state, login/signUp/confirmSignUp/logout.
- `hooks/useApi.ts` — returns an axios instance with the current Cognito ID token attached as `Authorization: Bearer`, memoized on `token`.
- `App.tsx` — route-based code splitting via `React.lazy`; `PrivateRoute` gates memo pages behind `isAuthenticated`.
- `pages/` — `Login`, `Register`, `Confirm` (Cognito signup flow) and `MemoList`/`MemoEditor` (the memo CRUD UI, using `@uiw/react-md-editor`).

**Infra (`infra/*.yml`, CloudFormation):** deployed in dependency order — `vpc` → `cognito` → `rds` → `ecr` → (push backend image) → `ecs` (includes ALB) → `s3` (includes CloudFront). See README for exact `aws cloudformation deploy` commands and required parameters/secrets.

**CI/CD (`.github/workflows/`):** path-filtered — changes under `backend/` trigger `backend.yml` (run pytest, build/push image to ECR, force ECS redeployment, wait for stability); changes under `frontend/` trigger `frontend.yml` (build, sync to S3, invalidate CloudFront). Deploys only run on push to `main`; on PRs to `main` / `develop`, `backend.yml` runs only the pytest job and `frontend.yml` only builds. `branch-policy.yml` checks PR direction and branch names on every PR to `main` / `develop`.

## Branch workflow

Follows the user-level `git-branch-flow` skill (read it before any branch, commit, push or PR work):
- `main` = production, `develop` = staging. Never commit or push to either directly; both are protected by GitHub rulesets (PR required, no force push, no deletion).
- Work branches are cut from `develop`: `feature/<issue>-<kebab-description>` or `fix/<issue>-<kebab-description>` (e.g. `feature/12-add-memo-search`), PR'd into `develop`.
- Release = PR `develop` → `main`. Urgent production fixes = `hotfix/*` cut from `main`, PR'd into `main` and then into `develop`.
- Commit messages start with 【追加】【修正】【更新】【削除】【リファクタ】【ドキュメント】【設定】【テスト】.
- Use the user-level `auto-pr` skill to commit, push and open PRs.

## Known compromises (see README "改善点" for full list)

These are intentional simplifications for this project, not oversights — don't silently "fix" them without flagging it, since some (e.g. RDS security group CIDR) trade correctness for avoiding circular CloudFormation dependencies:
- ALB is HTTP-only (no ACM cert); CloudFront proxies HTTP to avoid mixed content.
- DB password passed as a plain CloudFormation parameter (not Secrets Manager).
- Backend CORS is `allow_origins=["*"]`.
- ECS tasks run in public subnets with `DesiredCount: 1`; RDS is single-AZ.
