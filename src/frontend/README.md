# Frontend Development

This directory contains the React/Vite frontend for CaffeineCode.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Running Tests

### E2E Tests with Playwright

**Prerequisites:**
- Install dependencies: `npm install`
- Ensure the dev server is running or will be started automatically

**Run E2E tests:**
```bash
# Run all E2E tests (using npm script)
npm run test:e2e

# Run tests with UI (using npm script)
npm run test:e2e:ui

# Alternative: Use npx directly
npx playwright test

# Run tests with UI
npx playwright test --ui

# Run specific test file
npx playwright test adminFlow-addRepos

# List all tests
npx playwright test --list
```

**Generate new tests:**
```bash
# Generate a new test by recording browser interactions
npx playwright codegen http://localhost:5173/

# Save generated test to a specific file
npx playwright codegen --output tests/e2e/new-test.spec.js http://localhost:5173/
```

### Troubleshooting E2E Tests

**"No tests found" error:**

This error occurs when:
1. Dependencies are not installed - run `npm install` first
2. The Playwright config file has incorrect syntax for ES modules

The config file `playwright.config.js` must use ES module syntax since `package.json` has `"type": "module"`. It should use `import.meta.url` instead of `__dirname`.

## Troubleshooting

### Build Errors or Stale Cache Issues

If you encounter build errors like "Identifier has already been declared" or see old code after making changes:

**Quick fix:**
```bash
# Linux/Mac
./clear-cache.sh

# Windows
clear-cache.bat
```

This script will:
- Remove `node_modules` directory
- Remove `package-lock.json`
- Remove `dist` directory
- Remove `.vite` cache
- Reinstall all dependencies fresh

**Manual cache clearing:**
```bash
rm -rf node_modules package-lock.json dist .vite
npm install
```

### Browser Cache

Always do a hard refresh after updating code:
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

### Docker Cache

If running in Docker and experiencing issues:
```bash
docker-compose down
docker volume rm caffeinecode_frontend_node_modules
docker-compose build --no-cache frontend
docker-compose up -d
```

## More Help

For more detailed troubleshooting, see [TROUBLESHOOTING.md](../../TROUBLESHOOTING.md) in the root directory.
