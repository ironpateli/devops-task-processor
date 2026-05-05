# AWS Integration Guide

## Services
- Amazon ECR for container registry
- Amazon ECS Fargate for container runtime
- Amazon RDS PostgreSQL for primary DB
- Amazon ElastiCache Redis for queue/cache
- AWS Systems Manager Parameter Store or Secrets Manager for secrets

## Jenkins Credentials to Add
- aws-access-key-id
- aws-secret-access-key
- aws-region (string)
- sonar-token (already in use)

## Deployment Flow
1. Jenkins builds `apps/api` and `apps/web`
2. Jenkins runs Sonar scan and waits for quality gate
3. Jenkins builds Docker images
4. Jenkins pushes images to ECR
5. Jenkins forces ECS service new deployment

## Important Sonar/Jenkins Setup
1. Jenkins -> Manage Jenkins -> Configure System -> SonarQube servers
   - Name: `sonar-server`
   - Server URL: `http://localhost:9000` (or your reachable Sonar URL)
   - Token credential: `sonar-token`
2. SonarQube -> Administration -> Webhooks
   - URL: `http://<jenkins-host>/sonarqube-webhook/`
