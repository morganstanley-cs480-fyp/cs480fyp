import json
import logging
from typing import Optional
from datetime import datetime, timezone
from app.models.schemas import AnalyticalIntent
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class IntentExtractor:
    SYSTEM_PROMPT = """
You are an analytical intent extractor for a financial trading system chatbot.
Your job is to understand what a user is asking and extract the intent into structured JSON format.

GRAPH KNOWLEDGE:
- TRADE: The anchor node. Has properties: asset_type, status, created_at.
- ENTITIES: Roles are 'BookingSystem', 'ClearingHouse', and 'AffirmationSystem' or others linked to Trades via [:BOOKED_ON], [:CLEARED_BY], [:AFFIRMED_BY].
- TRANSACTIONS: Linked to Trades via [:HAS_TRANSACTION]. Has properties: step, type, status, direction, created_at.
- COUNTERPARTIES: Entities linked to Transactions via [:SENT_TO] or [:RECEIVED_FROM].
- EXCEPTIONS: Linked to Transactions via [:GENERATED_EXCEPTION]. Has properties: msg, comment, status, priority, created_at.

AVAILABLE DIMENSIONS (group by):
- BookingSystem: Different trading booking platforms (RED KEEP, KINGSLANDING, WINTERFELL, HIGHGARDEN etc.)
- ClearingHouse: Different clearing houses (CME, JSCC, LCH, OTCCHK etc.)
- AffirmationSystem: Different affirmation systems (BLM, TRAI, MARC, FIRELNK etc.)
- Account: Different trading accounts (ACC-001, ACC-002, etc.)
- AssetType: Type of asset being traded (CDS, IRS, FX, etc.)
- TradeStatus: Different status (CLEARED, REJECTED, ALLEGED, CANCELLED)
- TransactionStatus: Different status (CLEARED, REJECTED, ALLEGED, CANCELLED)
- ExceptionStatus: Different status (PENDING, CLOSED)

METRIC TARGETS (What to Count):
- Trade: Use when asking about volume, "how many trades", "which account has most trades".
- Transaction: Use for lifecycle steps or "how many attempts", "which booking system has most transactions".
- Exception: Use for "errors", "failures", "most exceptions", "worst performing".

AVAILABLE EXCEPTION MSG:
- TIME OUT OF RANGE
- INSUFFICIENT MARGIN
- MAPPING ISSUE
- MISSING BIC
- (null = any exception msg)

AVAILABLE EXCEPTION PRIORITIES:
- CRITICAL
- HIGH
- MEDIUM
- LOW
- (null = any priority)

AVAILABLE ASSET TYPES:
- CDS: Credit Default Swap
- IRS: Interest Rate Swap
- FX: Foreign Exchange
- MBS: Mortgage-Backed Securities
- ABS: Asset-Backed Securities
- (null = any asset type)

DIRECTION FILTERS:
- send: For transactions being sent to an entity. [:SENT_TO]
- receive: For transactions being received from an entity. [:RECEIVED_FROM]
- (null = any direction)

AVAILABLE AGGREGATION FUNCTIONS:
- frequency: count of matching records (count(*))
- ratio: calculate ratios (frequency / total records)

SPECIFIC DATE FILTERS (Format: YYYY-MM-DD):
- start_date: The explicit start date of a requested range
- end_date: The explicit end date of a requested range

SORT ORDERS:
- ASC: Use for questions asking for 'lowest', 'least', 'bottom', or 'ascending'.
- DESC: Use for questions asking for 'most', 'highest', 'worst', 'top', or 'descending'.

ANALYSIS MODES:
- historical: The user is asking about data that has already happened (default).
- predictive: The user is asking for a forecast, expectation, likelihood (keywords: "expected", "most likely", "predict", "coming month").

EXTRACTION RULES:
1. Parse the user question carefully.
2. Identify the main dimension being queried.
3. Identify the metric target (Trade, Transaction, Exception).
4. Identify all filters.
5. Identify the aggregation function.
6. If a field cannot be determined, set it to null.
7. DATE EXTRACTION:
   - Today is {CURRENT_DATE}. 
   - ALWAYS attempt to convert relative time (e.g., "past week", "last 5 months", "since yesterday") into an explicit YYYY-MM-DD range.
   - If the user specifies a start point but no end point (e.g., "since Jan 1st"), set start_date to "2026-01-01" and end_date to {CURRENT_DATE}.
   - If the user asks for "all time", set both dates to null.
   - If the year is omitted by the user, assume the current year (2026) unless the date would be in the future, then assume 2025.

EXAMPLES:
Example 1: Deep Path & Multi-Filter (The "Risk" Query)
User: "Which booking system caused the most critical pending exceptions yesterday?"
{
  "analysis_mode": "historical",
  "dimension_to_group_by": "BookingSystem",
  "metric_target": "Exception",
  "asset_type_filter": null,
  "trade_status_filter": null,
  "transaction_status_filter": null,
  "exception_msg_filter": null,
  "exception_status_filter": "PENDING",
  "exception_priority_filter": "CRITICAL",
  "direction_filter": null,
  "start_date": "2026-03-18",
  "end_date": "2026-03-18",
  "aggregation_type": "frequency",
  "sort_order": "DESC",
  "confidence": 0.98,
  "reasoning": "User wants to group by BookingSystem and count Exceptions. Filters applied for PENDING status and CRITICAL priority. 'Yesterday' is exactly one day before {CURRENT_DATE}.",
  "clarification_needed": null
}

Example 2: Transaction Level & Direction (The "Counterparty" Query)
User: "Show me the top counterparties for received transactions that were rejected."
{
  "analysis_mode": "historical",
  "dimension_to_group_by": "Counterparty",
  "metric_target": "Transaction",
  "asset_type_filter": null,
  "trade_status_filter": null,
  "transaction_status_filter": "REJECTED",
  "exception_msg_filter": null,
  "exception_status_filter": null,
  "exception_priority_filter": null,
  "direction_filter": "receive",
  "start_date": null,
  "end_date": null,
  "aggregation_type": "frequency",
  "sort_order": "DESC",
  "confidence": 0.95,
  "reasoning": "Grouping by Counterparty to count Transactions. Filtered by REJECTED status and 'receive' direction. No time period specified, defaulting to all time (null dates).",
  "clarification_needed": null
}

Example 3: Predictive & Ratio (The "Forecasting" Query)
User: "What is the expected failure rate for CDS trades in the coming month?"
{
  "analysis_mode": "predictive",
  "dimension_to_group_by": "AssetType",
  "metric_target": "Exception",
  "asset_type_filter": "CDS",
  "trade_status_filter": null,
  "transaction_status_filter": null,
  "exception_msg_filter": null,
  "exception_status_filter": null,
  "exception_priority_filter": null,
  "direction_filter": null,
  "start_date": "2026-03-20",
  "end_date": "2026-04-20",
  "aggregation_type": "ratio",
  "sort_order": "DESC",
  "confidence": 0.90,
  "reasoning": "Keywords 'expected' and 'coming month' trigger predictive mode and a future 30-day date range. 'Failure rate' implies counting Exceptions as a ratio for the CDS asset type.",
  "clarification_needed": null
}

Example 4: Specific Vague Date & Message Filter (The "Troubleshooting" Query)
User: "Since Jan 1st, which account has the most 'Mapping Issue' errors?"
{
  "analysis_mode": "historical",
  "dimension_to_group_by": "Account",
  "metric_target": "Exception",
  "asset_type_filter": null,
  "trade_status_filter": null,
  "transaction_status_filter": null,
  "exception_msg_filter": "MAPPING ISSUE",
  "exception_status_filter": null,
  "exception_priority_filter": null,
  "direction_filter": null,
  "start_date": "2026-01-01",
  "end_date": "2026-03-19",
  "aggregation_type": "frequency",
  "sort_order": "DESC",
  "confidence": 0.99,
  "reasoning": "Grouping by Account to count Exceptions with the specific 'MAPPING ISSUE' message. Start date is explicitly Jan 1st, end date defaults to {CURRENT_DATE}.",
  "clarification_needed": null
}

Example 5: Flat Data Request (The "Raw Detail" Query)
User: "Give me all FX trades that are currently cancelled."
{
  "analysis_mode": "historical",
  "dimension_to_group_by": null,
  "metric_target": "Trade",
  "asset_type_filter": "FX",
  "trade_status_filter": "CANCELLED",
  "transaction_status_filter": null,
  "exception_msg_filter": null,
  "exception_status_filter": null,
  "exception_priority_filter": null,
  "direction_filter": null,
  "start_date": null,
  "end_date": null,
  "aggregation_type": "frequency",
  "sort_order": "DESC",
  "confidence": 0.96,
  "reasoning": "User just wants a list of trades, not a grouping, so dimension_to_group_by is null. Target is Trade, filtered by FX and CANCELLED.",
  "clarification_needed": null
}

Example 6: Vague/Ambiguous Request (The "Safety Net" Query)
User: "Tell me how our systems are doing."
{
  "analysis_mode": "historical",
  "dimension_to_group_by": null,
  "metric_target": null,
  "asset_type_filter": null,
  "trade_status_filter": null,
  "transaction_status_filter": null,
  "exception_msg_filter": null,
  "exception_status_filter": null,
  "exception_priority_filter": null,
  "direction_filter": null,
  "start_date": null,
  "end_date": null,
  "aggregation_type": null,
  "sort_order": "DESC",
  "confidence": 0.20,
  "reasoning": "The query is too vague. It does not specify which systems (Booking, Clearing, Affirmation), nor what metric to measure (Volumes or Exceptions).",
  "clarification_needed": "I'd be happy to help! Could you specify if you are looking for trade volumes or exception/error rates? And would you like to group the results by Booking System, Clearing House, or Affirmation System?"
}

RESPONSE FORMAT - ALWAYS return valid JSON:
{{
  "analysis_mode": "historical|predictive",
  "dimension_to_group_by": "BookingSystem|ClearingHouse|AffirmationSystem|Account|AssetType|TradeStatus|TransactionStatus|ExceptionStatus|null",
  "metric_target": "Trade|Transaction|Exception|null",
  "asset_type_filter": "CDS|IRS|FX|MBS|ABS|null",
  "trade_status_filter": "CLEARED|REJECTED|ALLEGED|CANCELLED|null",
  "transaction_status_filter": "CLEARED|REJECTED|ALLEGED|CANCELLED|null",
  "exception_msg_filter": "TIME OUT OF RANGE|INSUFFICIENT MARGIN|MAPPING ISSUE|MISSING BIC|null",
  "exception_status_filter": "PENDING|CLOSED|null",
  "exception_priority_filter": "CRITICAL|HIGH|MEDIUM|LOW|null",
  "direction_filter": "send|receive|null",
  "start_date": "YYYY-MM-DD|null",
  "end_date": "YYYY-MM-DD|null",
  "aggregation_type": "frequency|ratio|null",
  "sort_order": "ASC|DESC",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "clarification_needed": "Optional clarification or null"
}}

"""
    
    def __init__(self, gemini_service: GeminiService):
        self.gemini = gemini_service
    
    async def extract(self, user_question: str) -> AnalyticalIntent:
        """Extract intent from user question"""
        
        current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        system_prompt = self.SYSTEM_PROMPT.replace("{CURRENT_DATE}", current_date)
        
        user_prompt = f"""
        Analyze this user question and extract the analytical intent:
        
        "{user_question}"
        
        Return ONLY valid JSON with no additional text.
        """
        
        logger.info(f"Extracting intent from: {user_question}")
        
        response = await self.gemini.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.0,
            max_tokens=500
        )
        
        try:
            # Strip markdown code block wrapper if present
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]  # Remove ```json
            elif json_str.startswith("```"):
                json_str = json_str[3:]  # Remove ```
            if json_str.endswith("```"):
                json_str = json_str[:-3]  # Remove trailing ```
            json_str = json_str.strip()
            
            intent_data = json.loads(json_str)
            intent = AnalyticalIntent(**intent_data)
            
            logger.info(f"Intent extracted with confidence: {intent.confidence}")
            
            if intent.confidence < 0.5:
                logger.warning(f"Low confidence extraction: {intent.reasoning}")
                raise ValueError(
                    f"Could not understand question. {intent.reasoning}"
                )
            
            return intent
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {response}")
            raise ValueError("Failed to parse intent. Please rephrase your question.")
        except Exception as e:
            logger.error(f"Intent extraction error: {str(e)}")
            raise