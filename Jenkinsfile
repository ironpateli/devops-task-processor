pipeline {
    agent any

    environment {
        AWS_REGION = credentials('aws-region')
        AWS_ACCOUNT_ID = credentials('aws-account-id')
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
                    withSonarQubeEnv('sonar-server') {
                        if (isUnix()) {
                            sh "${scannerHome}/bin/sonar-scanner"
                        } else {
                            bat "${scannerHome}\\bin\\sonar-scanner.bat"
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
                                ceTaskId=$(grep ceTaskId= "$taskFile" | cut -d= -f2)
                                while true; do
                                    result=$(curl -s -u "${SONAR_AUTH_TOKEN}:" "${SONAR_HOST_URL}/api/ce/activity?id=${ceTaskId}" | grep -o '"status":"[^"]*"' | head -1)
                                    if [[ "$result" == *"SUCCESS"* ]]; then
                                        echo "Task completed successfully"
                                        break
                                    elif [[ "$result" == *"FAILED"* ]]; then
                                        echo "Task failed"
                                        exit 1
                                    fi
                                    sleep 2
                                done
                            '''
                        } else {
                            bat '''
powershell -NoProfile -ExecutionPolicy Bypass -Command "$taskFile = Join-Path $env:WORKSPACE '.scannerwork\\report-task.txt'; if (!(Test-Path $taskFile)) { throw 'report-task.txt not found' }; $ceTaskId = (Select-String -Path $taskFile -Pattern 'ceTaskId=([^\\r\\n]+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }); while ($true) { $result = (curl.exe -s -u \"${env:SONAR_AUTH_TOKEN}:\" \"${env:SONAR_HOST_URL}/api/ce/activity?id=${ceTaskId}\" | Select-String -Pattern '\"status\":\"([^\"]+)\"' | ForEach-Object { $_.Matches[0].Groups[1].Value }); if ($result -eq 'SUCCESS') { Write-Host 'Task completed successfully'; break } elseif ($result -eq 'FAILED') { throw 'Task failed' }; Start-Sleep -Seconds 2 }"
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
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed! Check logs for errors.'
        }
    }
}
