@echo off
REM Script to clear all frontend caches
REM Run this if you encounter build or runtime errors

echo 🧹 Clearing frontend caches...

REM Clear node modules
if exist "node_modules" (
    echo 📦 Removing node_modules...
    rmdir /s /q node_modules
)

REM Clear package-lock
if exist "package-lock.json" (
    echo 🔒 Removing package-lock.json...
    del package-lock.json
)

REM Clear build output
if exist "dist" (
    echo 🏗️  Removing dist directory...
    rmdir /s /q dist
)

REM Clear Vite cache
if exist ".vite" (
    echo ⚡ Removing .vite cache...
    rmdir /s /q .vite
)

REM Reinstall dependencies
echo 📥 Installing fresh dependencies...
call npm install

echo.
echo ✅ Cache cleared successfully!
echo.
echo Next steps:
echo   1. Run 'npm run dev' to start the development server
echo   2. Hard refresh your browser (Ctrl+Shift+R)
echo.
pause
