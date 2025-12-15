# Pre-flight check script for CaffeineCode (Windows PowerShell)
# This script checks if all prerequisites are met before running docker compose

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CaffeineCode Pre-flight Checks" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Script:Errors = 0
$Script:Warnings = 0

# Check 1: Docker installation
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker found: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Docker not found. Please install Docker Desktop." -ForegroundColor Red
        Write-Host "    Download from: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Gray
        $Script:Errors++
    }
} catch {
    Write-Host "  [ERROR] Docker not found. Please install Docker Desktop." -ForegroundColor Red
    Write-Host "    Download from: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Gray
    $Script:Errors++
}
Write-Host ""

# Check 2: Docker Compose installation
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker Compose found: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Docker Compose not found or not working." -ForegroundColor Red
        $Script:Errors++
    }
} catch {
    Write-Host "  [ERROR] Docker Compose not found or not working." -ForegroundColor Red
    $Script:Errors++
}
Write-Host ""

# Check 3: Docker daemon running
Write-Host "Checking if Docker daemon is running..." -ForegroundColor Yellow
try {
    $result = docker ps 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker daemon is running" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Docker daemon is not running" -ForegroundColor Red
        Write-Host "    Please start Docker Desktop and wait for it to be ready." -ForegroundColor Gray
        Write-Host "    Look for a green icon in the system tray (bottom-right corner)" -ForegroundColor Gray
        Write-Host "    See WINDOWS_SETUP.md for detailed instructions" -ForegroundColor Gray
        $Script:Errors++
    }
} catch {
    Write-Host "  [ERROR] Docker daemon is not running" -ForegroundColor Red
    Write-Host "    Please start Docker Desktop and wait for it to be ready." -ForegroundColor Gray
    Write-Host "    See WINDOWS_SETUP.md for detailed instructions" -ForegroundColor Gray
    $Script:Errors++
}
Write-Host ""

# Check 4: .env file exists
Write-Host "Checking for .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  [OK] .env file found" -ForegroundColor Green
    
    # Check for required environment variables
    $content = Get-Content ".env" -Raw
    $requiredVars = @("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "DATABASE_URL")
    
    foreach ($var in $requiredVars) {
        if ($content -match "^${var}=") {
            Write-Host "  [OK] $var is set" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] $var is not set in .env" -ForegroundColor Yellow
            $Script:Warnings++
        }
    }
} else {
    Write-Host "  [ERROR] .env file not found" -ForegroundColor Red
    Write-Host "    Please create a .env file with required configuration." -ForegroundColor Gray
    Write-Host "    See LOCAL_DATABASE_SETUP.md for details." -ForegroundColor Gray
    $Script:Errors++
}
Write-Host ""

# Check 5: Port availability
Write-Host "Checking port availability..." -ForegroundColor Yellow
$ports = @(
    @{Port=5432; Name="PostgreSQL"},
    @{Port=6379; Name="Redis"},
    @{Port=8000; Name="Backend"},
    @{Port=5173; Name="Frontend"},
    @{Port=8081; Name="Adminer"}
)

foreach ($portInfo in $ports) {
    $port = $portInfo.Port
    $name = $portInfo.Name
    
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    
    if ($connections) {
        Write-Host "  [WARNING] Port $port ($name) is already in use" -ForegroundColor Yellow
        $Script:Warnings++
    } else {
        Write-Host "  [OK] Port $port ($name) is available" -ForegroundColor Green
    }
}
Write-Host ""

# Check 6: docker-compose.yml validation
Write-Host "Validating docker-compose.yml..." -ForegroundColor Yellow
try {
    $result = docker compose config --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] docker-compose.yml is valid" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] docker-compose.yml has errors" -ForegroundColor Red
        Write-Host "    Run 'docker compose config' to see details" -ForegroundColor Gray
        $Script:Errors++
    }
} catch {
    Write-Host "  [ERROR] docker-compose.yml has errors" -ForegroundColor Red
    Write-Host "    Run 'docker compose config' to see details" -ForegroundColor Gray
    $Script:Errors++
}
Write-Host ""

# Check 7: WSL 2 (Windows-specific)
Write-Host "Checking WSL 2 installation..." -ForegroundColor Yellow
try {
    $wslVersion = wsl --status 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] WSL 2 is installed" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] WSL 2 might not be installed" -ForegroundColor Yellow
        Write-Host "    If you encounter issues, install WSL 2:" -ForegroundColor Gray
        Write-Host "    Run in PowerShell as Admin: wsl --install" -ForegroundColor Gray
        $Script:Warnings++
    }
} catch {
    Write-Host "  [WARNING] Cannot verify WSL 2 installation" -ForegroundColor Yellow
    Write-Host "    If you encounter issues, install WSL 2:" -ForegroundColor Gray
    Write-Host "    Run in PowerShell as Admin: wsl --install" -ForegroundColor Gray
    $Script:Warnings++
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Pre-flight Check Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ($Script:Errors -eq 0 -and $Script:Warnings -eq 0) {
    Write-Host "[SUCCESS] All checks passed! You're ready to run:" -ForegroundColor Green
    Write-Host "  docker compose up --build" -ForegroundColor White
    exit 0
} elseif ($Script:Errors -eq 0) {
    Write-Host "[NOTICE] $Script:Warnings warning(s) found, but you can proceed." -ForegroundColor Yellow
    Write-Host "  Review warnings above and run:" -ForegroundColor Gray
    Write-Host "  docker compose up --build" -ForegroundColor White
    exit 0
} else {
    Write-Host "[FAILED] $Script:Errors error(s) found. Please fix them before proceeding." -ForegroundColor Red
    if ($Script:Warnings -gt 0) {
        Write-Host "[NOTICE] $Script:Warnings warning(s) also found." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "For help, see:" -ForegroundColor Gray
    Write-Host "  - Windows users: WINDOWS_SETUP.md" -ForegroundColor Gray
    Write-Host "  - Database setup: LOCAL_DATABASE_SETUP.md" -ForegroundColor Gray
    Write-Host "  - Troubleshooting: TROUBLESHOOTING.md" -ForegroundColor Gray
    exit 1
}
