"""
Search Orchestrator - Business Logic Coordinator
Orchestrates the complete search flow: parameter extraction, query building, execution, and history tracking.
"""

import time
from typing import Tuple, Any, Optional


from app.database.connection import db_manager
from app.models.request import SearchRequest
from app.models.response import SearchResponse
from app.models.domain import Trade, ExtractedParams

# NOTE: Using Gemini temporarily while Bedrock access is being resolved.
#       Switch back to: from app.services.bedrock_service import bedrock_service
from app.services.gemini_service import gemini_service as bedrock_service
from app.services.query_builder import query_builder
from app.services.query_history_service import query_history_service
from app.services.ranking_service import trade_ranker
from app.utils.logger import logger
from app.utils.exceptions import InvalidSearchRequestError, DatabaseQueryError


class SearchOrchestrator:
    """
    Orchestrates the complete search flow.

    Flow for Natural Language Search:
    1. Extract parameters using Bedrock
    2. Build SQL from extracted parameters
    3. Execute query against database
    4. Save to query history
    5. Format and return response

    Flow for Manual Search:
    1. Build SQL from manual filters
    2. Execute query against database
    3. Save to query history
    4. Format and return response
    """

    def __init__(self):
        self.bedrock = bedrock_service
        self.builder = query_builder
        self.history = query_history_service
        self.db = db_manager
        self.ranker = trade_ranker

    async def execute_search(self, request: SearchRequest) -> SearchResponse:
        """
        Execute a trade search request (natural language or manual).

        Args:
            request: SearchRequest containing user_id, search_type, and query/filters

        Returns:
            SearchResponse with results and metadata

        Raises:
            InvalidSearchRequestError: If request is invalid
            BedrockAPIError: If AI extraction fails
            DatabaseQueryError: If query execution fails
        """
        start_time = time.time()
        query_id: Optional[int] = None

        logger.info(
            "Starting search execution",
            extra={"user_id": request.user_id, "search_type": request.search_type},
        )

        # Save to query history early (before execution) so failed searches are tracked
        try:
            query_text = (
                request.query_text
                if request.search_type == "natural_language"
                else request.filters.model_dump_json()
            )
            query_id = await self.history.save_query(
                user_id=request.user_id,
                query_text=query_text,
                search_type=request.search_type,
            )
            logger.info(
                "Query saved to history",
                extra={"user_id": request.user_id, "query_id": query_id},
            )
        except Exception as e:
            # Log but don't fail search if history save fails
            logger.warning(
                f"Failed to save query to history: {e}",
                extra={"user_id": request.user_id},
            )

        # Step 1: Build SQL query based on search type
        if request.search_type == "natural_language":
            (
                sql_query,
                params,
                extracted_params,
            ) = await self._handle_natural_language_search(request)
        else:  # manual
            sql_query, params, extracted_params = await self._handle_manual_search(
                request
            )

        # Step 2: Validate query safety
        if not self.builder.validate_query_safety(sql_query, params):
            logger.error(
                "Query safety validation failed", extra={"user_id": request.user_id}
            )
            raise InvalidSearchRequestError(
                "Generated query failed safety validation",
                details={"user_id": request.user_id},
            )

        # Step 3: Execute query
        trades = await self._execute_query(sql_query, params, request.user_id)

        # Step 3.5: Apply intelligent ranking (if enabled)
        trades = await self._apply_ranking(trades, request.user_id)

        # Step 4: Format response
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        response = SearchResponse(
            query_id=query_id or 0,  # Use 0 if history save failed
            total_results=len(trades),
            results=trades,
            search_type=request.search_type,
            cached=False,  # TODO: Implement result caching in Phase 2
            execution_time_ms=execution_time,
            extracted_params=extracted_params
            if request.search_type == "natural_language"
            else None,
        )

        logger.info(
            "Search completed successfully",
            extra={
                "user_id": request.user_id,
                "query_id": query_id,
                "results_count": len(trades),
                "execution_time_ms": execution_time,
                "search_type": request.search_type,
            },
        )

        return response

    async def _handle_natural_language_search(
        self, request: SearchRequest
    ) -> Tuple[str, list[Any], Optional[ExtractedParams]]:
        """
        Handle natural language search: extract params → build SQL.

        Args:
            request: SearchRequest with query_text

        Returns:
            Tuple of (sql_query, params, extracted_params)
        """
        logger.info(
            "Processing natural language query",
            extra={"user_id": request.user_id, "query": request.query_text[:100]},
        )

        # Extract parameters using Bedrock
        extracted_params = await self.bedrock.extract_parameters(
            query=request.query_text, user_id=request.user_id
        )

        logger.info(
            "Parameters extracted from natural language",
            extra={
                "user_id": request.user_id,
                "extracted_params": extracted_params.model_dump(),
            },
        )

        # Build SQL from extracted parameters
        sql_query, params = self.builder.build_from_extracted_params(extracted_params)

        logger.info(
            "[SQL QUERY]\n%s\n[SQL PARAMS] %s",
            sql_query,
            params,
        )

        return sql_query, params, extracted_params

    async def _handle_manual_search(
        self, request: SearchRequest
    ) -> Tuple[str, list[Any], None]:
        """
        Handle manual search: build SQL from filters directly.

        Args:
            request: SearchRequest with filters

        Returns:
            Tuple of (sql_query, params, None)
        """
        logger.info(
            "Processing manual search",
            extra={"user_id": request.user_id, "filters": request.filters.model_dump()},
        )

        # Build SQL from manual filters
        sql_query, params = self.builder.build_from_manual_filters(request.filters)

        return sql_query, params, None

    async def _execute_query(
        self, sql_query: str, params: list[Any], user_id: str
    ) -> list[Trade]:
        """
        Execute SQL query and convert results to Trade models.

        Args:
            sql_query: Parameterized SQL query
            params: List of parameter values
            user_id: User ID for logging

        Returns:
            List of Trade models

        Raises:
            DatabaseQueryError: If query execution fails
        """
        logger.debug(
            "Executing trade search query",
            extra={
                "user_id": user_id,
                "param_count": len(params),
                "query_preview": sql_query[:200],
            },
        )

        try:
            # Execute query
            records = await self.db.fetch(sql_query, *params)

            # Convert records to Trade models
            trades = [Trade.from_db_record(record) for record in records]

            logger.info(
                "Query executed successfully",
                extra={"user_id": user_id, "results_count": len(trades)},
            )

            return trades

        except Exception as e:
            logger.error(
                f"Failed to execute trade search query: {e}",
                extra={"user_id": user_id, "param_count": len(params), "error": str(e)},
            )
            raise DatabaseQueryError(
                "Failed to execute search query",
                details={"error": str(e), "user_id": user_id},
            )

    async def _apply_ranking(self, trades: list[Trade], user_id: str) -> list[Trade]:
        """
        Apply intelligent ranking to search results.

        Fetches enriched data (exceptions, transactions) and ranks trades
        by relevance using the configured ranking algorithm.

        Args:
            trades: Initial list of trades from search query
            user_id: User ID for logging

        Returns:
            Ranked list of trades (most relevant first)
        """
        if not trades:
            return trades

        # Check if ranking is enabled
        if not self.ranker.config.is_enabled():
            logger.debug(
                "Ranking disabled, returning trades in original order",
                extra={"user_id": user_id},
            )
            return trades

        try:
            # Extract trade IDs
            trade_ids = [trade.trade_id for trade in trades]

            # Fetch enriched data for ranking
            enriched_query, enriched_params = self.builder.build_enriched_data_query(
                trade_ids
            )

            if not enriched_query:
                logger.warning("No enriched data query generated, skipping ranking")
                return trades

            # Execute enriched data query
            enriched_records = await self.db.fetch(enriched_query, *enriched_params)

            # Convert to dict for efficient lookup
            enriched_data = {}
            for record in enriched_records:
                enriched_data[record["trade_id"]] = {
                    "transaction_count": record["transaction_count"]
                }

            logger.debug(
                f"Fetched enriched data for {len(enriched_data)} trades",
                extra={"user_id": user_id},
            )

            # Apply ranking
            ranked_trades = self.ranker.rank_trades(trades, enriched_data)

            logger.info(
                "Applied intelligent ranking to search results",
                extra={"user_id": user_id, "trade_count": len(ranked_trades)},
            )

            return ranked_trades

        except Exception as e:
            # If ranking fails, log warning and return original order
            logger.warning(
                f"Ranking failed, returning trades in original order: {e}",
                extra={"user_id": user_id, "error": str(e)},
            )
            return trades


# Global singleton instance
search_orchestrator = SearchOrchestrator()
