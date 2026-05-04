pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube Analysis...'
                script {
                    def scannerHome = tool 'sonar-scanner'
                    withSonarQubeEnv('sonar-server') { // Ensure 'sonar-server' matches your Jenkins config
                        bat "${scannerHome}\\bin\\sonar-scanner.bat"
                    }
                }
            }
        }

        stage('Quality Gate Check') {
            steps {
                echo 'Waiting for Quality Gate result...'
                script {
                    try {
                        timeout(time: 10, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    } catch (Exception e) {
                        echo "waitForQualityGate failed (${e.class.simpleName}): ${e.message}"
                        echo 'Falling back to direct SonarQube API quality gate check...'
                        bat '''
powershell -NoProfile -ExecutionPolicy Bypass -Command "$taskFile = Join-Path $env:WORKSPACE '.scannerwork\\report-task.txt'; if (!(Test-Path $taskFile)) { throw 'report-task.txt not found. Sonar analysis may not have completed.' }; $ceTaskUrl = (Get-Content $taskFile | Where-Object { $_ -like 'ceTaskUrl=*' } | Select-Object -First 1).Split('=')[1]; if (-not $ceTaskUrl) { throw 'ceTaskUrl missing in report-task.txt' }; $analysisId = $null; for ($i = 0; $i -lt 60; $i++) { $task = Invoke-RestMethod -Uri $ceTaskUrl -Method Get; if ($task.task.status -eq 'SUCCESS') { $analysisId = $task.task.analysisId; break }; if ($task.task.status -in @('FAILED','CANCELED')) { throw ('Sonar CE task failed with status: ' + $task.task.status) }; Start-Sleep -Seconds 5 }; if (-not $analysisId) { throw 'Timed out waiting for Sonar CE task completion.' }; $qgUrl = 'http://localhost:9000/api/qualitygates/project_status?analysisId=' + $analysisId; $qg = Invoke-RestMethod -Uri $qgUrl -Method Get; $status = $qg.projectStatus.status; Write-Host ('Quality Gate status: ' + $status); if ($status -ne 'OK') { throw ('Quality Gate failed: ' + $status) }"
'''
                    }
                }
            }
        }

        stage('Docker Build & Deploy') {
            steps {
                echo 'Building and deploying cluster using docker-compose...'
                // Spin up 1 master and 3 workers in detached mode
                bat 'docker compose up -d --build'
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
        }
        success {
            echo 'Pipeline succeeded! Distributed cluster deployed.'
        }
        failure {
            echo 'Pipeline failed! Check logs for errors.'
            // Optional: sh 'docker-compose down' to clean up on failure
        }
    }
}
