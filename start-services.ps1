Write-Host "Starting services..." -ForegroundColor Green

# Set main directory and activate virtual environment
Set-Location "d:\staj\document_label\document_label_service\document_label_service"

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\Scripts\Activate.ps1"

# Wait for activation
Start-Sleep -Seconds 2

# Start embedding service
Write-Host "Starting embedding service on port 8001..." -ForegroundColor Yellow
Start-Process "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8001" -WorkingDirectory "d:\staj\document_label\document_label_service\embedding_service" -WindowStyle Normal

# Start labeling service  
Write-Host "Starting labeling service on port 8002..." -ForegroundColor Yellow
Start-Process "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8002" -WorkingDirectory "d:\staj\document_label\document_label_service\labeling_service" -WindowStyle Normal

Write-Host "Starting labeling service on port 8003..." -ForegroundColor Yellow
Start-Process "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8003" -WorkingDirectory "d:\staj\document_label\document_label_service\database" -WindowStyle Normal

Write-Host "Services are starting..." -ForegroundColor Green
Write-Host "Embedding Service: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Labeling Service: http://localhost:8002" -ForegroundColor Cyan
Write-Host "Labeling Service: http://localhost:8003" -ForegroundColor Cyan