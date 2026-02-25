"""
Bedrock Prompt Templates for Trade Search Parameter Extraction
Defines the system and user prompts for AWS Bedrock Claude 3.5 Sonnet.
"""

from datetime import datetime, timedelta
from typing import Optional


# System prompt defines the AI's role and capabilities
SYSTEM_PROMPT = """You are a trade search parameter extraction assistant. Your role is to extract structured search parameters from natural language queries about financial trades.

You understand:
- Financial terminology and asset types (e.g. FX, IRS, CDS, equity, bonds, etc.)
- Trade statuses: ALLEGED, CLEARED, REJECTED, CANCELLED
- Date references (relative and absolute)
- Account identifiers (format: ACC followed by numbers, e.g. ACC123)
- System names (booking systems, affirmation systems, clearing houses)

RULES:
- Extract ONLY what is explicitly mentioned in the query. Do not infer or add filters that are not stated.
- If a query is specific (e.g. a single trade ID, a single status), return only those parameters and null for everything else.
- If a query is broad (e.g. "show me all FX trades"), extract all relevant filters mentioned.
- Do NOT over-extract. A query about a trade ID should not also set statuses or asset types.
- The field lists for asset_types, booking_systems, affirmation_systems, clearing_houses are NOT exhaustive. Extract whatever value the user mentions as-is.
- Only statuses are a fixed set: ALLEGED, CLEARED, REJECTED, CANCELLED.

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
  "trade_id": integer or null,
  "accounts": ["list of account IDs mentioned, e.g. ACC123, ACC456"] or null,
  "asset_types": ["list of asset types as mentioned by user, e.g. FX, IRS, CDS"] or null,
  "booking_systems": ["list of booking system names as mentioned"] or null,
  "affirmation_systems": ["list of affirmation system names as mentioned"] or null,
  "clearing_houses": ["list of clearing house names as mentioned"] or null,
  "statuses": ["list from fixed set: ALLEGED, CLEARED, REJECTED, CANCELLED"] or null,
  "date_from": "YYYY-MM-DD or null",
  "date_to": "YYYY-MM-DD or null",
  "with_exceptions_only": true or false
}}

IMPORTANT EXTRACTION RULES:

Trade ID (HIGHEST PRIORITY - if present, set all other fields to null/false):
- "trade id 99202386", "trade 99202386", "find 99202386", "id 99202386" → trade_id: 99202386
- When trade_id is set, every other field must be null or false.
- If NO numeric trade ID is mentioned, trade_id must be null.

Trade Status (fixed set only):
- "alleged", "pending", "unconfirmed" → ["ALLEGED"]
- "cleared", "confirmed", "settled" → ["CLEARED"]
- "rejected", "failed" → ["REJECTED"]
- "cancelled", "canceled", "voided" → ["CANCELLED"]
- Multiple statuses if mentioned: ["ALLEGED", "REJECTED"]
- No status mentioned → null

Asset Types (open-ended — extract exactly as user says, uppercase):
- "FX", "foreign exchange", "forex" → ["FX"]
- "IRS", "interest rate swap" → ["IRS"]
- "CDS", "credit default swap" → ["CDS"]
- Any other asset type the user mentions → extract it as-is, uppercased
- No asset type mentioned → null

Booking / Affirmation Systems and Clearing Houses (open-ended — extract exactly as user says, uppercase):
- Extract whatever system or house name the user mentions
- No system mentioned → null

Date References (today is {today}):
- "today" → date_from: "{today}", date_to: "{today}"
- "yesterday" → date_from: "{yesterday}", date_to: "{yesterday}"
- "last week" or "past week" → date_from: "{one_week_ago}", date_to: "{today}"
- "last month" or "past month" → date_from: "{one_month_ago}", date_to: "{today}"
- "from X to Y" → date_from: "X", date_to: "Y"
- "since X" → date_from: "X", date_to: null
- "before X" → date_from: null, date_to: "X"
- "on X" → date_from: "X", date_to: "X"
- No date mentioned → both null

Account Patterns:
- "ACC123", "account ACC123", "ACC-123" → ["ACC123"]
- Multiple: ["ACC123", "ACC456"]

Special Filters:
- "with exceptions", "having exceptions", "exception trades" → with_exceptions_only: true
- Otherwise → with_exceptions_only: false

EXAMPLES:

Query: "trade id 77194044"
Output: {{
  "trade_id": 77194044,
  "accounts": null,
  "asset_types": null,
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": null,
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false
}}

Query: "show me alleged FX trades from last week"
Output: {{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["ALLEGED"],
  "date_from": "{one_week_ago}",
  "date_to": "{today}",
  "with_exceptions_only": false
}}

Query: "cleared IRS trades for ACC012345"
Output: {{
  "trade_id": null,
  "accounts": ["ACC012345"],
  "asset_types": ["IRS"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["CLEARED"],
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false
}}

Query: "all IRS and CDS trades from WINTERFELL"
Output: {{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["IRS", "CDS"],
  "booking_systems": ["WINTERFELL"],
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": null,
  "date_from": null,
  "date_to": null,
  "with_exceptions_only": false
}}

Query: "rejected trades from 2025-01-01 to 2025-06-30 with exceptions"
Output: {{
  "trade_id": null,
  "accounts": null,
  "asset_types": null,
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": null,
  "statuses": ["REJECTED"],
  "date_from": "2025-01-01",
  "date_to": "2025-06-30",
  "with_exceptions_only": true
}}

Query: "show FX trades cleared by LCH from 2025-01-01 to 2025-01-15"
Output: {{
  "trade_id": null,
  "accounts": null,
  "asset_types": ["FX"],
  "booking_systems": null,
  "affirmation_systems": null,
  "clearing_houses": ["LCH"],
  "statuses": ["CLEARED"],
  "date_from": "2025-01-01",
  "date_to": "2025-01-15",
  "with_exceptions_only": false
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
        "trade_id": {
            "type": "int",
            "nullable": True
        },
        "asset_types": {
            "type": "list",
            "nullable": True
        },
        "statuses": {
            "allowed_values": ["ALLEGED", "CLEARED", "REJECTED", "CANCELLED"],
            "type": "list",
            "nullable": True
        },
        "booking_systems": {
            "type": "list",
            "nullable": True
        },
        "affirmation_systems": {
            "type": "list",
            "nullable": True
        },
        "clearing_houses": {
            "type": "list",
            "nullable": True
        },
        "accounts": {
            "type": "list",
            "nullable": True
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
