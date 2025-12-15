#!/bin/bash
# Pre-flight check script for CaffeineCode
# This script checks if all prerequisites are met before running docker compose

echo "=========================================="
echo "CaffeineCode Pre-flight Checks"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Docker installation
echo "✓ Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "  ✓ Docker found: $DOCKER_VERSION"
else
    echo "  ✗ Docker not found. Please install Docker Desktop."
    echo "    Windows: https://docs.docker.com/desktop/install/windows-install/"
    echo "    Mac: https://docs.docker.com/desktop/install/mac-install/"
    echo "    Linux: https://docs.docker.com/engine/install/"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check 2: Docker Compose installation
echo "✓ Checking Docker Compose..."
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    echo "  ✓ Docker Compose found: $COMPOSE_VERSION"
else
    echo "  ✗ Docker Compose not found or not working."
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check 3: Docker daemon running
echo "✓ Checking if Docker daemon is running..."
if docker ps &> /dev/null; then
    echo "  ✓ Docker daemon is running"
else
    echo "  ✗ Docker daemon is not running"
    echo "    Please start Docker Desktop and wait for it to be ready."
    echo "    Windows: Look for green icon in system tray"
    echo "    Mac: Look for Docker icon in menu bar"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check 4: .env file exists
echo "✓ Checking for .env file..."
if [ -f ".env" ]; then
    echo "  ✓ .env file found"
    
    # Check for required environment variables
    REQUIRED_VARS=("POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD" "DATABASE_URL")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            echo "  ✓ $var is set"
        else
            echo "  ⚠ $var is not set in .env"
            WARNINGS=$((WARNINGS+1))
        fi
    done
else
    echo "  ✗ .env file not found"
    echo "    Please create a .env file with required configuration."
    echo "    See .env.example or LOCAL_DATABASE_SETUP.md for details."
    ERRORS=$((ERRORS+1))
fi
echo ""

# Check 5: Port availability
echo "✓ Checking port availability..."
PORTS=(5432 6379 8000 5173 8081)
PORT_NAMES=("PostgreSQL" "Redis" "Backend" "Frontend" "Adminer")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    NAME=${PORT_NAMES[$i]}
    
    if command -v lsof &> /dev/null; then
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "  ⚠ Port $PORT ($NAME) is already in use"
            WARNINGS=$((WARNINGS+1))
        else
            echo "  ✓ Port $PORT ($NAME) is available"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -an | grep -q ":$PORT.*LISTEN" 2>/dev/null; then
            echo "  ⚠ Port $PORT ($NAME) is already in use"
            WARNINGS=$((WARNINGS+1))
        else
            echo "  ✓ Port $PORT ($NAME) is available"
        fi
    else
        echo "  ℹ Cannot check port $PORT (lsof/netstat not available)"
    fi
done
echo ""

# Check 6: docker-compose.yml validation
echo "✓ Validating docker-compose.yml..."
if docker compose config --quiet 2>&1; then
    echo "  ✓ docker-compose.yml is valid"
else
    echo "  ✗ docker-compose.yml has errors"
    echo "    Run 'docker compose config' to see details"
    ERRORS=$((ERRORS+1))
fi
echo ""

# Summary
echo "=========================================="
echo "Pre-flight Check Summary"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✓ All checks passed! You're ready to run:"
    echo "  docker compose up --build"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠ $WARNINGS warning(s) found, but you can proceed."
    echo "  Review warnings above and run:"
    echo "  docker compose up --build"
    exit 0
else
    echo "✗ $ERRORS error(s) found. Please fix them before proceeding."
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠ $WARNINGS warning(s) also found."
    fi
    echo ""
    echo "For help, see:"
    echo "  - Windows users: WINDOWS_SETUP.md"
    echo "  - Database setup: LOCAL_DATABASE_SETUP.md"
    echo "  - Troubleshooting: TROUBLESHOOTING.md"
    exit 1
fi
