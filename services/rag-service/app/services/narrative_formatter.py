"""
Narrative formatter service for converting transaction history and exceptions
into human-readable narratives optimized for semantic search in RAG pipelines.
"""
from typing import List, Dict, Any
from datetime import datetime


class NarrativeFormatter:
    """
    Formats exception and transaction data into semantic-rich narratives.
    
    This service converts structured trading data into natural language descriptions
    that capture business context, temporal relationships, and key metrics for
    improved semantic search performance in vector databases.
    """
    
    @staticmethod
    def categorize_exception(error_msg: str) -> str:
        """
        Map error messages to problem categories for semantic clustering.
        
        This function analyzes exception messages and assigns them to one or more
        problem categories based on keyword matching. Categories provide semantic
        anchors that improve vector similarity search by clustering related exceptions.
        
        Args:
            error_msg: The exception message text to categorize
            
        Returns:
            Pipe-separated string of matching categories (e.g., "Credit Capacity | Collateral Issue")
            Returns "General Exception" if no specific category matches
        """
        error_lower = error_msg.lower()
        categories = []
        
        # Category 1: Settlement Instructions Problem
        if any(kw in error_lower for kw in [
            'ssi', 'settlement instruction', 'payment routing', 'correspondent bank',
            'intermediary bank', 'settlement bank', 'nostro', 'vostro'
        ]):
            categories.append("Settlement Instructions Problem")
        
        # Category 2: Collateral and Margin Issue
        if any(kw in error_lower for kw in [
            'collateral', 'margin', 'csa', 'variation margin', 'initial margin',
            'margin call', 'vm', 'im', 'posting requirement'
        ]):
            categories.append("Collateral and Margin Issue")
        
        # Category 3: Legal Documentation Gap
        if any(kw in error_lower for kw in [
            'isda', 'lei', 'legal entity identifier', 'documentation', 'master agreement',
            'confirmation', 'legal documentation', 'legal terms', 'credit support annex'
        ]):
            categories.append("Legal Documentation Gap")
        
        # Category 4: Credit Capacity Constraint
        if any(kw in error_lower for kw in [
            'credit limit', 'credit line', 'downgrade', 'credit rating', 'exposure',
            'credit capacity', 'creditworthiness', 'moody', 'fitch', 's&p'
        ]):
            categories.append("Credit Capacity Constraint")
        
        # Category 5: Holiday Calendar Conflict
        if any(kw in error_lower for kw in [
            'holiday', 'bank holiday', 'closed market', 'non-business day',
            'market closure', 'calendar', 'settlement date'
        ]):
            categories.append("Holiday Calendar Conflict")
        
        # Category 6: Rate and Pricing Validation
        if any(kw in error_lower for kw in [
            'libor', 'sofr', 'off-market', 'rate', 'fixing', 'benchmark',
            'pricing', 'market rate', 'reference rate'
        ]):
            categories.append("Rate and Pricing Validation")
        
        # Category 7: Reference Entity Credit Event
        if any(kw in error_lower for kw in [
            'succession', 'restructuring', 'credit event', 'isda determinations committee',
            'reference entity', 'merger', 'spin-off', 'isda dc'
        ]):
            categories.append("Reference Entity Credit Event")
        
        # Category 8: Regulatory Compliance Failure
        if any(kw in error_lower for kw in [
            'mifid', 'aml', 'kyc', 'ofac', 'sanctions', 'compliance', 'regulatory',
            'emir', 'dodd-frank', 'screening'
        ]):
            categories.append("Regulatory Compliance Failure")
        
        # Category 9: System and Infrastructure Failure
        if any(kw in error_lower for kw in [
            'swift', 'connectivity', 'timeout', 'system', 'booking system',
            'outage', 'infrastructure', 'technical failure', 'network'
        ]):
            categories.append("System and Infrastructure Failure")
        
        # Category 10: Trade Structure Non-Standard
        if any(kw in error_lower for kw in [
            'maturity', 'notional', 'imm date', 'tenor', 'effective date',
            'trade structure', 'non-standard', 'trade economics'
        ]):
            categories.append("Trade Structure Non-Standard")
        
        # Category 11: Trade Lifecycle Workflow Issue
        if any(kw in error_lower for kw in [
            'affirmation', 'dtcc', 'compression', 'bilateral', 'novation',
            'lifecycle', 'workflow', 'trade confirmation'
        ]):
            categories.append("Trade Lifecycle Workflow Issue")
        
        # Category 12: Capital Controls and Restrictions
        if any(kw in error_lower for kw in [
            'safe quota', 'capital control', 'cross-border', 'foreign exchange control',
            'pboc', 'onshore', 'offshore', 'rmb restriction'
        ]):
            categories.append("Capital Controls and Restrictions")
        
        # Category 13: Settlement Netting Optimization
        if any(kw in error_lower for kw in [
            'netting', 'gross settlement', 'net settlement', 'bilateral netting',
            'multilateral netting', 'settlement optimization'
        ]):
            categories.append("Settlement Netting Optimization")
        
        # Return categories or default
        if categories:
            return ' | '.join(categories)
        return "General Exception"
    
    @staticmethod
    def find_rejection_step(history_data: List[Dict[str, Any]]) -> int:
        """
        Find the step number where rejection occurred.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            Step number of the rejected transaction, or 0 if not found
        """
        for tx in history_data:
            if tx.get("status") == "REJECTED":
                return tx.get("step", 0)
        return 0
    
    @staticmethod
    def find_rejection_type(history_data: List[Dict[str, Any]]) -> str:
        """
        Find the transaction type that was rejected.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            Transaction type (e.g., "CREDIT_REJECT", "CONSENT_REJECTED")
        """
        for tx in history_data:
            if tx.get("status") == "REJECTED":
                return tx.get("type", "Unknown")
        return "Unknown"
    
    @staticmethod
    def format_transaction_event(tx: Dict[str, Any]) -> str:
        """
        Format a single transaction into readable narrative text.
        
        Args:
            tx: Transaction dictionary with keys: entity, direction, type, step, status, create_time
            
        Returns:
            Formatted string like "1. CME receive Request Consent at 09:05 (step 1, CLEARED)"
        """
        create_time = tx.get("create_time", "")
        time_str = create_time[11:16] if len(create_time) > 16 else "Unknown"
        
        entity = tx.get("entity", "Unknown")
        direction = tx.get("direction", "unknown")
        tx_type = tx.get("type", "UNKNOWN").replace("_", " ").title()
        step = tx.get("step", 0)
        status = tx.get("status", "UNKNOWN")
        
        return f"{step}. {entity} {direction} {tx_type} at {time_str} (step {step}, {status})"
    
    @staticmethod
    def calculate_duration(history_data: List[Dict[str, Any]]) -> str:
        """
        Calculate duration between first and last transaction.
        
        Args:
            history_data: List of transaction dictionaries with create_time fields
            
        Returns:
            Human-readable duration string (e.g., "7 minutes", "45 seconds")
        """
        if not history_data or len(history_data) < 2:
            return "Unknown"
        
        try:
            first_time = datetime.fromisoformat(
                history_data[0].get("create_time", "").replace("Z", "+00:00")
            )
            last_time = datetime.fromisoformat(
                history_data[-1].get("create_time", "").replace("Z", "+00:00")
            )
            duration = last_time - first_time
            
            minutes = int(duration.total_seconds() / 60)
            if minutes < 1:
                return f"{int(duration.total_seconds())} seconds"
            return f"{minutes} minutes"
        except Exception:
            return "Unknown"
    
    @classmethod
    def format_exception_narrative(
        cls,
        history_data: List[Dict[str, Any]],
        exception_data: Dict[str, Any],
        trade_data: Dict[str, Any],
        trade_id: str,
        exception_id: str
    ) -> str:
        """
        Convert transaction history + exception into human-readable narrative.
        
        This creates a business-focused narrative that captures:
        - Transaction flow and progression
        - Failure points and context
        - Exception details with business impact
        - Timeline and temporal relationships
        - Trade context (clearing house, asset type)
        
        Args:
            history_data: List of transaction dictionaries
            exception_data: Exception dictionary with msg, priority, status, comment
            trade_data: Trade dictionary with clearing_house, asset_type, etc.
            trade_id: Trade identifier
            exception_id: Exception identifier
            
        Returns:
            Formatted narrative text optimized for semantic search
        """
        # Extract exception details
        exception_msg = exception_data.get("msg", "No message provided")
        priority = exception_data.get("priority", "UNKNOWN")
        status = exception_data.get("status", "UNKNOWN")
        comment = exception_data.get("comment", "No comment")
        
        # Extract trade details
        clearing_house = trade_data.get("clearing_house", "Unknown")
        asset_type = trade_data.get("asset_type", "Unknown")
        
        # Categorize exception for semantic clustering
        problem_categories = cls.categorize_exception(exception_msg)
        
        # # Format transaction events
        # events = [cls.format_transaction_event(tx) for tx in history_data]
        # transaction_flow = "\n".join(events)
        
        # Calculate metrics
        duration = cls.calculate_duration(history_data)
        
        # Build comprehensive narrative with problem categories at the start
        narrative = f"""Problem Category: {problem_categories}

Exception: {exception_msg}

Trade Context:
Asset Type: {asset_type}
Clearing House: {clearing_house}

Exception Details:
Priority: {priority} (Status: {status})
Current Action: {comment}

Timeline: Transaction progressed through {len(history_data)} steps over {duration} before encountering this issue

Business Context:
This exception occurred during the {cls.find_rejection_type(history_data).replace('_', ' ').lower()} phase of trade processing.
The failure point was at step {cls.find_rejection_step(history_data)} in the processing sequence."""
        
        return narrative.strip()
    
    @classmethod
    def create_metadata(
        cls,
        history_data: List[Dict[str, Any]],
        exception_data: Dict[str, Any],
        trade_data: Dict[str, Any],
        trade_id: str,
        exception_id: str
    ) -> Dict[str, Any]:
        """
        Create enriched metadata dictionary for vector store.
        
        Args:
            history_data: List of transaction dictionaries
            exception_data: Exception dictionary
            trade_data: Trade dictionary with clearing_house, asset_type, etc.
            trade_id: Trade identifier
            exception_id: Exception identifier
            
        Returns:
            Dictionary with structured metadata fields for filtering and retrieval
        """
        return {
            "trade_id": trade_id,
            "exception_id": exception_id,
            "trans_id": str(exception_data.get("trans_id", "")),
            "exception_msg": exception_data.get("msg", ""),
            "priority": exception_data.get("priority", "UNKNOWN"),
            "status": exception_data.get("status", "UNKNOWN"),
            "asset_type": trade_data.get("asset_type", "Unknown"),
            "clearing_house": trade_data.get("clearing_house", "Unknown"),
            "rejection_step": cls.find_rejection_step(history_data),
            "rejection_type": cls.find_rejection_type(history_data),
            "transaction_count": len(history_data),
            "type": "exception_with_trade_history"
        }
