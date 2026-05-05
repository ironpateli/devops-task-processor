# Distributed Task Processor v2

Production-ready full-stack task processing application with DevOps pipeline.

## 📋 Architecture

- **Frontend**: Next.js web app (port 3000)
- **Backend**: Express API with PostgreSQL + Redis (port 4000)
- **Database**: PostgreSQL with persistent volumes
- **Cache/Queue**: Redis for job queueing
- **CI/CD**: Jenkins pipeline with SonarQube quality gates
- **Cloud**: AWS ECS/Fargate deployment ready

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Local Development

1. **Clone the repository**
```bash
git clone <repo-url>
cd devops-task-processor
```

2. **Create environment file**
```bash
cp .env.example .env
# Edit .env with your local values (defaults work for local dev)
```

3. **Start the stack**
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

4. **Access services**
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

### Development Commands

```bash
# View logs
docker compose -f docker-compose.dev.yml logs -f api

# Stop services
docker compose -f docker-compose.dev.yml down

# Rebuild images
docker compose -f docker-compose.dev.yml build --no-cache

# Run tests
npm --prefix apps/api test
```

## 📦 API Endpoints

### Health Check
```bash
GET /health
# Response: { "status": "ok", "service": "api" }
```

### Jobs
```bash
# List jobs
GET /api/jobs?limit=100&offset=0

# Get job by ID
GET /api/jobs/{id}

# Create job
POST /api/jobs
# Body: { "payload": "task data" }

# Update job status
PATCH /api/jobs/{id}
# Body: { "status": "COMPLETED" }
```

**Valid Job Statuses**: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`

## 🔧 Configuration

### Environment Variables

```env
# Application
NODE_ENV=development
API_PORT=4000
WEB_PORT=3000

# Database
POSTGRES_DB=task_processor
POSTGRES_USER=task_user
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_URL=redis://redis:6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000

# AWS (for production deployment)
AWS_REGION=ap-south-1
AWS_ACCOUNT_ID=your_account_id
ECS_CLUSTER=your_cluster
ECS_SERVICE=your_service
```

See `.env.example` for full list.

## 🔒 Security

### Important Security Notes
- **Never** commit `.env` files
- Change default database passwords in production
- Use AWS IAM roles for credentials
- Enable encryption for databases and caches
- See [SECURITY.md](./SECURITY.md) for detailed guidelines

### Credentials Management
For Jenkins deployment, configure credentials in Jenkins UI:
- `aws-region`
- `aws-account-id`
- `aws-access-key-id`
- `aws-secret-access-key`
- `sonar-token`

## 🔄 CI/CD Pipeline

### Jenkins Pipeline Stages
1. **Checkout** - Clone repository
2. **Install Dependencies** - npm ci for all apps
3. **Lint and Test** - Run API tests
4. **SonarQube Analysis** - Code quality scanning
5. **Quality Gate Check** - Wait for SonarQube results
6. **Build Docker Images** - Build API and Web containers
7. **Push to ECR** - Push images to AWS container registry
8. **Deploy to ECS** - Update ECS service (production only)

### SonarQube Setup
1. Configure SonarQube server in Jenkins:
   - Manage Jenkins → Configure System → SonarQube servers
   - URL: `http://localhost:9000` (or your Sonar instance)
   - Token: Add Jenkins credential `sonar-token`

2. Configure webhook in SonarQube:
   - Administration → Webhooks
   - URL: `http://jenkins-host/sonarqube-webhook/`

## 📁 Project Structure

```
.
├── apps/
│   ├── api/              # Express backend
│   │   ├── src/
│   │   ├── tests/        # API tests
│   │   └── Dockerfile
│   └── web/              # Next.js frontend
│       └── Dockerfile
├── infra/
│   └── aws/              # AWS deployment configs
├── docker-compose.dev.yml
├── Jenkinsfile           # CI/CD pipeline
├── sonar-project.properties
└── .env.example
```

## 🧪 Testing

```bash
# Run API tests
npm --prefix apps/api test

# Watch mode
npm --prefix apps/api run test:watch
```

## 📊 Monitoring

### Health Checks
- API health: `GET /health`
- Docker Compose includes health checks for all services
- Services automatically restart on failure

### Logs
```bash
# View all logs
docker compose -f docker-compose.dev.yml logs -f

# View specific service
docker compose -f docker-compose.dev.yml logs -f api
```

## 🚢 Production Deployment

### AWS ECS Deployment Flow
1. Jenkins builds Docker images
2. Images pushed to AWS ECR
3. SonarQube quality gate validated
4. ECS service updated with new images
5. Rolling deployment with health checks

### Prerequisites
- AWS ECR repositories created
- ECS cluster and service configured
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- IAM roles and policies configured

## 🐛 Troubleshooting

### API won't start
```bash
# Check database connectivity
docker compose -f docker-compose.dev.yml logs postgres

# Check Redis
docker compose -f docker-compose.dev.yml logs redis
```

### Database connection errors
- Verify `DATABASE_URL` in .env
- Check PostgreSQL is running: `docker compose -f docker-compose.dev.yml logs postgres`
- Ensure credentials match in docker-compose.dev.yml

### Redis connection errors
- Verify `REDIS_URL` in .env
- Check Redis is running: `docker compose -f docker-compose.dev.yml logs redis`

## 📝 Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm --prefix apps/api test`
4. Push and create PR
5. Pipeline will run automatically

## 📄 License

See LICENSE file

## 🤝 Support

For issues and questions, please check:
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [PROJECT_EXPLANATION.md](./PROJECT_EXPLANATION.md) - Detailed project info
- AWS documentation for cloud resources
