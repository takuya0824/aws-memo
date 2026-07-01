# AWS Memo

ZennやQiitaに投稿する前の技術記事下書きをMarkdownで管理するアプリ。

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
├── frontend/          # React + TypeScript
├── backend/           # FastAPI
├── infra/             # CloudFormation テンプレート
│   ├── vpc.yml        # VPC・サブネット・IGW
│   ├── cognito.yml    # Cognito User Pool
│   ├── rds.yml        # RDS PostgreSQL
│   └── ecs.yml        # ECS Fargate・ALB
└── .github/workflows/
    ├── frontend.yml   # S3へのデプロイ
    └── backend.yml    # ECR→ECSへのデプロイ
```

## セットアップ手順

### 1. インフラのデプロイ（CloudFormation）

```bash
# VPC
aws cloudformation deploy \
  --template-file infra/vpc.yml \
  --stack-name aws-memo-vpc

# Cognito
aws cloudformation deploy \
  --template-file infra/cognito.yml \
  --stack-name aws-memo-cognito

# RDS
aws cloudformation deploy \
  --template-file infra/rds.yml \
  --stack-name aws-memo-rds \
  --parameter-overrides DBPassword=<your-password>

# ECS (初回はECRにイメージをpushしてから)
aws cloudformation deploy \
  --template-file infra/ecs.yml \
  --stack-name aws-memo-ecs \
  --parameter-overrides ECRImageUri=<ecr-image-uri> DBPassword=<your-password> \
  --capabilities CAPABILITY_IAM
```

### 2. GitHub Secrets の設定

| Secret名 | 説明 |
|---|---|
| AWS_ACCESS_KEY_ID | AWS アクセスキー |
| AWS_SECRET_ACCESS_KEY | AWS シークレットキー |
| DB_PASSWORD | RDS パスワード |
| COGNITO_USER_POOL_ID | Cognito User Pool ID |
| COGNITO_CLIENT_ID | Cognito Client ID |
| API_BASE_URL | ALBのDNS名 |
| S3_BUCKET_NAME | フロントエンド用S3バケット名 |
| CLOUDFRONT_DISTRIBUTION_ID | CloudFrontディストリビューションID |

### 3. ローカル開発

```bash
# バックエンド
cd backend
cp .env.example .env  # 環境変数を設定
pip install -r requirements.txt
uvicorn app.main:app --reload

# フロントエンド
cd frontend
cp .env.example .env  # 環境変数を設定
npm install
npm run dev
```

## CI/CD フロー

- `main`ブランチへのpushで自動デプロイ
- `backend/`配下の変更 → ECRにイメージpush → ECSタスク更新
- `frontend/`配下の変更 → S3にビルド成果物をsync → CloudFrontキャッシュ削除

## 実施済み内容

### ローカル開発環境（Docker Compose）

```bash
# 起動
docker compose up --build

# 停止
docker compose down
```

アクセス先:
- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:8000
- DB: localhost:5433 (postgres/postgres)

---

### AWSインフラのデプロイ（CloudFormation）

#### 1. VPC

```bash
aws cloudformation deploy \
  --template-file infra/vpc.yml \
  --stack-name aws-memo-vpc \
  --region ap-northeast-1
```

#### 2. Cognito

```bash
aws cloudformation deploy \
  --template-file infra/cognito.yml \
  --stack-name aws-memo-cognito \
  --region ap-northeast-1
```

#### 3. RDS

```bash
aws cloudformation deploy \
  --template-file infra/rds.yml \
  --stack-name aws-memo-rds \
  --region ap-northeast-1 \
  --parameter-overrides DBPassword=<your-password>
```

#### 4. ECR

```bash
aws cloudformation deploy \
  --template-file infra/ecr.yml \
  --stack-name aws-memo-ecr \
  --region ap-northeast-1
```

#### 5. バックエンドイメージのビルド & ECR へのプッシュ

```bash
# ECR ログイン（<account-id> は自身の AWS アカウント ID）
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin \
    <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# linux/amd64 でビルドしてプッシュ（ECS Fargate 要件）
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/aws-memo-backend:latest \
  --push \
  ./backend
```

#### 6. ECS

```bash
aws cloudformation deploy \
  --template-file infra/ecs.yml \
  --stack-name aws-memo-ecs \
  --region ap-northeast-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    ECRImageUri=<account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/aws-memo-backend:latest \
    DBPassword=<your-password>
```

#### 7. ECS タスクの強制再デプロイ（イメージ更新時）

```bash
aws ecs update-service \
  --cluster aws-memo-cluster \
  --service aws-memo-service \
  --force-new-deployment \
  --region ap-northeast-1
```

---

#### 8. S3 + CloudFront

```bash
aws cloudformation deploy \
  --template-file infra/s3.yml \
  --stack-name aws-memo-s3 \
  --region ap-northeast-1
```

#### 9. フロントエンドのビルド & S3 へアップロード

```bash
# ビルド（環境変数は .env を参照）
npm run build --prefix frontend

# S3 へアップロード（<s3-bucket> は CloudFormation の Output を確認）
aws s3 sync frontend/dist s3://<s3-bucket> \
  --delete \
  --region ap-northeast-1
```

#### 10. CloudFront キャッシュ削除（デプロイ後）

```bash
# <distribution-id> は CloudFormation の Output を確認
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*" \
  --region ap-northeast-1
```

---

### 動作確認

```bash
# ALB ヘルスチェック（<alb-dns> は CloudFormation の Output を確認）
curl http://<alb-dns>/health
# → {"status":"ok"}
```

---

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
| CI/CD | 未設定 | GitHub Actions でプッシュ時に自動ビルド・デプロイ |
| フロントエンドのバンドルサイズ | 1.3 MB（警告あり） | dynamic import で code splitting を実施 |
| ログ管理 | CloudWatch Logs のみ | X-Ray によるトレーシングや CloudWatch アラームの設定 |
