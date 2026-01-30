"""
Bedrock Prompt Templates for Trade Search Parameter Extraction
Defines the system and user prompts for AWS Bedrock Claude 3.5 Sonnet.
"""

from datetime import datetime, timedelta
from typing import Optional


# System prompt defines the AI's role and capabilities
SYSTEM_PROMPT = """You are a trade search parameter extraction assistant. Your role is to extract structured search parameters from natural language queries about financial trades.

You understand:
- Financial terminology (FX, IRS, CDS, equity, bond, commodity, etc.)
- Trade statuses and their meanings
- Date references (relative and absolute)
- Account identifiers and naming patterns
- Clearing houses and system names

Extract parameters accurately and return them in valid JSON format. If a parameter is not mentioned in the query, use null.

CRITICAL: You must ONLY return valid JSON. No explanatory text, no markdown formatting, just pure JSON."""


def build_user_prompt(query: str, current_date: Optional[datetime] = None) -> str:
    """
    Build the user prompt for parameter extraction.
    
    Args:
        query: The natural language query from the user
        current_date: Current date for relative date calculation (defaults to now)
    
    Returns:
        Formatted prompt string for Bedrock
    """
    if current_date is None:
        current_date = datetime.now()
    
    # Format current date for the prompt
    today = current_date.strftime("%Y-%m-%d")
    day_of_week = current_date.strftime("%A")
    
    # Calculate reference dates for examples
    yesterday = (current_date - timedelta(days=1)).strftime("%Y-%m-%d")
    one_week_ago = (current_date - timedelta(days=7)).strftime("%Y-%m-%d")
    one_month_ago = (current_date - timedelta(days=30)).strftime("%Y-%m-%d")
    
    prompt = f"""Extract trade search parameters from this query and return them as JSON.

Query: "{query}"

Today's date: {today} ({day_of_week})

Extract these parameters (use null if not mentioned):

{{
  "accounts": ["list of account IDs mentioned, e.g., ACC123, ACC456"],
  "asset_types": ["list of asset types: FX, IRS, CDS, EQUITY, BOND, COMMODITY"],
  "booking_systems": ["list of booking systems: WINTERFELL, HIGHGARDEN, KINGSLANDING, RED KEEP"],
  "affirmation_systems": ["list of affirmation systems: TRAI, MARC, BLM, FIRELNK"],
  "clearing_houses": ["list of clearing houses: DTCC, LCH, CME, NSCC, JSCC, OTCCHK"],
  "statuses": ["list of statuses: ALLEGED, CLEARED, REJECTED, CANCELLED"],
  "date_from": "YYYY-MM-DD or null",
  "date_to": "YYYY-MM-DD or null",
  "with_exceptions_only": true or false,
  "cleared_trades_only": true or false
}}

IMPORTANT MAPPING RULES:

Asset Types:
- "FX" or "foreign exchange" or "forex" → ["FX"]
- "IRS" or "interest rate swap" → ["IRS"]
- "CDS" or "credit default swap" → ["CDS"]
- "equity" or "stock" or "equities" → ["EQUITY"]
- "bond" or "fixed income" → ["BOND"]
- "commodity" or "commodities" → ["COMMODITY"]
- If multiple mentioned: ["FX", "EQUITY"]

Trade Status:
- "pending" or "alleged" or "unconfirmed" → ["ALLEGED"]
- "cleared" or "confirmed" or "settled" → ["CLEARED"]
- "rejected" or "failed" → ["REJECTED"]
- "cancelled" or "canceled" → ["CANCELLED"]
- "all" or no status mentioned → null

Date References (today is {today}):
- "today" → date_from: "{today}", date_to: "{today}"
- "yesterday" → date_from: "{yesterday}", date_to: "{yesterday}"
- "last week" or "past week" → date_from: "{one_week_ago}", date_to: "{today}"
- "last month" or "past month" → date_from: "{one_month_ago}", date_to: "{today}"
- "this week" → date_from: (Monday of current week), date_to: "{today}"
- "from X to Y" → date_from: "X", date_to: "Y"
- "since X" → date_from: "X", date_to: null
- "before X" → date_from: null, date_to: "X"
- "on X" → date_from: "X", date_to: "X"

Account Patterns:
- "ACC123", "account ACC123", "ACC-123" → ["ACC123"]
- Multiple accounts: ["ACC123", "ACC456"]

Special Filters:
- "with exceptions", "having exceptions", "exception trades" → with_exceptions_only: true
- "cleared trades only", "only cleared" → cleared_trades_only: true

EXAMPLES:

Query: "show me pending FX trades from last week"
Output: {{
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["ALLEGED"],
  "date_from": "{one_week_ago}",
  "date_to": "{today}",
  "with_exceptions_only": false,
  "cleared_trades_only": false
}}

Query: "cleared EQUITY trades for ACC012345"
Output: {{
  "accounts": ["ACC012345"],
  "asset_types": ["EQUITY"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["CLEARED"],
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false,
  "cleared_trades_only": true
}}

Query: "all IRS and CDS trades from WINTERFELL"
Output: {{
  "accounts": null,
  "asset_types": ["IRS", "CDS"],
  "booking_systems": ["WINTERFELL"],
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": null,
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false,
  "cleared_trades_only": false
}}

Query: "rejected trades from yesterday with exceptions"
Output: {{
  "accounts": null,
  "asset_types": null,
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["REJECTED"],
  "date_from": "{yesterday}",
  "date_to": "{yesterday}",
  "with_exceptions_only": true,
  "cleared_trades_only": false
}}

Query: "show FX trades cleared by LCH from Jan 1 to Jan 15 2025"
Output: {{
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": ["LCH"],
  "statuses": ["CLEARED"],
  "date_from": "2025-01-01",
  "date_to": "2025-01-15",
  "with_exceptions_only": false,
  "cleared_trades_only": true
}}

Now extract parameters from the original query and return ONLY the JSON object, nothing else."""

    return prompt


def build_validation_rules() -> dict:
    """
    Define validation rules for extracted parameters.
    Used to validate Bedrock's response before using it.
    
    Returns:
        Dictionary of validation rules
    """
    return {
        "asset_types": {
            "allowed_values": ["FX", "IRS", "CDS", "EQUITY", "BOND", "COMMODITY"],
            "type": "list",
            "nullable": True
        },
        "statuses": {
            "allowed_values": ["ALLEGED", "CLEARED", "REJECTED", "CANCELLED"],
            "type": "list",
            "nullable": True
        },
        "booking_systems": {
            "allowed_values": ["WINTERFELL", "HIGHGARDEN", "KINGSLANDING", "RED KEEP"],
            "type": "list",
            "nullable": True
        },
        "affirmation_systems": {
            "allowed_values": ["TRAI", "MARC", "BLM", "FIRELNK"],
            "type": "list",
            "nullable": True
        },
        "clearing_houses": {
            "allowed_values": ["DTCC", "LCH", "CME", "NSCC", "JSCC", "OTCCHK"],
            "type": "list",
            "nullable": True
        },
        "accounts": {
            "type": "list",
            "nullable": True,
            "pattern": r"^ACC\d+$"  # Account pattern: ACC followed by numbers
        },
        "date_from": {
            "type": "date",
            "nullable": True,
            "format": "%Y-%m-%d"
        },
        "date_to": {
            "type": "date",
            "nullable": True,
            "format": "%Y-%m-%d"
        },
        "with_exceptions_only": {
            "type": "bool",
            "nullable": False,
            "default": False
        },
        "cleared_trades_only": {
            "type": "bool",
            "nullable": False,
            "default": False
        }
    }


# Test queries for validation and testing
TEST_QUERIES = [
    {
        "query": "show me pending FX trades from last week",
        "expected_params": {
            "asset_types": ["FX"],
            "statuses": ["ALLEGED"],
            "accounts": None,
            "with_exceptions_only": False
        }
    },
    {
        "query": "cleared EQUITY trades for ACC012345",
        "expected_params": {
            "accounts": ["ACC012345"],
            "asset_types": ["EQUITY"],
            "statuses": ["CLEARED"],
            "cleared_trades_only": True
        }
    },
    {
        "query": "all rejected IRS trades",
        "expected_params": {
            "asset_types": ["IRS"],
            "statuses": ["REJECTED"],
            "accounts": None
        }
    },
    {
        "query": "show me trades with exceptions from WINTERFELL",
        "expected_params": {
            "booking_systems": ["WINTERFELL"],
            "with_exceptions_only": True,
            "statuses": None
        }
    },
    {
        "query": "FX and CDS trades cleared by LCH from Jan 1 to Jan 15 2025",
        "expected_params": {
            "asset_types": ["FX", "CDS"],
            "clearing_houses": ["LCH"],
            "statuses": ["CLEARED"],
            "date_from": "2025-01-01",
            "date_to": "2025-01-15"
        }
    }
]
