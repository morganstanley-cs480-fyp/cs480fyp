"""
Unit tests for query_builder service.
Tests SQL generation and safety validation.
"""

from app.services.query_builder import query_builder
from app.models.domain import ExtractedParams
from app.models.request import ManualSearchFilters


class TestQueryBuilderFromExtractedParams:
    """Tests for build_from_extracted_params method."""

    def test_build_simple_account_filter(self):
        """Test query generation with single account filter."""
        params = ExtractedParams(
            accounts=["ACC001"],
            asset_types=None,
            booking_systems=None,
            affirmation_systems=None,
            clearing_houses=None,
            statuses=None,
            date_from=None,
            date_to=None,
            with_exceptions_only=False,
            cleared_trades_only=False,
        )

        query, values = query_builder.build_from_extracted_params(params)

        assert "account = ANY($1::text[])" in query
        assert values == [["ACC001"]]
        assert "SELECT" in query
        assert "FROM trades" in query

    def test_build_multiple_filters(self):
        """Test query with multiple filter types."""
        params = ExtractedParams(
            accounts=["ACC001", "ACC002"],
            asset_types=["FX", "IRS"],
            statuses=["ALLEGED", "CLEARED"],
            date_from=None,
            date_to=None,
            with_exceptions_only=False,
            cleared_trades_only=False,
        )

        query, values = query_builder.build_from_extracted_params(params)

        assert "account = ANY($1::text[])" in query
        assert "asset_type = ANY($2::text[])" in query
        assert "status = ANY($3::text[])" in query
        assert len(values) == 3
        assert values[0] == ["ACC001", "ACC002"]
        assert values[1] == ["FX", "IRS"]
        assert values[2] == ["ALLEGED", "CLEARED"]

    def test_build_with_date_range(self):
        """Test query with date filters."""
        from datetime import date

        params = ExtractedParams(
            accounts=None,
            asset_types=None,
            date_from="2025-01-01",
            date_to="2025-01-31",
            with_exceptions_only=False,
            cleared_trades_only=False,
        )

        query, values = query_builder.build_from_extracted_params(params)

        assert "update_time >=" in query
        assert "update_time <" in query
        assert "INTERVAL '1 day'" in query  # End date inclusive
        assert len(values) == 2
        assert values[0] == date(2025, 1, 1)
        assert values[1] == date(2025, 1, 31)

    def test_build_cleared_trades_only(self):
        """Test cleared_trades_only flag."""
        params = ExtractedParams(
            accounts=None,
            asset_types=None,
            date_from=None,
            date_to=None,
            with_exceptions_only=False,
            cleared_trades_only=True,
        )

        query, values = query_builder.build_from_extracted_params(params)

        assert "status = $1::text" in query
        assert "CLEARED" in values

    def test_build_no_filters(self):
        """Test query with no filters (returns all)."""
        params = ExtractedParams(
            accounts=None,
            asset_types=None,
            date_from=None,
            date_to=None,
            with_exceptions_only=False,
            cleared_trades_only=False,
        )

        query, values = query_builder.build_from_extracted_params(params)

        assert "WHERE 1=1" in query
        assert "AND TRUE" in query or len(values) == 0
        assert "LIMIT" in query


class TestQueryBuilderFromManualFilters:
    """Tests for build_from_manual_filters method."""

    def test_build_simple_manual_filter(self):
        """Test manual search with single filter."""
        filters = ManualSearchFilters(account="ACC001", asset_type=None, status=[])

        query, values = query_builder.build_from_manual_filters(filters)

        assert "account = $1::text" in query
        assert values == ["ACC001"]

    def test_build_with_trade_id(self):
        """Test trade ID filter (integer type)."""
        filters = ManualSearchFilters(
            trade_id=12345678, account=None, asset_type=None, status=[]
        )

        query, values = query_builder.build_from_manual_filters(filters)

        assert "id = $1::integer" in query
        assert values == [12345678]

    def test_build_with_status_list(self):
        """Test status filter with multiple values."""
        filters = ManualSearchFilters(
            account=None, asset_type=None, status=["ALLEGED", "CLEARED", "REJECTED"]
        )

        query, values = query_builder.build_from_manual_filters(filters)

        assert "status = ANY($1::text[])" in query
        assert values == [["ALLEGED", "CLEARED", "REJECTED"]]

    def test_build_with_date_type_selection(self):
        """Test date_type parameter (create_time vs update_time)."""
        filters = ManualSearchFilters(
            account=None,
            asset_type=None,
            status=[],
            date_type="create_time",
            date_from="2025-01-01",
            date_to="2025-01-31",
        )

        query, values = query_builder.build_from_manual_filters(filters)

        assert "create_time >=" in query
        assert "create_time <" in query
        assert "ORDER BY create_time DESC" in query

    def test_build_combined_filters(self):
        """Test multiple manual filters combined."""
        filters = ManualSearchFilters(
            account="ACC001",
            asset_type="FX",
            booking_system="WINTERFELL",
            status=["CLEARED"],
            date_from="2025-01-01",
            date_to="2025-01-31",
        )

        query, values = query_builder.build_from_manual_filters(filters)

        assert len(values) == 6  # All filters
        assert "account = $1::text" in query
        assert "asset_type = $2::text" in query
        assert "booking_system = $3::text" in query
        assert "status = ANY($4::text[])" in query


class TestQuerySafetyValidation:
    """Tests for validate_query_safety method."""

    def test_safe_query_passes(self):
        """Test that properly parameterized query passes validation."""
        query = "SELECT * FROM trades WHERE account = $1 AND status = ANY($2::text[])"
        values = ["ACC001", ["ALLEGED"]]

        assert query_builder.validate_query_safety(query, values) is True

    def test_placeholder_count_mismatch_fails(self):
        """Test that mismatched placeholder count fails."""
        query = "SELECT * FROM trades WHERE account = $1 AND status = $2"
        values = ["ACC001"]  # Only 1 value but 2 placeholders

        assert query_builder.validate_query_safety(query, values) is False

    def test_dangerous_string_concatenation_fails(self):
        """Test that string concatenation patterns are detected."""
        # Test queries that contain dangerous patterns in the string itself
        dangerous_queries = [
            ("SELECT * FROM trades WHERE account = ' + 'malicious", []),  # Contains ' +
            ('SELECT * FROM trades WHERE account = " + "malicious', []),  # Contains " +
            ("SELECT * FROM trades WHERE value = {}", []),  # Contains {}
            ("SELECT * FROM trades WHERE value = %s", []),  # Contains %s
        ]

        for query, values in dangerous_queries:
            assert query_builder.validate_query_safety(query, values) is False

    def test_format_function_detected(self):
        """Test that .format patterns are detected."""
        # Query string that contains .format in it
        query = "SELECT * FROM trades WHERE account = value.format"

        assert query_builder.validate_query_safety(query, []) is False


class TestBuildCountQuery:
    """Tests for build_count_query method."""

    def test_convert_select_to_count(self):
        """Test conversion of SELECT query to COUNT query."""
        search_query = """
            SELECT id, account, asset_type
            FROM trades
            WHERE account = $1 AND status = $2
            ORDER BY update_time DESC
            LIMIT 50
        """

        count_query = query_builder.build_count_query(search_query)

        assert "SELECT COUNT(*) FROM trades" in count_query
        assert "WHERE" in count_query
        assert "ORDER BY" not in count_query
        assert "LIMIT" not in count_query

    def test_preserve_where_clause(self):
        """Test that WHERE clause is preserved in count query."""
        search_query = "SELECT * FROM trades WHERE asset_type = $1 ORDER BY id"
        count_query = query_builder.build_count_query(search_query)

        assert "WHERE asset_type = $1" in count_query
