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


def build_user_prompt(
    query: str,
    current_date: Optional[datetime] = None,
    conversation: Optional[list[dict[str, str]]] = None,
) -> str:
    """
    Build the user prompt for parameter extraction.

    Args:
        query: The natural language query from the user
        current_date: Current date for relative date calculation (defaults to now)
        conversation: Optional conversation history for context-aware extraction

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

    # Format conversation history if available
    history_text = "(none)"
    if conversation:
        lines = []
        # Take last 6 turns to keep context relevant but concise
        for msg in conversation[-6:]:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        if lines:
            history_text = "\n".join(lines)

    prompt = f"""
Current Date: {today} ({day_of_week})
Reference Dates:
- Yesterday: {yesterday}
- One week ago: {one_week_ago}

Conversation Context:
{history_text}

USER QUERY: "{query}"

Based on the query and conversation context above, extract the search parameters into valid JSON.
If the user asks a follow-up question (e.g., "show me the rejected ones"), use the context to infer filters.
Do not invent filters not present in the conversation or query.

RESPONSE FORMAT:
{{
  "asset_types": ["string"] | null,
  "booking_systems": ["string"] | null,
  "affirmation_systems": ["string"] | null,
  "clearing_houses": ["string"] | null,
  "accounts": ["string"] | null,
  "statuses": ["ALLEGED" | "CLEARED" | "REJECTED" | "CANCELLED"] | null,
  "date_from": "YYYY-MM-DD" | null,
  "date_to": "YYYY-MM-DD" | null,
  "trade_id": "string" | null
}}
"""
    return prompt.strip()


def build_prompt(query: str, columns: list[str]) -> str:
    """
    Builds the prompt for the Bedrock model, including the query and schema.

    Args:
        query: The user's search query.
        columns: The columns of the trades table.

    Returns:
        The complete prompt string.
    """
    # f-string is used here to allow for future expansion if needed
    prompt = f"""Extract trade search parameters from this query and return them as JSON.
The query is: "{query}"

Today's date is {datetime.now().strftime('%Y-%m-%d')}.

Here is the schema of the `trades` table:
- {', '.join(columns)}

Possible values for `status`:
- ALLEGED
- CLEARED
- REJECTED
- CANCELLED

Return a JSON object with the following structure.
If a value is not present in the query, set it to null.
{{
  "asset_types": ["string"] | null,
  "booking_systems": ["string"] | null,
  "affirmation_systems": ["string"] | null,
  "clearing_houses": ["string"] | null,
  "accounts": ["string"] | null,
  "statuses": ["ALLEGED" | "CLEARED" | "REJECTED" | "CANCELLED"] | null,
  "date_from": "YYYY-MM-DD" | null,
  "date_to": "YYYY-MM-DD" | null,
  "trade_id": "string" | null
}}
"""
    return prompt.strip()


def build_validation_rules() -> dict:
    """
    Define validation rules for extracted parameters.
    Used to validate Bedrock's response before using it.

    Returns:
        Dictionary of validation rules
    """
    return {
        "trade_id": {"type": "int", "nullable": True},
        "asset_types": {"type": "list", "nullable": True},
        "statuses": {
            "allowed_values": ["ALLEGED", "CLEARED", "REJECTED", "CANCELLED"],
            "type": "list",
            "nullable": True,
        },
        "booking_systems": {"type": "list", "nullable": True},
        "affirmation_systems": {"type": "list", "nullable": True},
        "clearing_houses": {"type": "list", "nullable": True},
        "accounts": {"type": "list", "nullable": True},
        "date_from": {"type": "date", "nullable": True, "format": "%Y-%m-%d"},
        "date_to": {"type": "date", "nullable": True, "format": "%Y-%m-%d"},
        "with_exceptions_only": {"type": "bool", "nullable": False, "default": False},
    }


# Test queries for validation and testing
TEST_QUERIES = [
    {
        "query": "show me pending FX trades from last week",
        "expected_params": {
            "asset_types": ["FX"],
            "statuses": ["ALLEGED"],
            "accounts": None,
            "with_exceptions_only": False,
        },
    },
    {
        "query": "cleared EQUITY trades for ACC012345",
        "expected_params": {
            "accounts": ["ACC012345"],
            "asset_types": ["EQUITY"],
            "statuses": ["CLEARED"],
            "cleared_trades_only": True,
        },
    },
    {
        "query": "all rejected IRS trades",
        "expected_params": {
            "asset_types": ["IRS"],
            "statuses": ["REJECTED"],
            "accounts": None,
        },
    },
    {
        "query": "show me trades with exceptions from WINTERFELL",
        "expected_params": {
            "booking_systems": ["WINTERFELL"],
            "with_exceptions_only": True,
            "statuses": None,
        },
    },
    {
        "query": "FX and CDS trades cleared by LCH from Jan 1 to Jan 15 2025",
        "expected_params": {
            "asset_types": ["FX", "CDS"],
            "clearing_houses": ["LCH"],
            "statuses": ["CLEARED"],
            "date_from": "2025-01-01",
            "date_to": "2025-01-15",
        },
    },
]
