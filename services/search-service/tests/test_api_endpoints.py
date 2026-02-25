"""
Integration tests for API endpoints.
Tests the complete request-response cycle.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.fixture
async def client():
    """Create test client."""
    async with AsyncClient(
        app=app, base_url="http://test", follow_redirects=True
    ) as ac:
        yield ac


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client):
        """Test GET / returns service info."""
        response = await client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "search-service"
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health_check_all_healthy(self, client):
        """Test GET /health when all systems healthy."""
        with (
            patch(
                "app.api.routes.health.db_manager.health_check", new_callable=AsyncMock
            ) as mock_db,
            patch(
                "app.api.routes.health.redis_manager.health_check",
                new_callable=AsyncMock,
            ) as mock_redis,
        ):
            # Mock healthy responses
            mock_db.return_value = True
            mock_redis.return_value = True

            response = await client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["checks"]["database"]["status"] == "ok"
            assert data["checks"]["cache"]["status"] == "ok"

    @pytest.mark.asyncio
    async def test_readiness_probe(self, client):
        """Test GET /health/ready."""
        # Mock the internal pool/client attributes that readiness check inspects
        with (
            patch("app.api.routes.health.db_manager._pool") as mock_db_pool,
            patch("app.api.routes.health.redis_manager._client") as mock_redis,
            patch(
                "app.api.routes.health.db_manager.health_check",
                new_callable=AsyncMock,
                return_value=True,
            ),
            patch(
                "app.api.routes.health.redis_manager.health_check",
                new_callable=AsyncMock,
                return_value=True,
            ),
        ):
            # Mock pool methods
            mock_db_pool.get_size.return_value = 5
            mock_db_pool.get_max_size.return_value = 10

            response = await client.get("/health/ready")

            assert response.status_code == 200
            data = response.json()
            assert data["ready"] is True

    @pytest.mark.asyncio
    async def test_liveness_probe(self, client):
        """Test GET /health/live."""
        response = await client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data["alive"] is True


class TestSearchEndpoint:
    """Tests for POST /search endpoint."""

    @pytest.mark.asyncio
    async def test_manual_search_success(self, client):
        """Test manual search with valid filters."""
        with patch(
            "app.services.search_orchestrator.search_orchestrator.execute_search"
        ) as mock_search:
            mock_search.return_value = {
                "query_id": 1,
                "total_results": 5,
                "results": [],
                "search_type": "manual",
                "cached": False,
                "execution_time_ms": 10.5,
                "extracted_params": None,
            }

            request_data = {
                "user_id": "test_user",
                "search_type": "manual",
                "filters": {"asset_type": "FX", "status": ["CLEARED"]},
            }

            response = await client.post("/search", json=request_data)

            assert response.status_code == 200
            data = response.json()
            assert data["search_type"] == "manual"
            assert "query_id" in data

    @pytest.mark.asyncio
    async def test_natural_language_search_success(self, client):
        """Test natural language search."""
        with patch(
            "app.services.search_orchestrator.search_orchestrator.execute_search"
        ) as mock_search:
            mock_search.return_value = {
                "query_id": 2,
                "total_results": 10,
                "results": [],
                "search_type": "natural_language",
                "cached": False,
                "execution_time_ms": 234.5,
                "extracted_params": {"asset_types": ["FX"], "statuses": ["ALLEGED"]},
            }

            request_data = {
                "user_id": "test_user",
                "search_type": "natural_language",
                "query_text": "show me pending FX trades",
            }

            response = await client.post("/search", json=request_data)

            assert response.status_code == 200
            data = response.json()
            assert data["search_type"] == "natural_language"
            assert data["extracted_params"] is not None

    @pytest.mark.asyncio
    async def test_search_missing_user_id(self, client):
        """Test search fails without user_id."""
        request_data = {"search_type": "manual", "filters": {"asset_type": "FX"}}

        response = await client.post("/search", json=request_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_search_invalid_search_type(self, client):
        """Test search fails with invalid search_type."""
        request_data = {
            "user_id": "test_user",
            "search_type": "invalid_type",
            "filters": {},
        }

        response = await client.post("/search", json=request_data)

        assert response.status_code == 422


class TestHistoryEndpoints:
    """Tests for query history endpoints."""

    @pytest.mark.asyncio
    async def test_get_history_success(self, client):
        """Test GET /history returns user history."""
        with patch(
            "app.services.query_history_service.query_history_service.get_user_history"
        ) as mock_history:
            mock_history.return_value = [
                {
                    "query_id": 1,
                    "user_id": "test_user",
                    "query_text": "{}",
                    "is_saved": False,
                    "query_name": None,
                    "create_time": "2025-01-30T10:00:00",
                    "last_use_time": "2025-01-30T10:00:00",
                }
            ]

            response = await client.get("/history?user_id=test_user")

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) > 0

    @pytest.mark.asyncio
    async def test_get_history_missing_user_id(self, client):
        """Test GET /history fails without user_id."""
        response = await client.get("/history")

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_history_success(self, client):
        """Test PUT /history/{query_id} updates query."""
        with patch(
            "app.services.query_history_service.query_history_service.update_query"
        ) as mock_update:
            mock_update.return_value = {
                "query_id": 1,
                "user_id": "test_user",
                "is_saved": True,
                "query_name": "My Saved Query",
                "query_text": "test query",
                "create_time": "2025-01-18T10:00:00",
                "last_use_time": "2025-01-20T09:00:00",
            }

            request_data = {"is_saved": True, "query_name": "My Saved Query"}

            response = await client.put(
                "/history/1?user_id=test_user", json=request_data
            )

            assert response.status_code == 200
            data = response.json()
            assert data["is_saved"] is True
            assert data["query_name"] == "My Saved Query"

    @pytest.mark.asyncio
    async def test_delete_history_success(self, client):
        """Test DELETE /history/{query_id} deletes query."""
        with patch(
            "app.services.query_history_service.query_history_service.delete_query"
        ) as mock_delete:
            mock_delete.return_value = None

            response = await client.delete("/history/1?user_id=test_user")

            assert response.status_code == 204  # No Content is correct for DELETE

    @pytest.mark.asyncio
    async def test_delete_history_unauthorized(self, client):
        """Test DELETE fails with wrong user_id."""
        from app.utils.exceptions import UnauthorizedAccessError

        with patch(
            "app.services.query_history_service.query_history_service.delete_query",
            side_effect=UnauthorizedAccessError("Not your query"),
        ):
            response = await client.delete("/history/1?user_id=wrong_user")

            assert response.status_code == 403


class TestErrorHandling:
    """Tests for global error handling."""

    @pytest.mark.asyncio
    async def test_404_not_found(self, client):
        """Test non-existent endpoint returns 404."""
        response = await client.get("/nonexistent")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_method_not_allowed(self, client):
        """Test wrong HTTP method returns 405."""
        response = await client.put("/health")

        assert response.status_code == 405
