"""
Query History Service - CRUD Operations for Query History
Manages user query history: saving, retrieving, updating, and deleting queries.
"""

from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional
from app.database.connection import db_manager
from app.models.domain import QueryHistory
from app.utils.logger import logger
from app.utils.exceptions import (
    DatabaseQueryError,
    QueryHistoryNotFoundError,
    UnauthorizedAccessError
)


class QueryHistoryService:
    """
    Service for managing query history in the database.
    Provides CRUD operations with ownership validation.
    """
    
    async def save_query(
        self,
        user_id: str,
        query_text: str,
        search_type: str
    ) -> int:
        """
        Save a new query to history.
        
        Args:
            user_id: User who executed the query
            query_text: Natural language query or JSON filters
            search_type: "natural_language" or "manual"
        
        Returns:
            query_id of the newly created record
        
        Raises:
            DatabaseQueryError: If save fails
        """
        query = """
            INSERT INTO query_history 
            (user_id, query_text, is_saved, query_name, create_time, last_use_time)
            VALUES ($1, $2, FALSE, NULL, NOW(), NOW())
            RETURNING id
        """
        
        try:
            query_id = await db_manager.fetchval(query, user_id, query_text)
            
            logger.info(
                "Query saved to history",
                extra={
                    "query_id": query_id,
                    "user_id": user_id,
                    "search_type": search_type,
                    "query_length": len(query_text)
                }
            )
            
            return query_id
            
        except Exception as e:
            logger.error(
                f"Failed to save query to history: {e}",
                extra={"user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to save query to history",
                details={"error": str(e), "user_id": user_id}
            )
    
    async def get_user_history(
        self,
        user_id: str,
        limit: int = 50,
        saved_only: bool = False
    ) -> list[QueryHistory]:
        """
        Get query history for a user.
        
        Args:
            user_id: User ID to fetch history for
            limit: Maximum number of records to return (default: 50, max: 100)
            saved_only: If True, return only saved/bookmarked queries
        
        Returns:
            List of QueryHistory records, ordered by last_use_time DESC
        
        Raises:
            DatabaseQueryError: If query fails
        """
        # Build query based on filters
        if saved_only:
            query = """
                SELECT * FROM query_history 
                WHERE user_id = $1 AND is_saved = TRUE
                ORDER BY last_use_time DESC
                LIMIT $2
            """
        else:
            query = """
                SELECT * FROM query_history 
                WHERE user_id = $1
                ORDER BY last_use_time DESC
                LIMIT $2
            """
        
        try:
            records = await db_manager.fetch(query, user_id, limit)
            
            # Convert to QueryHistory models
            history_list = [QueryHistory.from_db_record(record) for record in records]
            
            logger.info(
                "Retrieved user query history",
                extra={
                    "user_id": user_id,
                    "count": len(history_list),
                    "saved_only": saved_only,
                    "limit": limit
                }
            )
            
            return history_list
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve query history: {e}",
                extra={"user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to retrieve query history",
                details={"error": str(e), "user_id": user_id}
            )
    
    async def get_history_stats(self, user_id: str) -> dict:
        """
        Get statistics about user's query history.
        
        Args:
            user_id: User ID to get stats for
        
        Returns:
            Dictionary with total_count, saved_count, recent_count (last 7 days)
        
        Raises:
            DatabaseQueryError: If query fails
        """
        query = """
            SELECT 
                COUNT(*) as total_count,
                COUNT(*) FILTER (WHERE is_saved = TRUE) as saved_count,
                COUNT(*) FILTER (WHERE last_use_time >= NOW() - INTERVAL '7 days') as recent_count
            FROM query_history
            WHERE user_id = $1
        """
        
        try:
            record = await db_manager.fetchrow(query, user_id)
            
            stats = {
                "total_count": record["total_count"],
                "saved_count": record["saved_count"],
                "recent_count": record["recent_count"]
            }
            
            logger.debug(
                "Retrieved query history stats",
                extra={"user_id": user_id, "stats": stats}
            )
            
            return stats
            
        except Exception as e:
            logger.error(
                f"Failed to retrieve history stats: {e}",
                extra={"user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to retrieve history statistics",
                details={"error": str(e), "user_id": user_id}
            )
    
    async def update_query(
        self,
        query_id: int,
        user_id: str,
        is_saved: bool,
        query_name: Optional[str] = None
    ) -> QueryHistory:
        """
        Update a query's saved status and name.
        
        Args:
            query_id: ID of query to update
            user_id: User ID (for ownership validation)
            is_saved: Whether to mark as saved
            query_name: Name for saved query (required if is_saved=True)
        
        Returns:
            Updated QueryHistory record
        
        Raises:
            QueryHistoryNotFoundError: If query doesn't exist
            UnauthorizedAccessError: If user doesn't own the query
            DatabaseQueryError: If update fails
        """
        # First, verify ownership
        await self._verify_ownership(query_id, user_id)
        
        # Update query
        query = """
            UPDATE query_history 
            SET is_saved = $1, query_name = $2
            WHERE id = $3 AND user_id = $4
            RETURNING *
        """
        
        try:
            record = await db_manager.fetchrow(query, is_saved, query_name, query_id, user_id)
            
            if not record:
                raise QueryHistoryNotFoundError(
                    f"Query {query_id} not found",
                    details={"query_id": query_id, "user_id": user_id}
                )
            
            updated_history = QueryHistory.from_db_record(record)
            
            logger.info(
                "Query history updated",
                extra={
                    "query_id": query_id,
                    "user_id": user_id,
                    "is_saved": is_saved,
                    "query_name": query_name
                }
            )
            
            return updated_history
            
        except QueryHistoryNotFoundError:
            raise
        except Exception as e:
            logger.error(
                f"Failed to update query history: {e}",
                extra={"query_id": query_id, "user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to update query history",
                details={"error": str(e), "query_id": query_id}
            )
    
    async def delete_query(
        self,
        query_id: int,
        user_id: str
    ) -> None:
        """
        Delete a query from history.
        
        Args:
            query_id: ID of query to delete
            user_id: User ID (for ownership validation)
        
        Raises:
            QueryHistoryNotFoundError: If query doesn't exist
            UnauthorizedAccessError: If user doesn't own the query
            DatabaseQueryError: If deletion fails
        """
        # First, verify ownership
        await self._verify_ownership(query_id, user_id)
        
        # Delete query
        query = """
            DELETE FROM query_history 
            WHERE id = $1 AND user_id = $2
        """
        
        try:
            result = await db_manager.execute(query, query_id, user_id)
            
            # Check if any rows were deleted
            if result == "DELETE 0":
                raise QueryHistoryNotFoundError(
                    f"Query {query_id} not found",
                    details={"query_id": query_id, "user_id": user_id}
                )
            
            logger.info(
                "Query history deleted",
                extra={"query_id": query_id, "user_id": user_id}
            )
            
        except QueryHistoryNotFoundError:
            raise
        except Exception as e:
            logger.error(
                f"Failed to delete query history: {e}",
                extra={"query_id": query_id, "user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to delete query history",
                details={"error": str(e), "query_id": query_id}
            )
    
    async def delete_all_user_queries(
        self,
        user_id: str
    ) -> int:
        """
        Delete all query history for a user.
        
        Args:
            user_id: User ID whose history should be cleared
        
        Returns:
            Number of queries deleted
        
        Raises:
            DatabaseQueryError: If deletion fails
        """
        query = """
            DELETE FROM query_history 
            WHERE user_id = $1
        """
        
        try:
            result = await db_manager.execute(query, user_id)
            
            # Extract number of deleted rows from result (e.g., "DELETE 5")
            deleted_count = int(result.split()[-1]) if result else 0
            
            logger.info(
                "All query history deleted for user",
                extra={"user_id": user_id, "deleted_count": deleted_count}
            )
            
            return deleted_count
            
        except Exception as e:
            logger.error(
                f"Failed to delete all query history: {e}",
                extra={"user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to delete all query history",
                details={"error": str(e), "user_id": user_id}
            )
    
    async def update_last_use_time(
        self,
        query_id: int,
        user_id: str
    ) -> None:
        """
        Update the last_use_time for a query.
        Called when a user re-runs a saved query.
        
        Args:
            query_id: ID of query to update
            user_id: User ID (for ownership validation)
        
        Raises:
            DatabaseQueryError: If update fails
        """
        query = """
            UPDATE query_history 
            SET last_use_time = NOW()
            WHERE id = $1 AND user_id = $2
        """
        
        try:
            await db_manager.execute(query, query_id, user_id)
            
            logger.debug(
                "Updated query last_use_time",
                extra={"query_id": query_id, "user_id": user_id}
            )
            
        except Exception as e:
            logger.warning(
                f"Failed to update last_use_time: {e}",
                extra={"query_id": query_id, "user_id": user_id}
            )
            # Don't raise - this is non-critical

    async def get_suggestions(
        self,
        user_id: str,
        query: str,
        limit: int = 10,
        max_candidates: int = 200,
        min_score: float = 0.3
    ) -> list[dict]:
        """
        Get fuzzy typeahead suggestions from trade database values.

        Args:
            user_id: User ID to fetch suggestions for
            query: User-typed query string
            limit: Maximum number of suggestions to return
            max_candidates: Max recent history rows to scan
            min_score: Minimum similarity score to include

        Returns:
            List of suggestion dicts with query metadata
        """
        normalized_query = self._normalize_text(query)
        if len(normalized_query) < 2:
            return []

        pattern = f"%{query.strip()}%"
        per_field_limit = max(5, min(25, max_candidates // 6))

        field_specs = [
            ("Account", "account", "account", "text"),
            ("Asset type", "asset_type", "asset type", "text"),
            ("Booking system", "booking_system", "booking system", "text"),
            ("Affirmation system", "affirmation_system", "affirmation system", "text"),
            ("Clearing house", "clearing_house", "clearing house", "text"),
            ("Status", "status", "status", "text"),
            ("Trade id", "id", "trade id", "id"),
        ]

        scored: dict[str, tuple[float, dict]] = {}

        for category, column, label, value_type in field_specs:
            if value_type == "id":
                sql_query = f"""
                    SELECT DISTINCT {column}::text AS value
                    FROM trades
                    WHERE {column}::text ILIKE $1
                    ORDER BY {column}::text
                    LIMIT $2
                """
            else:
                sql_query = f"""
                    SELECT DISTINCT {column} AS value
                    FROM trades
                    WHERE {column} ILIKE $1
                    ORDER BY {column}
                    LIMIT $2
                """

            try:
                records = await db_manager.fetch(sql_query, pattern, per_field_limit)
            except Exception as e:
                logger.error(
                    f"Failed to fetch suggestions for {column}: {e}",
                    extra={"user_id": user_id}
                )
                raise DatabaseQueryError(
                    "Failed to fetch suggestions",
                    details={"error": str(e), "user_id": user_id, "field": column}
                )

            for record in records:
                raw_value = (record.get("value") or "").strip()
                if not raw_value:
                    continue

                query_text = f"{label} {raw_value}"
                normalized_value = self._normalize_text(raw_value)
                normalized_phrase = self._normalize_text(query_text)

                score = max(
                    self._similarity_score(normalized_query, normalized_value),
                    self._similarity_score(normalized_query, normalized_phrase)
                )

                if score < min_score:
                    continue

                suggestion = {
                    "query_id": 0,
                    "user_id": user_id,
                    "query_text": query_text,
                    "is_saved": False,
                    "query_name": None,
                    "create_time": None,
                    "last_use_time": None,
                    "score": score,
                    "category": category,
                }

                existing = scored.get(query_text)
                if existing is None or score > existing[0]:
                    scored[query_text] = (score, suggestion)

        suggestions = [item[1] for item in scored.values()]

        suggestions.sort(
            key=lambda item: item["score"],
            reverse=True
        )

        return suggestions[:limit]
    
    async def _verify_ownership(
        self,
        query_id: int,
        user_id: str
    ) -> None:
        """
        Verify that a user owns a query.
        
        Args:
            query_id: Query ID to check
            user_id: User ID to verify
        
        Raises:
            QueryHistoryNotFoundError: If query doesn't exist
            UnauthorizedAccessError: If user doesn't own the query
        """
        query = """
            SELECT user_id FROM query_history 
            WHERE id = $1
        """
        
        try:
            record = await db_manager.fetchrow(query, query_id)
            
            if not record:
                raise QueryHistoryNotFoundError(
                    f"Query {query_id} not found",
                    details={"query_id": query_id}
                )
            if record["user_id"] != user_id:
                logger.warning(
                    "Unauthorized access attempt",
                    extra={
                        "query_id": query_id,
                        "attempted_user": user_id,
                        "owner": record["user_id"]
                    }
                )
                raise UnauthorizedAccessError(
                    "You do not have permission to access this query",
                    details={"query_id": query_id}
                )
                
        except (QueryHistoryNotFoundError, UnauthorizedAccessError):
            raise
        except Exception as e:
            logger.error(
                f"Failed to verify ownership: {e}",
                extra={"query_id": query_id, "user_id": user_id}
            )
            raise DatabaseQueryError(
                "Failed to verify query ownership",
                details={"error": str(e), "query_id": query_id}
            )

    @staticmethod
    def _normalize_text(text: str) -> str:
        return " ".join(text.lower().split())

    @staticmethod
    def _looks_like_manual_filters(text: str) -> bool:
        # Manual search filters are saved as JSON strings.
        return text.lstrip().startswith("{")

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return {token for token in text.split(" ") if token}

    def _similarity_score(self, query: str, candidate: str) -> float:
        ratio = SequenceMatcher(None, query, candidate).ratio()

        if candidate.startswith(query):
            ratio += 0.3
        elif query in candidate:
            ratio += 0.1

        query_tokens = self._tokenize(query)
        candidate_tokens = self._tokenize(candidate)
        if query_tokens and candidate_tokens:
            intersection = query_tokens.intersection(candidate_tokens)
            union = query_tokens.union(candidate_tokens)
            ratio += 0.2 * (len(intersection) / len(union))

        return min(ratio, 1.5)

    @staticmethod
    def _coerce_datetime(value) -> datetime:
        if isinstance(value, datetime):
            return value

        if isinstance(value, str):
            cleaned = value.replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(cleaned)
            except ValueError:
                pass

        return datetime.min


# Global singleton instance
query_history_service = QueryHistoryService()
