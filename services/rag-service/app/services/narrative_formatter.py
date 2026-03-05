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
    def categorize_exception(error_msg: str, comment: str = "") -> str:
        """
        Map error messages to problem categories for semantic clustering.
        
        Args:
            error_msg: The exception message text to categorize
            comment: Additional comment or context about the exception
            
        Returns:
            Pipe-separated string of matching categories
            Returns "General Exception" if no specific category matches
        """
        combined_text = f"{error_msg} {comment}".lower()
        categories = []
        
        # Categorize based on keywords in exception message and comment
        category_keywords = {
            "Settlement Instructions Problem": [
                'ssi', 'settlement instruction', 'payment routing', 'correspondent bank',
                'intermediary bank', 'settlement bank', 'nostro', 'vostro', 'settlement'
            ],
            "Collateral and Margin Issue": [
                'collateral', 'margin', 'csa', 'variation margin', 'initial margin',
                'margin call', 'vm', 'im', 'posting requirement', 'insufficient margin'
            ],
            "Legal Documentation Gap": [
                'isda', 'lei', 'legal entity identifier', 'documentation', 'master agreement',
                'confirmation', 'legal documentation', 'legal terms', 'credit support annex',
                'mapping', 'no mapping'
            ],
            "Credit Capacity Constraint": [
                'credit limit', 'credit line', 'downgrade', 'credit rating', 'exposure',
                'credit capacity', 'creditworthiness', 'credit check', 'credit reject', 
                'credit fail', 'credit approved'
            ],
            "Holiday Calendar Conflict": [
                'holiday', 'bank holiday', 'closed market', 'non-business day',
                'market closure', 'calendar', 'settlement date'
            ],
            "Rate and Pricing Validation": [
                'libor', 'sofr', 'off-market', 'rate', 'fixing', 'benchmark',
                'pricing', 'market rate', 'reference rate'
            ],
            "Reference Entity Credit Event": [
                'succession', 'restructuring', 'credit event', 'isda determinations committee',
                'reference entity', 'merger', 'spin-off', 'isda dc'
            ],
            "Regulatory Compliance Failure": [
                'mifid', 'aml', 'kyc', 'ofac', 'sanctions', 'compliance', 'regulatory',
                'emir', 'dodd-frank', 'screening'
            ],
            "System and Infrastructure Failure": [
                'swift', 'connectivity', 'timeout', 'system', 'booking system',
                'outage', 'infrastructure', 'technical failure', 'network', 'system error'
            ],
            "Trade Structure Non-Standard": [
                'maturity', 'notional', 'imm date', 'tenor', 'effective date',
                'trade structure', 'non-standard', 'trade economics'
            ],
            "Trade Lifecycle Workflow Issue": [
                'affirmation', 'dtcc', 'compression', 'bilateral', 'novation',
                'lifecycle', 'workflow', 'trade confirmation', 'consent', 'consent rejected'
            ],
            "Capital Controls and Restrictions": [
                'safe quota', 'capital control', 'cross-border', 'foreign exchange control',
                'pboc', 'onshore', 'offshore', 'rmb restriction'
            ],
            "Settlement Netting Optimization": [
                'netting', 'gross settlement', 'net settlement', 'bilateral netting',
                'multilateral netting', 'settlement optimization'
            ]
        }
        
        # Check each category
        for category, keywords in category_keywords.items():
            if any(kw in combined_text for kw in keywords):
                categories.append(category)
        
        # Return categories or default
        return ' | '.join(categories) if categories else "General Exception"
    
    @staticmethod
    def get_entities_involved(history_data: List[Dict[str, Any]]) -> List[str]:
        """
        Extract unique entities involved in the transaction flow.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            List of unique entity names
        """
        entities = set()
        for tx in history_data:
            entity = tx.get("entity")
            if entity:
                entities.add(entity)
        return sorted(list(entities))
    
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
    def find_rejection_transaction(history_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Find the transaction that was rejected.
        
        Args:
            history_data: List of transaction dictionaries
            
        Returns:
            Rejected transaction dictionary, or empty dict if not found
        """
        for tx in history_data:
            if tx.get("status") == "REJECTED":
                return tx
        return {}
    
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
            Formatted string describing the transaction event
        """
        create_time = tx.get("create_time", "")
        # Extract time in HH:MM format
        time_str = create_time[11:16] if len(create_time) > 16 else "unknown time"
        
        entity = tx.get("entity", "Unknown")
        direction = tx.get("direction", "unknown")
        direction_past = "sent" if direction == "send" else "received" if direction == "receive" else direction
        tx_type = tx.get("type", "UNKNOWN").replace("_", " ").lower()
        step = tx.get("step", 0)
        status = tx.get("status", "UNKNOWN")

        # Create natural language description
        if status == "REJECTED":
            return f"Step {step}: {entity} {direction_past} {tx_type} at {time_str} - REJECTED"
        else:
            return f"Step {step}: {entity} {direction_past} {tx_type} at {time_str}"
    
    @staticmethod
    def build_transaction_flow_narrative(history_data: List[Dict[str, Any]]) -> str:
        """
        Build a narrative description of the transaction flow.
        
        Args:
            history_data: List of transaction dictionaries in chronological order
            
        Returns:
            Natural language description of the transaction flow
        """
        if not history_data:
            return "No transaction history available."
        
        # Format each transaction
        events = [NarrativeFormatter.format_transaction_event(tx) for tx in history_data]
        
        # Build narrative
        narrative_parts = []
        narrative_parts.append("Transaction Flow:")
        for event in events:
            narrative_parts.append(f"  {event}")
        
        return "\n".join(narrative_parts)
    
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
            return "less than 1 minute"
        
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
                seconds = int(duration.total_seconds())
                return f"{seconds} second{'s' if seconds != 1 else ''}"
            elif minutes < 60:
                return f"{minutes} minute{'s' if minutes != 1 else ''}"
            else:
                hours = minutes // 60
                remaining_minutes = minutes % 60
                if remaining_minutes == 0:
                    return f"{hours} hour{'s' if hours != 1 else ''}"
                return f"{hours} hour{'s' if hours != 1 else ''} and {remaining_minutes} minute{'s' if remaining_minutes != 1 else ''}"
        except Exception:
            return "unknown duration"
    
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
        Optimized for exception-type similarity search in RAG systems.
        
        Prioritizes:
        - Problem categorization and symptoms
        - Trade context and infrastructure
        - Failure patterns and entity involvement
        
        De-emphasizes:
        - Exact timestamps and chronological flow
        
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
        comment = exception_data.get("comment", "")
        
        # Extract trade details
        account = trade_data.get("account", "Unknown")
        asset_type = trade_data.get("asset_type", "Unknown")
        clearing_house = trade_data.get("clearing_house", "Unknown")
        booking_system = trade_data.get("booking_system", "Unknown")
        affirmation_system = trade_data.get("affirmation_system", "Unknown")
        trade_status = trade_data.get("status", "Unknown")
        
        # Categorize exception for semantic clustering
        problem_categories = cls.categorize_exception(exception_msg, comment)
        
        # Get entities involved
        entities = cls.get_entities_involved(history_data)
        entities_str = ", ".join(entities) if entities else "Unknown"
        
        # Find rejection details
        rejection_tx = cls.find_rejection_transaction(history_data)
        rejection_step = cls.find_rejection_step(history_data)
        rejection_type = cls.find_rejection_type(history_data)
        rejection_entity = rejection_tx.get("entity", "Unknown") if rejection_tx else "Unknown"
        
        # Format rejection type for readability
        rejection_type_formatted = rejection_type.replace("_", " ").lower()
        
        # Calculate high-level metrics
        duration = cls.calculate_duration(history_data)
        total_steps = len(history_data)
        
        # Build exception-focused narrative
        narrative = f"""Exception Type: {problem_categories}

Primary Issue:
Exception: {exception_msg}
Context: {comment if comment else "No additional details provided"}
Priority: {priority}
Status: {status}

Trade Context:
- Asset Type: {asset_type}
- Clearing House: {clearing_house}
- Account: {account}
- Booking System: {booking_system}
- Affirmation System: {affirmation_system}

Failure Pattern:
- Failed At: {rejection_type_formatted}
- Responsible Entity: {rejection_entity}
- Stage: Step {rejection_step} of {total_steps}
- Processing Duration: {duration}
- Entities Involved: {entities_str}

"""

        # Add concise transaction flow (simplified)
        if history_data:
            narrative += "Transaction Sequence:\n"
            for tx in history_data:
                entity = tx.get("entity", "Unknown")
                tx_type = tx.get("type", "UNKNOWN").replace("_", " ").lower()
                tx_status = tx.get("status", "")
                status_marker = " [FAILED]" if tx_status == "REJECTED" else ""
                narrative += f"  → {entity}: {tx_type}{status_marker}\n"
        
        narrative += f"""
Problem Summary:
This {asset_type} trade clearing through {clearing_house} encountered a {problem_categories.split(' | ')[0] if ' | ' in problem_categories else problem_categories} issue. The specific error "{exception_msg}" occurred during the {rejection_type_formatted} phase handled by {rejection_entity}. {f'Additional context: {comment}' if comment else ''} This type of failure typically indicates issues with {cls._get_typical_cause(problem_categories, rejection_type)}.

Search Keywords: {exception_msg.lower()}, {problem_categories.lower()}, {asset_type}, {clearing_house}, {rejection_type_formatted}, {rejection_entity}, {comment.lower() if comment else ''}"""

        return narrative.strip()
    
    @staticmethod
    def _get_typical_cause(problem_category: str, rejection_type: str) -> str:
        """
        Map problem categories to typical root causes for semantic understanding.
        
        Args:
            problem_category: Pipe-separated category string
            rejection_type: Type of rejection that occurred
            
        Returns:
            Human-readable description of typical causes
        """
        # Get primary category
        primary_category = problem_category.split(' | ')[0] if ' | ' in problem_category else problem_category
        
        cause_mapping = {
            "Settlement Instructions Problem": "missing or incorrect settlement instructions, bank account details, or payment routing information",
            "Collateral and Margin Issue": "insufficient collateral, margin requirements not met, or posting threshold violations",
            "Legal Documentation Gap": "missing legal entity identifiers (LEI), incomplete ISDA documentation, or entity mapping issues",
            "Credit Capacity Constraint": "credit limit exceeded, credit line unavailability, or counterparty credit rating issues",
            "Holiday Calendar Conflict": "settlement date falling on non-business days or market holidays",
            "Rate and Pricing Validation": "off-market rates, pricing discrepancies, or benchmark fixing issues",
            "Reference Entity Credit Event": "corporate actions, restructuring events, or credit event determinations",
            "Regulatory Compliance Failure": "KYC/AML violations, sanctions screening failures, or regulatory reporting issues",
            "System and Infrastructure Failure": "system connectivity problems, booking platform errors, or technical infrastructure issues",
            "Trade Structure Non-Standard": "non-standard trade economics, unusual maturity dates, or custom trade structures",
            "Trade Lifecycle Workflow Issue": "affirmation failures, consent rejections, or workflow approval issues",
            "Capital Controls and Restrictions": "cross-border capital restrictions, FX controls, or regulatory capital limitations",
            "Settlement Netting Optimization": "netting eligibility issues or settlement optimization conflicts"
        }
        
        # Add rejection-type specific context
        rejection_context = ""
        if "CREDIT" in rejection_type:
            rejection_context = " in the credit approval process"
        elif "CONSENT" in rejection_type:
            rejection_context = " in the counterparty consent workflow"
        elif "AFFIRMATION" in rejection_type:
            rejection_context = " in trade affirmation procedures"
        
        base_cause = cause_mapping.get(primary_category, "trade processing or validation issues")
        return base_cause + rejection_context
    
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
            "exception_comment": exception_data.get("comment", ""),
            "priority": exception_data.get("priority", "UNKNOWN"),
            "status": exception_data.get("status", "UNKNOWN"),
            "account": trade_data.get("account", "Unknown"),
            "asset_type": trade_data.get("asset_type", "Unknown"),
            "clearing_house": trade_data.get("clearing_house", "Unknown"),
            "booking_system": trade_data.get("booking_system", "Unknown"),
            "affirmation_system": trade_data.get("affirmation_system", "Unknown"),
            "trade_status": trade_data.get("status", "Unknown"),
            "rejection_step": cls.find_rejection_step(history_data),
            "rejection_type": cls.find_rejection_type(history_data),
            "transaction_count": len(history_data),
            "entities_involved": cls.get_entities_involved(history_data),
            "problem_category": cls.categorize_exception(
                exception_data.get("msg", ""), 
                exception_data.get("comment", "")
            ),
            "type": "exception_with_trade_history"
        }
