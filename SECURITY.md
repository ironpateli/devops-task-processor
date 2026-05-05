# Security Guidelines

## 🔐 Security Best Practices

### 1. Credentials Management

#### ❌ NEVER do this:
```
- Commit .env files
- Hardcode API keys in code
- Store secrets in docker-compose files
- Commit jenkins.war or sensitive files
```

#### ✅ DO this instead:
```
- Use .env.example as template
- Store secrets in Jenkins credentials store
- Use AWS Secrets Manager for production
- Use AWS IAM roles for EC2/ECS instances
- Use Parameter Store for non-sensitive config
```

### 2. Environment Variables

**Local Development:**
```bash
cp .env.example .env
# Edit .env with development values
```

**Production Deployment:**
- Use AWS Secrets Manager
- Use Jenkins credentials
- Never commit .env files

### 3. Database Security

#### PostgreSQL
```yaml
# ❌ Bad - exposed to world
ports:
  - "5432:5432"

# ✅ Good - internal network only
networks:
  - task-network

# Change default credentials
POSTGRES_PASSWORD: changeme  # -> Use strong password
```

#### Authentication
- Change default passwords immediately
- Use IAM database authentication in RDS
- Enable SSL/TLS for connections
- Restrict database access with security groups

### 4. Redis Security

```yaml
# ✅ Good practices
- Run on internal network only
- Enable AUTH with strong password
- Use SSL/TLS for connections
- Disable dangerous commands (FLUSHDB, etc.)
```

**Production Redis (ElastiCache):**
```
- Enable encryption at rest
- Enable encryption in transit
- Enable auth tokens
- Use VPC subnets with security groups
```

### 5. API Security

#### Input Validation ✅
- Validate payload length (10KB limit)
- Validate job status against whitelist
- Validate job ID is positive integer
- Reject malformed requests

#### Error Handling ✅
- Don't expose sensitive error details to client
- Log errors server-side for debugging
- Return generic error messages in production

#### CORS Configuration ✅
```javascript
// ✅ Good - specify allowed origins
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

// ❌ Bad - allow all origins
app.use(cors());
```

### 6. Docker Security

#### Image Security
```dockerfile
# ✅ Good
FROM node:20-alpine  # Use minimal base image
RUN npm ci            # Use clean install
USER node            # Don't run as root

# ❌ Bad
FROM node:20          # Bloated image
RUN npm install       # May not match lock file
# Running as root
```

#### Registry Security
- Use private ECR repositories
- Enable image scanning
- Use image signing with Cosign
- Implement least privilege IAM roles

### 7. Jenkins Security

#### Credentials ✅
```groovy
// ✅ Good - use credentials binding
withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
  // AWS commands here
}

// ✅ Good - use environment variables
environment {
  AWS_REGION = credentials('aws-region')
}

// ❌ Bad - hardcoded paths
'JAVA_HOME=C:\\Users\\asus\\.sonar\\cache\\...'
```

#### Pipeline Security ✅
- Restrict job execution to specific agents
- Use declarative pipeline syntax
- Enable audit logging
- Use role-based access control (RBAC)
- Enable Jenkins security matrix

#### SonarQube Setup ✅
```groovy
// Configure in Jenkins:
// Manage Jenkins > Configure System > SonarQube servers
// - Name: sonar-server
// - URL: http://sonar-server:9000
// - Token: Use Jenkins credential
```

### 8. AWS Deployment Security

#### IAM Roles & Policies ✅
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService"
      ],
      "Resource": "arn:aws:ecs:region:account-id:service/cluster/service"
    }
  ]
}
```

#### RDS PostgreSQL ✅
- Enable IAM database authentication
- Enable automated backups
- Enable encryption at rest
- Use VPC with security groups
- Enable Multi-AZ for production
- Enable enhanced monitoring

#### ElastiCache Redis ✅
- Enable encryption at rest
- Enable encryption in transit
- Use VPC with security groups
- Enable auth tokens
- Regular backups to S3
- Parameter groups with AUTH

### 9. Network Security

#### Docker Network ✅
```yaml
services:
  api:
    networks:
      - task-network
  postgres:
    networks:
      - task-network

networks:
  task-network:
    driver: bridge
```

#### AWS Security Groups ✅
```
- API: Allow 4000 from ALB only
- Database: Allow 5432 from API security group only
- Redis: Allow 6379 from API security group only
- ALB: Allow 80/443 from internet
```

### 10. Code Review & Quality

#### SonarQube Analysis ✅
- Security hotspots review
- OWASP Top 10 checks
- Code quality gates
- Dependency vulnerabilities

#### Dependencies ✅
```bash
# Check for known vulnerabilities
npm audit
npm audit fix

# Keep dependencies updated
npm update
npm outdated
```

### 11. Logging & Monitoring

#### Application Logs ✅
- Log authentication attempts
- Log failed requests
- Don't log sensitive data (passwords, tokens)
- Use structured logging (JSON format)

#### CloudWatch Logs ✅
- Aggregate logs from all services
- Set up alarms for errors
- Regular log retention policy
- Enable log encryption

### 12. Incident Response

#### What to do if compromised:
1. **Immediately rotate credentials**
2. **Revoke tokens** in Jenkins and SonarQube
3. **Change database passwords**
4. **Rotate AWS access keys**
5. **Review CloudWatch logs** for suspicious activity
6. **Re-deploy** with new credentials
7. **Audit git history** for leaked secrets

#### Detection of compromise:
- Unexpected resources created in AWS
- Unusual CloudWatch log patterns
- Failed authentication attempts
- Unauthorized deployments
- Unexpected database queries

### 13. Production Checklist

Before deploying to production:

- [ ] All credentials in secrets manager
- [ ] HTTPS/TLS enabled
- [ ] Database encryption enabled
- [ ] RDS backups configured
- [ ] CloudWatch monitoring setup
- [ ] WAF enabled on ALB
- [ ] VPC security groups configured
- [ ] IAM policies follow least privilege
- [ ] SonarQube quality gates passing
- [ ] Security group rules reviewed
- [ ] Encryption in transit enabled
- [ ] Logging and audit trail enabled
- [ ] Incident response plan ready

## 🔍 Security Audit

Run periodic security audits:

```bash
# Check npm vulnerabilities
npm audit

# Check Docker image vulnerabilities
docker scan task-processor-api:latest

# Review SonarQube security hotspots
# Check AWS CloudTrail for suspicious activity
# Review IAM policy permissions
```

## 📚 Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Docker Security](https://docs.docker.com/engine/security/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

## 🚨 Report Security Issues

If you discover a security vulnerability, please email security@example.com with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Do not open public issues for security vulnerabilities.**
