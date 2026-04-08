"""
Knowledge Graph analytics service for search-service.

Translates tool-call argument dicts (produced by native Gemini function calling)
into parameterised Cypher queries and runs them against Neo4j.

The query-building logic mirrors graph-chatbot's GenericQueryBuilder so both
services produce identical results from the same graph schema.  No Pydantic
AnalyticalIntent model is required here — Gemini fills in the args directly.
"""

from typing import Any

from app.database.neo4j_client import neo4j_client
from app.utils.logger import logger


class KGService:
    """Converts Gemini tool-call args into Cypher and returns structured evidence."""

    # Maps (Dimension, MetricTarget) -> mandatory MATCH path
    BLUEPRINTS: dict[tuple[str, str], str] = {
        ("BookingSystem", "Trade"): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)",
        ("BookingSystem", "Transaction"): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        (
            "BookingSystem",
            "Exception",
        ): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        ("ClearingHouse", "Trade"): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)",
        ("ClearingHouse", "Transaction"): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        (
            "ClearingHouse",
            "Exception",
        ): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        ("AffirmationSystem", "Trade"): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)",
        (
            "AffirmationSystem",
            "Transaction",
        ): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        (
            "AffirmationSystem",
            "Exception",
        ): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        # Counterparty dimension — groups by the entity on the other end of a transaction
        (
            "Counterparty",
            "Trade",
        ): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim:Entity)",
        (
            "Counterparty",
            "Transaction",
        ): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim:Entity)",
        (
            "Counterparty",
            "Exception",
        ): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim:Entity), (tr)-[:GENERATED_EXCEPTION]->(e:Exception)",
        # Property-based fallback (Account, AssetType, TradeStatus, etc.)
        ("PROPERTY", "Trade"): "(t:Trade)",
        ("PROPERTY", "Transaction"): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        (
            "PROPERTY",
            "Exception",
        ): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
    }

    # Maps dimension name -> the Cypher property expression to GROUP BY
    DIMENSION_PROPERTIES: dict[str, str] = {
        "BookingSystem": "dim.name",
        "ClearingHouse": "dim.name",
        "AffirmationSystem": "dim.name",
        "Counterparty": "dim.name",
        "Account": "t.account",
        "AssetType": "t.asset_type",
        "TradeStatus": "t.status",
        "TransactionStatus": "tr.status",
        "ExceptionStatus": "e.status",
    }

    # Dimensions that route to the PROPERTY blueprint (no :Entity node needed)
    PROPERTY_DIMENSIONS = {"Account", "AssetType", "TradeStatus", "TransactionStatus", "ExceptionStatus"}

    # Cross-dimension Cypher templates.
    # Each entry maps (dim1, dim2) -> a Cypher MATCH clause that binds both
    # dim1_node and dim2_node variables alongside a trade node t.
    PATHWAY_BLUEPRINTS: dict[tuple[str, str], str] = {
        ("Counterparty", "ClearingHouse"): (
            "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim1_node:Entity), "
            "(t)-[:CLEARED_BY]->(dim2_node:Entity)"
        ),
        ("Counterparty", "BookingSystem"): (
            "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim1_node:Entity), "
            "(t)-[:BOOKED_ON]->(dim2_node:Entity)"
        ),
        ("Counterparty", "AssetType"): (
            "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:SENT_TO|RECEIVED_FROM]->(dim1_node:Entity)"
        ),
        ("ClearingHouse", "BookingSystem"): (
            "(t:Trade)-[:CLEARED_BY]->(dim1_node:Entity), (t)-[:BOOKED_ON]->(dim2_node:Entity)"
        ),
        ("ClearingHouse", "AssetType"): "(t:Trade)-[:CLEARED_BY]->(dim1_node:Entity)",
        ("BookingSystem", "AssetType"): "(t:Trade)-[:BOOKED_ON]->(dim1_node:Entity)",
    }

    # For pathway pairs where dim2 is a trade property (not an :Entity node)
    PATHWAY_DIM2_PROPERTY: dict[str, str] = {
        "AssetType": "t.asset_type",
        "TradeStatus": "t.status",
    }

    async def query(self, args: dict[str, Any]) -> dict[str, Any]:
        """
        Build and execute a Cypher query from Gemini tool-call args.

        When args contains dimension_2, a cross-dimension (pathway) query is
        run returning (dim1_value, dim2_value, count) pairs.

        Returns an evidence dict in the same shape as the SQL evidence dicts
        produced by ChatService, so downstream synthesis treats them uniformly.
        """
        dimension = args.get("dimension") or "TradeStatus"
        dimension_2 = args.get("dimension_2")
        target = args.get("metric_target") or "Trade"

        # Route to pathway query when a second dimension is requested
        if dimension_2:
            return await self._pathway_query(dimension, dimension_2, target, args)

        sort_order = (args.get("sort_order") or "DESC").upper()
        if sort_order not in ("ASC", "DESC"):
            sort_order = "DESC"

        # Pick the mandatory MATCH path
        blueprint_key = (dimension, target)
        if blueprint_key in self.BLUEPRINTS:
            mandatory_path = self.BLUEPRINTS[blueprint_key]
        else:
            # Fallback: use property-based path for unknown combinations
            mandatory_path = self.BLUEPRINTS.get(("PROPERTY", target), "(t:Trade)")

        grouping_col = self.DIMENSION_PROPERTIES.get(dimension, "t.status")
        target_var = {"Trade": "t", "Transaction": "tr", "Exception": "e"}.get(target, "t")

        # Optional MATCH clauses ensure aggregation columns are always present
        optional_matches: list[str] = []
        if "tr:Transaction" not in mandatory_path:
            optional_matches.append("OPTIONAL MATCH (t)-[:HAS_TRANSACTION]->(tr:Transaction)")
        if "e:Exception" not in mandatory_path:
            optional_matches.append("OPTIONAL MATCH (tr)-[:GENERATED_EXCEPTION]->(e:Exception)")
        optional_cypher = "\n".join(optional_matches)

        where_clause, params = self._build_where(args)

        cypher = f"""
MATCH {mandatory_path}
{optional_cypher}
WHERE {where_clause}
WITH
    {grouping_col} AS dimension_value,
    count(DISTINCT {target_var}) AS metric,
    count(DISTINCT t) AS trade_count,
    count(DISTINCT tr) AS transaction_count,
    count(DISTINCT e) AS exception_count,
    collect(DISTINCT properties(t))[0..5] AS trade_details,
    collect(DISTINCT properties(e))[0..5] AS exception_details
RETURN
    dimension_value,
    metric,
    trade_count,
    transaction_count,
    exception_count,
    trade_details,
    exception_details
ORDER BY metric {sort_order}
LIMIT 25
""".strip()

        logger.info(
            "Executing KG query",
            extra={"dimension": dimension, "target": target, "sort_order": sort_order},
        )

        rows = await neo4j_client.execute(cypher, params)

        labels = [str(r.get("dimension_value", "UNKNOWN")) for r in rows]
        values = [int(r.get("metric", 0) or 0) for r in rows]

        return {
            "source": "knowledge_graph",
            "dimension": dimension,
            "metric_target": target,
            "rows": rows,
            "chart": {
                "title": f"{target} count by {dimension} (Knowledge Graph)",
                "labels": labels,
                "series": [{"name": "metric", "data": values}],
                "chart_type": "bar",
            },
            "metadata": {
                "row_count": len(rows),
                "dimension": dimension,
                "metric_target": target,
            },
        }

    def _build_where(self, args: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        """Build WHERE clause string and params dict from args without any f-string injection."""
        clauses: list[str] = ["1=1"]
        params: dict[str, Any] = {}

        if v := args.get("asset_type_filter"):
            clauses.append("t.asset_type = $asset_type")
            params["asset_type"] = str(v).upper()

        if v := args.get("trade_status_filter"):
            clauses.append("t.status = $trade_status")
            params["trade_status"] = str(v).upper()

        if v := args.get("transaction_status_filter"):
            clauses.append("tr.status = $transaction_status")
            params["transaction_status"] = str(v).upper()

        if v := args.get("exception_msg_filter"):
            clauses.append("e.msg = $exception_msg")
            params["exception_msg"] = str(v)

        if v := args.get("exception_status_filter"):
            clauses.append("e.status = $exception_status")
            params["exception_status"] = str(v).upper()

        if v := args.get("exception_priority_filter"):
            clauses.append("e.priority = $exception_priority")
            params["exception_priority"] = str(v).upper()

        if v := args.get("direction_filter"):
            clauses.append("tr.direction = $direction")
            params["direction"] = str(v).lower()

        if v := args.get("start_date"):
            clauses.append("t.created_at >= datetime($start_date)")
            params["start_date"] = str(v)

        if v := args.get("end_date"):
            clauses.append("t.created_at <= datetime($end_date)")
            params["end_date"] = str(v)

        return " AND ".join(clauses), params

    async def _pathway_query(
        self,
        dim1: str,
        dim2: str,
        target: str,
        args: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Cross-dimension query that returns (dim1_value × dim2_value, count) pairs.
        E.g. Counterparty × ClearingHouse shows which counterparties route trades
        through which clearing houses.
        """
        sort_order = (args.get("sort_order") or "DESC").upper()
        if sort_order not in ("ASC", "DESC"):
            sort_order = "DESC"

        blueprint_key = (dim1, dim2)
        match_clause = self.PATHWAY_BLUEPRINTS.get(blueprint_key)
        if not match_clause:
            # Try reversed pair
            reversed_key = (dim2, dim1)
            if reversed_key in self.PATHWAY_BLUEPRINTS:
                # Swap and recurse with dimensions flipped
                return await self._pathway_query(dim2, dim1, target, args)
            # Unsupported combination — fall back to single-dimension query
            logger.warning(
                "Unsupported pathway pair %s × %s, falling back to single-dimension",
                dim1,
                dim2,
            )
            args_copy = dict(args)
            args_copy.pop("dimension_2", None)
            return await self.query(args_copy)

        # Build dim2 expression — either a node property or a trade property
        if "dim2_node" in match_clause:
            dim2_expr = "dim2_node.name"
        else:
            dim2_expr = self.PATHWAY_DIM2_PROPERTY.get(dim2, "t.status")

        target_var = {"Trade": "t", "Transaction": "tr", "Exception": "e"}.get(target, "t")

        # Optional matches so aggregation vars are always present
        optional_parts: list[str] = []
        if "tr:Transaction" not in match_clause and "tr:Transaction" not in match_clause:
            optional_parts.append("OPTIONAL MATCH (t)-[:HAS_TRANSACTION]->(tr:Transaction)")
        if "e:Exception" not in match_clause:
            optional_parts.append("OPTIONAL MATCH (tr)-[:GENERATED_EXCEPTION]->(e:Exception)")
        optional_cypher = "\n".join(optional_parts)

        where_clause, params = self._build_where(args)

        cypher = f"""
MATCH {match_clause}
{optional_cypher}
WHERE {where_clause}
WITH
    dim1_node.name AS dim1_value,
    {dim2_expr} AS dim2_value,
    count(DISTINCT {target_var}) AS metric,
    count(DISTINCT t) AS trade_count
RETURN
    dim1_value,
    dim2_value,
    metric,
    trade_count
ORDER BY metric {sort_order}
LIMIT 25
""".strip()

        logger.info(
            "Executing KG pathway query",
            extra={"dim1": dim1, "dim2": dim2, "target": target},
        )

        rows = await neo4j_client.execute(cypher, params)

        # Build chart: group rows under dim1 as X-axis, one series per dim2 value
        dim2_values: list[str] = []
        seen_dim2: set[str] = set()
        dim1_values: list[str] = []
        seen_dim1: set[str] = set()
        for r in rows:
            d1 = str(r.get("dim1_value", "UNKNOWN"))
            d2 = str(r.get("dim2_value", "UNKNOWN"))
            if d1 not in seen_dim1:
                seen_dim1.add(d1)
                dim1_values.append(d1)
            if d2 not in seen_dim2:
                seen_dim2.add(d2)
                dim2_values.append(d2)

        pivot: dict[str, dict[str, int]] = {d1: {} for d1 in dim1_values}
        for r in rows:
            d1 = str(r.get("dim1_value", "UNKNOWN"))
            d2 = str(r.get("dim2_value", "UNKNOWN"))
            pivot[d1][d2] = pivot[d1].get(d2, 0) + int(r.get("metric", 0) or 0)

        chart_series = [
            {
                "name": d2,
                "data": [pivot[d1].get(d2, 0) for d1 in dim1_values],
            }
            for d2 in dim2_values
        ]

        return {
            "source": "knowledge_graph",
            "dimension": dim1,
            "dimension_2": dim2,
            "metric_target": target,
            "rows": rows,
            "chart": {
                "title": f"{target} pathways: {dim1} → {dim2}",
                "labels": dim1_values,
                "series": chart_series,
                "chart_type": "bar",
            },
            "metadata": {
                "row_count": len(rows),
                "dimension": dim1,
                "dimension_2": dim2,
                "metric_target": target,
            },
        }


# Module-level singleton
kg_service = KGService()
