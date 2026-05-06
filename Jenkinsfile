pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = ''
        ECR_REPOSITORY_API = 'task-processor-api'
        ECR_REPOSITORY_WEB = 'task-processor-web'
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                script {
                    if (isUnix()) {
                        sh 'npm --prefix apps/api ci'
                        sh 'npm --prefix apps/web ci'
                    } else {
                        bat 'npm --prefix apps/api ci'
                        bat 'npm --prefix apps/web ci'
                    }
                }
            }
        }

        stage('Lint and Test') {
            steps {
                echo 'Running tests...'
                script {
                    if (isUnix()) {
                        sh 'npm --prefix apps/api test'
                    } else {
                        bat 'npm --prefix apps/api test'
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube Analysis...'
                script {
                    def scannerHome = tool 'sonar-scanner'
                    def jdkHome = tool 'jdk21'
                    withSonarQubeEnv('sonar-server') {
                        withEnv(["JAVA_HOME=${jdkHome}", "PATH+JAVA=${jdkHome}/bin"]) {
                            if (isUnix()) {
                                sh 'java -version'
                                sh "${scannerHome}/bin/sonar-scanner"
                            } else {
                                bat 'java -version'
                                bat "${scannerHome}\\bin\\sonar-scanner.bat"
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate Check') {
            steps {
                echo 'Waiting for Quality Gate result...'
                withSonarQubeEnv('sonar-server') {
                    script {
                        if (isUnix()) {
                            sh '''
                                taskFile="${WORKSPACE}/.scannerwork/report-task.txt"
                                if [ ! -f "$taskFile" ]; then
                                  echo "ERROR: report-task.txt not found"
                                  exit 1
                                fi
                                ceTaskId=$(grep '^ceTaskId=' "$taskFile" | cut -d= -f2 | tr -d '\\r')
                                if [ -z "$ceTaskId" ]; then
                                  echo "ERROR: ceTaskId missing in report-task.txt"
                                  exit 1
                                fi
                                hostUrl="${SONAR_HOST_URL%/}"
                                analysisId=""
                                for i in $(seq 1 180); do
                                  ceJson=$(curl -s -u "${SONAR_AUTH_TOKEN}:" "${hostUrl}/api/ce/task?id=${ceTaskId}")
                                  status=$(echo "$ceJson" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
                                  if [ "$status" = "SUCCESS" ]; then
                                    analysisId=$(echo "$ceJson" | grep -o '"analysisId":"[^"]*"' | head -1 | cut -d'"' -f4)
                                    break
                                  fi
                                  if [ "$status" = "FAILED" ] || [ "$status" = "CANCELED" ]; then
                                    echo "ERROR: Sonar CE task failed with status: $status"
                                    exit 1
                                  fi
                                  sleep 5
                                done
                                if [ -z "$analysisId" ]; then
                                  echo "ERROR: Timed out waiting for Sonar CE task completion."
                                  exit 1
                                fi
                                qgJson=$(curl -s -u "${SONAR_AUTH_TOKEN}:" "${hostUrl}/api/qualitygates/project_status?analysisId=${analysisId}")
                                qgStatus=$(echo "$qgJson" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
                                echo "Quality Gate status: $qgStatus"
                                if [ "$qgStatus" != "OK" ]; then
                                  echo "ERROR: Quality Gate failed: $qgStatus"
                                  exit 1
                                fi
                            '''
                        } else {
                            bat '''
powershell -NoProfile -ExecutionPolicy Bypass -Command "$taskFile = Join-Path $env:WORKSPACE '.scannerwork\\report-task.txt'; if (!(Test-Path $taskFile)) { throw 'report-task.txt not found. Sonar analysis may not have completed.' }; $ceTaskId = ((Get-Content $taskFile | Where-Object { $_ -like 'ceTaskId=*' } | Select-Object -First 1).Split('=')[1]).Trim(); if (-not $ceTaskId) { throw 'ceTaskId missing in report-task.txt' }; $hostUrl = $env:SONAR_HOST_URL.TrimEnd('/'); if (-not $hostUrl) { throw 'SONAR_HOST_URL is missing in environment.' }; if (-not $env:SONAR_AUTH_TOKEN) { throw 'SONAR_AUTH_TOKEN is missing in environment.' }; $pair = $env:SONAR_AUTH_TOKEN + ':'; $base64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair)); $headers = @{ Authorization = ('Basic ' + $base64) }; $analysisId = $null; $ceApi = $hostUrl + '/api/ce/task?id=' + $ceTaskId; for ($i = 0; $i -lt 180; $i++) { $task = Invoke-RestMethod -Uri $ceApi -Method Get -Headers $headers; if ($task.task.status -eq 'SUCCESS') { $analysisId = $task.task.analysisId; break }; if ($task.task.status -in @('FAILED','CANCELED')) { throw ('Sonar CE task failed with status: ' + $task.task.status) }; Start-Sleep -Seconds 5 }; if (-not $analysisId) { throw 'Timed out waiting for Sonar CE task completion.' }; $qgUrl = $hostUrl + '/api/qualitygates/project_status?analysisId=' + $analysisId; $qg = Invoke-RestMethod -Uri $qgUrl -Method Get -Headers $headers; $status = $qg.projectStatus.status; Write-Host ('Quality Gate status: ' + $status); if ($status -ne 'OK') { throw ('Quality Gate failed: ' + $status) }"
                            '''
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building API and Web images...'
                script {
                    if (isUnix()) {
                        sh 'docker compose -f docker-compose.dev.yml build'
                    } else {
                        bat 'docker compose -f docker-compose.dev.yml build'
                    }
                }
            }
        }

        stage('Push to ECR') {
            when {
                expression { return env.AWS_ACCOUNT_ID?.trim() && env.AWS_REGION?.trim() }
            }
            steps {
                echo 'Pushing images to ECR...'
                script {
                    def ecrUrl = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                    if (isUnix()) {
                        sh '''
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                            docker tag task-processor-api:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_API}:latest
                            docker tag task-processor-web:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_WEB}:latest
                            docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_API}:latest
                            docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_WEB}:latest
                        '''
                    } else {
                        bat '''
                            for /f "tokens=*" %%i in ('aws ecr get-login-password --region %AWS_REGION%') do set PASSWORD=%%i
                            echo %PASSWORD% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com
                            docker tag task-processor-api:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_API%:latest
                            docker tag task-processor-web:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_WEB%:latest
                            docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_API%:latest
                            docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_WEB%:latest
                        '''
                    }
                }
            }
        }

        stage('Deploy to ECS') {
            when {
                expression { return env.ECS_CLUSTER?.trim() && env.ECS_SERVICE?.trim() }
            }
            steps {
                echo 'Triggering ECS deployment...'
                script {
                    if (isUnix()) {
                        sh 'aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force-new-deployment --region ${AWS_REGION}'
                    } else {
                        bat 'aws ecs update-service --cluster %ECS_CLUSTER% --service %ECS_SERVICE% --force-new-deployment --region %AWS_REGION%'
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed! Check logs for errors.'
        }
    }
}
