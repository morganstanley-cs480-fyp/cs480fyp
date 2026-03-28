import logging
from typing import Tuple, Dict, Any
from app.models.schemas import AnalyticalIntent

logger = logging.getLogger(__name__)

class GenericQueryBuilder:
    """Builds dynamic analytical Cypher queries using Path-Aware Blueprints."""
    
    # 1. THE HIGHWAYS: Maps (Dimension, Target) -> Mandatory Cypher Path
    # Using explicit MATCH paths ensures we only count valid data.
    BLUEPRINTS = {
        # --- BOOKING SYSTEM PATHS ---
        ("BookingSystem", "Trade"): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)",
        ("BookingSystem", "Transaction"): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        ("BookingSystem", "Exception"): "(dim:Entity)<-[:BOOKED_ON]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        
        # --- CLEARING HOUSE PATHS ---
        ("ClearingHouse", "Trade"): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)",
        ("ClearingHouse", "Transaction"): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        ("ClearingHouse", "Exception"): "(dim:Entity)<-[:CLEARED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        
        # --- AFFIRMATION SYSTEM PATHS ---
        ("AffirmationSystem", "Trade"): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)",
        ("AffirmationSystem", "Transaction"): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        ("AffirmationSystem", "Exception"): "(dim:Entity)<-[:AFFIRMED_BY]-(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)",
        
        # --- PROPERTY-BASED PATHS (Fallback for AssetType, Status, Account) ---
        ("PROPERTY", "Trade"): "(t:Trade)",
        ("PROPERTY", "Transaction"): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)",
        ("PROPERTY", "Exception"): "(t:Trade)-[:HAS_TRANSACTION]->(tr:Transaction)-[:GENERATED_EXCEPTION]->(e:Exception)"
    }

    # 2. PROPERTY MAPPING: Translates the JSON dimension to the Cypher property
    DIMENSION_PROPERTIES = {
        "BookingSystem": "dim.name",
        "ClearingHouse": "dim.name",
        "AffirmationSystem": "dim.name",
        "Account": "t.account",
        "AssetType": "t.asset_type",
        "TradeStatus": "t.status",
        "TransactionStatus": "tr.status",
        "ExceptionStatus": "e.status",
        "ExceptionPriority": "e.priority"
    }

    async def build(self, intent: AnalyticalIntent) -> Tuple[str, Dict[str, Any]]:
        """Build Cypher query from the extracted intent."""
        
        # 1. Default assignments to prevent None errors
        dimension = intent.dimension_to_group_by or "TradeStatus"
        target = intent.metric_target or "Trade"
        
        # 2. Select the strict path (Blueprint)
        blueprint_key = (dimension, target)
        if blueprint_key in self.BLUEPRINTS:
            mandatory_path = self.BLUEPRINTS[blueprint_key]
        else:
            mandatory_path = self.BLUEPRINTS[("PROPERTY", target)]
            
        # 3. Determine grouping column and the core variable to count
        grouping_column = self.DIMENSION_PROPERTIES.get(dimension, "t.status")
        target_var = {"Trade": "t", "Transaction": "tr", "Exception": "e"}.get(target, "t")
        
        # 4. Add Optional Matches for UI richness
        # This ensures we always return trade_count, transaction_count, exception_count 
        optional_matches = []
        if "tr:Transaction" not in mandatory_path:
            optional_matches.append("OPTIONAL MATCH (t)-[:HAS_TRANSACTION]->(tr:Transaction)")
        if "e:Exception" not in mandatory_path:
            optional_matches.append("OPTIONAL MATCH (tr)-[:GENERATED_EXCEPTION]->(e:Exception)")
            
        optional_cypher = "\n".join(optional_matches)
        where_clauses = self._build_where_clauses(intent)
        sort_order = intent.sort_order if intent.sort_order else "DESC"

        # 5. Construct Final Cypher
        # Returns the dimension value, the metric count, and counts of trades/transactions/exceptions and the details for UI display.
        cypher = f"""
        MATCH {mandatory_path}
        {optional_cypher}
        WHERE {where_clauses}
        WITH 
            {grouping_column} AS dimension_value, 
            count(DISTINCT {target_var}) AS metric,
            count(DISTINCT t) AS trade_count,
            count(DISTINCT tr) AS transaction_count,
            count(DISTINCT e) AS exception_count,
            collect(DISTINCT properties(t))[0..10] AS trade_details,
            collect(DISTINCT properties(tr))[0..10] AS transaction_details,
            collect(DISTINCT properties(e))[0..10] AS exception_details
        RETURN 
            dimension_value, 
            metric, 
            trade_count, 
            transaction_count, 
            exception_count,
            trade_details,
            transaction_details,
            exception_details
        ORDER BY metric {sort_order}
        LIMIT 50
        """
        
        params = self._build_parameters(intent)
        logger.info(f"Built path-aware query: Grouping by [{dimension}] targeting [{target}]")
        
        return cypher, params

    def _build_where_clauses(self, intent: AnalyticalIntent) -> str:
        """Build precise WHERE clauses from intent filters."""
        clauses = ["1=1"] # Default true condition
        
        # String/Status filters
        if intent.exception_msg_filter:
            clauses.append("e.msg = $exception_msg")
        if intent.asset_type_filter:
            clauses.append("t.asset_type = $asset_type")
        if intent.trade_status_filter:
            clauses.append("t.status = $trade_status")
        if intent.transaction_status_filter:
            clauses.append("tr.status = $transaction_status")
        if intent.exception_status_filter:
            clauses.append("e.status = $exception_status")
        if intent.exception_priority_filter:
            clauses.append("e.priority = $exception_priority")
        if intent.direction_filter:
            clauses.append("tr.direction = $direction")
            
        # Date filters using proper Neo4j datetime casting
        if intent.start_date:
            clauses.append("t.created_at >= datetime($start_date)")
        if intent.end_date:
            clauses.append("t.created_at <= datetime($end_date)")
            
        return " AND ".join(clauses)

    def _build_parameters(self, intent: AnalyticalIntent) -> Dict[str, Any]:
        """Map intent variables to secure Cypher parameters."""
        params = {}
        
        if intent.exception_msg_filter:
            params["exception_msg"] = intent.exception_msg_filter
        if intent.asset_type_filter:
            params["asset_type"] = intent.asset_type_filter.upper()
        if intent.trade_status_filter:
            params["trade_status"] = intent.trade_status_filter.upper()
        if intent.transaction_status_filter:
            params["transaction_status"] = intent.transaction_status_filter.upper()
        if intent.exception_status_filter:
            params["exception_status"] = intent.exception_status_filter.upper()
        if intent.exception_priority_filter:
            params["exception_priority"] = intent.exception_priority_filter.upper()
        if intent.direction_filter:
            params["direction"] = intent.direction_filter.lower()
            
        # Dates are now raw strings from the LLM, no Python timedelta math required!
        if intent.start_date:
            params["start_date"] = intent.start_date
        if intent.end_date:
            params["end_date"] = intent.end_date
            
        return params