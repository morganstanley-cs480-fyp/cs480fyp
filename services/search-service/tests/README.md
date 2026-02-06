# Search Service Testing Guide

This directory contains tests for the search service with LocalStack integration.

## Test Structure

```
tests/
├── conftest.py                    # Pytest fixtures and configuration
├── mock_bedrock.py               # Mock Bedrock responses (existing)
├── test_infrastructure.py        # Infrastructure smoke tests (existing)
├── test_models.py                # Domain model tests (existing)
├── test_integration_example.py   # Example integration tests (new)
└── README.md                     # This file
```

## Test Categories

### Unit Tests
- Fast, isolated tests
- No external dependencies
- Mock all external services
- Run with: `pytest -m unit`

### Integration Tests
- Test with real services (PostgreSQL, Redis)
- Use LocalStack for AWS services
- Use mocks for Bedrock (Community LocalStack limitation)
- Run with: `pytest -m integration`

## Running Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install python-dotenv moto
   ```

2. **Start LocalStack environment:**
   ```bash
   # From services/ directory
   docker-compose -f docker-compose.test.yml up -d
   ```

3. **Wait for services to be ready:**
   ```bash
   # Check LocalStack health
   curl http://localhost:4566/_localstack/health
   
   # Check PostgreSQL
   docker exec fyp-postgres-test pg_isready -U postgres
   
   # Check Redis
   docker exec fyp-redis-test redis-cli ping
   ```

### Run All Tests
```bash
# From search-service/ directory
pytest
```

### Run Specific Test Categories
```bash
# Unit tests only (fast)
pytest -m unit

# Integration tests only
pytest -m integration

# Smoke tests (quick health checks)
pytest -m smoke

# Specific test file
pytest tests/test_integration_example.py

# Specific test class
pytest tests/test_integration_example.py::TestDatabaseIntegration

# Specific test function
pytest tests/test_integration_example.py::TestDatabaseIntegration::test_database_connection
```

### Run with Coverage
```bash
# Generate coverage report
pytest --cov=app --cov-report=html

# Open coverage report
# Windows: start htmlcov/index.html
# Mac/Linux: open htmlcov/index.html
```

### Run with Verbose Output
```bash
pytest -v -s
```

## Writing Tests

### Example: Database Integration Test
```python
import pytest

@pytest.mark.asyncio
@pytest.mark.integration
async def test_query_trades(db_connection, clean_db):
    """Test querying trades from database"""
    async with db_connection.acquire() as conn:
        # Your test logic here
        result = await conn.fetch("SELECT * FROM trades LIMIT 1")
        assert result is not None
```

### Example: Redis Cache Test
```python
@pytest.mark.asyncio
@pytest.mark.integration
async def test_cache_search_results(redis_connection, clean_redis):
    """Test caching search results"""
    await redis_connection.set("search:test", "cached_result")
    result = await redis_connection.get("search:test")
    assert result == b"cached_result"
```

### Example: Mock Bedrock Test
```python
@pytest.mark.unit
def test_bedrock_extraction(mock_bedrock_response):
    """Test Bedrock query extraction (mocked)"""
    response = mock_bedrock_response(
        extracted_query="SELECT * FROM trades",
        confidence=0.95
    )
    assert response["confidence"] == 0.95
```

## Available Fixtures

### Database Fixtures
- `db_connection`: Session-scoped database pool
- `db_transaction`: Function-scoped transaction (auto-rollback)
- `clean_db`: Truncates tables before test

### Redis Fixtures
- `redis_connection`: Session-scoped Redis connection
- `clean_redis`: Flushes Redis before test

### AWS Fixtures
- `aws_credentials`: Sets LocalStack credentials
- `localstack_endpoint`: LocalStack endpoint URL
- `bedrock_client`: Boto3 Bedrock client (points to LocalStack)
- `s3_client`: Boto3 S3 client (points to LocalStack)
- `mock_bedrock_response`: Function to generate mock Bedrock responses

### Data Fixtures
- `sample_trade_data`: Sample trade dictionary
- `sample_search_query`: Sample search query dictionary

### Utility Fixtures
- `test_settings`: Access to test settings
- `wait_for_services`: Waits for all services to be ready

## Troubleshooting

### LocalStack not starting
```bash
# Check logs
docker logs fyp-localstack-test

# Restart LocalStack
docker-compose -f docker-compose.test.yml restart localstack
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres-test

# Test connection manually
docker exec -it fyp-postgres-test psql -U postgres -d trading_db_test
```

### Redis connection issues
```bash
# Check Redis is running
docker ps | grep redis-test

# Test connection manually
docker exec -it fyp-redis-test redis-cli ping
```

### Tests timing out
- Increase timeout in pytest.ini
- Check service health before running tests
- Use `wait_for_services` fixture

## CI/CD Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Start LocalStack
  run: docker-compose -f services/docker-compose.test.yml up -d

- name: Wait for services
  run: |
    timeout 60 bash -c 'until curl -s http://localhost:4566/_localstack/health; do sleep 2; done'

- name: Run tests
  run: |
    cd services/search-service
    pytest --cov=app --cov-report=xml

- name: Stop LocalStack
  run: docker-compose -f services/docker-compose.test.yml down
```

## Best Practices

1. **Test Isolation**: Use `clean_db` and `clean_redis` fixtures
2. **Mock Bedrock**: LocalStack Community doesn't fully support Bedrock - use mocks
3. **Transaction Rollback**: Use `db_transaction` for write operations
4. **Async Tests**: Always use `@pytest.mark.asyncio` decorator
5. **Test Markers**: Tag tests with appropriate markers (unit/integration/slow)
6. **Fixtures**: Prefer fixtures over setup/teardown methods
7. **Assertions**: Use descriptive assertion messages
8. **Coverage**: Aim for >80% coverage, but don't sacrifice quality for numbers

## Next Steps

As you implement the search service:

1. Write tests BEFORE implementing features (TDD)
2. Add integration tests for each new service layer
3. Update fixtures as new models are created
4. Add more test data fixtures as needed
5. Implement API tests once routes are created
6. Add end-to-end tests for complete flows
