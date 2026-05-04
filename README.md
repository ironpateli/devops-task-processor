# Distributed Task Processor

A networking and distributed systems project demonstrating a Master/Worker architecture. This project uses `docker-compose` to spin up a single Master Node and multiple Worker Nodes that communicate over an internal Docker network.

## Architecture
- **Master Node:** Exposes a REST API on port `3000` and serves a UI dashboard. It holds a queue of jobs.
- **Worker Node:** Headless Node.js scripts that poll the Master Node for jobs, perform Proof-of-Work computations (CPU heavy), and submit the results back.

## How to Run Locally

You only need Docker and Docker Compose installed.

1. Open your terminal in this directory.
2. Run the cluster:
   ```bash
   docker-compose up -d
   ```
3. Open your browser and navigate to: `http://localhost:3000`
4. Click **Deploy 10 Jobs** and watch the three independent worker nodes pick up tasks and process them!

To view logs and see the workers communicating:
```bash
docker-compose logs -f
```

To shut down:
```bash
docker-compose down
```

## DevOps CI/CD Pipeline

This project includes a `Jenkinsfile` and `sonar-project.properties` for a full CI/CD pipeline.

**Pipeline Stages:**
1. **Checkout:** Pulls code.
2. **SonarQube Analysis:** Scans both `master` and `worker` code for vulnerabilities and code smells.
3. **Quality Gate:** Waits for SonarQube approval.
4. **Deploy:** Runs `docker-compose up -d --build` to build the images and deploy the 1 Master / 3 Worker cluster directly on the Jenkins agent.

## Explaining this to your Professor

If you need to explain what this project is and why it's relevant to DevOps/Networking:

> "I built a Distributed Task Processing system. It uses a Master/Worker architecture, which is the foundational design pattern for cloud scaling and CI/CD tools (like Jenkins itself). 
> 
> The Master node hosts a web dashboard and an API queue. The Worker nodes are entirely separate applications running in isolated Docker containers. They communicate with the Master over an internal Docker bridge network. 
> 
> When a user submits heavy computational jobs to the Master, the Master doesn't freeze. Instead, it delegates the work across multiple Worker nodes operating in parallel. I orchestrated the deployment of this entire distributed cluster using `docker-compose` and automated the static code analysis and deployment via a Jenkins CI/CD pipeline."
