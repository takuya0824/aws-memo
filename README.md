# AWS Memo

Markdown で書けるシンプルなメモアプリ。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| バックエンド | Python / FastAPI |
| データベース | RDS PostgreSQL |
| 認証 | Amazon Cognito |
| ホスティング | S3 + CloudFront |
| コンテナ | ECS Fargate + ECR |
| IaC | CloudFormation |
| CI/CD | GitHub Actions |

## アーキテクチャ構成図

[architecture.drawio](./architecture.drawio) を [draw.io](https://app.diagrams.net/) で開いて確認できます。

## インフラ構成

```
GitHub → GitHub Actions → ECR → ECS Fargate (FastAPI)
                       ↓
                  CloudFormation (IaC管理)

ユーザー → CloudFront → S3 (React)
         → ALB → ECS Fargate (FastAPI) → RDS PostgreSQL
                     ↑
                  Cognito (JWT認証)
```

## ディレクトリ構成

```
aws-memo/
├── frontend/              # React + TypeScript
├── backend/               # FastAPI
├── infra/                 # CloudFormation テンプレート
│   ├── vpc.yml            # VPC・サブネット・IGW
│   ├── cognito.yml        # Cognito User Pool
│   ├── rds.yml            # RDS PostgreSQL
│   ├── ecr.yml            # ECR リポジトリ
│   ├── ecs.yml            # ECS Fargate・ALB
│   └── s3.yml             # S3・CloudFront
├── .github/workflows/
│   ├── frontend.yml       # S3へのデプロイ
│   └── backend.yml        # ECR→ECSへのデプロイ
├── docker-compose.yml     # ローカル開発環境
├── .env.example           # 環境変数サンプル
└── architecture.drawio    # アーキテクチャ構成図
```

## セットアップ手順

### 1. ローカル開発

```bash
cp .env.example .env  # 環境変数を設定
docker compose up --build
```

| サービス | URL |
|---|---|
| フロントエンド | http://localhost:5173 |
| バックエンド API | http://localhost:8000 |
| DB | localhost:5433 (postgres/postgres) |

### 2. AWSインフラのデプロイ（CloudFormation）

依存関係の順にデプロイする。

```bash
# 1. VPC
aws cloudformation deploy --template-file infra/vpc.yml --stack-name aws-memo-vpc --region ap-northeast-1

# 2. Cognito
aws cloudformation deploy --template-file infra/cognito.yml --stack-name aws-memo-cognito --region ap-northeast-1

# 3. RDS
aws cloudformation deploy --template-file infra/rds.yml --stack-name aws-memo-rds --region ap-northeast-1 \
  --parameter-overrides DBPassword=<your-password>

# 4. ECR
aws cloudformation deploy --template-file infra/ecr.yml --stack-name aws-memo-ecr --region ap-northeast-1

# ※ ECS デプロイ前にバックエンドイメージを ECR へプッシュする（手順 3 参照）

# 5. ECS（ALB含む）
aws cloudformation deploy --template-file infra/ecs.yml --stack-name aws-memo-ecs --region ap-northeast-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ECRImageUri=<account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/aws-memo-backend:latest \
    DBPassword=<your-password>

# 6. S3 + CloudFront
aws cloudformation deploy --template-file infra/s3.yml --stack-name aws-memo-s3 --region ap-northeast-1
```

### 3. バックエンドのビルド & デプロイ

```bash
# ECR ログイン
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# ビルド & プッシュ（linux/amd64 指定が必要）
docker buildx build --platform linux/amd64 --provenance=false \
  -t <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/aws-memo-backend:latest --push ./backend

# ECS を最新イメージで再デプロイ
aws ecs update-service --cluster aws-memo-cluster --service aws-memo-service \
  --force-new-deployment --region ap-northeast-1
```

### 4. フロントエンドのビルド & デプロイ

```bash
# ビルド
VITE_COGNITO_USER_POOL_ID=<user-pool-id> \
VITE_COGNITO_CLIENT_ID=<client-id> \
VITE_API_BASE_URL=http://<alb-dns> \
npm run build --prefix frontend

# S3 へアップロード
aws s3 sync frontend/dist s3://<s3-bucket> --delete --region ap-northeast-1

# CloudFront キャッシュ削除
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

### 5. GitHub Secrets の設定

リポジトリの **Settings → Secrets and variables → Actions** に登録する。

| Secret名 | 説明 |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS アクセスキー |
| `AWS_SECRET_ACCESS_KEY` | AWS シークレットキー |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Cognito Client ID |
| `API_BASE_URL` | ALB の DNS 名（`http://...`） |
| `ECR_URI` | ECR リポジトリ URI |
| `ECS_CLUSTER` | ECS クラスター名 |
| `ECS_SERVICE` | ECS サービス名 |
| `S3_BUCKET` | フロントエンド用 S3 バケット名 |
| `CF_DISTRIBUTION_ID` | CloudFront ディストリビューション ID |

### 動作確認

```bash
curl http://<alb-dns>/health
# → {"status":"ok"}
```

## CI/CD フロー

- `main` ブランチへの push で自動デプロイ（手動実行も可）
- `backend/` 配下の変更 → ECR にイメージ push → ECS タスク更新
- `frontend/` 配下の変更 → S3 にビルド成果物を sync → CloudFront キャッシュ削除

## 改善点

今回の開発で複雑さを避けるために妥協した点。後続対応の参考として記載する。

### セキュリティ

| 項目 | 現状 | 推奨対応 |
|---|---|---|
| ALB が HTTP のみ | ポート80のみ、HTTPS なし | ACM で証明書を発行し ALB に HTTPS リスナーを追加。独自ドメインが必要 |
| DBパスワードの管理 | CloudFormation パラメータで平文渡し | AWS Secrets Manager に格納し ECS タスクで動的取得 |
| RDS のセキュリティグループ | VPC 全体の CIDR `10.0.0.0/16` を許可 | ECS セキュリティグループIDのみを許可（循環依存を避けるため妥協） |
| CORS 設定 | バックエンドで `allow_origins=["*"]` | CloudFront ドメインのみに絞る |
| WAF | 未設定 | CloudFront または ALB に AWS WAF を適用してボット・SQLi 対策 |

### アーキテクチャ

| 項目 | 現状 | 推奨対応 |
|---|---|---|
| ECS タスクのサブネット | パブリックサブネット配置 | プライベートサブネットに配置し NAT Gateway 経由でアウトバウンド通信 |
| CloudFront → ALB 通信 | HTTP（混在コンテンツ回避のため CloudFront でプロキシ） | ALB を HTTPS 化して直接通信 |
| RDS のマルチ AZ | `MultiAZ: false` | 本番運用では `true` にしてフェイルオーバー対応 |
| ECS のタスク数 | `DesiredCount: 1` | 本番では 2 以上に増やし可用性を確保 |

### 開発・運用

| 項目 | 現状 | 推奨対応 |
|---|---|---|
| CI/CD | GitHub Actions で実装済み | OIDC による認証に移行してアクセスキーを不要にする |
| フロントエンドのバンドルサイズ | 1.3 MB（警告あり） | dynamic import で code splitting を実施 |
| ログ管理 | CloudWatch Logs のみ | X-Ray によるトレーシングや CloudWatch アラームの設定 |
