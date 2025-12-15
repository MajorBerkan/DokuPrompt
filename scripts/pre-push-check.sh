#!/bin/bash

# Pre-push check script
# Run this before pushing to catch issues that GitHub Actions would catch

set -e

echo "🔍 Running pre-push checks..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks failed
FAILED=0

# Change to repository root
cd "$(dirname "$0")/.."

# Backend checks
echo "================================"
echo "🐍 Backend Checks"
echo "================================"

if [ -d "src/backend" ]; then
    cd src/backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
        echo -e "${YELLOW}⚠️  No virtual environment found. Consider creating one:${NC}"
        echo "   python -m venv venv && source venv/bin/activate"
    fi
    
    # Check Python syntax with flake8
    echo -e "\n📝 Running flake8 linting..."
    if command -v flake8 &> /dev/null; then
        if flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics --exclude=__pycache__,.venv,venv; then
            echo -e "${GREEN}✓ Flake8 syntax check passed${NC}"
        else
            echo -e "${RED}✗ Flake8 found syntax errors${NC}"
            FAILED=1
        fi
    else
        echo -e "${YELLOW}⚠️  flake8 not installed, skipping...${NC}"
    fi
    
    # Run pytest if available
    echo -e "\n🧪 Running backend tests..."
    if command -v pytest &> /dev/null; then
        if pytest tests/ -v --tb=short 2>&1 | tail -20; then
            echo -e "${GREEN}✓ Backend tests passed${NC}"
        else
            echo -e "${RED}✗ Backend tests failed${NC}"
            FAILED=1
        fi
    else
        echo -e "${YELLOW}⚠️  pytest not installed, skipping tests...${NC}"
        echo "   Install with: pip install -r requirements-dev.txt"
    fi
    
    cd ../..
else
    echo -e "${YELLOW}⚠️  Backend directory not found${NC}"
fi

# Frontend checks
echo ""
echo "================================"
echo "⚛️  Frontend Checks"
echo "================================"

if [ -d "src/frontend" ]; then
    cd src/frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Run: npm install${NC}"
    fi
    
    # Run ESLint
    echo -e "\n📝 Running ESLint..."
    if [ -f "package.json" ] && npm run lint --if-present > /dev/null 2>&1; then
        if npm run lint 2>&1 | tail -20; then
            echo -e "${GREEN}✓ ESLint passed${NC}"
        else
            echo -e "${YELLOW}⚠️  ESLint found issues (non-blocking)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  ESLint not configured or failed to run${NC}"
    fi
    
    # Test build
    echo -e "\n🏗️  Testing build..."
    if npm run build 2>&1 | tail -10; then
        echo -e "${GREEN}✓ Build successful${NC}"
        rm -rf dist  # Clean up
    else
        echo -e "${RED}✗ Build failed${NC}"
        FAILED=1
    fi
    
    cd ../..
else
    echo -e "${YELLOW}⚠️  Frontend directory not found${NC}"
fi

# Summary
echo ""
echo "================================"
echo "📊 Summary"
echo "================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to push.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please fix issues before pushing.${NC}"
    exit 1
fi
