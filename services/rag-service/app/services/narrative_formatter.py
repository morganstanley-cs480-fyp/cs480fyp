"""
Narrative formatter service for converting transaction history and exceptions
into human-readable narratives optimized for semantic search in RAG pipelines.
"""
from typing import List, Dict, Any
from datetime import datetime
import re


class NarrativeFormatter:
    """
    Formats exception and transaction data into semantic-rich narratives.
    
    This service converts structured trading data into natural language descriptions
    that capture business context, temporal relationships, and key metrics for
    improved semantic search performance in vector databases.
    """
    
    @staticmethod
    def extract_product_type(history_data: List[Dict[str, Any]]) -> str:
        """
        Extract product type from transaction history metadata.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            Product type string (e.g., "IRS", "CDS", "FX")
        """
        # This would typically come from trade data
        # Could be enhanced to parse from transaction metadata
        return "Unknown"
    
    @staticmethod
    def extract_clearing_house(history_data: List[Dict[str, Any]]) -> str:
        """
        Extract clearing house entity from first transaction.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            Clearing house name (e.g., "CME", "LCH", "JSCC")
        """
        if history_data and len(history_data) > 0:
            return history_data[0].get("entity", "Unknown")
        return "Unknown"
    
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
    
    @staticmethod
    def extract_financial_metrics(exception_msg: str) -> str:
        """
        Extract and format financial metrics from exception message.
        
        Args:
            exception_msg: Exception message text
            
        Returns:
            Formatted financial details section, or empty string if none found
        """
        metrics_section = ""
        if "credit" in exception_msg.lower() and "$" in exception_msg:
            # Extract amounts mentioned in message (e.g., $5M, $8M, $2.3M)
            amounts = re.findall(r'\$[\d,.]+[MBK]?', exception_msg)
            if amounts:
                metrics_section = f"\nFinancial Details:\nMentioned amounts: {', '.join(amounts)}\n"
        return metrics_section
    
    @classmethod
    def format_exception_narrative(
        cls,
        history_data: List[Dict[str, Any]],
        exception_data: Dict[str, Any],
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
        
        Args:
            history_data: List of transaction dictionaries
            exception_data: Exception dictionary with msg, priority, status, comment
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
        
        # Format transaction events
        events = [cls.format_transaction_event(tx) for tx in history_data]
        transaction_flow = "\n".join(events)
        
        # Calculate metrics
        duration = cls.calculate_duration(history_data)
        metrics_section = cls.extract_financial_metrics(exception_msg)
        
        # Build comprehensive narrative
        narrative = f"""Exception: {exception_msg}

Transaction Flow:
{transaction_flow}

Exception Details:
Priority: {priority} (Status: {status})
Current Action: {comment}
{metrics_section}
Timeline: Transaction progressed through {len(history_data)} steps over {duration} before encountering this issue

Business Context:
This exception occurred during the {cls.find_rejection_type(history_data).replace('_', ' ').lower()} phase of trade processing. 
The clearing house {cls.extract_clearing_house(history_data)} was involved in the transaction workflow.
The failure point was at step {cls.find_rejection_step(history_data)} in the processing sequence."""
        
        return narrative.strip()
    
    @classmethod
    def create_metadata(
        cls,
        history_data: List[Dict[str, Any]],
        exception_data: Dict[str, Any],
        trade_id: str,
        exception_id: str
    ) -> Dict[str, Any]:
        """
        Create enriched metadata dictionary for vector store.
        
        Args:
            history_data: List of transaction dictionaries
            exception_data: Exception dictionary
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
            "product_type": cls.extract_product_type(history_data),
            "clearing_house": cls.extract_clearing_house(history_data),
            "rejection_step": cls.find_rejection_step(history_data),
            "rejection_type": cls.find_rejection_type(history_data),
            "transaction_count": len(history_data),
            "type": "exception_with_trade_history"
        }
