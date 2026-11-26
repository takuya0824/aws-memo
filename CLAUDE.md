# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code（claude.ai/code）向けの案内です。

## プロジェクトの概要

AWS Memo — Markdown で書けるメモアプリ。フロントエンドは React + TypeScript、バックエンドは FastAPI、DB は RDS PostgreSQL、認証は Cognito。CloudFront / S3 の後ろの ECS Fargate にデプロイし、インフラは CloudFormation で管理している。

## よく使うコマンド

### ローカル開発（Docker）

```bash
cp .env.example .env       # 先に環境変数を設定する
docker compose up --build
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000
- DB: localhost:5433（postgres/postgres）

### バックエンド（`backend/` で実行）

```bash
pip install -r requirements-dev.txt     # テスト用の依存も入る（本番のイメージは requirements.txt だけを使う）
uvicorn app.main:app --reload           # API をローカルで起動（DATABASE_URL と COGNITO_* の環境変数が必要）
pytest tests/ -v                        # すべてのテストを実行
pytest tests/test_memos.py -v           # 1 ファイルだけ実行
pytest tests/test_memos.py::test_name -v  # 1 つのテストだけ実行
```

テストは SQLite（`test.db`）を使い、`get_db` と `get_current_user` の両方を差し替えている（`tests/conftest.py` を参照）。そのため、実際の DB や Cognito に接続しなくてもテストを実行できる。

### フロントエンド（`frontend/` で実行）

```bash
npm install
npm run dev        # Vite の開発サーバー。/api を API_TARGET（既定は http://localhost:8000）へ転送する
npm run build       # tsc の型チェック + vite build
npm run preview
```

## アーキテクチャ

**リクエストの流れ（本番）:** CloudFront が S3 からビルド済みの React アプリを配信し、あわせて `/api/*` を ECS Fargate（FastAPI のコンテナ）の前にある ALB へ転送する。FastAPI は RDS PostgreSQL に接続する。API の認証には Cognito が発行する JWT を使う。フロントエンドからバックエンドへの呼び出しが絶対 URL ではなく相対パス（`/api/...`）になっているのはこのため。本番（CloudFront）でもローカル開発（`vite.config.ts` の Vite の proxy、転送先は `API_TARGET`）でも、`/api` はそのままバックエンドに届く。

**バックエンド（`backend/app/`）:**
- `main.py` — FastAPI アプリの設定、CORS、`routers/memos.py` を `/api/memos` にマウント。起動時に `Base.metadata.create_all` を実行する（マイグレーションツールはなく、スキーマの変更は SQLAlchemy のモデルから直接反映される）。
- `auth.py` — 依存関数 `get_current_user`。Cognito の JWKS を取得して Bearer の JWT を検証し、Cognito の `sub` をユーザー ID として返す。すべてのメモのエンドポイントがこれに依存し、すべてのクエリが `user_id` で絞り込まれる。管理者向けの、ユーザーをまたいだアクセスはない。
- `models.py` / `schemas.py` — SQLAlchemy のモデルは `Memo` の 1 つだけ。Pydantic のスキーマは `MemoCreate` / `MemoUpdate` / `MemoResponse` に分かれている。
- `config.py` — `pydantic-settings` の `Settings`。`.env` から読む（`database_url`、`cognito_user_pool_id`、`cognito_client_id`、`cognito_region`）。import の時点で必須なので、これらがないとアプリは起動しない（テストでは import の前に環境変数として設定している。`conftest.py` を参照）。
- `routers/memos.py` — メモの CRUD。すべて認証済みの `user_id` で絞り込む。

**フロントエンド（`frontend/src/`）:**
- `contexts/AuthContext.tsx` — `amazon-cognito-identity-js` を直接使う（Amplify は使っていない）。Cognito の `CognitoUserPool`、セッションとトークンの状態、login / signUp / confirmSignUp / logout を持つ。
- `hooks/useApi.ts` — 現在の Cognito の ID トークンを `Authorization: Bearer` に付けた axios のインスタンスを返す。`token` が変わったときだけ作り直す。
- `App.tsx` — `React.lazy` による画面ごとのコード分割。`PrivateRoute` で、メモの画面を `isAuthenticated` のときだけ表示する。
- `pages/` — `Login`、`Register`、`Confirm`（Cognito の新規登録の流れ）と、`MemoList` / `MemoEditor`（メモの CRUD の画面。`@uiw/react-md-editor` を使用）。

**インフラ（`infra/*.yml`、CloudFormation）:** 依存関係の順にデプロイする — `vpc` → `cognito` → `rds` → `ecr` →（バックエンドのイメージを push）→ `ecs`（ALB を含む）→ `s3`（CloudFront を含む）。`aws cloudformation deploy` の具体的なコマンドと、必要なパラメータ・Secrets は README を参照。

**CI/CD（`.github/workflows/`）:** パスで絞り込んでいる。`backend/` 以下の変更で `backend.yml` が動き（pytest の実行、ECR へのイメージの build / push、ECS の強制再デプロイ、安定するまで待機）、`frontend/` 以下の変更で `frontend.yml` が動く（ビルド、S3 への sync、CloudFront のキャッシュ削除）。デプロイは main への push（または main を選んだ手動実行）のときだけ。main / develop 向けの PR では、`backend.yml` は pytest のジョブだけ、`frontend.yml` はビルドだけを実行する。`branch-policy.yml` は、main / develop 向けのすべての PR で、PR の向きとブランチ名を検査する。

## ブランチ運用

ユーザー全体の `git-branch-flow` スキルに従う（ブランチ・コミット・push・PR の作業の前に読む）:
- `main` = 本番、`develop` = ステージング。どちらにも直接コミット・push しない。どちらも GitHub のルールセットで保護している（PR 必須、force push 禁止、削除禁止）。
- 作業ブランチは `develop` から切る: `feature/<Issue番号>-<内容（ケバブケース）>` または `fix/<Issue番号>-<内容>`（例: `feature/12-add-memo-search`）。PR 先は `develop`。
- リリース = `develop` → `main` の PR。本番の緊急修正 = `main` から `hotfix/*` を切り、`main` へ PR を出したあと `develop` にも PR を出す。
- コミットメッセージは【追加】【修正】【更新】【削除】【リファクタ】【ドキュメント】【設定】【テスト】のどれかで始める。
- コミット・push・PR の作成には、ユーザー全体の `auto-pr` スキルを使う。

## 意図的な妥協点（全体は README の「改善点」を参照）

これらは見落としではなく、このプロジェクトのために意図して単純にしたもの。断りなく「直さない」こと。中には（RDS のセキュリティグループの CIDR など）、CloudFormation の循環依存を避けるために正しさを犠牲にしているものもある:
- ALB は HTTP のみ（ACM の証明書なし）。混在コンテンツを避けるため、CloudFront が HTTP で転送している。
- DB のパスワードは、CloudFormation のパラメータとして平文で渡している（Secrets Manager は使っていない）。
- バックエンドの CORS は `allow_origins=["*"]`。
- ECS のタスクはパブリックサブネットで `DesiredCount: 1`。RDS はシングル AZ。
