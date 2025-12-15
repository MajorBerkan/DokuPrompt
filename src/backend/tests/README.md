# Backend Tests

This directory contains automated tests for the CaffeineCode backend API.

## Running Tests

### Prerequisites
```bash
pip install -r requirements-dev.txt
```

### Run All Tests
```bash
pytest
```

### Run Specific Tests
```bash
# Run a specific test file
pytest tests/test_main.py

# Run a specific test function
pytest tests/test_main.py::test_root_endpoint

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html
```

## Test Structure

- `conftest.py` - Test fixtures and configuration
- `test_*.py` - Test files (one per module/feature)

## Writing Tests

### Example Test
```python
def test_my_endpoint(client):
    """Test description"""
    response = client.get("/api/my-endpoint")
    assert response.status_code == 200
    assert response.json()["key"] == "expected_value"
```

### Using Fixtures
```python
def test_with_database(db_session):
    """Test that uses database"""
    # db_session is provided by conftest.py
    # Use it to interact with the database
    pass
```

## Test Markers

Use pytest markers to categorize tests:

```python
@pytest.mark.slow
def test_slow_operation(client):
    """This test takes a long time"""
    pass

@pytest.mark.integration
def test_external_api(client):
    """This test requires external services"""
    pass
```

Run specific markers:
```bash
pytest -m "not slow"  # Skip slow tests
pytest -m "integration"  # Run only integration tests
```

## Continuous Integration

Tests run automatically on GitHub Actions when:
- Code is pushed to `main` or `develop`
- Pull requests are created
- Changes are made to `src/backend/**`

See `.github/workflows/backend-tests.yml` for CI configuration.
