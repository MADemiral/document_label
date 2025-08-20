Write-Host "Starting project..." -ForegroundColor Green

# Set main directory
Set-Location "d:\staj\document_label\"

# Start Docker Compose (with full path and proper arguments)
# Write-Host "Starting Docker services..." -ForegroundColor Yellow
# Start-Process "docker-compose" -ArgumentList "up", "-d" -WorkingDirectory "D:\staj\document_label\" -WindowStyle Normal

# Wait a bit for Docker to start
Start-Sleep -Seconds 5

# Start Spring Boot API Gateway
Write-Host "Starting API Gateway (Spring Boot)..." -ForegroundColor Yellow
Start-Process "cmd" -ArgumentList "/c", ".\mvnw spring-boot:run" -WorkingDirectory "D:\staj\document_label\api-gateway" -WindowStyle Normal

# Wait a bit for API Gateway to start
Start-Sleep -Seconds 10

# Start Angular frontend
Write-Host "Starting Angular frontend..." -ForegroundColor Yellow
Start-Process "cmd" -ArgumentList "/c", "ng serve --open" -WorkingDirectory "D:\staj\document_label\fr" -WindowStyle Normal

# Start backend services (fix the path)
Write-Host "Starting backend services..." -ForegroundColor Yellow
Start-Process "powershell" -ArgumentList "-File", "D:\staj\document_label\start-services.ps1" -WindowStyle Normal

Write-Host "All services are starting up..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Embedding Service: http://localhost:8001" -ForegroundColor Cyan  
Write-Host "Labeling Service: http://localhost:8002" -ForegroundColor Cyan
Write-Host "Database: PostgreSQL on port 5432" -ForegroundColor Cyan