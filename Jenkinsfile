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
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build & Deploy') {
            steps {
                echo 'Building and deploying cluster using docker-compose...'
                // Spin up 1 master and 3 workers in detached mode
                bat 'docker-compose up -d --build'
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
