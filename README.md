# Distributed Task Processor v2

This repo now includes a production-style app stack:

- `apps/web`: Next.js frontend
- `apps/api`: Express API with PostgreSQL + Redis integration
- `docker-compose.dev.yml`: local full stack runtime
- `infra/aws`: ECS task definition and cloud deployment notes

## Local Run

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Web: http://localhost:3000  
API Health: http://localhost:4000/health

## Jenkins Pipeline

Pipeline stages:
1. Checkout
2. Install dependencies
3. API tests
4. SonarQube analysis
5. Quality Gate (`waitForQualityGate`)
6. Docker image build
7. ECR push (when AWS vars exist)
8. ECS deployment (when cluster/service vars exist)

## Notes

- Quality Gate requires Sonar webhook configured in SonarQube.
- AWS deploy stages run only when required env vars are present.
