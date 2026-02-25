"""
Query Builder Service - Safe SQL Generation
Converts extracted parameters or manual filters into parameterized SQL queries.

CRITICAL SECURITY:
- NEVER concatenate user input into SQL strings
- ALWAYS use parameterized queries with asyncpg placeholders ($1, $2, etc.)
- asyncpg handles escaping automatically - we just provide values in order
"""

from typing import Tuple, Any
from datetime import datetime
from app.config.settings import settings
from app.models.domain import ExtractedParams
from app.models.request import ManualSearchFilters
from app.utils.logger import logger


class QueryBuilder:
    """
    Builds safe, parameterized SQL queries from search parameters.
    
    Uses PostgreSQL's ANY() function for multi-value filters:
    - WHERE account = ANY($1::text[]) for lists of values
    - Handles NULL values properly
    - Supports date ranges
    - Always returns parameterized queries (SQL + values list)
    """
    
    # Base SELECT query with all required columns
    BASE_QUERY = """
        SELECT 
            id,
            account,
            asset_type,
            booking_system,
            affirmation_system,
            clearing_house,
            create_time,
            update_time,
            status
        FROM trades
        WHERE 1=1
    """
    
    def build_from_extracted_params(
        self, 
        params: ExtractedParams
    ) -> Tuple[str, list[Any]]:
        """
        Build SQL query from AI-extracted parameters.
        
        Args:
            params: ExtractedParams from Bedrock
        
        Returns:
            Tuple of (sql_query, parameter_values)
            Example: ("SELECT ... WHERE account = ANY($1)", [["ACC123", "ACC456"]])
        """
        conditions = []
        values = []
        param_index = 1

        # Handle trade_id filter — exact lookup, short-circuits all other filters
        if params.trade_id is not None:
            conditions.append(f"id = ${param_index}::integer")
            values.append(params.trade_id)
            param_index += 1
            query = f"{self.BASE_QUERY} AND {conditions[0]} LIMIT 1"
            logger.info(
                "Built SQL query from extracted parameters (trade_id exact lookup)",
                extra={"trade_id": params.trade_id}
            )
            return query, values
        
        # Handle accounts filter
        if params.accounts:
            conditions.append(f"account = ANY(${param_index}::text[])")
            values.append(params.accounts)
            param_index += 1
        
        # Handle asset_types filter
        if params.asset_types:
            conditions.append(f"asset_type = ANY(${param_index}::text[])")
            values.append(params.asset_types)
            param_index += 1
        
        # Handle booking_systems filter
        if params.booking_systems:
            conditions.append(f"booking_system = ANY(${param_index}::text[])")
            values.append(params.booking_systems)
            param_index += 1
        
        # Handle affirmation_systems filter
        if params.affirmation_systems:
            conditions.append(f"affirmation_system = ANY(${param_index}::text[])")
            values.append(params.affirmation_systems)
            param_index += 1
        
        # Handle clearing_houses filter
        if params.clearing_houses:
            conditions.append(f"clearing_house = ANY(${param_index}::text[])")
            values.append(params.clearing_houses)
            param_index += 1
        
        # Handle statuses filter
        if params.statuses:
            conditions.append(f"status = ANY(${param_index}::text[])")
            values.append(params.statuses)
            param_index += 1
        
        # Handle date_from filter (always uses update_time)
        if params.date_from:
            conditions.append(f"update_time >= ${param_index}::timestamp")
            # Convert string date to datetime object for asyncpg
            date_value = datetime.strptime(params.date_from, "%Y-%m-%d").date()
            values.append(date_value)
            param_index += 1
        
        # Handle date_to filter (always uses update_time)
        if params.date_to:
            # Add 1 day to include the entire end date
            conditions.append(f"update_time < (${param_index}::timestamp + INTERVAL '1 day')")
            # Convert string date to datetime object for asyncpg
            date_value = datetime.strptime(params.date_to, "%Y-%m-%d").date()
            values.append(date_value)
            param_index += 1
        
        # Handle with_exceptions_only filter
        # Note: This requires an exceptions table join - for now we skip this filter
        # TODO: Implement when exceptions table is available
        if params.with_exceptions_only:
            logger.warning("with_exceptions_only filter not yet implemented")

        # Handle cleared_trades_only filter
        if params.cleared_trades_only:
            conditions.append(f"status = ${param_index}::text")
            values.append("CLEARED")
            param_index += 1

        # Build final query
        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        query = f"{self.BASE_QUERY} AND {where_clause} ORDER BY update_time DESC LIMIT {settings.MAX_SEARCH_RESULTS}"
        
        logger.info(
            "Built SQL query from extracted parameters",
            extra={
                "num_conditions": len(conditions),
                "num_params": len(values),
                "has_date_filter": params.date_from is not None or params.date_to is not None
            }
        )
        
        return query, values
    
    def build_from_manual_filters(
        self, 
        filters: ManualSearchFilters
    ) -> Tuple[str, list[Any]]:
        """
        Build SQL query from manual frontend filters.
        
        Args:
            filters: ManualSearchFilters from frontend
        
        Returns:
            Tuple of (sql_query, parameter_values)
        """
        conditions = []
        values = []
        param_index = 1
        
        # Handle trade_id filter (exact match, INTEGER type)
        if filters.trade_id:
            try:
                trade_id_int = int(filters.trade_id)
                conditions.append(f"id = ${param_index}::integer")
                values.append(trade_id_int)
                param_index += 1
            except ValueError:
                logger.warning(f"Invalid trade_id format: {filters.trade_id}")
        
        # Handle account filter (exact match, single value)
        if filters.account:
            conditions.append(f"account = ${param_index}::text")
            values.append(filters.account)
            param_index += 1
        
        # Handle asset_type filter (exact match, single value)
        if filters.asset_type:
            conditions.append(f"asset_type = ${param_index}::text")
            values.append(filters.asset_type)
            param_index += 1
        
        # Handle booking_system filter (exact match, single value)
        if filters.booking_system:
            conditions.append(f"booking_system = ${param_index}::text")
            values.append(filters.booking_system)
            param_index += 1
        
        # Handle affirmation_system filter (exact match, single value)
        if filters.affirmation_system:
            conditions.append(f"affirmation_system = ${param_index}::text")
            values.append(filters.affirmation_system)
            param_index += 1
        
        # Handle clearing_house filter (exact match, single value)
        if filters.clearing_house:
            conditions.append(f"clearing_house = ${param_index}::text")
            values.append(filters.clearing_house)
            param_index += 1
        
        # Handle status filter (can be multiple values)
        if filters.status:
            conditions.append(f"status = ANY(${param_index}::text[])")
            values.append(filters.status)
            param_index += 1
        
        # Determine which date field to filter on
        date_field = filters.date_type  # "create_time" or "update_time"
        
        # Handle date_from filter
        if filters.date_from:
            conditions.append(f"{date_field} >= ${param_index}::timestamp")
            # Convert string date to datetime object for asyncpg
            date_value = datetime.strptime(filters.date_from, "%Y-%m-%d").date()
            values.append(date_value)
            param_index += 1
        
        # Handle date_to filter
        if filters.date_to:
            # Add 1 day to include the entire end date
            conditions.append(f"{date_field} < (${param_index}::timestamp + INTERVAL '1 day')")
            # Convert string date to datetime object for asyncpg
            date_value = datetime.strptime(filters.date_to, "%Y-%m-%d").date()
            values.append(date_value)
            param_index += 1
        
        # Handle with_exceptions_only filter
        # TODO: Implement when exceptions table is available
        if filters.with_exceptions_only:
            logger.warning("with_exceptions_only filter not yet implemented")
        
        # Handle cleared_trades_only filter
        if filters.cleared_trades_only:
            conditions.append(f"status = ${param_index}::text")
            values.append("CLEARED")
            param_index += 1
        
        # Build final query
        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        query = f"{self.BASE_QUERY} AND {where_clause} ORDER BY {date_field} DESC LIMIT {settings.MAX_SEARCH_RESULTS}"
        
        logger.info(
            "Built SQL query from manual filters",
            extra={
                "num_conditions": len(conditions),
                "num_params": len(values),
                "date_field": date_field,
                "has_trade_id": filters.trade_id is not None
            }
        )
        
        return query, values
    
    def validate_query_safety(self, query: str, values: list[Any]) -> bool:
        """
        Validate that a query is safe and follows security best practices.
        
        Checks:
        - No string concatenation/interpolation in query
        - All values are in the values list
        - Query uses parameterized placeholders ($1, $2, etc.)
        
        Args:
            query: SQL query string
            values: List of parameter values
        
        Returns:
            True if query is safe, False otherwise
        """
        # Check for dangerous patterns
        dangerous_patterns = [
            "' + ",
            '" + ',
            "format(",
            ".format",
            "%s",
            "{}"
        ]
        
        for pattern in dangerous_patterns:
            if pattern in query:
                logger.error(
                    f"Unsafe query pattern detected: {pattern}",
                    extra={"query_preview": query[:200]}
                )
                return False
        
        # Count placeholders in query
        placeholder_count = query.count("$")
        
        # Verify placeholder count matches values count
        if placeholder_count != len(values):
            logger.error(
                f"Placeholder count mismatch: {placeholder_count} placeholders, {len(values)} values",
                extra={"query_preview": query[:200]}
            )
            return False
        
        logger.debug("Query safety validation passed")
        return True
    
    def build_count_query(self, search_query: str) -> str:
        """
        Convert a search query to a count query.
        
        Args:
            search_query: Original SELECT query
        
        Returns:
            COUNT query with same WHERE clause
        """
        # Extract WHERE clause from original query
        where_index = search_query.lower().find("where")
        order_index = search_query.lower().find("order by")
        
        if where_index == -1:
            where_clause = ""
        elif order_index == -1:
            where_clause = search_query[where_index:]
        else:
            where_clause = search_query[where_index:order_index]
        
        count_query = f"SELECT COUNT(*) FROM trades {where_clause}"
        
        return count_query
    
    def build_enriched_data_query(self, trade_ids: list[int]) -> Tuple[str, list[Any]]:
        """
        Build query to fetch enriched data for ranking (transactions only).
        
        This query efficiently fetches transaction counts for a list of trade IDs.
        Exception data is not included as exceptions are managed via dedicated page.
        
        Performance: Optimized for small result sets (typically 50 trades).
        Uses simple LEFT JOIN with GROUP BY - efficient with proper indexes.
        
        Args:
            trade_ids: List of trade IDs to fetch enriched data for
        
        Returns:
            Tuple of (sql_query, parameter_values)
        """
        if not trade_ids:
            return "", []
        
        query = """
            SELECT 
                t.id as trade_id,
                COUNT(DISTINCT tr.id) as transaction_count
            FROM trades t
            LEFT JOIN transactions tr ON t.id = tr.trade_id
            WHERE t.id = ANY($1::integer[])
            GROUP BY t.id
        """
        
        logger.debug(
            f"Building enriched data query for {len(trade_ids)} trades"
        )
        
        return query, [trade_ids]


# Global singleton instance
query_builder = QueryBuilder()
