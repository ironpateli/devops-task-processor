pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        ECR_REPOSITORY_API = 'task-processor-api'
        ECR_REPOSITORY_WEB = 'task-processor-web'
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
                bat 'npm --prefix apps/api ci'
                bat 'npm --prefix apps/web ci'
            }
        }

        stage('Lint and Test') {
            steps {
                echo 'Running tests...'
                bat 'npm --prefix apps/api test'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube Analysis...'
                script {
                    def scannerHome = tool 'sonar-scanner'
                    withSonarQubeEnv('sonar-server') {
                        withEnv([
                            'JAVA_HOME=C:\\Users\\asus\\.sonar\\cache\\39c5e23f3ce4d420663afba8ffde28034b72e2b3e240943dc2321bc1f912eef9\\OpenJDK21U-jre_x64_windows_hotspot_21.0.9_10.zip_extracted\\jdk-21.0.9+10-jre',
                            'PATH+JAVA=C:\\Users\\asus\\.sonar\\cache\\39c5e23f3ce4d420663afba8ffde28034b72e2b3e240943dc2321bc1f912eef9\\OpenJDK21U-jre_x64_windows_hotspot_21.0.9_10.zip_extracted\\jdk-21.0.9+10-jre\\bin'
                        ]) {
                            bat 'java -version'
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
                    bat '''
powershell -NoProfile -ExecutionPolicy Bypass -Command "$taskFile = Join-Path $env:WORKSPACE '.scannerwork\\report-task.txt'; if (!(Test-Path $taskFile)) { throw 'report-task.txt not found. Sonar analysis may not have completed.' }; $ceTaskUrl = (Get-Content $taskFile | Where-Object { $_ -like 'ceTaskUrl=*' } | Select-Object -First 1).Split('=')[1]; if (-not $ceTaskUrl) { throw 'ceTaskUrl missing in report-task.txt' }; if (-not $env:SONAR_AUTH_TOKEN) { throw 'SONAR_AUTH_TOKEN is missing in environment.' }; $pair = $env:SONAR_AUTH_TOKEN + ':'; $base64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair)); $headers = @{ Authorization = ('Basic ' + $base64) }; $analysisId = $null; for ($i = 0; $i -lt 180; $i++) { $task = Invoke-RestMethod -Uri $ceTaskUrl -Method Get -Headers $headers; if ($task.task.status -eq 'SUCCESS') { $analysisId = $task.task.analysisId; break }; if ($task.task.status -in @('FAILED','CANCELED')) { throw ('Sonar CE task failed with status: ' + $task.task.status) }; Start-Sleep -Seconds 5 }; if (-not $analysisId) { throw 'Timed out waiting for Sonar CE task completion.' }; $qgUrl = $env:SONAR_HOST_URL + '/api/qualitygates/project_status?analysisId=' + $analysisId; $qg = Invoke-RestMethod -Uri $qgUrl -Method Get -Headers $headers; $status = $qg.projectStatus.status; Write-Host ('Quality Gate status: ' + $status); if ($status -ne 'OK') { throw ('Quality Gate failed: ' + $status) }"
'''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building API and Web images...'
                bat 'docker compose -f docker-compose.dev.yml build'
            }
        }

        stage('Push to ECR') {
            when {
                expression { return env.AWS_ACCOUNT_ID?.trim() }
            }
            steps {
                echo 'Pushing images to ECR...'
                bat 'aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com'
                bat 'docker tag task-processor-api:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_API%:latest'
                bat 'docker tag task-processor-web:latest %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_WEB%:latest'
                bat 'docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_API%:latest'
                bat 'docker push %AWS_ACCOUNT_ID%.dkr.ecr.%AWS_REGION%.amazonaws.com/%ECR_REPOSITORY_WEB%:latest'
            }
        }

        stage('Deploy to ECS') {
            when {
                expression { return env.ECS_CLUSTER?.trim() && env.ECS_SERVICE?.trim() }
            }
            steps {
                echo 'Triggering ECS deployment...'
                bat 'aws ecs update-service --cluster %ECS_CLUSTER% --service %ECS_SERVICE% --force-new-deployment --region %AWS_REGION%'
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

