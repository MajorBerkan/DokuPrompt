#!/bin/bash
# Script to clear all frontend caches
# Run this if you encounter build or runtime errors

echo "🧹 Clearing frontend caches..."

# Clear node modules
if [ -d "node_modules" ]; then
    echo "📦 Removing node_modules..."
    rm -rf node_modules
fi

# Clear package-lock
if [ -f "package-lock.json" ]; then
    echo "🔒 Removing package-lock.json..."
    rm package-lock.json
fi

# Clear build output
if [ -d "dist" ]; then
    echo "🏗️  Removing dist directory..."
    rm -rf dist
fi

# Clear Vite cache
if [ -d ".vite" ]; then
    echo "⚡ Removing .vite cache..."
    rm -rf .vite
fi

# Reinstall dependencies
echo "📥 Installing fresh dependencies..."
npm install

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start the development server"
echo "  2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo ""
