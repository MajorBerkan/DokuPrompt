# Code Quality Metrics

## Current Status (as of December 11, 2024)

### Test Coverage
- **Backend**: ~45% (Target: 85-90%+)
- **Frontend**: In progress (Target: 85-90%+)

### GitHub Actions
- ✅ Backend tests with coverage reporting
- ✅ Frontend tests with coverage reporting
- ✅ Playwright E2E tests
- ✅ Docker build validation
- ✅ CI/CD pipeline
- ✅ All actions updated to latest versions

## Coverage Improvement Plan

### Phase 1: Infrastructure (COMPLETED)
- [x] Update GitHub Actions to latest versions
  - docker/build-push-action: v5 → v6
  - docker/setup-buildx-action: v3 → v4
  - codecov/codecov-action: v4 → v5
- [x] Add coverage reporting to CI/CD
- [x] Fix failing tests
- [x] Add .coveragerc configuration
- [x] Update .gitignore for coverage artifacts
- [x] Add pytest-mock dependency

### Phase 2: Critical Path Testing (IN PROGRESS)
Priority modules for test coverage improvement:

#### Backend High Priority (Low Coverage, High Impact)
1. `app/api/routes_docs.py` (33% → 85%+)
   - Document creation, update, deletion
   - History management
   - Error handling

2. `app/api/routes_ai.py` (35% → 85%+)
   - AI analysis endpoints
   - Prompt generation
   - Error cases

3. `app/services/ai_service.py` (35% → 85%+)
   - Document generation
   - AI integration
   - Prompt handling

4. `app/services/git_service.py` (36% → 85%+)
   - Repository cloning
   - Git operations
   - Branch management

5. `app/api/routes_repo.py` (47% → 85%+)
   - Repository management
   - Clone operations
   - Repository listing

#### Backend Medium Priority
- `app/auth/deps.py` (37% → 85%+) - Authentication
- `app/auth/mock_auth.py` (47% → 85%+) - Mock auth
- `app/api/routes_prompts.py` (57% → 85%+) - Prompt management

#### Backend Low Priority (Worker Tasks - Complex Testing)
- `app/worker/tasks_periodic.py` (0% → 60%+)
- `app/worker/tasks_git.py` (18% → 60%+)
- `app/worker/tasks_ai.py` (45% → 60%+)

Note: Worker tasks require complex async/Celery mocking and may not reach 85% initially.

### Phase 3: Component Testing
- Frontend components
- Integration tests
- E2E test coverage

### Phase 4: Optimization
- Remove dead code
- Refactor for testability
- Achieve 85-90%+ overall coverage

## Test Execution

### Backend
```bash
cd src/backend
pytest --cov=app --cov-report=html --cov-report=term
```

View coverage report: `src/backend/htmlcov/index.html`

### Frontend
```bash
cd src/frontend
npm run test:coverage
```

View coverage report: `src/frontend/coverage/index.html`

## Coverage Thresholds

### Current Policy
Coverage thresholds are tracked but not enforced to allow gradual improvement.

### Target Policy (Future)
Once 85% coverage is achieved:
- Minimum 85% line coverage
- Minimum 85% branch coverage
- CI fails if coverage drops below threshold

## Code Quality Tools

### Backend
- **Linter**: flake8
- **Formatter**: black (via requirements-dev.txt)
- **Type Checker**: mypy (via requirements-dev.txt)
- **Test Framework**: pytest
- **Coverage**: pytest-cov

### Frontend
- **Linter**: ESLint with security plugin
- **Formatter**: Prettier
- **Test Framework**: Vitest (unit/integration)
- **E2E Framework**: Playwright
- **Coverage**: Vitest with V8 provider

## Monitoring

Coverage is automatically reported to:
- GitHub Actions workflow summaries
- Codecov (if configured)
- Local HTML reports

## Best Practices

1. **Write tests alongside code**: New features should include tests
2. **Test critical paths first**: Focus on user-facing functionality
3. **Mock external dependencies**: Use pytest-mock for services
4. **Test error cases**: Don't just test happy paths
5. **Keep tests fast**: Unit tests should run in seconds
6. **Maintain test data**: Use fixtures for common setups

## Disabled Tests

The following test files are currently disabled and need updates:
- `test_routes_ai.py` - Needs schema migration update
- `test_services_ai.py` - Needs function updates
- `test_routes_repo.py` - Needs schema migration update

These should be re-enabled as part of Phase 2.
